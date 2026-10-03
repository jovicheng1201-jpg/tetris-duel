import type { ActivePiece, PieceType, Rotation } from "./types";

type Matrix = readonly string[];

const BASE_SHAPES: Record<PieceType, Matrix> = {
  I: ["....", "XXXX", "....", "...."],
  O: [".XX.", ".XX.", "....", "...."],
  T: [".X..", "XXX.", "....", "...."],
  S: [".XX.", "XX..", "....", "...."],
  Z: ["XX..", ".XX.", "....", "...."],
  J: ["X...", "XXX.", "....", "...."],
  L: ["..X.", "XXX.", "....", "...."],
};

export interface Cell {
  x: number;
  y: number;
}

export function getPieceCells(piece: ActivePiece): Cell[] {
  let matrix = BASE_SHAPES[piece.type].map((row) => [...row]);
  for (let turn = 0; turn < piece.rotation; turn += 1) {
    matrix = matrix.map((_, row) =>
      matrix.map((line) => line[row]!).reverse(),
    );
  }
  const cells: Cell[] = [];
  matrix.forEach((row, y) =>
    row.forEach((value, x) => {
      if (value === "X") cells.push({ x: piece.x + x, y: piece.y + y });
    }),
  );
  return cells;
}

export function rotateValue(rotation: Rotation, direction: 1 | -1): Rotation {
  return ((rotation + direction + 4) % 4) as Rotation;
}

export function spawnPiece(type: PieceType): ActivePiece {
  return { type, x: 3, y: 0, rotation: 0 };
}

export function getBaseShape(type: PieceType): Matrix {
  return BASE_SHAPES[type];
}
