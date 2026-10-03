import { useEffect, useRef } from "react";
import type { GameState } from "../game/engine/types";
import { renderBoard } from "../game/runtime/CanvasRenderer";
import { useTranslation } from "react-i18next";

export default function BoardCanvas({ state, label }: { state: GameState; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const { t } = useTranslation();
  stateRef.current = state;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let frame = 0;
    let active = true;
    const draw = () => {
      if (!active) return;
      renderBoard(canvas, stateRef.current);
      frame = requestAnimationFrame(draw);
    };
    const observer = new ResizeObserver(() => renderBoard(canvas, stateRef.current));
    observer.observe(canvas);
    draw();
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const active = state.active ? t("game.pieceName", { piece: state.active.type }) : t("game.noPiece");
  return (
    <canvas
      ref={canvasRef}
      className="board-canvas"
      role="img"
      aria-label={label + ". " + t("game.score") + ": " + state.stats.score + ". " + t("game.lines") + ": " + state.stats.lines + ". " + active}
    />
  );
}
