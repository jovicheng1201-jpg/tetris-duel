import { useCallback, useEffect, useRef, useState } from "react";
import { GameRuntime, type RuntimeOptions } from "./GameRuntime";
import type { EngineEvent, GameMode, GameState } from "../engine/types";

export interface UseGameRuntimeOptions {
  mode: GameMode;
  seed?: number;
  difficulty?: RuntimeOptions["difficulty"];
  autoStart?: boolean;
  onEvent?: (event: EngineEvent) => void;
  onResult?: RuntimeOptions["onResult"];
}

export function useGameRuntime(options: UseGameRuntimeOptions) {
  const runtimeRef = useRef<GameRuntime | null>(null);
  const callbacks = useRef({ onEvent: options.onEvent, onResult: options.onResult });
  callbacks.current = { onEvent: options.onEvent, onResult: options.onResult };
  const [, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((value) => value + 1), []);

  if (!runtimeRef.current) {
    runtimeRef.current = new GameRuntime({
      mode: options.mode,
      seed: options.seed,
      difficulty: options.difficulty,
      autoStart: options.autoStart,
      onChange: refresh,
      onEvent: (event) => callbacks.current.onEvent?.(event),
      onResult: (winner, player, opponent) => callbacks.current.onResult?.(winner, player, opponent),
    });
  }

  const runtime = runtimeRef.current;
  useEffect(() => {
    if (options.autoStart !== false) runtime.start();
    return () => runtime.destroy();
  }, [runtime, options.autoStart]);

  return {
    runtime,
    player: runtime.player as GameState,
    opponent: runtime.opponent as GameState | null,
    refresh,
  };
}
