import { applyGarbage } from "./board";
import { nextRandomInt } from "./random";
import type { GameState, RandomState } from "./types";

export function createGarbageHoles(
  random: RandomState,
  lines: number,
  maxLines: number,
): number[] {
  const count = Math.max(0, Math.min(lines, maxLines));
  const holes: number[] = [];
  let previous = -1;
  for (let index = 0; index < count; index += 1) {
    let hole = nextRandomInt(random, 10);
    if (hole === previous) hole = (hole + 1 + nextRandomInt(random, 8)) % 10;
    holes.push(hole);
    previous = hole;
  }
  return holes;
}

export function queueGarbage(state: GameState, id: string, holes: number[]): void {
  if (holes.length === 0 || state.status !== "playing") return;
  state.incomingGarbage.push({ id, holes: [...holes] });
}

export function applyQueuedGarbage(state: GameState): boolean {
  if (state.incomingGarbage.length === 0 || state.status !== "playing") return false;
  let toppedOut = false;
  while (state.incomingGarbage.length > 0) {
    const attack = state.incomingGarbage.shift()!;
    const result = applyGarbage(state.boardRows, attack.holes);
    state.boardRows = result.board;
    state.stats.attacksReceived += attack.holes.length;
    toppedOut ||= result.toppedOut;
    if (toppedOut) break;
  }
  return toppedOut;
}

export function applyIncomingAttack(state: GameState, id: string, holes: number[]): boolean {
  if (state.status !== "playing" || holes.length < 1 || holes.length > 8) return false;
  if (state.incomingGarbage.some((attack) => attack.id === id)) return false;
  state.incomingGarbage.push({ id, holes: [...holes] });
  return false;
}

export function cancelIncomingGarbage(state: GameState, lines: number): number {
  let remaining = Math.max(0, lines);
  while (remaining > 0 && state.incomingGarbage.length > 0) {
    const attack = state.incomingGarbage[0]!;
    const canceled = Math.min(remaining, attack.holes.length);
    attack.holes.splice(0, canceled);
    remaining -= canceled;
    if (attack.holes.length === 0) state.incomingGarbage.shift();
  }
  return remaining;
}
