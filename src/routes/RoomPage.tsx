import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguagePicker from "../components/LanguagePicker";
import OnlineGame from "../features/rooms/OnlineGame";
import { ensureGuestSession } from "../features/auth/auth";
import { RoomRealtime, type PresencePlayer, type RoomEvent } from "../features/realtime/RoomRealtime";
import { loadRoomState, leaveRoom, requestRematch, setReady, startMatch, type RoomState } from "../features/rooms/roomService";
import { supabase } from "../lib/supabase/client";

function playerName(locale: string): string {
  const fallback = locale === "zh-TW" ? "玩家" : "Player";
  try { return localStorage.getItem("tetris.playerName") || fallback; } catch { return fallback; }
}

export default function RoomPage() {
  const { roomId = "" } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const client = supabase;
  const [room, setRoom] = useState<RoomState | null>(null);
  const roomRef = useRef<RoomState | null>(null);
  roomRef.current = room;
  const [userId, setUserId] = useState("");
  const [presence, setPresence] = useState<PresencePlayer[]>([]);
  const [connection, setConnection] = useState("CONNECTING");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [rematchWaiting, setRematchWaiting] = useState(false);
  const realtimeRef = useRef<RoomRealtime | null>(null);
  const childEventRef = useRef<((event: RoomEvent) => void) | null>(null);
  const refreshRef = useRef<() => Promise<void>>(async () => undefined);
  const registerChildEvent = useCallback((handler: (event: RoomEvent) => void) => {
    childEventRef.current = handler;
    return () => { childEventRef.current = null; };
  }, []);

  const refresh = useCallback(async () => {
    if (!client) return;
    const fresh = await loadRoomState(client, roomId);
    roomRef.current = fresh;
    setRoom(fresh);
    if (fresh.match?.status === "playing") setRematchWaiting(false);
    else if (fresh.members.some((member) => member.rematch_ready)) setRematchWaiting(true);
  }, [client, roomId]);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!client) {
      setError("SUPABASE_NOT_CONFIGURED");
      return;
    }
    let active = true;
    let channel: RoomRealtime | null = null;
    void (async () => {
      try {
        const id = await ensureGuestSession(client, playerName(i18n.language), i18n.language);
        const initial = await loadRoomState(client, roomId);
        if (!active) return;
        const own = initial.members.find((member) => member.user_id === id);
        if (!own) throw new Error("ROOM_ACCESS_DENIED");
        setUserId(id);
        setRoom(initial);
        roomRef.current = initial;
        channel = new RoomRealtime(client, roomId, id, playerName(i18n.language), own.seat, {
          onEvent: (event) => {
            if (event.kind === "player_joined" || event.kind === "ready" || event.kind === "start" || event.kind === "rematch" || event.kind === "game_over") {
              void refreshRef.current().catch(() => undefined);
            }
            childEventRef.current?.(event);
          },
          onPresence: (players) => { if (active) setPresence(players); },
          onStatus: (status) => { if (active) setConnection(status); },
          onInvalidMessage: () => { if (active) setError("INVALID_MESSAGE"); },
        });
        realtimeRef.current = channel;
        await channel.subscribe();
        if (!active) return;
        await refreshRef.current();
        if (own.seat === 2) void channel.send("player_joined", null).catch(() => undefined);
      } catch (reason) {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "ROOM_LOAD_FAILED");
      }
    })();
    return () => {
      active = false;
      realtimeRef.current = null;
      void channel?.close();
    };
  }, [client, roomId, i18n.language]);

  useEffect(() => {
    if (!client || !room) return;
    const heartbeat = window.setInterval(() => {
      void client.rpc("tetris_mark_presence_heartbeat", { p_room_id: roomId });
    }, 15000);
    const poll = room.match?.status !== "playing"
      ? window.setInterval(() => { void refreshRef.current().catch(() => undefined); }, 2500)
      : null;
    return () => { window.clearInterval(heartbeat); if (poll) window.clearInterval(poll); };
  }, [client, Boolean(room), room?.match?.status, roomId]);

  const me = room?.members.find((member) => member.user_id === userId);
  const isHost = Boolean(userId && room?.host_user_id === userId);
  const onlineIds = new Set(presence.map((player) => player.userId));

  const ready = async () => {
    if (!client || !room || !me) return;
    setBusy(true); setError("");
    try {
      await setReady(client, room.id, !me.is_ready);
      await realtimeRef.current?.send("ready", room.match?.id ?? null, { ready: !me.is_ready, seat: me.seat });
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "NETWORK_ERROR"); }
    finally { setBusy(false); }
  };

  const start = async () => {
    if (!client || !room) return;
    setBusy(true); setError("");
    try {
      const started = await startMatch(client, room.id);
      await realtimeRef.current?.send("start", started.match_id, {
        seed: started.seed, roundNo: started.round_no, rulesVersion: started.rules_version, serverStartAt: started.server_start_at,
      });
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "NETWORK_ERROR"); }
    finally { setBusy(false); }
  };

  const rematch = async () => {
    if (!client || !room?.match) return;
    setBusy(true); setError(""); setRematchWaiting(true);
    try {
      await requestRematch(client, room.id, room.match.id);
      await realtimeRef.current?.send("rematch", room.match.id, { requestId: crypto.randomUUID(), action: "request" });
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "NETWORK_ERROR"); setRematchWaiting(false); }
    finally { setBusy(false); }
  };

  const leave = async () => {
    if (!client || !room) { navigate("/online"); return; }
    setBusy(true);
    try {
      await leaveRoom(client, room.id);
      await realtimeRef.current?.close();
      navigate("/online", { replace: true });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "NETWORK_ERROR"); }
    finally { setBusy(false); }
  };

  const copyCode = async () => {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.room_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { setError("COPY_FAILED"); }
  };

  const connectionText = connection === "SUBSCRIBED" ? t("room.connected")
    : connection === "CONNECTING" || connection === "CLOSED" ? t("room.connecting")
      : t("room.reconnecting");
  const errorText = error === "SUPABASE_NOT_CONFIGURED" ? t("room.roomSetup")
    : error === "ROOM_ACCESS_DENIED" || error === "ROOM_NOT_FOUND" || error.includes("ROOM_") ? t("room.loadFailed")
      : error === "INVALID_MESSAGE" ? t("errors.invalidMessage")
        : error === "COPY_FAILED" ? t("room.copyFailed")
          : error ? t("errors.network") : "";

  if (room?.match?.status === "playing" && me && realtimeRef.current) {
    return (
      <OnlineGame
        roomId={room.id}
        roomCode={room.room_code}
        match={room.match}
        seat={me.seat}
        opponent={room.members.find((member) => member.user_id !== userId)?.display_name ?? t("game.waitingForOpponent")}
        realtime={realtimeRef.current}
        onRoomEvent={registerChildEvent}
        onRefresh={() => void refreshRef.current().catch(() => undefined)}
        onLeave={() => void leave()}
      />
    );
  }

  return (
    <main className="page-shell lobby-page">
      <header className="topbar">
        <Link className="brand" to="/"><span className="brand-mark" aria-hidden="true">▦</span><span>{t("brand")}</span></Link>
        <div className="top-actions"><Link className="quiet-link" to="/">{t("nav.home")}</Link><LanguagePicker /></div>
      </header>
      <section className="lobby-card room-card">
        <p className="eyebrow"><span className="eyebrow-dot" />{t("home.online")}</p>
        <h1>{room ? t("room.title") : t("room.connecting")}</h1>
        <p>{room?.match?.status === "finished" ? t("room.rematchWaiting") : t("room.share")}</p>
        {room && (
          <>
            <div className="room-code-display">
              <div><span className="stat-label">{t("room.code")}</span><strong>{room.room_code}</strong></div>
              <button className="secondary-button" onClick={() => void copyCode()}>{copied ? t("room.copied") : t("room.copy")}</button>
            </div>
            <div className="connection-state"><span className={"presence-badge " + (connection === "SUBSCRIBED" ? "is-online" : "")} />{connectionText}</div>
            <div className="room-players">
              {room.members.map((member) => {
                const online = onlineIds.has(member.user_id);
                return (
                  <div className="room-player" key={member.user_id}>
                    <span className="player-avatar">{member.seat === 1 ? "1" : "2"}</span>
                    <div className="room-player-info"><strong>{member.display_name}{member.user_id === userId ? " · " + t("game.you") : ""}</strong><small>{member.user_id === room.host_user_id ? t("room.host") : t("room.guest")} · {member.is_ready ? t("room.ready") : t("room.notReady")}</small></div>
                    <span className={"presence-badge " + (online ? "is-online" : "")}>{online ? t("room.online") : t("room.offline")}</span>
                  </div>
                );
              })}
              {room.members.length < 2 && <div className="room-player"><span className="player-avatar">2</span><div className="room-player-info"><strong>{t("game.waitingForOpponent")}</strong><small>{t("room.waiting")}</small></div><span className="presence-badge">{t("room.offline")}</span></div>}
            </div>
            {room.match?.status === "finished" ? (
              <div className="setup-note"><strong>{t("game.gameOver")}</strong><span>{rematchWaiting || room.members.some((member) => member.rematch_ready) ? t("room.rematchWaiting") : t("room.resultSaved")}</span></div>
            ) : null}
            <div className="room-buttons">
              {room.match?.status === "finished"
                ? <button className="primary-button" disabled={busy || rematchWaiting || room.members.some((member) => member.rematch_ready && member.user_id === userId)} onClick={() => void rematch()}>{t("room.rematch")}</button>
                : <button className={me?.is_ready ? "secondary-button" : "primary-button"} disabled={busy || !me || room.members.length < 2} onClick={() => void ready()}>{me?.is_ready ? t("room.notReady") : t("room.ready")}</button>}
              {room.match?.status !== "finished" && isHost && <button className="primary-button" disabled={busy || room.members.length !== 2 || !room.members.every((member) => member.is_ready)} onClick={() => void start()}>{t("room.start")}</button>}
              <button className="secondary-button" disabled={busy} onClick={() => void leave()}>{t("room.leave")}</button>
            </div>
          </>
        )}
        {errorText && <p className="lobby-error" role="alert">{errorText}</p>}
      </section>
      <footer className="home-footer"><span>STACK ATTACK</span><Link to="/online">{t("room.back")}</Link></footer>
    </main>
  );
}
