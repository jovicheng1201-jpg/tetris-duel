import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  FULL_ROW,
  type ActivePiece,
  type GameState,
} from "./types";
import { getPieceCells } from "./pieces";

export function createEmptyBoard(): Uint16Array {
  return new Uint16Array(BOARD_HEIGHT);
}

export function canPlace(board: Uint16Array, piece: ActivePiece): boolean {
  for (const cell of getPieceCells(piece)) {
    if (cell.x < 0 || cell.x >= BOARD_WIDTH || cell.y >= BOARD_HEIGHT) return false;
    if (cell.y >= 0 && ((board[cell.y] ?? 0) & (1 << cell.x)) !== 0) return false;
  }
  return true;
}

export function findDropY(board: Uint16Array, piece: ActivePiece): number {
  let y = piece.y;
  while (canPlace(board, { ...piece, y: y + 1 })) y += 1;
  return y;
}

export function lockPiece(board: Uint16Array, piece: ActivePiece): Uint16Array {
  const next = board.slice();
  for (const cell of getPieceCells(piece)) {
    if (cell.y >= 0 && cell.y < BOARD_HEIGHT && cell.x >= 0 && cell.x < BOARD_WIDTH) {
      next[cell.y] = ((next[cell.y] ?? 0) | (1 << cell.x)) as number;
    }
  }
  return next;
}

export function clearFullRows(board: Uint16Array): { board: Uint16Array; cleared: number } {
  const remaining = Array.from(board).filter((row) => row !== FULL_ROW);
  const cleared = BOARD_HEIGHT - remaining.length;
  const next = new Uint16Array(BOARD_HEIGHT);
  next.set(remaining, cleared);
  return { board: next, cleared };
}

export function applyGarbage(board: Uint16Array, holes: number[]): { board: Uint16Array; toppedOut: boolean } {
  if (holes.length === 0) return { board, toppedOut: false };
  const count = Math.min(holes.length, BOARD_HEIGHT);
  const lostRows = Array.from(board.slice(0, count));
  const next = new Uint16Array(BOARD_HEIGHT);
  next.set(board.slice(count), 0);
  for (let index = 0; index < count; index += 1) {
    const hole = Math.max(0, Math.min(BOARD_WIDTH - 1, holes[index] ?? 0));
    next[BOARD_HEIGHT - count + index] = (FULL_ROW ^ (1 << hole)) as number;
  }
  return { board: next, toppedOut: lostRows.some((row) => row !== 0) };
}

export function getColumnHeights(board: Uint16Array): number[] {
  return Array.from({ length: BOARD_WIDTH }, (_, x) => {
    for (let y = 0; y < BOARD_HEIGHT; y += 1) {
      if (((board[y] ?? 0) & (1 << x)) !== 0) return BOARD_HEIGHT - y;
    }
    return 0;
  });
}

export function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    boardRows: state.boardRows.slice(),
    active: state.active ? { ...state.active } : null,
    nextQueue: [...state.nextQueue],
    random: { ...state.random, bag: [...state.random.bag] },
    incomingGarbage: state.incomingGarbage.map((attack) => ({ ...attack, holes: [...attack.holes] })),
    stats: { ...state.stats },
  };
}
