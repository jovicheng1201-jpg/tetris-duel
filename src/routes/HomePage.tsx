import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguagePicker from "../components/LanguagePicker";

function savedName(): string {
  try {
    return localStorage.getItem("tetris.playerName") ?? "";
  } catch {
    return "";
  }
}

function bestScore(mode: "solo" | "ai"): number {
  try {
    return Number(localStorage.getItem("tetris.best." + mode) ?? 0);
  } catch {
    return 0;
  }
}

export default function HomePage() {
  const { t } = useTranslation();
  const [name, setName] = useState(savedName);
  const [difficulty, setDifficulty] = useState("normal");

  useEffect(() => {
    try {
      localStorage.setItem("tetris.playerName", name.slice(0, 20));
      localStorage.setItem("tetris.aiDifficulty", difficulty);
    } catch {
      // Local preferences are optional.
    }
  }, [name, difficulty]);

  return (
    <main className="page-shell home-page">
      <header className="topbar">
        <Link className="brand" to="/" aria-label={t("nav.home")}>
          <span className="brand-mark" aria-hidden="true">▦</span>
          <span>{t("brand")}</span>
        </Link>
        <nav className="top-actions" aria-label={t("home.mainNavigation")}>
          <Link className="quiet-link desktop-link" to="/leaderboard">{t("nav.leaderboard")}</Link>
          <a className="quiet-link desktop-link" href="/storybook/">{t("nav.storybook")}</a>
          <LanguagePicker />
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" />{t("home.eyebrow")}</p>
          <h1>{t("home.title")}</h1>
          <p className="hero-subtitle">{t("home.subtitle")}</p>
          <label className="name-field">
            <span>{t("home.playerName")}</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value.slice(0, 20))}
              placeholder={t("home.namePlaceholder")}
              maxLength={20}
              autoComplete="nickname"
            />
          </label>
          <p className="offline-note"><span aria-hidden="true">✦</span> {t("home.offlineNote")}</p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="hero-piece piece-t">T</div>
          <div className="hero-piece piece-i">I</div>
          <div className="hero-piece piece-o">O</div>
          <div className="hero-piece piece-l">L</div>
          <div className="hero-spark spark-one">✦</div>
          <div className="hero-spark spark-two">✧</div>
          <div className="hero-floor" />
        </div>
      </section>

      <section className="mode-section" aria-label={t("home.gameModes")}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("home.chooseMode")}</p>
            <h2>{t("home.playTitle")}</h2>
          </div>
          <Link className="quiet-link" to="/leaderboard">{t("nav.leaderboard")} <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="mode-grid">
          <Link className="mode-card mode-solo" to="/play/solo">
            <span className="mode-icon" aria-hidden="true">▤</span>
            <span className="mode-title">{t("home.solo")}</span>
            <span className="mode-hint">{t("home.soloHint")}</span>
            <span className="mode-score">{t("home.topScore")}: <strong>{bestScore("solo").toLocaleString()}</strong></span>
            <span className="mode-arrow" aria-hidden="true">↗</span>
          </Link>
          <div className="mode-card mode-ai">
            <span className="mode-icon" aria-hidden="true">◈</span>
            <span className="mode-title">{t("home.ai")}</span>
            <span className="mode-hint">{t("home.aiHint")}</span>
            <label className="difficulty-picker">
              <span>{t("game.difficulty")}</span>
              <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                <option value="easy">{t("game.easy")}</option>
                <option value="normal">{t("game.normal")}</option>
                <option value="hard">{t("game.hard")}</option>
              </select>
            </label>
            <Link className="card-play" to={"/play/ai?difficulty=" + difficulty}>{t("home.challenge")} <span aria-hidden="true">→</span></Link>
            <span className="mode-score">{t("home.topScore")}: <strong>{bestScore("ai").toLocaleString()}</strong></span>
          </div>
          <Link className="mode-card mode-online" to="/online">
            <span className="mode-icon" aria-hidden="true">⌁</span>
            <span className="mode-title">{t("home.online")}</span>
            <span className="mode-hint">{t("home.onlineHint")}</span>
            <span className="mode-tag"><i /> {t("room.privateRoom")}</span>
            <span className="mode-arrow" aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>

      <footer className="home-footer">
        <span>STACK ATTACK <span className="footer-separator">·</span> {t("home.friendly")}</span>
        <a href="/storybook/">{t("nav.storybook")} <span aria-hidden="true">↗</span></a>
      </footer>
    </main>
  );
}
