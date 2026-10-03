import { applyAttack, applyInput, createGame, getFreshSeed, setPaused, stepGame } from "../engine/engine";
import { chooseAiTarget, type AiDifficulty, AI_DIFFICULTIES } from "../engine/ai";
import type { EngineEvent, GameInput, GameMode, GameState } from "../engine/types";

type MatchWinner = "player" | "opponent" | "draw";

export interface RuntimeOptions {
  mode: GameMode;
  seed?: number;
  difficulty?: "easy" | "normal" | "hard";
  autoStart?: boolean;
  onChange?: () => void;
  onEvent?: (event: EngineEvent) => void;
  onResult?: (winner: MatchWinner, player: GameState, opponent: GameState | null) => void;
}

interface HeldInput {
  ageMs: number;
  repeatMs: number;
}

export class GameRuntime {
  readonly mode: GameMode;
  player: GameState;
  opponent: GameState | null;
  private readonly difficulty: AiDifficulty;
  private readonly onChange?: () => void;
  private readonly onEvent?: (event: EngineEvent) => void;
  private readonly onResult?: RuntimeOptions["onResult"];
  private frameId = 0;
  private lastFrame = 0;
  private accumulator = 0;
  private uiAccumulator = 0;
  private aiAge = 0;
  private aiStep = 0;
  private aiPieceCount = -1;
  private aiTarget: ReturnType<typeof chooseAiTarget> = null;
  private readonly held = new Map<GameInput, HeldInput>();
  private resultSent = false;

  constructor(options: RuntimeOptions) {
    this.mode = options.mode;
    this.difficulty = AI_DIFFICULTIES[options.difficulty ?? "normal"];
    this.onChange = options.onChange;
    this.onEvent = options.onEvent;
    this.onResult = options.onResult;
    const seed = options.seed ?? getFreshSeed();
    this.player = createGame(seed);
    this.opponent = options.mode === "ai" ? createGame(seed) : null;
  }

  start(): void {
    if (this.frameId || this.player.status === "game_over") return;
    this.lastFrame = performance.now();
    this.frameId = requestAnimationFrame(this.tick);
  }

  destroy(): void {
    if (this.frameId) cancelAnimationFrame(this.frameId);
    this.frameId = 0;
    this.held.clear();
  }

  pause(): void {
    if (this.player.status === "game_over" || this.player.status === "paused") return;
    setPaused(this.player, true);
    if (this.opponent) setPaused(this.opponent, true);
    this.held.clear();
    this.onChange?.();
  }

  resume(): void {
    if (this.player.status !== "paused") return;
    setPaused(this.player, false);
    if (this.opponent) setPaused(this.opponent, false);
    this.lastFrame = performance.now();
    this.start();
    this.onChange?.();
  }

  togglePause(): void {
    if (this.player.status === "paused") this.resume();
    else this.pause();
  }

  restart(): void {
    this.destroy();
    const seed = getFreshSeed();
    this.player = createGame(seed);
    this.opponent = this.mode === "ai" ? createGame(seed) : null;
    this.accumulator = 0;
    this.uiAccumulator = 0;
    this.aiAge = 0;
    this.aiStep = 0;
    this.aiPieceCount = -1;
    this.aiTarget = null;
    this.resultSent = false;
    this.onChange?.();
    this.start();
  }

  press(input: GameInput): void {
    if (this.player.status !== "playing") return;
    this.applyPlayerInput(input);
    if (input === "left" || input === "right" || input === "soft_drop") {
      this.held.set(input, { ageMs: 0, repeatMs: 0 });
    }
    this.onChange?.();
  }

  release(input: GameInput): void {
    this.held.delete(input);
  }

  receiveAttack(id: string, holes: number[]): void {
    const result = applyAttack(this.player, id, holes);
    this.handlePlayerEvents(result.events);
    this.onChange?.();
  }

  opponentLost(): void {
    if (this.resultSent) return;
    this.pause();
    this.reportResult("player");
  }

  remoteDraw(): void {
    if (this.resultSent) return;
    this.pause();
    this.reportResult("draw");
  }

  private applyPlayerInput(input: GameInput): void {
    const result = applyInput(this.player, input);
    this.handlePlayerEvents(result.events);
  }

  private handlePlayerEvents(events: EngineEvent[]): void {
    for (const event of events) {
      this.onEvent?.(event);
      if (event.type === "game_over" && this.mode === "online_pvp") {
        this.reportResult("opponent");
      }
      if (event.type === "attack_created" && this.opponent) {
        const incoming = applyAttack(this.opponent, event.id, event.holes);
        if (incoming.events.some((item) => item.type === "game_over")) this.checkAiResult();
      }
    }
    if (this.mode === "ai") this.checkAiResult();
  }

