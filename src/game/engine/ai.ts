import { canPlace, clearFullRows, getColumnHeights, lockPiece } from "./board";
import type { ActivePiece, GameState, PieceType } from "./types";

export interface AiDifficulty {
  thinkMs: number;
  stepMs: number;
  errorRate: number;
}

export const AI_DIFFICULTIES: Record<"easy" | "normal" | "hard", AiDifficulty> = {
  easy: { thinkMs: 700, stepMs: 105, errorRate: 0.22 },
  normal: { thinkMs: 350, stepMs: 60, errorRate: 0.08 },
  hard: { thinkMs: 180, stepMs: 30, errorRate: 0.015 },
};

export interface AiTarget {
  x: number;
  rotation: ActivePiece["rotation"];
}

function evaluate(board: Uint16Array, lines: number): number {
  const heights = getColumnHeights(board);
  const aggregateHeight = heights.reduce((sum, height) => sum + height, 0);
  const holes = heights.reduce((total, _height, x) => {
    let seen = false;
    let count = 0;
    for (let y = 0; y < board.length; y += 1) {
      const filled = ((board[y] ?? 0) & (1 << x)) !== 0;
      if (filled) seen = true;
      else if (seen) count += 1;
    }
    return total + count;
  }, 0);
  const bumpiness = heights.slice(1).reduce((sum, height, index) => sum + Math.abs(height - heights[index]!), 0);
  const wells = heights.reduce((sum, height, index) => {
    const left = heights[index - 1] ?? 22;
    const right = heights[index + 1] ?? 22;
    return sum + Math.max(0, Math.min(left, right) - height);
  }, 0);
  return -0.52 * aggregateHeight - 0.78 * holes - 0.19 * bumpiness - 0.28 * wells + 0.82 * lines;
}

export function chooseAiTarget(state: GameState, pieceType?: PieceType): AiTarget | null {
  const active = state.active;
  if (!active) return null;
  const type = pieceType ?? active.type;
  let best: AiTarget | null = null;
  let bestValue = Number.NEGATIVE_INFINITY;

  for (let rotation = 0; rotation < 4; rotation += 1) {
    for (let x = -2; x < 10; x += 1) {
      let candidate: ActivePiece = { type, x, y: 0, rotation: rotation as ActivePiece["rotation"] };
      if (!canPlace(state.boardRows, candidate)) continue;
      while (canPlace(state.boardRows, { ...candidate, y: candidate.y + 1 })) {
        candidate = { ...candidate, y: candidate.y + 1 };
      }
      const placed = lockPiece(state.boardRows, candidate);
      const cleared = clearFullRows(placed);
      const value = evaluate(cleared.board, cleared.cleared);
      if (value > bestValue) {
        bestValue = value;
        best = { x, rotation: candidate.rotation };
      }
    }
  }
  return best;
}
