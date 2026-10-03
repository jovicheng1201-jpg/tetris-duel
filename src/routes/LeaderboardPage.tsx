import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguagePicker from "../components/LanguagePicker";
import { supabase } from "../lib/supabase/client";
import { loadLeaderboard, type LeaderboardEntry } from "../features/leaderboard/leaderboardService";

type Tab = "solo" | "ai" | "online_pvp";

export default function LeaderboardPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("solo");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    void loadLeaderboard(supabase, tab)
      .then((result) => { if (active) setEntries(result); })
      .catch(() => { if (active) { setEntries([]); setError(true); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tab]);

  return (
    <main className="page-shell leaderboard-page">
      <header className="topbar">
        <Link className="brand" to="/"><span className="brand-mark" aria-hidden="true">▦</span><span>{t("brand")}</span></Link>
        <div className="top-actions"><Link className="quiet-link" to="/">{t("nav.home")}</Link><LanguagePicker /></div>
      </header>
      <section className="leaderboard-card">
        <p className="eyebrow"><span className="eyebrow-dot" />STACK ATTACK</p>
        <h1>{t("leaderboard.title")}</h1>
        <div className="leaderboard-tabs" role="tablist" aria-label={t("leaderboard.title")}>
          {(["solo", "ai", "online_pvp"] as const).map((mode) => (
            <button key={mode} role="tab" aria-selected={tab === mode} aria-pressed={tab === mode} onClick={() => setTab(mode)}>
              {mode === "solo" ? t("leaderboard.solo") : mode === "ai" ? t("leaderboard.ai") : t("leaderboard.online")}
            </button>
          ))}
        </div>
        {loading ? <p className="loading-state" role="status">{t("game.connecting")}</p>
          : error ? <p className="lobby-error" role="alert">{t("leaderboard.loadError")}</p>
            : entries.length === 0 ? <p className="empty-state">{t("leaderboard.empty")}</p>
              : (
                <div className="table-scroll">
                  <table className="leaderboard-table">
                    <thead><tr><th>{t("leaderboard.rank")}</th><th>{t("leaderboard.player")}</th><th>{t("leaderboard.best")}</th><th>{t("leaderboard.wins")}</th></tr></thead>
                    <tbody>
                      {entries.map((entry) => (
                        <tr key={entry.user_id}><td>{entry.rank.toString().padStart(2, "0")}</td><td>{entry.display_name}</td><td>{entry.best_score.toLocaleString()}</td><td>{entry.wins.toLocaleString()}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
        {tab === "online_pvp" && <p className="unverified-note">{t("leaderboard.unverified")}</p>}
      </section>
    </main>
  );
}
