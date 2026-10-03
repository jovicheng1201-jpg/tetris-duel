import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { ActivePiece, EngineEvent, GameInput, GameState } from "../../game/engine/types";
import { useGameRuntime } from "../../game/runtime/useGameRuntime";
import BoardCanvas from "../../components/BoardCanvas";
import MiniBoard from "../../components/MiniBoard";
import TouchControls from "../../components/TouchControls";
import LanguagePicker from "../../components/LanguagePicker";
import type { RoomRealtime, RoomEvent } from "../realtime/RoomRealtime";
import { submitMatchResult, type RoomState } from "./roomService";
import { supabase } from "../../lib/supabase/client";

type Match = NonNullable<RoomState["match"]>;
type Winner = "player" | "opponent" | "draw";
type RemoteBoard = { boardRows: Uint16Array; active: ActivePiece | null; score: number; lines: number; level: number };

interface OnlineGameProps {
  roomId: string;
  roomCode: string;
  match: Match;
  seat: number;
  opponent: string;
  realtime: RoomRealtime;
  onRoomEvent: (handler: (event: RoomEvent) => void) => () => void;
  onRefresh: () => void;
  onLeave: () => void;
}

export default function OnlineGame(props: OnlineGameProps) {
  const { t } = useTranslation();
  const [winner, setWinner] = useState<Winner | null>(null);
  const [remoteBoard, setRemoteBoard] = useState<RemoteBoard | null>(null);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [saveState, setSaveState] = useState<"pending" | "saved" | "error">("pending");
  const sentResult = useRef(false);
  const remoteGameOver = useRef(false);
  const lastSeq = useRef(new Map<string, number>());
  const snapshotSending = useRef(false);
  const playerRef = useRef<GameState | null>(null);
  const startedRef = useRef(false);

  const onResult = useCallback((result: Winner, player: GameState) => {
    setWinner(result);
    if (!remoteGameOver.current && result !== "player") {
      void props.realtime.send("game_over", props.match.id, {
        reason: "top_out",
        score: player.stats.score,
        lines: player.stats.lines,
        level: player.stats.level,
        elapsedMs: player.stats.elapsedMs,
        attacksSent: player.stats.attacksSent,
        attacksReceived: player.stats.attacksReceived,
      }).catch(() => undefined);
    }
    if (sentResult.current || !supabase) return;
    sentResult.current = true;
    setSaveState("pending");
    const outcome = result === "draw" ? "draw" : result === "player" ? "win" : "loss";
    void submitMatchResult(supabase, props.match.id, {
      score: player.stats.score,
      lines_cleared: player.stats.lines,
      final_level: player.stats.level,
      elapsed_ms: player.stats.elapsedMs,
      attacks_sent: player.stats.attacksSent,
      attacks_received: player.stats.attacksReceived,
      outcome,
    }).then(() => {
      setSaveState("saved");
      props.onRefresh();
    }).catch(() => setSaveState("error"));
  }, [props.match.id, props.onRefresh, props.realtime]);

  const onEvent = useCallback((event: EngineEvent) => {
    if (event.type === "attack_created") {
      void props.realtime.send("attack", props.match.id, {
        attackId: event.id,
        lines: event.lines,
        holes: event.holes,
      }).catch(() => undefined);
    }
  }, [props.match.id, props.realtime]);

  const { runtime, player } = useGameRuntime({
    mode: "online_pvp",
    seed: props.match.seed,
    autoStart: false,
    onEvent,
    onResult,
  });
  playerRef.current = player;

  useEffect(() => {
    let alive = true;
    let started = false;
    const startAt = new Date(props.match.started_at ?? Date.now()).getTime();
    const update = () => {
      if (!alive || started) return;
      const left = startAt - Date.now();
      if (left <= 0) {
        started = true;
        startedRef.current = true;
        setCountdown(null);
        void props.realtime.setPresenceState("playing");
        runtime.start();
      } else {
        setCountdown(Math.ceil(left / 1000));
      }
    };
    update();
    const timer = window.setInterval(update, 100);
    return () => { alive = false; window.clearInterval(timer); };
  }, [props.match.id, props.match.started_at, props.realtime, runtime]);

  useEffect(() => {
    const unregister = props.onRoomEvent((event) => {
      if (event.matchId !== props.match.id) return;
      const prior = lastSeq.current.get(event.senderUserId) ?? -1;
      if (event.seq <= prior) return;
      lastSeq.current.set(event.senderUserId, event.seq);

      if (event.kind === "attack") {
        runtime.receiveAttack(event.attackId, event.holes);
      } else if (event.kind === "snapshot") {
        setRemoteBoard({ boardRows: Uint16Array.from(event.rows), active: event.active, score: event.score, lines: event.lines, level: event.level });
      } else if (event.kind === "game_over") {
        remoteGameOver.current = true;
        runtime.opponentLost();
      } else if (event.kind === "sync_request" && playerRef.current?.status === "playing") {
        const current = playerRef.current;
        void props.realtime.send("snapshot", props.match.id, {
          rows: Array.from(current.boardRows),
          active: current.active,
          hold: current.hold,
          score: current.stats.score,
          lines: current.stats.lines,
          level: current.stats.level,
          status: current.status,
        }).catch(() => undefined);
      }
    });
    void props.realtime.send("sync_request", props.match.id).catch(() => undefined);
    return unregister;
  }, [props.match.id, props.onRoomEvent, props.realtime, runtime]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = playerRef.current;
      if (!startedRef.current || snapshotSending.current || current?.status !== "playing") return;
      snapshotSending.current = true;
      void props.realtime.send("snapshot", props.match.id, {
        rows: Array.from(current.boardRows),
        active: current.active,
        hold: current.hold,
        score: current.stats.score,
        lines: current.stats.lines,
        level: current.stats.level,
        status: current.status,
      }).catch(() => undefined).finally(() => { snapshotSending.current = false; });
    }, 250);
    return () => window.clearInterval(timer);
  }, [props.match.id, props.realtime]);

  useEffect(() => {
    const keyToInput: Record<string, GameInput> = {
      ArrowLeft: "left", KeyA: "left",
      ArrowRight: "right", KeyD: "right",
      ArrowDown: "soft_drop", KeyS: "soft_drop",
      Space: "hard_drop", ArrowUp: "rotate_cw", KeyX: "rotate_cw",
      KeyZ: "rotate_ccw", KeyC: "hold", ShiftLeft: "hold", ShiftRight: "hold",
    };
    const down = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input,select,textarea,[contenteditable=true]")) return;
      const input = keyToInput[event.code];
      if (!input) return;
      event.preventDefault();
      if (!event.repeat || input === "left" || input === "right" || input === "soft_drop") runtime.press(input);
    };
    const up = (event: KeyboardEvent) => {
      const input = keyToInput[event.code];
      if (input) runtime.release(input);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [runtime]);

  const ended = winner !== null || player.status === "game_over";
  const winnerLabel = winner === "player" ? t("game.youWin") : winner === "draw" ? t("game.draw") : t("game.youLose");

  return (
    <main className="page-shell game-page">
      <header className="topbar game-topbar">
        <Link className="brand" to="/"><span className="brand-mark" aria-hidden="true">▦</span><span>{t("brand")}</span></Link>
        <div className="game-heading"><span className="live-dot" />{t("home.online")} <span className="versus-label">VS {props.opponent}</span></div>
        <div className="top-actions"><LanguagePicker /><button className="icon-link" onClick={props.onLeave} aria-label={t("room.leave")}>⌂</button></div>
      </header>
      <section className="lobby-card online-match-card">
        <div className="online-match-meta"><span>{t("room.code")}: <strong>{props.roomCode}</strong></span><span>{t("room.seat")} {props.seat}</span></div>
        <div className="room-match-layout">
          <div className="room-board-wrap">
            <div className="board-frame">
              <BoardCanvas state={player} label={t("game.boardLabel", { player: t("game.you") })} />
              {(countdown !== null || ended) && <div className="board-overlay"><div className="overlay-card result-overlay">
                {countdown !== null ? <><span className="result-icon">{countdown}</span><h2>{t("game.connecting")}</h2></>
                  : <><span className="result-icon">{winner === "player" ? "✦" : winner === "draw" ? "＝" : "▦"}</span><p className="eyebrow">{t("game.vsResult")}</p><h2>{winnerLabel}</h2><div className="result-score"><span>{t("game.score")}</span><strong>{player.stats.score.toLocaleString()}</strong></div><p className="casual-caption">{saveState === "pending" ? t("room.resultPending") : saveState === "saved" ? t("room.resultSaved") : t("errors.network")}</p></>}
              </div></div>}
            </div>
            <TouchControls onPress={(input) => runtime.press(input)} onRelease={(input) => runtime.release(input)} disabled={ended || countdown !== null} />
            <div className="online-player-stats"><span>{t("game.score")} <strong>{player.stats.score.toLocaleString()}</strong></span><span>{t("game.lines")} <strong>{player.stats.lines}</strong></span><span>{t("game.level")} <strong>{player.stats.level}</strong></span></div>
          </div>
          <aside className="online-opponent-column">
            <div className="opponent-heading"><span className="opponent-avatar">▣</span><span>{props.opponent}</span><span className="seat-caption">P{props.seat === 1 ? 2 : 1}</span></div>
            {remoteBoard ? <MiniBoard state={remoteBoard} label={t("game.boardLabel", { player: props.opponent })} /> : <div className="mini-board-placeholder">{t("game.waitingForOpponent")}</div>}
            <div className="opponent-stats"><span>{t("game.score")}</span><strong>{remoteBoard?.score.toLocaleString() ?? "—"}</strong></div>
            <div className="opponent-stats"><span>{t("game.lines")}</span><strong>{remoteBoard?.lines ?? "—"}</strong></div>
            <div className="preview-card hold-preview"><span className="stat-label">{t("game.level")}</span><strong className="stat-value stat-value-small">{String(remoteBoard?.level ?? 1).padStart(2, "0")}</strong></div>
          </aside>
        </div>
        <p className="keyboard-hint">← → {t("game.move")} · ↑ {t("game.rotate")} · Space {t("game.drop")} · C {t("game.hold")}</p>
      </section>
      <footer className="game-footer"><span>STACK ATTACK</span><span>{t("room.connected")}</span><span>{t("game.casual")}</span></footer>
    </main>
  );
}
