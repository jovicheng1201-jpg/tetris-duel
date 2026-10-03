export const BOARD_WIDTH = 10;
export const VISIBLE_ROWS = 20;
export const HIDDEN_ROWS = 2;
export const BOARD_HEIGHT = VISIBLE_ROWS + HIDDEN_ROWS;
export const FULL_ROW = (1 << BOARD_WIDTH) - 1;

export type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
export type Rotation = 0 | 1 | 2 | 3;
export type GameMode = "solo" | "ai" | "online_pvp";
export type GameStatus = "playing" | "paused" | "game_over";
export type GameOverReason = "top_out" | "opponent" | "disconnect";

export interface ActivePiece {
  type: PieceType;
  x: number;
  y: number;
  rotation: Rotation;
}

export interface GameStats {
  score: number;
  lines: number;
  level: number;
  attacksSent: number;
  attacksReceived: number;
  elapsedMs: number;
  piecesLocked: number;
}

export interface GarbageAttack {
  id: string;
  holes: number[];
}

export interface RandomState {
  seed: number;
  bag: PieceType[];
  bagIndex: number;
}

export interface GameRules {
  rowsPerLevel: number;
  lineScores: readonly [number, number, number, number];
  softDropPoints: number;
  hardDropPoints: number;
  lockDelayMs: number;
  maxLockResets: number;
  comboAttack: boolean;
  maxGarbageLinesPerAttack: number;
}

export interface GameState {
  boardRows: Uint16Array;
  active: ActivePiece | null;
  hold: PieceType | null;
  holdUsed: boolean;
  nextQueue: PieceType[];
  random: RandomState;
  incomingGarbage: GarbageAttack[];
  stats: GameStats;
  status: GameStatus;
  lockElapsedMs: number;
  lockResets: number;
  combo: number;
  gravityAccumulatorMs: number;
  seed: number;
  gameOverReason: GameOverReason | null;
}

export type GameInput =
  | "left"
  | "right"
  | "soft_drop"
  | "hard_drop"
  | "rotate_cw"
  | "rotate_ccw"
  | "hold";

export type EngineEvent =
  | { type: "piece_locked"; piece: PieceType }
  | { type: "lines_cleared"; count: number; score: number }
  | { type: "attack_created"; lines: number; holes: number[]; id: string }
  | { type: "game_over"; reason: GameOverReason };

export interface EngineResult {
  state: GameState;
  events: EngineEvent[];
}

export const PIECE_TYPES: readonly PieceType[] = ["I", "O", "T", "S", "Z", "J", "L"];

export const DEFAULT_RULES: GameRules = {
  rowsPerLevel: 10,
  lineScores: [100, 300, 500, 800],
  softDropPoints: 1,
  hardDropPoints: 2,
  lockDelayMs: 500,
  maxLockResets: 15,
  comboAttack: true,
  maxGarbageLinesPerAttack: 8,
};

export function gravityIntervalMs(level: number): number {
  return Math.max(80, 1000 * Math.pow(0.8, Math.max(0, level - 1)));
}
