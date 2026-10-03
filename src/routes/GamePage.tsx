import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BoardCanvas from "../components/BoardCanvas";
import MiniBoard from "../components/MiniBoard";
import TouchControls from "../components/TouchControls";
import LanguagePicker from "../components/LanguagePicker";
import { useGameRuntime } from "../game/runtime/useGameRuntime";
import type { GameInput, GameMode } from "../game/engine/types";
import { ensureGuestSession } from "../features/auth/auth";
import { createLocalMatch, submitMatchResult } from "../features/rooms/roomService";
import { supabase } from "../lib/supabase/client";

type Winner = "player" | "opponent" | "draw";

function savedName(locale: string): string {
  const fallback = locale === "zh-TW" ? "玩家" : "Player";
  try { return localStorage.getItem("tetris.playerName") || fallback; } catch { return fallback; }
}

export default function GamePage() {
  const { mode: routeMode } = useParams();
  const [search] = useSearchParams();
  const mode: GameMode = routeMode === "ai" ? "ai" : "solo";
  const difficulty = (["easy", "normal", "hard"].includes(search.get("difficulty") ?? "")
    ? search.get("difficulty")
    : "normal") as "easy" | "normal" | "hard";
  const { t, i18n } = useTranslation();
  const [winner, setWinner] = useState<Winner | null>(null);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const savedMatch = useRef<string | null>(null);
  const databaseMatch = useRef<{ seed: number; promise: Promise<string | null>; submitted: boolean } | null>(null);
  const onResult = useCallback((value: Winner) => setWinner(value), []);
  const { runtime, player, opponent } = useGameRuntime({ mode, difficulty, onResult });

  useEffect(() => {
    if (!supabase || databaseMatch.current?.seed === player.seed) return;
    const seed = player.seed;
    const promise = ensureGuestSession(supabase, savedName(i18n.language), i18n.language)
      .then(() => createLocalMatch(supabase!, mode, seed))
      .catch(() => null);
    databaseMatch.current = { seed, promise, submitted: false };
  }, [mode, player.seed]);

  useEffect(() => {
    const finished = player.status === "game_over" || winner !== null;
    if (!finished || !supabase) return;
    const entry = databaseMatch.current;
    if (!entry || entry.seed !== player.seed || entry.submitted) return;
    entry.submitted = true;
    const outcome = mode === "solo" ? "finished" : winner === "draw" ? "draw" : winner === "player" ? "win" : "loss";
    void entry.promise.then((matchId) => {
      if (!matchId) return;
      return submitMatchResult(supabase!, matchId, {
        score: player.stats.score,
        lines_cleared: player.stats.lines,
        final_level: player.stats.level,
        elapsed_ms: player.stats.elapsedMs,
        attacks_sent: player.stats.attacksSent,
        attacks_received: player.stats.attacksReceived,
        outcome,
      });
    });
  }, [mode, player.seed, player.status, player.stats, winner]);

  useEffect(() => {
    const keyToInput: Record<string, GameInput | "pause"> = {
      ArrowLeft: "left", KeyA: "left",
      ArrowRight: "right", KeyD: "right",
      ArrowDown: "soft_drop", KeyS: "soft_drop",
      Space: "hard_drop",
      ArrowUp: "rotate_cw", KeyX: "rotate_cw",
      KeyZ: "rotate_ccw",
      KeyC: "hold", ShiftLeft: "hold", ShiftRight: "hold",
      Escape: "pause",
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, select, textarea, [contenteditable=true]")) return;
      const input = keyToInput[event.code];
      if (!input) return;
      event.preventDefault();
      if (input === "pause") {
        if (!event.repeat) runtime.togglePause();
      } else if (!event.repeat || input === "left" || input === "right" || input === "soft_drop") {
        runtime.press(input);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const input = keyToInput[event.code];
      if (input && input !== "pause") runtime.release(input);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [runtime]);

  useEffect(() => {
    if (player.status !== "game_over" || savedMatch.current === String(player.seed)) return;
    savedMatch.current = String(player.seed);
    try {
      const key = "tetris.best." + mode;
      const previous = Number(localStorage.getItem(key) ?? 0);
      if (player.stats.score > previous) localStorage.setItem(key, String(player.stats.score));
    } catch {
      // Saving a personal best is optional.
    }
  }, [mode, player, player.stats.score, player.status, player.seed]);

  const title = mode === "ai" ? t("home.ai") : t("home.solo");
  const onPress = (input: GameInput) => runtime.press(input);
  const onRelease = (input: GameInput) => runtime.release(input);
  const reset = () => {
    setWinner(null);
    savedMatch.current = null;
    runtime.restart();
    setConfirmRestart(false);
  };
  const ended = player.status === "game_over" || winner !== null;
  const resultWinner = winner ?? (player.status === "game_over" ? "opponent" : null);

  return (
    <main className="page-shell game-page">
      <header className="topbar game-topbar">
        <Link className="brand" to="/" aria-label={t("nav.home")}>
          <span className="brand-mark" aria-hidden="true">▦</span><span>{t("brand")}</span>
        </Link>
        <div className="game-heading"><span className="live-dot" />{title}{mode === "ai" && <span className="versus-label">VS {t("game.ai")}</span>}</div>
        <div className="top-actions">
          <LanguagePicker />
          <Link className="icon-link" to="/" aria-label={t("game.home")}>⌂</Link>
        </div>
      </header>

      <section className={"game-layout " + (mode === "ai" ? "has-opponent" : "")}>
        <aside className="game-sidebar left-sidebar">
          <div className="stat-card score-card">
            <span className="stat-label">{t("game.score")}</span>
            <strong className="stat-value">{player.stats.score.toLocaleString()}</strong>
            <span className="score-spark" aria-hidden="true">✦</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">{t("game.level")}</span>
            <strong className="stat-value stat-value-small">{String(player.stats.level).padStart(2, "0")}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">{t("game.lines")}</span>
            <strong className="stat-value stat-value-small">{String(player.stats.lines).padStart(2, "0")}</strong>
          </div>
          <div className="preview-card hold-preview">
            <span className="stat-label">{t("game.hold")}</span>
            <strong className={"piece-token " + (player.hold ? "piece-" + player.hold.toLowerCase() : "")}>{player.hold ?? "—"}</strong>
          </div>
          {opponent && (
            <div className="opponent-card">
              <div className="opponent-heading"><span className="opponent-avatar">▣</span><span>{t("game.ai")}</span></div>
              <MiniBoard state={opponent} label={t("game.boardLabel", { player: t("game.ai") })} />
              <div className="opponent-stats"><span>{t("game.score")}</span><strong>{opponent.stats.score.toLocaleString()}</strong></div>
              <div className="opponent-stats"><span>{t("game.lines")}</span><strong>{opponent.stats.lines}</strong></div>
            </div>
          )}
        </aside>

        <section className="board-column" aria-label={title}>
          <div className="board-frame">
            <BoardCanvas state={player} label={t("game.boardLabel", { player: t("game.you") })} />
            {player.status === "paused" && !ended && (
              <div className="board-overlay">
                <div className="overlay-card"><span className="overlay-icon">Ⅱ</span><h2>{t("game.paused")}</h2><button className="primary-button" onClick={() => runtime.resume()}>{t("game.resume")}</button></div>
              </div>
            )}
            {ended && (
              <div className="board-overlay">
                <div className="overlay-card result-overlay">
                  <span className="result-icon" aria-hidden="true">{resultWinner === "player" ? "✦" : resultWinner === "draw" ? "＝" : "▦"}</span>
                  <p className="eyebrow">{mode === "ai" ? t("game.vsResult") : t("game.gameOver")}</p>
                  <h2>{resultWinner === "player" ? t("game.youWin") : resultWinner === "draw" ? t("game.draw") : mode === "ai" ? t("game.youLose") : t("game.gameOver")}</h2>
                  <div className="result-score"><span>{t("game.score")}</span><strong>{player.stats.score.toLocaleString()}</strong></div>
                  <p className="casual-caption">{t("game.casual")}</p>
                  <button className="primary-button result-button" onClick={reset}>{t("game.playAgain")} <span aria-hidden="true">→</span></button>
                </div>
              </div>
            )}
            <span className="board-corner corner-tl" />
            <span className="board-corner corner-br" />
          </div>
          <TouchControls onPress={onPress} onRelease={onRelease} disabled={ended || player.status !== "playing"} />
          <p className="keyboard-hint">← → {t("game.move")} · ↑ {t("game.rotate")} · Space {t("game.drop")} · C {t("game.hold")}</p>
        </section>

        <aside className="game-sidebar right-sidebar">
          <div className="preview-card next-preview">
            <span className="stat-label">{t("game.next")}</span>
            <div className="next-list">
              {player.nextQueue.slice(0, 5).map((piece, index) => (
                <span key={index} className={"piece-token piece-" + piece.toLowerCase()}>{piece}</span>
              ))}
            </div>
          </div>
          <button className="control-card" onClick={() => runtime.togglePause()} disabled={ended}>
            <span className="control-icon">{player.status === "paused" ? "▶" : "Ⅱ"}</span>
            <span>{player.status === "paused" ? t("game.resume") : t("game.pause")}</span>
          </button>
          <button className="control-card" onClick={() => setConfirmRestart(true)} disabled={ended}>
            <span className="control-icon">↻</span><span>{t("game.restart")}</span>
          </button>
          <div className="tips-card">
            <span className="tips-star">✳</span>
            <p>{t("game.tip")}</p>
          </div>
        </aside>
      </section>

      {confirmRestart && (
        <div className="modal-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) setConfirmRestart(false); }}>
          <section className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="restart-title">
            <span className="dialog-icon">↻</span><h2 id="restart-title">{t("game.restartConfirm")}</h2>
            <div className="dialog-actions">
              <button className="secondary-button" onClick={() => setConfirmRestart(false)}>{t("game.cancel")}</button>
              <button className="primary-button" onClick={reset}>{t("game.restart")}</button>
            </div>
          </section>
        </div>
      )}
      <footer className="game-footer"><span>STACK ATTACK</span><span>{savedName(i18n.language)}</span><span>{mode === "ai" ? t("game." + difficulty) : t("game.localBest")}</span></footer>
    </main>
  );
}