  private tick = (now: number): void => {
    this.frameId = 0;
    const elapsed = Math.min(100, Math.max(0, now - this.lastFrame));
    this.lastFrame = now;

    if (this.player.status === "playing") {
      this.accumulator += elapsed;
      const fixedStep = 1000 / 60;
      while (this.accumulator >= fixedStep) {
        this.stepHeldInputs(fixedStep);
        this.runAi(fixedStep);
        const playerResult = stepGame(this.player, fixedStep);
        this.handlePlayerEvents(playerResult.events);

        if (this.opponent?.status === "playing") {
          const opponentResult = stepGame(this.opponent, fixedStep);
          for (const event of opponentResult.events) {
            if (event.type === "attack_created") {
              const incoming = applyAttack(this.player, event.id, event.holes);
              this.handlePlayerEvents(incoming.events);
            }
          }
        }
        this.checkAiResult();
        this.accumulator -= fixedStep;
      }
      this.uiAccumulator += elapsed;
      if (this.uiAccumulator >= 100) {
        this.uiAccumulator = 0;
        this.onChange?.();
      }
    }
    if (this.player.status === "playing" || this.player.status === "paused") {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private stepHeldInputs(elapsed: number): void {
    for (const [input, timing] of this.held) {
      timing.ageMs += elapsed;
      const initialDelay = input === "soft_drop" ? 45 : 150;
      const repeatInterval = input === "soft_drop" ? 45 : 48;
      if (timing.ageMs >= initialDelay) {
        timing.repeatMs += elapsed;
        if (timing.repeatMs >= repeatInterval) {
          timing.repeatMs = 0;
          this.applyPlayerInput(input);
        }
      }
    }
  }

  private runAi(elapsed: number): void {
    const ai = this.opponent;
    if (!ai || ai.status !== "playing" || !ai.active) return;
    if (ai.stats.piecesLocked !== this.aiPieceCount) {
      this.aiPieceCount = ai.stats.piecesLocked;
      this.aiTarget = chooseAiTarget(ai);
      this.aiAge = 0;
      this.aiStep = 0;
      if (this.aiTarget && Math.random() < this.difficulty.errorRate) {
        this.aiTarget.x += Math.random() < 0.5 ? -1 : 1;
      }
    }
    if (!this.aiTarget) return;
    this.aiAge += elapsed;
    if (this.aiAge < this.difficulty.thinkMs) return;
    this.aiStep += elapsed;
    if (this.aiStep < this.difficulty.stepMs) return;
    this.aiStep = 0;

    const active = ai.active;
    const clockwiseTurns = (this.aiTarget.rotation - active.rotation + 4) % 4;
    if (clockwiseTurns !== 0) {
      const direction = clockwiseTurns <= 2 ? "rotate_cw" : "rotate_ccw";
      const result = applyInput(ai, direction);
      this.handleAiEvents(result.events);
    } else if (active.x < this.aiTarget.x) {
      const result = applyInput(ai, "right");
      this.handleAiEvents(result.events);
    } else if (active.x > this.aiTarget.x) {
      const result = applyInput(ai, "left");
      this.handleAiEvents(result.events);
    } else {
      const result = applyInput(ai, "hard_drop");
      this.handleAiEvents(result.events);
    }
  }

  private handleAiEvents(events: EngineEvent[]): void {
    for (const event of events) {
      if (event.type === "attack_created") {
        const incoming = applyAttack(this.player, event.id, event.holes);
        this.handlePlayerEvents(incoming.events);
      }
    }
  }

  private checkAiResult(): void {
    if (this.resultSent || this.mode !== "ai" || !this.opponent) return;
    const playerOut = this.player.status === "game_over";
    const aiOut = this.opponent.status === "game_over";
    if (!playerOut && !aiOut) return;
    if (playerOut && !aiOut) {
      setPaused(this.opponent, true);
      this.reportResult("opponent");
    } else if (aiOut && !playerOut) {
      setPaused(this.player, true);
      this.reportResult("player");
    } else {
      this.reportResult("draw");
    }
  }

  private reportResult(winner: MatchWinner): void {
    if (this.resultSent) return;
    this.resultSent = true;
    this.onResult?.(winner, this.player, this.opponent);
    this.onChange?.();
  }
}
