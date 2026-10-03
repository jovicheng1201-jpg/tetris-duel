import { useEffect, useRef } from "react";
import type { GameState } from "../game/engine/types";
import { renderMiniBoard } from "../game/runtime/CanvasRenderer";

export default function MiniBoard({ state, label }: { state: Pick<GameState, "boardRows" | "active">; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let frame = 0;
    let active = true;
    const draw = () => {
      if (!active) return;
      const current = stateRef.current;
      renderMiniBoard(canvas, Array.from(current.boardRows), current.active);
      frame = requestAnimationFrame(draw);
    };
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    draw();
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);
  return <canvas ref={canvasRef} className="mini-board" role="img" aria-label={label} />;
}
