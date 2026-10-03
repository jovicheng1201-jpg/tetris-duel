import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguagePicker from "../components/LanguagePicker";
import { supabase, supabaseConfigured } from "../lib/supabase/client";
import { createRoom, joinRoom } from "../features/rooms/roomService";

function playerName(locale: string): string {
  const fallback = locale === "zh-TW" ? "玩家" : "Player";
  try { return localStorage.getItem("tetris.playerName") || fallback; } catch { return fallback; }
}

export default function LobbyPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const create = async () => {
    if (!supabase) return;
    setBusy(true);
    setError("");
    try {
      const room = await createRoom(supabase, playerName(i18n.language), i18n.language);
      navigate("/room/" + room.roomId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("errors.network"));
    } finally {
      setBusy(false);
    }
  };

  const join = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    try {
      const room = await joinRoom(supabase, code, playerName(i18n.language), i18n.language);
      navigate("/room/" + room.roomId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("room.joinFailed"));
    } finally {
      setBusy(false);
    }
  };

  const message = error === "ROOM_CODE_INVALID"
    ? t("errors.invalidCode")
    : error === "ROOM_NOT_FOUND" || error === "ROOM_FULL" || error === "ROOM_EXPIRED" || error.includes("ROOM_")
      ? t("room.joinFailed")
      : error === "Guest sign in failed"
        ? t("errors.authRequired")
        : error
          ? t("errors.network")
          : "";

  return (
    <main className="page-shell lobby-page">
      <header className="topbar">
        <Link className="brand" to="/"><span className="brand-mark" aria-hidden="true">▦</span><span>{t("brand")}</span></Link>
        <div className="top-actions"><Link className="quiet-link" to="/">{t("nav.home")}</Link><LanguagePicker /></div>
      </header>
      <section className="lobby-card">
        <p className="eyebrow"><span className="eyebrow-dot" />{t("home.online")}</p>
        <h1>{t("room.title")}</h1>
        <p>{t("room.subtitle")}</p>

        {!supabaseConfigured && (
          <aside className="setup-note">
            <strong>{t("room.roomUnavailable")}</strong>
            <span>{t("room.roomSetup")}</span>
          </aside>
        )}

        <div className="room-actions">
          <section className="room-action-card">
            <span className="mode-icon" aria-hidden="true">⌁</span>
            <h2>{t("room.create")}</h2>
            <p>{t("room.share")}</p>
            <button className="primary-button" disabled={!supabase || busy} onClick={() => void create()}>
              {busy ? t("game.connecting") : t("room.create")}
            </button>
          </section>
          <form className="room-action-card" onSubmit={(event) => void join(event)}>
            <span className="mode-icon" aria-hidden="true">↗</span>
            <h2>{t("room.join")}</h2>
            <label className="form-field">
              <span>{t("room.code")}</span>
              <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))} placeholder={t("room.codePlaceholder")} maxLength={10} autoCapitalize="characters" />
            </label>
            <button className="secondary-button" type="submit" disabled={!supabase || busy || code.length !== 10}>
              {busy ? t("game.connecting") : t("room.join")}
            </button>
          </form>
        </div>
        {message && <p className="lobby-error" role="alert">{message}</p>}
        <p className="casual-caption">{t("leaderboard.unverified")}</p>
      </section>
      <footer className="home-footer"><span>STACK ATTACK · {t("game.casual")}</span><a href="/storybook/">{t("nav.storybook")} ↗</a></footer>
    </main>
  );
}
