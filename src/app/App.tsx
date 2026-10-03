import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";

const HomePage = lazy(() => import("../routes/HomePage"));
const GamePage = lazy(() => import("../routes/GamePage"));
const LobbyPage = lazy(() => import("../routes/LobbyPage"));
const RoomPage = lazy(() => import("../routes/RoomPage"));
const LeaderboardPage = lazy(() => import("../routes/LeaderboardPage"));

export default function App() {
  const { t } = useTranslation();
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Suspense fallback={<main className="page-shell loading-state" role="status">{t("game.connecting")}</main>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/play/:mode" element={<GamePage />} />
          <Route path="/online" element={<LobbyPage />} />
          <Route path="/room/:roomId" element={<RoomPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
