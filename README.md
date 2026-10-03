# Stack Attack / 方塊對決

A responsive browser Tetris game built with Vite, React, TypeScript, and Supabase.

## Requirements and setup

- Install Node.js LTS (npm is included).
- Install this project's dependencies with npm install.
- Copy .env.example to .env.local, then set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.
- In Supabase Auth settings, enable Anonymous Sign-ins.
- Apply supabase/migrations/202610030001_tetris_mvp.sql to your Supabase project.
- Start the development server with npm run dev.

## GitHub Pages deployment

The `.github/workflows/deploy-pages.yml` workflow builds and deploys on pushes to `main` or `master`, and can also be run manually. In repository Settings → Pages, select **GitHub Actions** as the publishing source. Add the non-secret repository Actions variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for online play; never add a service-role or secret key. The workflow derives the Vite base path from the repository name and publishes a `404.html` fallback for room links.

Solo play and AI matches work without Supabase. Online rooms and the cloud leaderboard need a configured Supabase project. The client uses only the publishable key; do not put a service-role key in .env.local.

## MVP features

- Solo endless play, three AI difficulty levels, and invite-code private rooms.
- Keyboard and touch controls, hold piece, ghost piece, score, level, and line tracking.
- Realtime Ready / Start countdown, presence, board snapshots, garbage attacks, results, and rematches.
- English and Traditional Chinese interface.
- Supabase guest sessions, PostgreSQL room / match / result / score records, RLS, and casual leaderboards.
- The existing interactive storybook remains available at /storybook/.

Online scores are player-reported casual results and are not cheat-proof. Realtime room messages are ephemeral; PostgreSQL stores room metadata and completed results, not every board frame.

## Commands

- npm run dev — local development server
- npm run build — strict TypeScript compilation and production build
- npm run preview — serve the production build locally

## 繁體中文安裝與啟動

1. 安裝 Node.js LTS（npm 已包含在 Node.js 中）。
2. 在專案根目錄執行 npm install。
3. 複製 .env.example 為 .env.local，填入 Supabase URL 與 Publishable Key。
4. 在 Supabase Auth 設定中啟用 Anonymous Sign-ins。
5. 套用 supabase/migrations/202610030001_tetris_mvp.sql。
6. 執行 npm run dev 啟動開發伺服器。

### GitHub Pages 部署

`.github/workflows/deploy-pages.yml` 會在推送到 `main` 或 `master` 時建置並部署，也可從 Actions 手動執行。請在 repository Settings → Pages 將發布來源設為 **GitHub Actions**。若要啟用線上對戰，請在 repository Actions variables 設定非機密的 `VITE_SUPABASE_URL` 與 `VITE_SUPABASE_PUBLISHABLE_KEY`；絕不可設定或提交 service-role／secret key。Workflow 會依 repository 名稱設定 Vite base path，並產生支援房間深層連結的 `404.html`。

未設定 Supabase 時仍可玩單人及 AI；線上房間與雲端排行榜需要 Supabase 專案。前端只使用 Publishable Key，不可將 Service Role Key 放進 .env.local。

## MVP 功能

- 單人無盡模式、三種 AI 難度、房間代碼邀請對戰。
- 鍵盤與觸控操作、暫存方塊、落點預覽、分數、等級與消行統計。
- 即時 Ready／倒數開始、在線狀態、盤面快照、攻擊行、結果與再戰。
- 英文與繁體中文介面。
- Supabase 訪客登入、PostgreSQL 房間／比賽／結果／分數資料、RLS 與休閒排行榜。
- 原有互動繪本保留於 /storybook/。

線上分數由客戶端回報，屬休閒紀錄，並非防作弊排名。Realtime 房間訊息是暫態資料；PostgreSQL 保存房間中繼資料與完成結果，不會逐格保存即時盤面。
