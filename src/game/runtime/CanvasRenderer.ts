import { BOARD_HEIGHT, HIDDEN_ROWS, VISIBLE_ROWS, type GameState, type PieceType } from "../engine/types";
import { getPieceCells } from "../engine/pieces";
import { findDropY } from "../engine/board";

const COLORS: Record<PieceType, string> = {
  I: "#4de0e8",
  O: "#ffd166",
  T: "#b18cff",
  S: "#66e3a4",
  Z: "#ff6b8a",
  J: "#6f9cff",
  L: "#ffad66",
};

function drawCell(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellWidth: number,
  cellHeight: number,
  color: string,
  alpha = 1,
  ghost = false,
): void {
  const inset = Math.max(1, Math.min(cellWidth, cellHeight) * 0.055);
  context.globalAlpha = alpha;
  context.fillStyle = color;
  if (ghost) {
    context.globalAlpha = 0.5;
    context.strokeStyle = color;
    context.lineWidth = Math.max(1, Math.min(cellWidth, cellHeight) * 0.08);
    context.strokeRect(x * cellWidth + inset * 2, y * cellHeight + inset * 2, cellWidth - inset * 4, cellHeight - inset * 4);
  } else {
    context.beginPath();
    const left = x * cellWidth + inset;
    const top = y * cellHeight + inset;
    const width = cellWidth - inset * 2;
    const height = cellHeight - inset * 2;
    const radius = Math.min(5, width * 0.18, height * 0.18);
    context.roundRect(left, top, width, height, radius);
    context.fill();
    context.fillStyle = "rgba(255,255,255,.32)";
    context.fillRect(left + width * 0.14, top + height * 0.12, width * 0.72, Math.max(1, height * 0.08));
  }
  context.globalAlpha = 1;
}

export function renderBoard(canvas: HTMLCanvasElement, state: GameState): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  const bounds = canvas.getBoundingClientRect();
  if (bounds.width === 0 || bounds.height === 0) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.round(bounds.width * ratio);
  const pixelHeight = Math.round(bounds.height * ratio);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  const cellWidth = bounds.width / 10;
  const cellHeight = bounds.height / VISIBLE_ROWS;
  context.clearRect(0, 0, bounds.width, bounds.height);
  context.fillStyle = "#0b1020";
  context.fillRect(0, 0, bounds.width, bounds.height);

  for (let y = 0; y < VISIBLE_ROWS; y += 1) {
    for (let x = 0; x < 10; x += 1) {
      const rowMask = state.boardRows[y + HIDDEN_ROWS] ?? 0;
      if ((rowMask & (1 << x)) !== 0) drawCell(context, x, y, cellWidth, cellHeight, "#52627d");
      else {
        context.strokeStyle = "rgba(139,158,190,.08)";
        context.lineWidth = 1;
        context.strokeRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
      }
    }
  }

  if (state.active) {
    const ghostY = findDropY(state.boardRows, state.active);
    for (const cell of getPieceCells({ ...state.active, y: ghostY })) {
      const visibleY = cell.y - HIDDEN_ROWS;
      if (visibleY >= 0 && visibleY < VISIBLE_ROWS) drawCell(context, cell.x, visibleY, cellWidth, cellHeight, COLORS[state.active.type], 1, true);
    }
    for (const cell of getPieceCells(state.active)) {
      const visibleY = cell.y - HIDDEN_ROWS;
      if (visibleY >= 0 && visibleY < VISIBLE_ROWS) drawCell(context, cell.x, visibleY, cellWidth, cellHeight, COLORS[state.active.type]);
    }
  }

  if (state.status === "paused" || state.status === "game_over") {
    context.fillStyle = "rgba(4,8,17,.58)";
    context.fillRect(0, 0, bounds.width, bounds.height);
  }

  void BOARD_HEIGHT;
}

export function renderMiniBoard(canvas: HTMLCanvasElement, rows: number[], active?: { type: PieceType; x: number; y: number; rotation: 0 | 1 | 2 | 3 } | null): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(bounds.width * ratio);
  canvas.height = Math.round(bounds.height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  const cellWidth = bounds.width / 10;
  const cellHeight = bounds.height / VISIBLE_ROWS;
  context.fillStyle = "#0b1020";
  context.fillRect(0, 0, bounds.width, bounds.height);
  for (let y = HIDDEN_ROWS; y < BOARD_HEIGHT; y += 1) {
    const rowMask = rows[y] ?? 0;
    for (let x = 0; x < 10; x += 1) {
      if ((rowMask & (1 << x)) !== 0) drawCell(context, x, y - HIDDEN_ROWS, cellWidth, cellHeight, "#7788a9");
    }
  }
  if (active) {
    for (const cell of getPieceCells(active)) {
      const visibleY = cell.y - HIDDEN_ROWS;
      if (visibleY >= 0 && visibleY < VISIBLE_ROWS) drawCell(context, cell.x, visibleY, cellWidth, cellHeight, COLORS[active.type]);
    }
  }
}
