import { applyIncomingAttack, applyQueuedGarbage, cancelIncomingGarbage, createGarbageHoles } from "./attacks";
import { canPlace, clearFullRows, createEmptyBoard, findDropY, lockPiece } from "./board";
import { rotateValue, spawnPiece } from "./pieces";
import { attackForClear, updateStatsForClear } from "./scoring";
import { createRandomState, fillQueue } from "./random";
import {
  DEFAULT_RULES,
  type EngineEvent,
  type EngineResult,
  type GameInput,
  type GameOverReason,
  type GameRules,
  type GameState,
} from "./types";

export function createGame(seed: number): GameState {
  const random = createRandomState(seed);
  const state: GameState = {
    boardRows: createEmptyBoard(),
    active: null,
    hold: null,
    holdUsed: false,
    nextQueue: [],
    random,
    incomingGarbage: [],
    stats: { score: 0, lines: 0, level: 1, attacksSent: 0, attacksReceived: 0, elapsedMs: 0, piecesLocked: 0 },
    status: "playing",
    lockElapsedMs: 0,
    lockResets: 0,
    combo: 0,
    gravityAccumulatorMs: 0,
    seed,
    gameOverReason: null,
  };
  fillQueue(random, state.nextQueue, 7);
  spawnNext(state);
  return state;
}

function finish(state: GameState, reason: GameOverReason, events: EngineEvent[]): void {
  if (state.status === "game_over") return;
  state.status = "game_over";
  state.gameOverReason = reason;
  events.push({ type: "game_over", reason });
}

function spawnNext(state: GameState, events: EngineEvent[] = []): void {
  fillQueue(state.random, state.nextQueue, 7);
  const type = state.nextQueue.shift();
  if (!type) {
    finish(state, "top_out", events);
    return;
  }
  state.active = spawnPiece(type);
  state.holdUsed = false;
  state.lockElapsedMs = 0;
  state.lockResets = 0;
  if (!canPlace(state.boardRows, state.active)) finish(state, "top_out", events);
}

function resetLockIfGrounded(state: GameState, rules: GameRules): void {
  if (
    state.active
    && state.lockResets < rules.maxLockResets
    && !canPlace(state.boardRows, { ...state.active, y: state.active.y + 1 })
  ) {
    state.lockElapsedMs = 0;
    state.lockResets += 1;
  }
}

function lockAndSpawn(state: GameState, rules: GameRules, events: EngineEvent[], hardDropCells = 0): void {
  if (!state.active || state.status !== "playing") return;
  const lockedType = state.active.type;
  state.boardRows = lockPiece(state.boardRows, state.active);
  state.stats.piecesLocked += 1;
  events.push({ type: "piece_locked", piece: lockedType });
  state.active = null;

  const result = clearFullRows(state.boardRows);
  state.boardRows = result.board;
  const lineScore = updateStatsForClear(state.stats, result.cleared, 0, hardDropCells, rules);

  if (result.cleared > 0) {
    state.combo += 1;
    events.push({ type: "lines_cleared", count: result.cleared, score: lineScore });
    const attack = cancelIncomingGarbage(state, attackForClear(result.cleared, state.combo, rules.comboAttack));
    if (attack > 0) {
      const holes = createGarbageHoles(state.random, attack, rules.maxGarbageLinesPerAttack);
      const attackId = state.seed.toString(36) + "-" + state.stats.piecesLocked + "-" + state.random.seed.toString(36);
      state.stats.attacksSent += attack;
      events.push({ type: "attack_created", lines: attack, holes, id: attackId });
    }
  } else {
    state.combo = 0;
  }

  const toppedOut = applyQueuedGarbage(state);
  if (toppedOut) {
    finish(state, "top_out", events);
    return;
  }
  spawnNext(state, events);
}

export function applyInput(
  state: GameState,
  input: GameInput,
  rules: GameRules = DEFAULT_RULES,
): EngineResult {
  const events: EngineEvent[] = [];
  if (state.status !== "playing" || !state.active) return { state, events };
  const piece = state.active;

  if (input === "left" || input === "right") {
    const dx = input === "left" ? -1 : 1;
    const candidate = { ...piece, x: piece.x + dx };
    if (canPlace(state.boardRows, candidate)) {
      state.active = candidate;
      resetLockIfGrounded(state, rules);
    }
  } else if (input === "rotate_cw" || input === "rotate_ccw") {
    const direction = input === "rotate_cw" ? 1 : -1;
    const rotation = rotateValue(piece.rotation, direction);
    const kicks = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1]];
    for (const [dx, dy] of kicks) {
      const candidate = { ...piece, x: piece.x + dx!, y: piece.y + dy!, rotation };
      if (canPlace(state.boardRows, candidate)) {
        state.active = candidate;
        resetLockIfGrounded(state, rules);
        break;
      }
    }
  } else if (input === "soft_drop") {
    const candidate = { ...piece, y: piece.y + 1 };
    if (canPlace(state.boardRows, candidate)) {
      state.active = candidate;
      state.stats.score += rules.softDropPoints;
      state.gravityAccumulatorMs = 0;
    }
  } else if (input === "hard_drop") {
    const targetY = findDropY(state.boardRows, piece);
    const distance = Math.max(0, targetY - piece.y);
    state.active = { ...piece, y: targetY };
    lockAndSpawn(state, rules, events, distance);
  } else if (input === "hold" && !state.holdUsed) {
    const current = piece.type;
    const replacement = state.hold ?? state.nextQueue.shift();
    state.hold = current;
    state.holdUsed = true;
    if (replacement) {
      state.active = spawnPiece(replacement);
      fillQueue(state.random, state.nextQueue, 7);
      if (!canPlace(state.boardRows, state.active)) finish(state, "top_out", events);
    }
  }
  return { state, events };
}

export function stepGame(state: GameState, elapsedMs: number, rules: GameRules = DEFAULT_RULES): EngineResult {
  const events: EngineEvent[] = [];
  if (state.status !== "playing" || !state.active) return { state, events };
  const elapsed = Math.max(0, Math.min(elapsedMs, 100));
  state.stats.elapsedMs += elapsed;
  state.gravityAccumulatorMs += elapsed;

  const interval = Math.max(80, 1000 * Math.pow(0.8, Math.max(0, state.stats.level - 1)));
  while (state.gravityAccumulatorMs >= interval && state.status === "playing" && state.active) {
    state.gravityAccumulatorMs -= interval;
    const below: NonNullable<GameState["active"]> = { ...state.active, y: state.active.y + 1 };
    if (canPlace(state.boardRows, below)) {
      state.active = below;
      state.lockElapsedMs = 0;
    } else {
      state.gravityAccumulatorMs = 0;
      break;
    }
  }

  if (state.active && !canPlace(state.boardRows, { ...state.active, y: state.active.y + 1 })) {
    state.lockElapsedMs += elapsed;
    if (state.lockElapsedMs >= rules.lockDelayMs) lockAndSpawn(state, rules, events);
  } else if (state.active) {
    state.lockElapsedMs = 0;
  }
  return { state, events };
}

export function applyAttack(state: GameState, id: string, holes: number[]): EngineResult {
  const events: EngineEvent[] = [];
  const toppedOut = applyIncomingAttack(state, id, holes);
  if (toppedOut) finish(state, "top_out", events);
  return { state, events };
}

export function setPaused(state: GameState, paused: boolean): void {
  if (state.status === "game_over") return;
  state.status = paused ? "paused" : "playing";
}

export function getFreshSeed(): number {
  return (crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now()) >>> 0;
}
