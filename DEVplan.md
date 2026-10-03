# Tetris 對戰遊戲：工程開發計畫

文件版本：v1.0  
產品形態：響應式 Web 遊戲，可選擇以 PWA 加入主畫面  
前端：Vite、React、TypeScript（strict）  
後端：Supabase Auth、PostgreSQL、Realtime Broadcast、Realtime Presence、Database Functions；需要時使用 Edge Functions  
目標裝置：iPhone、iPad、Android 手機／平板、Windows／macOS／Linux 桌面瀏覽器  
本文件用途：可直接拆分工程工作的產品規格、資料契約、程式架構、驗收與分階段交付依據。

---

## 1. 產品目標與已知基線

### 1.1 產品目標

提供一款可跨裝置遊玩的俄羅斯方塊遊戲，首版支援單人無盡模式、玩家對 AI、兩名玩家透過房間代碼連線對戰。

連線模式以 Supabase Realtime Broadcast 傳送 Ready、Start、攻擊行、盤面 Snapshot、Game Over 和 Rematch 事件；以 Presence 顯示房間玩家在線或暫時離線狀態；以 PostgreSQL 儲存玩家公開資料、房間、比賽結果及排行榜資料。即時遊戲迴圈在瀏覽器端執行，不把每個方塊移動寫入資料庫。

### 1.2 工作區現況與遷移範圍

目前工作區包含以原生 HTML、JavaScript、CSS 製作的互動繪本，主要入口為 index.html、app.js 與 styles.css；尚無 Vite／React／TypeScript 專案骨架。現有 app.js 已有英文及繁體中文文字結構。

本計畫將 Tetris 定義為新的遊戲應用程式。Phase 0 要先決定路由與既有繪本的放置方式，再建立 Vite 專案入口；搬移前先保留既有故事頁及 assets，不在此計畫階段直接刪除內容。若繪本仍需留在同一網站，可安排在 /storybook 路由；若遊戲取代現有入口，則以獨立提交或分支保留繪本版本。

本遊戲本身不加入故事劇情。介面須預留英文與繁體中文，所有按鈕、錯誤訊息、房間狀態、角色名稱及對戰結果不得硬編碼在 React 元件中。切換語言不得重置棋盤、比賽狀態或目前房間。

### 1.3 產品原則

- 遊戲規則由純 TypeScript 模組實作，不依賴 React、DOM 或 Supabase。
- 單人與 AI 對戰不依賴網路；線上對戰需要 Supabase Auth session 和 Realtime 連線。
- PostgreSQL 保存可恢復的房間／比賽中繼資料與結果；Broadcast 傳送低延遲、可丟棄或可重新同步的遊戲事件。
- Presence 只負責目前連線狀態，不當成持久玩家資料或比分資料。
- 網路訊息、Local Storage、IndexedDB 和 URL 參數均視為不可信輸入，進入核心遊戲或資料庫前需解析和驗證。
- UI 適用兒童及一般玩家：文字簡單、按鈕大、操作結果清楚，不以暴力、危險或驚嚇內容包裝失敗狀態。
- 首版以 Casual 對戰為主。瀏覽器客戶端送出的比分不能視為防作弊的權威證據；排行榜須標示資料信任等級，正式 Ranked 模式列為後續里程碑。

---

## 2. 首版功能範圍與非目標

### 2.1 MVP 必須具備

- 首頁選擇單人、玩家對 AI、線上房間及排行榜。
- 10 欄、20 列可見棋盤，另有隱藏生成列。
- 七種標準 Tetromino、連續消列、計分、等級與方塊落速。
- 鍵盤與觸控操作；手機及平板可只用觸控完成整局。
- Pause／Resume、Restart、回到首頁，以及 Game Over 後重玩。
- AI 對手能選擇落點、消列及發送攻擊行。
- 線上建立房間、以代碼加入、Ready、倒數 Start、在線狀態、雙方盤面快照、垃圾行攻擊、Game Over、Rematch、重新連線。
- 英文和繁體中文覆蓋所有可見文字；切換語言不重置遊戲。
- Supabase Auth 匿名玩家 session，允許玩家先建立／加入房間而不註冊傳統帳號。是否啟用匿名登入需在 Supabase 專案設定確認。
- 玩家公開名稱、房間、比賽結果、聚合排行榜以 PostgreSQL 保存。
- RLS、Realtime 私有頻道授權、輸入驗證及 DB function 權限。
- 桌面、手機直向／橫向、平板尺寸的版面驗收。

### 2.2 首版不包含

- 觀戰者、排位媒合、公開房間大廳或好友系統。
- 語音／文字聊天。
- 付費道具、廣告、虛擬貨幣。
- 每次按鍵都上傳資料庫或把資料庫當作 60 FPS 遊戲伺服器。
- 將 Realtime Broadcast 訊息當作可靠永久訊息佇列。
- 保證客戶端回報的每一筆分數都防作弊。
- App Store／Google Play 原生包裝；首版為瀏覽器遊戲，PWA 安裝能力可在 Phase 5 加入。
- 排位賽、具獎品或金錢價值的競技功能。

---

## 3. 遊戲規則

規則集中在 src/game/engine/rules.ts，並以 rulesVersion 傳入比賽紀錄。調整規則時遞增 rulesVersion，讓歷史比分可以辨識所用版本。

### 3.1 棋盤與方塊

- 棋盤寬 10 格；畫面可見高度 20 格，另保留 2 列隱藏生成區，邏輯高度共 22 列。
- 七種方塊 I、O、T、S、Z、J、L，以 4×4 或對應形狀矩陣表示。
- 使用 7-bag 隨機器：每袋包含七種方塊各一枚，袋內用 Fisher–Yates shuffle 排序；袋空時補下一袋。
- 線上同一場比賽兩位玩家收到相同 seed 與 rulesVersion，各自以相同確定性隨機演算法建立相同方塊順序。
- 新方塊無法放入棋盤時 Game Over。
- 落地投影（ghost piece）顯示目前方塊的預計落點。
- 每個方塊可 Hold 一次；該方塊鎖定後才能再次 Hold。
- MVP 支援順時針及逆時針旋轉；採固定 wall-kick offset 清單，先實作並測試自己的簡化 kick 規則。完整 SRS 可作為後續規則版本，不假設兩份規則可以混用。

### 3.2 重力、鎖定與計分

- 每 10 條消除行數升一級。
- 初版重力間隔：level 1 約 1000 ms；升級後使用明確的落速表或公式，最低限制 80 ms。數值集中在 GameRules，不散落在動畫程式。
- 方塊抵達地面或其他方塊時開始 500 ms lock delay。移動或旋轉可重置 lock delay，但同一方塊最多重置 15 次，避免無限懸停。
- 消行計分：單行 100、雙行 300、三行 500、四行 800，再乘以消行前的 level。
- Soft drop 每向下移動一格加 1 分；Hard drop 每向下移動一格加 2 分。
- Level = 1 + floor(totalLines / 10)。
- 首版不計算 T-spin，也不使用競賽等級的 back-to-back 系統，以便雙語說明與測試保持簡單。
- 所有計分函式使用整數；畫面格式化與千分位文字由 UI 層負責。

### 3.3 對戰攻擊規則

清行產生的攻擊行：

| 本次清行 | 攻擊行數 |
|---:|---:|
| 0 | 0 |
| 1 | 0 |
| 2 | 1 |
| 3 | 2 |
| 4 | 4 |

- 連續兩次以上消行可各加 1 combo 攻擊行；combo 在未消行時歸零。MVP 是否開啟 combo 需透過 GameRules 設定，測試固定預期值。
- 首版採簡單抵銷：先以本次產生的攻擊抵銷自己尚未送出的 incoming garbage queue，剩餘攻擊再送給對手。
- 對手收到垃圾行後由底部推入，最上方一格作為洞。hole 欄位必須介於 0 至 9；同一攻擊的行數與洞位置陣列長度必須一致。
- AI 使用相同消行與攻擊規則。
- 線上 PvP 任一方盤面頂出時發送 game_over。若雙方在同一伺服器時間窗口都報 Game Over，由比賽 finalize RPC 以最後有效事件和預先定義的平手規則裁定；MVP 平手規則為平手，不以兩個客戶端收到訊息的先後猜勝負。
- 單人和 PvAI 達到 Game Over 後顯示最終分數、消行數、等級與再玩一次按鈕。

### 3.4 模式行為

| 模式 | 遊戲流程 | 是否需要網路 | 結果保存 |
|---|---|---:|---|
| 單人 | 建立本機盤面，玩家持續消行，Game Over 可重玩 | 否 | 可先存 local best；登入後可上傳 casual 分數 |
| 玩家 vs AI | 玩家與 AI 同時遊玩，彼此攻擊；先頂出者落敗 | 否 | 本機統計；有登入時送出 Casual 結果 |
| 線上 PvP | 建立／加入房間、兩人準備、同步倒數、即時攻擊和盤面更新 | 是 | PostgreSQL 比賽結果與排行榜統計 |

離線遊玩不要求 Supabase session。需要線上房間、永久玩家名稱或伺服器排行榜時，才要求 Auth session。

---

## 4. 畫面、流程與跨裝置處理

### 4.1 畫面清單

1. Home：模式選擇、語言、排行榜入口、登入／訪客狀態。
2. Game：棋盤、分數、下一塊、Hold、等級、暫停／重新開始、操作說明。
3. Lobby：建立房間、輸入房間代碼、錯誤與連線狀態。
4. Room：房間代碼、玩家席位、Presence 在線狀態、Ready 狀態、離開房間。
5. Countdown：開始倒數、雙方狀態，只有成功讀取比賽 seed 才開始。
6. Online Game：自己的完整棋盤、對手縮小棋盤、兩邊分數與狀態、連線狀態。
7. Result：勝負／平手、雙方比分、Rematch、離開房間、再玩一次。
8. Leaderboard：單人、AI、PvP 分類；Casual 與 Verified／Ranked 標籤不可混為同一排行。
9. Settings：語言、音效、操作說明、是否啟用震動（裝置支援時）。

### 4.2 狀態機

首頁路由狀態：

    home
      -> solo_game
      -> ai_game
      -> online_lobby
      -> online_room
      -> online_countdown
      -> online_game
      -> match_result
      -> leaderboard

遊戲狀態：

    ready -> countdown -> playing -> paused -> playing
                                -> game_over -> result

- 單人及 AI 模式可 Pause。
- 線上對戰不提供單方暫停；切到背景時將 Presence 狀態改為 away，UI 提示連線中斷或背景執行限制。回前景時以 monotonic clock 的小幅 dt 上限恢復，不補算數分鐘的重力時間。
- 使用者按 Restart 時清除本局暫存、建立新 seed，先顯示確認或二段式操作避免誤觸。
- 重新整理頁面後，Solo／AI 可從 IndexedDB 讀回最近一次存檔（若該階段已實作）；線上局面只能還原自己的本機 checkpoint，並由對手傳回目前 snapshot。資料庫不存每幀棋盤。
- 語言切換只更新文案，不重新建立 game state、room state 或 Auth session。

### 4.3 桌面與觸控操作

桌面預設鍵位：

| 動作 | 鍵位 |
|---|---|
| 左移／右移 | ←／→ 或 A／D |
| Soft drop | ↓ 或 S |
| Hard drop | Space |
| 順時針旋轉 | ↑ 或 X |
| 逆時針旋轉 | Z |
| Hold | C 或 Shift |
| Pause | Escape |

- 只在遊戲區域或遊戲已取得鍵盤操作焦點時攔截方向鍵與 Space，避免首頁或表單無法使用。
- 長按左右移動需有 DAS（初始延遲）和 ARR（重複間隔）；參數可由 GameRules 或 InputConfig 控制。
- 觸控版提供明確的大型方向、旋轉、Soft drop、Hard drop、Hold 控制鈕；不要求只靠手勢，也不把旋轉與 Hard drop 綁在容易誤觸的單一區域。
- 每個主要觸控目標至少 48×48 CSS px，按下／持續按住／禁用狀態有清楚視覺差異。
- 支援單手直向；平板及桌面使用更寬的版面。橫向時重新分配棋盤與按鈕空間，不裁切底部控制列。
- 只在觸控控制區設定 touch-action，遊戲外頁面仍可正常捲動。

### 4.4 響應式與可讀性

- 棋盤使用 Canvas 2D 或 CSS Grid；MVP 建議 Canvas 2D，避免 200 個格子元件在高頻更新時造成 React 重繪。
- Canvas 寬高依 10 欄、22 列和可用容器計算；依 devicePixelRatio 設定 backing store，CSS 尺寸維持邏輯比例。
- 手機 PvP：自己棋盤保持可操作大小，對手盤面縮小顯示在上方或可展開區；平板／桌面可以左右並列。
- 使用 100dvh／safe-area inset 或等效處理 iOS Safari 瀏海、Home Indicator 和動態網址列。最低支援寬度 320 CSS px。
- 任何語系、超長名稱或錯誤訊息都要自動換行或截斷加提示；不得覆蓋棋盤與控制鈕。
- Canvas 的替代文字和旁邊的文字狀態區要讀出目前分數、等級、活動方塊、連線及遊戲狀態；重要結果用 aria-live="polite" 通知。
- Focus 樣式可見，禁用狀態有文字或語義屬性，不單靠顏色區分。
- 頭像缺失使用 initials 或預設圖示，圖片載入失敗不得遮住棋盤。
- 提供 prefers-reduced-motion 支援，避免快速閃爍，提供音效開關，設定足夠文字對比。

---

## 5. 程式架構與目錄建議

TypeScript 使用 strict、noUncheckedIndexedAccess 等嚴格設定。遊戲規則以純模組測試，UI、Supabase、遊戲迴圈透過介面組合。

    project/
    ├─ index.html
    ├─ package.json
    ├─ package-lock.json
    ├─ vite.config.ts
    ├─ tsconfig.json
    ├─ .env.example
    ├─ supabase/
    │  ├─ config.toml
    │  ├─ migrations/
    │  ├─ seed.sql
    │  ├─ functions/
    │  │  └─ tetris-submit-result/
    │  └─ tests/
    ├─ src/
    │  ├─ main.tsx
    │  ├─ app/
    │  │  ├─ App.tsx
    │  │  ├─ router.tsx
    │  │  └─ providers/
    │  ├─ routes/
    │  │  ├─ HomePage.tsx
    │  │  ├─ GamePage.tsx
    │  │  ├─ LobbyPage.tsx
    │  │  ├─ RoomPage.tsx
    │  │  ├─ ResultPage.tsx
    │  │  └─ LeaderboardPage.tsx
    │  ├─ game/
    │  │  ├─ engine/
    │  │  │  ├─ types.ts
    │  │  │  ├─ rules.ts
    │  │  │  ├─ random.ts
    │  │  │  ├─ pieces.ts
    │  │  │  ├─ board.ts
    │  │  │  ├─ collision.ts
    │  │  │  ├─ rotation.ts
    │  │  │  ├─ scoring.ts
    │  │  │  ├─ attacks.ts
    │  │  │  ├─ engine.ts
    │  │  │  └─ ai.ts
    │  │  ├─ runtime/
    │  │  │  ├─ GameLoop.ts
    │  │  │  ├─ InputController.ts
    │  │  │  ├─ CanvasRenderer.ts
    │  │  │  └─ useGameRuntime.ts
    │  │  └─ persistence/
    │  │     └─ localGameStore.ts
    │  ├─ features/
    │  │  ├─ auth/
    │  │  ├─ rooms/
    │  │  ├─ realtime/
    │  │  ├─ results/
    │  │  └─ leaderboard/
    │  ├─ components/
    │  │  ├─ GameBoard.tsx
    │  │  ├─ BoardCanvas.tsx
    │  │  ├─ TouchControls.tsx
    │  │  ├─ ScorePanel.tsx
    │  │  ├─ NextQueue.tsx
    │  │  ├─ OpponentPanel.tsx
    │  │  ├─ ConnectionBanner.tsx
    │  │  ├─ LanguagePicker.tsx
    │  │  └─ Modal.tsx
    │  ├─ lib/
    │  │  ├─ supabase/
    │  │  │  ├─ client.ts
    │  │  │  ├─ database.types.ts
    │  │  │  └─ realtime.types.ts
    │  │  ├─ i18n/
    │  │  │  ├─ index.ts
    │  │  │  └─ locales/
    │  │  │     ├─ en.json
    │  │  │     └─ zh-TW.json
    │  │  └─ validation/
    │  ├─ styles/
    │  │  ├─ tokens.css
    │  │  ├─ layout.css
    │  │  └─ game.css
    │  └─ test/
    └─ public/

### 5.1 分層責任

- game/engine：純 TypeScript 規則、盤面、計分、AI 和事件。不得 import React、Canvas、Supabase 或 window。
- game/runtime：requestAnimationFrame、鍵盤／觸控輸入、Canvas 繪圖與 React hook。runtime 呼叫 engine，但 engine 不依賴 runtime。
- features/rooms：建立房間、加入房間、Ready、離開與呼叫 DB functions。
- features/realtime：管理 Supabase Channel、Broadcast parsing、Presence state、重連和同步。
- features/results：結算、結果提交、重試及重複提交保護。
- features/leaderboard：呼叫安全 View／RPC，切換模式與翻頁。
- components：可重用畫面組件，不直接執行 SQL 或建立 Supabase Channel。
- lib/supabase：唯一建立 client 的模組；不向瀏覽器匯出 secret key。
- routes：組合元件和 feature hook，處理路由生命週期。
- locales：所有面向玩家的字串在 en.json 和 zh-TW.json 維護。狀態機使用穩定狀態碼，顯示層再翻譯。

### 5.2 狀態管理原則

- 引擎的高頻狀態保存在 GameRuntime ref／engine instance；不要每個 animation frame 呼叫 setState。
- React state 只保存低頻 UI 狀態：頁面、Pause、計分摘要、連線、Presence、對手快照、對話框及語言。
- 分數或狀態摘要可每 100–200 ms 批次推送至 React；BoardCanvas 以 requestAnimationFrame 繪製最新 engine state。
- Realtime callbacks 先經 runtime schema validator，轉成 domain event，再交給 online match controller。
- 單一擁有者負責 teardown：頁面卸載時取消動畫、解除 DOM listener、untrack Presence 並 removeChannel。

---

## 6. 核心型別與資料契約

以下型別是實作方向；正式型別以 src/game/engine/types.ts 及 src/lib/supabase/realtime.types.ts 維護。

    type GameMode = "solo" | "ai" | "online_pvp";
    type GameStatus = "ready" | "countdown" | "playing" | "paused" | "game_over";
    type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
    type Rotation = 0 | 1 | 2 | 3;

    type ActivePiece = {
      type: PieceType;
      x: number;
      y: number;
      rotation: Rotation;
    };

    type GameStats = {
      score: number;
      lines: number;
      level: number;
      attacksSent: number;
      attacksReceived: number;
      elapsedMs: number;
    };

    type GameState = {
      boardRows: Uint16Array; // 22 個 row mask，只用低 10 bits
      active: ActivePiece | null;
      hold: PieceType | null;
      holdUsed: boolean;
      nextQueue: PieceType[];
      bagState: RandomState;
      incomingGarbage: GarbageAttack[];
      stats: GameStats;
      status: GameStatus;
      lockElapsedMs: number;
      lockResets: number;
      combo: number;
      seed: number;
    };

建議 boardRows[0] 是最上方列、boardRows[21] 是最底列；bit 0 到 bit 9 分別代表欄位 0 到 9。選定後固定並以測試鎖定，不可在渲染與碰撞模組使用相反方向。

所有 Realtime 事件採共用封套：

    type EventEnvelope = {
      protocolVersion: 1;
      roomId: string;
      matchId: string;
      senderUserId: string;
      seq: number;
      sentAt: string;
    };

事件 payload：

- ready：ready boolean、seat；DB member row 是準備狀態來源，Broadcast 用於即時提示。
- start：seed、rulesVersion、roundNo、serverStartAt；先由 DB RPC 建立 active match，成功後才能發送。
- attack：attackId、lineCount、holeColumns；接收端按 attackId／seq 去重並套用合法攻擊。
- snapshot：boardRows 整數陣列、active piece、hold、score、lines、level、status；只用於顯示對手盤面與重新同步，不直接裁決勝負。
- game_over：reason、final GameStats、lastSnapshotSeq、clientFinishedAt。
- rematch：requestId、action（request／accept／decline）、sender。
- sync_request：請求目前 match 狀態；對手收到後立即回一份 snapshot 和必要的 match metadata。

所有事件必須檢查 protocolVersion、roomId、matchId、senderUserId 是否為房間成員、seq 是否遞增、棋盤列數與 bit 範圍、方塊類型、分數非負、攻擊行數上限等。未知事件或錯誤版本不得讓整個 React app 崩潰。

---

## 7. Supabase 資料模型

所有本專案自建的 PostgreSQL table 名稱以 tetris_ 開頭。Supabase 內建 auth.users、realtime.messages 等系統資料不屬於本專案自建 tables。Migration 是唯一正式 schema 來源；Supabase TypeScript Database type 從 migration 更新。

### 7.1 tetris_player

用途：玩家可公開顯示的基本資料，不保存 email 或 OAuth token。

欄位建議：

- user_id uuid primary key，references auth.users(id) on delete cascade。
- display_name text not null，長度 1–20，去除控制字元。
- avatar_key text null，使用預設 icon key，不接受任意外部圖片 URL。
- locale text not null default 'en'，限定 en／zh-TW。
- created_at、updated_at timestamptz not null。
- is_anonymous boolean 可由 Auth claim 派生或保留遷移狀態；不可讓使用者任意改成他人身份。

### 7.2 tetris_room

用途：連線房間與等待／進行中／結束狀態。

欄位建議：

- id uuid primary key。
- room_code text unique not null，使用足夠長度的隨機英數代碼，正規化大小寫；Join 只透過 DB function，避免公開列舉房間。
- host_user_id uuid references tetris_player(user_id)。
- status text check in ('waiting','playing','finished','expired')。
- rules_version text not null。
- settings jsonb not null，經 schema 驗證；MVP 限制房間設定範圍。
- created_at、updated_at、expires_at timestamptz not null。
- room_code 不可當作授權憑證；每次讀取與操作仍需 Auth uid、membership 和 RLS 檢查。

### 7.3 tetris_room_member

用途：房間席位、Ready、Rematch 和必要的重連時間戳。

欄位建議：

- room_id uuid references tetris_room(id) on delete cascade。
- user_id uuid references tetris_player(user_id)。
- seat smallint check in (1,2)。
- is_ready boolean not null default false。
- rematch_ready boolean not null default false。
- joined_at timestamptz not null。
- left_at timestamptz null。
- last_heartbeat_at timestamptz null，僅供重連寬限或結算參考，不代表 Presence 在線狀態。
- primary key (room_id, user_id)，unique (room_id, seat)。
- Presence 是線上／離線即時狀態來源；此表不是 Presence 的替代品。

### 7.4 tetris_match

用途：單人、AI 及線上比賽的共同中繼資料。

欄位建議：

- id uuid primary key。
- room_id uuid null references tetris_room(id)。
- mode text check in ('solo','ai','online_pvp')。
- round_no integer not null default 1。
- status text check in ('created','playing','finished','abandoned')。
- seed bigint not null。
- rules_version text not null。
- player1_user_id uuid null references tetris_player(user_id)。
- player2_user_id uuid null references tetris_player(user_id)；AI 可用固定 system 值或 null，AI 玩家資料不作登入帳號。
- winner_user_id uuid null references tetris_player(user_id)。
- finish_reason text null。
- created_at、started_at、finished_at timestamptz。
- room_id 有值時對 room_id、round_no 建 unique constraint；solo／AI 的 room_id 是 null。
- DB 中只存比賽生命周期及結果關聯，不保存每幀棋盤或每個按鍵。

### 7.5 tetris_match_result

用途：每位玩家一筆結果，讓對戰兩邊統計可分開查詢。

欄位建議：

- match_id uuid references tetris_match(id) on delete cascade。
- user_id uuid null references tetris_player(user_id)。
- seat smallint null。
- score bigint not null check (score >= 0)。
- lines_cleared integer not null check (lines_cleared >= 0)。
- final_level integer not null check (final_level >= 1)。
- elapsed_ms integer not null check (elapsed_ms >= 0)。
- attacks_sent、attacks_received integer not null default 0。
- outcome text check in ('win','loss','draw','completed','abandoned')。
- verification_status text check in ('client_reported','validated','rejected')。
- result_payload_hash text null，用來協助去重和稽核，不宣稱可單獨證明遊戲公平。
- submitted_at timestamptz not null。
- primary key (match_id, user_id)；AI 或離線未登入局不建立伺服器結果。

### 7.6 tetris_score

用途：排行榜用的聚合統計，不直接讓瀏覽器任意更新。

欄位建議：

- user_id uuid references tetris_player(user_id)。
- mode text check in ('solo','ai','online_pvp')。
- season_key text not null default 'all_time'。
- best_score bigint not null default 0。
- total_score bigint not null default 0。
- matches_played、wins、losses、draws bigint not null default 0。
- rating integer not null default 1000；只用於 PvP 評分，未驗證 Casual 賽不得混入 Ranked rating。
- updated_at timestamptz not null。
- primary key (user_id, mode, season_key)。
- tetris_leaderboard 建議為安全 View 或 RPC，以 mode、season_key、排序欄位和 limit 查詢；View 需明確保護 RLS，不得預設假設 View 自動沿用 base table RLS。
- Solo／AI 依 best_score 排序；Casual PvP 依 wins、draws、best_score 顯示。Ranked rating 只收 verified 結果。

### 7.7 Index 與保留策略

- tetris_room(room_code)、tetris_room(status, expires_at)。
- tetris_room_member(user_id, room_id) 及 tetris_room_member(room_id, is_ready)。
- tetris_match(room_id, round_no)、tetris_match(mode, started_at desc)。
- tetris_match_result(user_id, submitted_at desc)、tetris_match_result(match_id)。
- tetris_score(mode, season_key, best_score desc)、tetris_score(mode, season_key, rating desc)。
- 設定房間逾時清理；清除 waiting 且過期房間及其空會員資料。
- 比賽結果為產品資料，不因房間清理一併刪除；房間刪除策略不得 cascade 到已需保留的 match results。

---

## 8. PostgreSQL RPC、RLS 與 Supabase Realtime

### 8.1 Database Functions／RPC

所有會更動多張表的行為以單一 PostgreSQL transaction function 執行，避免 client 分多次寫入造成半完成房間狀態。建議函式：

- tetris_create_profile(p_display_name, p_locale)：由 auth.uid() 建立／更新自己的公開 profile。
- tetris_create_room(p_settings)：產生代碼、建立 waiting room、加入 host seat 1；回傳安全的房間摘要。
- tetris_join_room(p_room_code)：大小寫正規化、鎖定 room row、檢查 waiting／expiry／空席、加入 seat 2；回傳房間和會員摘要。
- tetris_set_ready(p_room_id, p_ready)：僅會員可改自己的準備狀態；更新成功後 client 發 ready Broadcast。
- tetris_start_match(p_room_id)：僅 host 可呼叫；鎖定 room，驗證兩個有效席位均 ready，產生 seed 與 match id，寫入 tetris_match，更新 room status，回傳 serverStartAt 和 match metadata。
- tetris_mark_presence_heartbeat(p_room_id)：有需要時低頻更新 last_heartbeat_at；不得每個 frame 呼叫。
- tetris_leave_room(p_room_id)：記錄離開；若比賽進行中交由結算流程處理，不得任意刪除另一名玩家。
- tetris_create_local_match(p_mode, p_rules_version)：登入玩家選擇上傳 Solo／AI 成績時建立可追蹤 match。
- tetris_submit_match_result(p_match_id, p_result)：驗證 caller 是參賽者、欄位範圍和 match 狀態；使用 unique key 保證重複提交冪等。
- tetris_request_rematch(p_room_id, p_match_id)：更新要求／接受狀態；兩位有效會員都接受後建立新 round，回傳新的 seed 和 start metadata。
- tetris_get_leaderboard(p_mode, p_season_key, p_limit, p_cursor)：只回傳公開必要欄位及安全分頁結果。

- 預設採 SECURITY INVOKER。確需 SECURITY DEFINER 時明確設定空 search_path、完整限定 schema/table/function 名稱、驗證 auth.uid()、限制 EXECUTE 權限並提供負向權限測試。
- client 不得直接 INSERT 或 UPDATE tetris_score，也不得自行修改 winner_user_id。
- 原子更新聚合分數與結果提交同一 transaction；同一 match 的重送不重覆計分。

### 8.2 Realtime channel

- Topic 形式為 tetris-room:<room uuid>；Channel 設定 private: true。
- Realtime 設定關閉 public room channel，對 realtime.messages 建立 RLS policies。
- 授權需確認 auth.uid() 在 topic 對應 room 的 tetris_room_member 中，且會員仍有效；接收 Broadcast、發送 Broadcast、發送 Presence、讀取 Presence 權限分開檢查。
- 加入頻道前先取得登入 session；處理 SUBSCRIBED、CHANNEL_ERROR、TIMED_OUT、CLOSED，顯示連線狀態。
- 進房先查 DB room/match 狀態，subscribe 成功後 track Presence，再送 sync_request；不可假設剛加入頻道就會收到先前 Broadcast。
- 對 Start、Game Over 和 Rematch 等重要狀態，資料庫狀態為真實來源；Broadcast 只通知其他即時連線者。錯過訊息的客戶端重新讀 RPC 後可恢復。
- Snapshot 是可丟棄的最新狀態；控制頻率約每秒 4–5 次，板面有改變時送出；不要 60 FPS broadcast。
- Attack、Start、Game Over、Rematch 和 Snapshot 都帶 protocolVersion、roomId、matchId、senderUserId 和 seq。收到舊 match、重複 id 或過舊 seq 時忽略。
- 可在 send 設定支援的 acknowledgement，但 acknowledgement 只能表示傳送階段，不可替代 DB durable state 或對方處理確認。

### 8.3 Presence

- Presence payload 僅放必要欄位：displayName（可從資料庫取）、seat、state（lobby／playing／away）、clientSessionId。
- 使用 Presence sync、join、leave 更新對手 online badge；多分頁時同一 user 可有多個 clientSessionId，畫面只需彙整成一位玩家在線。
- Presence 不放 email、Auth token、房間代碼以外的秘密或個資。
- Presence 是連線狀態，不持久寫入 tetris_room_member.is_online。離線後用 reconnect grace period（建議 20–30 秒）讓玩家回連；逾時規則需由 DB function 檢查有效 heartbeat／比賽狀態，不能只接受某個客戶端說「對方已離線」就判敗。

### 8.4 RLS 與前端金鑰

- 對每張 public schema 的 tetris_* table 啟用 RLS，並逐項設定 GRANT 和 SELECT／INSERT／UPDATE／DELETE policy。
- tetris_player：公開讀取只允許公開欄位；使用者只可編輯自己的顯示名稱和語言。
- tetris_room、tetris_room_member、tetris_match：只有有效房間會員或 match 參與者能讀取必要資料；room code 加入只透過 RPC。
- tetris_match_result：只給 match participants 或管理端查看；排行榜走有限欄位 View／RPC。
- tetris_score：允許讀取已公開的統計，不允許 client 直接寫入。
- 測試 RLS 的 allow 和 deny；包含匿名未登入、Auth 匿名使用者、房間外使用者、房間內玩家、兩個不同玩家。
- Vite 環境變數使用 VITE_SUPABASE_URL 和 VITE_SUPABASE_PUBLISHABLE_KEY（舊專案可能使用 anon key）；所有瀏覽器可見的 key 都不是 secret，安全性必須來自 Auth、GRANT、RLS 和 RPC 授權。
- service_role／secret key 僅限可信任 server 或部署環境，絕不可用 VITE_ 前綴、放入 bundle、寫入 Git 或傳至 Realtime payload。

---


## 9. 遊戲引擎與演算法

### 9.1 確定性亂數與 7-bag

random.ts 提供可由 seed 重現的 PRNG，例如 mulberry32 或 xorshift32，並實作 Fisher–Yates。seed、PRNG 版本、7-bag 和 rulesVersion 都要可重現。改 PRNG 實作時遞增 rulesVersion，避免不同 client 在同 seed 產生不同方塊。

核心函式：

    createSeededRng(seed: number): RandomSource
    shuffleBag(rng: RandomSource): PieceType[]
    drawNextPiece(state: RandomState): DrawResult
    ensureQueue(state: GameState, minLength: number): GameState

### 9.2 碰撞與移動

- 使用 PieceType + rotation table 產生 occupied cells。
- canPlace(board, piece) 檢查左／右牆、底部、已鎖定方塊及允許的隱藏列。
- movePiece(state, dx, dy) 只有合法才回傳位置更新。
- rotatePiece(state, direction) 試用 kick offset 清單；全失敗時保留原狀。
- computeGhostPiece(state) 由目前位置向下探到最後可放位置。
- applySoftDrop、applyHardDrop 使用相同 collision 邏輯，避免顯示落點與實際鎖定不一致。

### 9.3 鎖定、消行與攻擊

- lockPiece 將目前方塊 occupied cells 寫入 rows，清除 active piece。
- clearFullRows 穩定壓縮未滿列並回傳消行數。
- calculateScore(lines, levelBeforeClear, softDropCells, hardDropCells) 回傳加分與新統計。
- calculateAttack(lines, combo, rules) 回傳 outgoing line count。
- resolveIncomingAndOutgoing(incomingQueue, outgoingAttack) 先抵銷再回傳剩餘攻擊。
- createGarbageRows(lineCount, holeColumns) 建立合法行；每個 hole 只缺一格。
- spawnNextPiece 產生下一方塊，碰撞失敗轉 Game Over。
- 所有方塊移動與鎖定使用整數格；時間以毫秒浮點數累積，避免每 frame 四捨五入誤差。

### 9.4 固定步長遊戲迴圈

- GameLoop 使用 requestAnimationFrame 和 accumulator；遊戲邏輯以固定 tick（建議 60 Hz）更新，渲染可使用螢幕更新率。
- elapsed = performance.now() - previousFrame，單一 frame 的 elapsed 上限約 100 ms；頁面從背景恢復後不追補超長時間。
- 重力、soft drop、lock delay 由遊戲時鐘累積，不使用 setInterval 當作碰撞核心。
- dispose 必須 cancelAnimationFrame，避免路由切換後舊 game loop 與新 game loop 同時執行。
- React hook 回傳 start、pause、resume、restart、dispatchInput、getState 和 destroy。

### 9.5 AI 落點搜尋

MVP AI 使用一層全落點搜尋：

1. 列舉目前方塊的旋轉狀態。
2. 列舉各合法水平位置。
3. 將候選方塊直接落到最低合法列。
4. 模擬消行，建立結果盤面。
5. 以 heuristic 計分並選最佳落點。

候選評估項目：aggregate height（各欄高度總和）、holes（被方塊覆蓋且下方仍有空洞的格數）、bumpiness（相鄰欄高度差）、completed lines（本次清行數獎勵）、wells（單欄凹槽懲罰）、top height（接近頂端的額外懲罰）。

使用固定權重常數並由單元測試驗證合理案例，例如 AI 能清行、避免明顯洞、沒有合法落點時回報 Game Over。難度由決策延遲、搜尋深度、heuristic 權重擾動和落點失誤機率調整；難度不得修改物理規則。Hold 與兩步 lookahead 列為後續優化。

---

## 10. 前端核心函式與元件責任

### 10.1 Game Engine API

engine.ts 對外提供：

    createGame(options: {
      mode: GameMode;
      seed: number;
      rules: GameRules;
      difficulty?: AiDifficulty;
    }): GameState

    stepGame(state: GameState, elapsedMs: number): EngineResult
    applyInput(state: GameState, input: GameInput): EngineResult
    endGame(state: GameState, reason: GameOverReason): GameState
    serializeGame(state: GameState): PersistedGameState
    restoreGame(data: unknown): GameState | RestoreError
    validateGameState(data: unknown): ValidationResult

- EngineResult 包含新狀態及事件陣列，如 piece_locked、lines_cleared、attack_created、game_over。
- 引擎函式不可呼叫 setState、Supabase、Local Storage 或 DOM。
- IndexedDB restore 對 schema version、board mask、piece queue 和 seed 逐項驗證；壞資料清除並安全開始新局。

### 10.2 React 元件

- App：全域 Provider、router、錯誤邊界。
- HomePage：模式選擇、語言切換和玩家狀態。
- GamePage：建立／銷毀 GameRuntime，接收模式與 seed。
- GameBoard／BoardCanvas：Canvas 繪圖、ResizeObserver、DPR 更新、可及描述。
- ScorePanel：分數、消行、level、next queue、hold。
- TouchControls：觸控按鈕、長按左右／soft drop、自動釋放與 pointercancel。
- LobbyPage：建立房間、Join 表單、欄位驗證。
- RoomPage：訂閱私人 channel、顯示房間代碼、雙方 Ready 和 Presence。
- OnlineGamePage：同時管理本機 game runtime 和 opponent snapshot store；不把對手快照寫回本機引擎。
- OpponentPanel：繪製對手最後一份合法 snapshot，顯示快照年齡與連線提示。
- ConnectionBanner：連線、重新連線、超時、房間已結束狀態。
- ResultPage：勝負、分數、驗證標籤、Rematch 操作。
- LeaderboardPage：模式 tab、分數／rating、分頁及空／載入／錯誤狀態。
- LanguagePicker：變更 i18n locale，不重建 game 或 Supabase session。

### 10.3 Realtime services

- createRoomService(client)：create、join、ready、start、leave、rematch RPC。
- createRoomChannel(client, roomId)：建立 private channel、綁定事件、track/untrack presence。
- parseRoomEvent(raw)：Zod 或手寫 validator 驗證事件封套與 payload。
- sendRoomEvent(channel, event)：統一加 envelope、序號、錯誤處理和記錄。
- applyOpponentAttack(state, event)：驗證 match、來源、seq、行數後修改本機盤面。
- updateOpponentSnapshot(store, event)：只接受較新 seq，不觸碰本機遊戲引擎。
- handleChannelStatus(status)：建立 connected／reconnecting／disconnected UI 狀態。
- reconcileRoomState(roomId)：斷線重連後呼叫 RPC 取回當前 room/match 狀態，請求新 snapshot。
- teardownRoomChannel(channel)：取消 timer、untrack Presence、移除 handlers 和 Channel。

---

## 11. 資料流程與錯誤處理

### 11.1 建立／加入房間

建立房間：

    Auth session
      -> tetris_create_room RPC
      -> 回傳 room id、短代碼、seat 1
      -> 建立 private room channel
      -> SUBSCRIBED 後 track Presence
      -> 等待第二位玩家

加入房間：

    Auth session
      -> 輸入代碼並正規化
      -> tetris_join_room RPC 驗證並取得 seat 2
      -> 建立 private room channel
      -> 訂閱成功後 track Presence
      -> 呼叫 room state 查詢並顯示雙方狀態

Join 錯誤需提供可翻譯錯誤碼：ROOM_NOT_FOUND、ROOM_EXPIRED、ROOM_FULL、ROOM_ALREADY_STARTED、AUTH_REQUIRED、NETWORK_RETRY。

### 11.2 Ready 與 Start

- 玩家點 Ready -> 呼叫 tetris_set_ready RPC -> 成功後送 ready Broadcast。
- 房間畫面同時以 RPC 結果和 Broadcast 更新狀態；重新連線時再取 DB state。
- Host 點 Start -> tetris_start_match transaction 檢查兩人 ready -> 建立 match id、seed、serverStartAt -> Host 廣播 start。
- 客戶端使用 serverStartAt 倒數；只有 match.status=playing 且 seed 已取得才能建立 GameRuntime。
- 任何一方錯過 start Broadcast，進房後從 tetris_match 恢復 seed 和狀態。

### 11.3 對局攻擊及盤面快照

- Engine 產生 attack_created event 後，online controller 發 Broadcast；送出前加 seq、attackId、matchId。
- 接收端驗證 payload，丟棄重複 attackId，將攻擊行加進自己棋盤，再以新狀態觸發渲染。
- Snapshot 約每 200 ms 或棋盤重大狀態改變時傳送，不包含登入 token、email 或其他玩家私有資料。
- 對手快照超過設定時間未更新時標示「同步中」，不顯示新鮮狀態的假象。
- 網路中斷時本機 game loop 的策略明確：短暫中斷允許本機繼續並佇列有限數量的攻擊事件；超過寬限時間時停止接受新一局並進入連線結果流程。不得無限累積訊息。

### 11.4 Game Over 與結果提交

- 本機 game_over event 先鎖定本機結果，防止重複結算。
- 線上玩家廣播 game_over，呼叫結果 RPC；RPC 用 match row lock／unique constraint 保證最多結算一次。
- match status finished、winner 與所有必要結果更新後回應成功。
- 網路錯誤時保留待送結果，在 match still eligible 時以相同 match id 冪等重試；UI 顯示「結果待同步」。
- Solo／AI 無網路也可結束並保留本機 high score；有 Auth 且使用者選擇同步時再呼叫 Supabase。
- client_reported 與 validated 結果在 API 和 UI 分開；不能在文件、UI 或排行榜稱 casual client score 已防作弊。

### 11.5 錯誤狀態

穩定錯誤碼至少包括：

- AUTH_SESSION_REQUIRED
- PROFILE_NAME_INVALID
- ROOM_CODE_INVALID
- ROOM_NOT_FOUND
- ROOM_FULL
- ROOM_EXPIRED
- ROOM_PERMISSION_DENIED
- MATCH_NOT_ACTIVE
- REALTIME_SUBSCRIBE_FAILED
- REALTIME_RECONNECTING
- REALTIME_EVENT_INVALID
- REALTIME_EVENT_STALE
- RESULT_ALREADY_SUBMITTED
- RESULT_REJECTED
- LEADERBOARD_LOAD_FAILED
- GAME_STATE_RESTORE_FAILED
- STORAGE_UNAVAILABLE

UI 顯示翻譯後的簡單訊息，可重試的錯誤提供 Retry；開發日誌才保存錯誤細節。不得把 JWT、完整 Auth session 或 service key 寫入 log。

---

## 12. 玩家資料與排行榜信任模型

- 未登入玩家可本機單人或 PvAI；切換到線上模式時建立 Supabase anonymous Auth session，或提示使用者登入。
- 玩家選擇一個公開名稱，不收集不必要個資。匿名帳號升級／跨裝置保留身分列為後續帳號功能。
- RPC 由 PostgreSQL 以 Auth uid 推斷玩家身份；不接受 request payload 指定其他 user_id。
- MVP 單人／AI／Casual PvP 結果可以存為 client_reported，資料庫函式檢查非負值、合理時間和上限並防止重複提交。這些檢查能降低誤用，不能證明客戶端沒有被修改。
- Casual 排行榜明確標註「非防作弊排名」；不發獎、不承諾公平競技。
- 後續要推出 Ranked PvP，必須另建權威驗證：可信任 game server 或可重播且經伺服器驗證的輸入紀錄。只有伺服器驗證的 match result 可更新 Ranked rating。
- Edge Function 可作為結果提交入口、速率限制和基本資料驗證，但若只收到客戶端最終比分，不能視為權威遊戲伺服器。

---

## 13. 多語系、設定與離線資料

- 初版 locale：en、zh-TW。英文與繁中須有相同模式、規則、錯誤與結果 key。
- React 元件只傳 i18n key 和插值資料，不直接寫出給玩家看的文字。
- 數字和日期用 Intl.NumberFormat／Intl.DateTimeFormat 依 locale 顯示。
- 代碼、事件 enum 和資料庫狀態保留穩定英文值；顯示文字另行翻譯。
- 語言切換不會重新建立 Board、清除分數、離開房間或更換 seed。
- localStorage 保存語言、音效、觸控設定和最近模式；IndexedDB 可保存本機最高分與可恢復局面。
- Local Storage 與 IndexedDB 內容視為不可信資料；載入時有 schema version、範圍驗證及 migration。
- PWA 只快取靜態程式資源和語系檔；Auth、Realtime、match result API 不可被 Service Worker 假裝成離線成功。離線時可玩 Solo／AI，不可建立或加入線上房間。

---

## 14. 環境與部署

### 14.1 環境變數

提供 .env.example，不提交實際密鑰：

    VITE_SUPABASE_URL=
    VITE_SUPABASE_PUBLISHABLE_KEY=

- Vite 的 VITE_ 變數會進入瀏覽器 bundle，僅放 Supabase project URL 和 publishable／舊 anon key。
- Edge Function 的 Supabase secret key、私密 API key 和管理連線字串只放 Supabase Secrets 或可信任部署環境。
- 本機、Preview、Production 使用分開的 Supabase project 或明確環境隔離，migration 一致。
- 建立空值檢查；缺少 Supabase env 時仍能啟動 Solo／AI，但線上功能顯示設定錯誤頁。

### 14.2 建置與發布

- 建議使用 npm lockfile，Node.js LTS。
- 初期部署於支援 Vite static build 的 HTTPS 靜態主機；路由要設定 fallback 到 index.html。
- Supabase migration 先在 local／preview project 驗證，再部署 production。
- Realtime、Auth redirect URL、匿名登入、Site URL 和允許網域逐環境設定。
- PWA Manifest、Service Worker 和安裝提示屬於 Phase 5；Safari 與 Chrome 需分別驗收。
- 對局結果／連線故障可用不含 PII 的前端錯誤監控；預設不收集按鍵逐項紀錄。

---

## 15. 測試計畫與驗收方法

### 15.1 Engine unit tests（Vitest）

測試固定 seed 和規則，不連 Supabase：

- 7-bag 每袋恰有七種方塊各一個，固定 seed 可重現序列。
- 所有旋轉矩陣佔格數正確，O 方塊旋轉符合既定規則。
- 左右牆、底部、堆疊碰撞；非法移動不更動 state。
- Wall kick 每個候選 offset 按指定順序測試；全部失敗時旋轉不變。
- Ghost 落點與 Hard drop 結果一致。
- 完整列清除、連續多列清除、隱藏列壓縮。
- 每次消行、level transition、soft drop 和 hard drop 分數正確。
- Lock delay、最多 lock reset 次數、Game Over spawn collision。
- 7-bag queue、Hold 使用限制及 Hold 後 spawn collision。
- outgoing attack、combo、incoming 抵銷與 hole index 邊界。
- 序列化／還原往返一致；壞 board mask、壞版本和惡意資料被拒絕。
- 隨機輸入序列不得產生超出 board 範圍的佔格或 NaN 統計。

### 15.2 AI tests

- 所有選擇皆是合法可達的落點。
- 盤面存在單行消除時，特定 fixture 能選到該清行落點。
- 同一 state 和 difficulty 得到相同結果（若 difficulty 明確含隨機，則使用 seed 測試）。
- 高度／洞／bumpiness 的權重改變依預期影響決策。
- 計算時間不得阻塞一幀超過目標預算；超過時再把搜尋移至 Worker。

### 15.3 Component 與 accessibility tests

使用 React Testing Library：

- 模式按鈕有可見焦點、disabled 狀態可辨識、觸控目標至少 48 px。
- 鍵盤、TouchControls 都呼叫同一 GameInput API。
- Game Over、Reconnect、Rematch、Join error 的 aria-live 和翻譯正確。
- 切換語言不重置 game state，也不離開房間。
- 320 px 手機寬度、長英文名稱、繁中較長訊息不遮蔽控制。
- Canvas ResizeObserver 和 devicePixelRatio 改變後尺寸維持 10:22 盤面比例。
- prefers-reduced-motion 與音效開關行為正確。

### 15.4 Supabase database／RLS tests

- 每個 migration 可在乾淨 local Supabase 重播。
- profile owner 可讀寫自己允許欄位，不能改別人。
- 非會員不能讀 room/member/match 私有資料。
- room code join 只透過授權 RPC；room 已滿、已過期、已開局時交易完全回滾。
- 只有 host 能 start，且雙方 ready 才能開始。
- 未參賽者不可提交結果；重送相同結果不會重複累積 tetris_score。
- client 不能直接更新 winner、verification_status、rating 或聚合 score。
- leaderboard 只暴露必要欄位，使用者不能透過 View 繞過 RLS。
- Realtime policies 驗證房間會員可加入／接收／發送，非會員被拒絕。

### 15.5 Realtime integration 與 E2E

使用 Supabase local stack 或測試 project、兩個獨立登入 session：

- 玩家 1 建房、玩家 2 加入，房間只允許兩席。
- 雙方 Presence 在線／離開狀態正確，雙分頁彙整無重複玩家。
- Ready / Start 順序正確，未 Ready 時 start RPC 拒絕。
- start Broadcast 遺失後，新訂閱者從 DB 讀回正確 match seed 和狀態。
- 攻擊事件只套用一次，重複 seq、過期 match、非法 holes 被忽略。
- Snapshot 更新對手棋盤，不覆蓋自己的 board。
- 網路斷線後出現 banner，重連讀 DB、請求新 snapshot，過期事件不回放至新 round。
- Game Over 競態、重複提交、Rematch 兩人接受／一人離開。
- 測試有限網路延遲、封包遺失、關閉分頁、手機背景恢復和 token 過期。

Playwright 至少覆蓋桌面 Chromium、WebKit（Safari 相容性）、Android Chrome 尺寸和 iPhone/iPad viewport；真機測試仍需安排實際 Safari、iOS Safari 和 Android Chrome 點按／旋轉／Home Indicator 驗收。

### 15.6 效能與可觀測性

- Board render 不造成 60 FPS React tree 全面重繪；用 React Profiler／Performance panel 檢查。
- Snapshot 約 4–5 Hz；Presence 不隨盤面更新；監看 Broadcast 訊息大小和 Realtime quotas。
- 連線失敗、RPC 錯誤和結果待同步以結構化 error code 記錄，不記 Auth token 或不必要 PII。
- 至少記錄 client build、rulesVersion、mode、match id hash、錯誤碼和 reconnect 次數，便於重現不一致。
- 內存、動畫迴圈和 Channel 在離開頁面後確實清理；長時間測試無 timer／listener 累積。

---

## 16. 里程碑與完成定義

### M0：範圍確認與專案骨架

- 決定 Tetris 和現有繪本的路由／保留方式。
- 建立 Vite、React、TypeScript strict、React Router、Vitest 基礎。
- 建立 en／zh-TW locale、全域樣式和響應式 app shell。
- 設定 .env.example、Supabase local project、migration workflow。

完成條件：桌面和手機可載入新首頁；兩語切換不重載應用；原有繪本資產仍可復原。

### M1：本機遊戲引擎

- 完成棋盤、7-bag、碰撞、移動、旋轉、ghost、消行、計分、落速、hold、Game Over。
- 建立固定步長 GameLoop、鍵盤和觸控 InputController。
- Canvas 繪製主棋盤和 Next／Hold。
- 實作 Restart／Pause／Resume。

完成條件：引擎測試覆蓋核心規則；可在桌機和手機完整玩完一局；畫面縮放不裁棋盤。

### M2：單人與 AI

- 完成 Solo mode 與 local high score。
- 實作 heuristic AI 和難度設定。
- 加入 PvAI incoming/outgoing garbage、比賽結果畫面。
- IndexedDB 局面保存可列為本階段可選項。

完成條件：玩家與 AI 可持續對戰，攻擊規則一致、AI 不產生非法移動、本機離線可玩。

### M3：Auth、資料庫與房間

- 完成匿名 Auth、profile 建立／編輯及 migrations。
- 建立全部 tetris_* tables、索引、RLS、RPC、local seed。
- 完成 create/join/ready/leave UI 和兩玩家 room membership。

完成條件：兩個不同 session 可建房和加入；非會員無法讀取房間資料；未 Ready 無法開始。

### M4：Realtime PvP

- 私有 channel 授權、Presence、ready/start/attack/snapshot/game_over/rematch events。
- 在線對戰雙盤 UI、reconnect flow、snapshot reconcile、訊息驗證。
- 比賽結果 transaction、冪等重試、Casual scoreboard。

完成條件：兩個瀏覽器可完成對戰；斷線、訊息重複、錯過 start、Rematch 和結果重送都不會讓 room/match 卡在不一致狀態。

### M5：排行榜、無障礙與跨裝置硬化

- 完成 tetris_score 聚合和單人／AI／Casual PvP 排行榜。
- 完成英／繁中全字串、鍵盤焦點、screen reader 狀態、減少動態效果。
- 驗收手機直向／橫向、平板、桌面及 iOS safe area。
- 視產品需要加入 PWA manifest、靜態資源快取及安裝說明。

完成條件：跨尺寸無重疊、可只用觸控完成遊戲，語言切換保留房間和遊戲進度；排名類型和 Casual 信任等級清楚標示。

### M6：安全與公開部署

- RLS／RPC 負向測試、Realtime topic policy review、Supabase Auth redirect 設定。
- 部署 Preview／Production、設定環境 secrets 和資料保留。
- 進行 browser E2E、兩真實裝置對戰、壓力及弱網測試。
- 寫出初次建置、migration、部署、回復版本與問題排查文件。

完成條件：新環境能依文件重建資料庫和網站；Production 不含 service_role／secret key；至少兩種手機瀏覽器及桌面瀏覽器通過核心對戰。

### M7：Ranked／防作弊（後續）

只有在要提供競技排名、獎勵或賽事時啟動：

- 設計可信任權威遊戲流程、輸入驗證／重播或獨立 game server。
- 驗證 seed、方塊序列、攻擊序列、時間窗和結果。
- Ranked rating 只接受 server-verified result。
- 進行攻擊測試、濫用限制、速率限制和賽事公平性檢查。

---

## 17. MVP 驗收清單

### 遊戲

- [ ] 單人、玩家 vs AI、玩家 vs 玩家三種模式都可到達。
- [ ] 棋盤 10×20 可見，方塊不會穿牆、重疊或消失。
- [ ] 七種方塊順序由 seed 可重現。
- [ ] 移動、旋轉、Hard drop、Soft drop、Hold、ghost、消行、計分、level、Game Over 規則一致。
- [ ] AI 做出合法落點，可消行並按照規則攻擊。
- [ ] PvP 兩個不同使用者能 Ready、Start、接收攻擊、看到對方盤面、Game Over、保存結果及 Rematch。

### Supabase

- [ ] 自建資料表、函式、View 均以 tetris_ 開頭；Supabase 系統 schema 除外。
- [ ] 玩家、房間、比賽結果、排行榜皆由 PostgreSQL 保存。
- [ ] Ready／Start／Attack／Game Over／Rematch／Snapshot 走 Broadcast。
- [ ] 玩家在線／離線走 Presence，不用資料庫 polling 取代。
- [ ] 房間 channel 為 private，RLS 確認僅房間會員可加入。
- [ ] 全部公開 schema tetris_* tables 有明確 GRANT 和 RLS policies。
- [ ] 客戶端不能直接改 aggregate score、winner、rating 或 verification status。
- [ ] Publishable key 可存在瀏覽器，secret/service role 不在 bundle。

### UX／跨平台

- [ ] en 與 zh-TW 覆蓋首頁、操作、房間、錯誤、比分與結果。
- [ ] 切換語言不重置棋盤、比賽或房間。
- [ ] 桌面鍵盤操作不攔截非遊戲畫面的正常輸入。
- [ ] 手機與平板不用鍵盤也能完整控制遊戲。
- [ ] iPhone Safari、iPad Safari、Android Chrome、桌面常用瀏覽器通過主要流程。
- [ ] 320 px、直向、橫向、長名稱、錯誤提示和 Canvas resize 下沒有重疊或遮蔽。
- [ ] 主要按鈕至少 48×48 px，有 focus、pressed、disabled 狀態和可讀標籤。
- [ ] 連線中斷、重連、結果待同步和失敗都有清楚可翻譯提示。

### 資料信任

- [ ] Casual 與 Ranked 明確分開；MVP 不宣稱 client_reported 是防作弊比分。
- [ ] result submit 冪等且可重試，不會重複計分。
- [ ] Realtime 訊息驗證版本、房間、比賽、會員、序號與欄位範圍。
- [ ] 重要生命周期以 DB 狀態為依據，錯過 Broadcast 後仍能重新同步。

---

## 18. 實作注意事項

1. 不要把 board tick 放在 React setInterval；用固定步長 GameLoop 和 requestAnimationFrame。
2. 不要每 60 FPS 對 Supabase 發送棋盤、Presence 或資料庫寫入；快照只需 4–5 Hz，Presence 只在低頻狀態變更時更新。
3. 不要把 Broadcast 當成會保留歷史的 DB；進房和重連都先查 room/match durable state。
4. 不要把 Realtime 收到的 opponent snapshot 套用到自己的 engine state；它只更新對手顯示資料。
5. 不要相信 client 傳來的 user_id、winner、分數或 event 內容；Auth uid 從 session 推斷，所有事件在兩端解析驗證。
6. 不要把 room code 當授權；每次 DB 和 channel 操作仍需會員身分與 RLS。
7. 不要在前端使用 Supabase secret/service_role；不要將機密加 VITE_ 前綴。
8. 不要讓 client 直接改排行榜統計；由 transaction RPC 更新，並設唯一鍵防止重複提交。
9. 不要讓 Table 名稱散落在 client query；使用生成的 Database types、RPC wrapper 和 migration。
10. 不要依據離線 Presence 的單次 leave 事件立即宣告另一方輸掉；提供短暫 reconnect grace，再依可驗證狀態處理。
11. 不要在 board render canvas 中塞入不可翻譯的狀態文字；Canvas 繪製棋盤，DOM 顯示可及狀態和本地化操作說明。
12. 不要在手機版把控制鈕放在無法觸及、被瀏海／Home Indicator 蓋住或易誤觸的位置。
13. 不要在改規則／隨機演算法後沿用舊 rulesVersion；比賽記錄須可判斷遊戲版本。
14. 不要將 casual client result 宣稱為可信任競技排名；權威驗證是 Ranked 上線前置條件。

---

## 19. 官方技術參考

實作時以當下版本的官方文件確認 client API、private channel policy 和部署選項：

- Supabase Realtime Broadcast：https://supabase.com/docs/guides/realtime/broadcast
- Supabase Realtime Presence：https://supabase.com/docs/guides/realtime/presence
- Supabase Realtime Authorization：https://supabase.com/docs/guides/realtime/authorization
- Supabase Database Functions／RPC：https://supabase.com/docs/guides/database/functions
- Supabase Row Level Security：https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase JavaScript Client：https://supabase.com/docs/reference/javascript/introduction
- Vite 官方文件：https://vite.dev/guide/
- React 官方文件：https://react.dev/learn

---

## 20. MVP v0.1 實作狀態（2026-10-03）

### 已交付於目前工作區

- Vite + React + TypeScript 專案骨架、strict TypeScript、npm lockfile、雙語 JSON 字典與依路由 lazy loading。
- 把原互動繪本及圖片放在 public/storybook/，修正 /storybook/ 在 Vite dev／preview 下應回到子目錄首頁。
- 純 TypeScript 棋盤與遊戲引擎：10×22 儲存、20 列可視區、7-bag、I/O/T/S/Z/J/L、移動、簡化 wall kick、重力、Lock delay、Hold、ghost、消行、分數、等級及 top-out。
- 固定步長 requestAnimationFrame runtime、可調重力與按鍵 DAS/ARR、自適應 Canvas renderer、可及 DOM 狀態標籤、觸控控制。
- 單人模式、三種 heuristic AI 難度及互相發送／取消／排入 garbage attack。
- Supabase 訪客登入、房間建立／加入／Ready／Start／離開／Rematch RPC wrapper、Presence、私人房間 Broadcast event schema、盤面快照、攻擊及 Game Over。
- PostgreSQL migration 建立 tetris_player、tetris_room、tetris_room_member、tetris_match、tetris_match_result、tetris_score，並提供 RPC、RLS 和 Realtime topic policies。
- 單人與 AI 的分數可寫入資料庫；本機最高分仍在 localStorage；排行榜由安全 RPC 讀取。
- README 包含安裝、Supabase Anonymous Sign-ins、環境變數及 migration 套用方式。

### 已完成的工作區驗證

- Node.js 與 npm 已安裝；專案 npm install 完成，套件稽核回報 0 vulnerabilities。
- npm run build 通過 TypeScript strict build 與 Vite production build。
- 在瀏覽器確認首頁、Solo board、AI board、觸控 Hard Drop、英文／繁體中文切換保留目前分數，以及繪本 /storybook/ 的互動進度按鈕。
- 以 390×844 與 1280×900 檢視主要版面；Canvas、控制鈕、統計卡片及導覽沒有互相覆蓋。
- 建置輸出僅有 Zod dependency 註解提示；Vite 已略過該註解，不影響輸出。

### Supabase／雙分頁連線驗收（2026-10-03）

- 工作區 `.env.local` 有設定 Supabase URL 和 Publishable Key；格式確認為 publishable key。`.gitignore` 同時忽略 `.env`、`.env.local` 與 `.env.*`，且白名單只允許 `.env.example`。掃描工作區未發現 Secret／service-role／GitHub token 類 key pattern；環境檔沒有被 Git 追蹤。
- 已將 `supabase/migrations/202610030001_tetris_mvp.sql` 套用至目前已連結的 Supabase 專案。實測初次被擋於 Supabase Anonymous Sign-ins 尚未啟用；已只將 `enable_anonymous_sign_ins` 設為 true，並保留遠端其餘 Auth、MFA、DB pooler、Storage 設定。
- 以兩個瀏覽器分頁分別使用 `127.0.0.1` 與 `localhost`，隔離瀏覽器儲存中的兩個訪客 session。驗證建立房間與產生代碼、另一分頁加入、房主自動看見新玩家、雙方 Presence 在線、Ready Broadcast 同步、房主 Start 及兩端進入同場遊戲。
- 對房主棋盤執行 Hard Drop 後，另一端的對手棋盤 Snapshot 分數同步由 0 更新至 10；兩分頁瀏覽器 Console 無 error／warning。
- 實測找到並修正等待房資訊不同步的問題：加入者現在在 private channel 發送 `player_joined`，房主收到後重新讀取 DB；等待中的房間另有 2.5 秒 durable-state 輪詢作為遺失事件的恢復方式。初始房間畫面不再在 OnlineGame 掛載前發送無效的 `sync_request`；同步請求已移入 OnlineGame 註冊事件接收器後。
- Broadcast 傳送在已 joined channel 時使用 WebSocket；channel 未就緒時明確使用 `httpSend()` REST Broadcast。重新載入兩個玩家後再送盤面快照，對手分數仍有同步，且本輪 Console 沒有新的 error／warning。
- 已新增 `.github/workflows/deploy-pages.yml`：依 GitHub repository 名稱設定 Vite base path、輸出 `404.html` 支援房間深層連結，並從 GitHub Actions 發布 Pages。README 已補上 Pages 與非機密 Actions variables 說明。
- `npm run build -- --base=/tetris-duel/` 通過，並確認輸出使用子路徑資產 URL、包含繪本靜態資產。Zod dependency 的 Rollup 註解提示不影響建置。

### 尚未完成：GitHub Pages 發布

這個工作目錄目前沒有 Git remote，GitHub CLI 也尚未登入，因此尚未推送任何內容、建立／選定 GitHub repository 或啟用 Pages。沒有 Secret Key、service-role key 或 `.env.local` 內容被提交或上傳。要完成前端發布，需要先提供／設定目標 GitHub repository，並在本機完成 GitHub CLI 登入與推送權限；發布後還需在該 repository 設定 Pages 使用 GitHub Actions，及填入 `VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY` 兩個非機密 Actions variables。

此版本定位為 browser casual MVP。比分來自客戶端回報，不能視為防作弊競技資料。正式 ranked、game server 權威模擬、短碼濫用限速、閒置房間清理及真實弱網重連壓力驗收仍屬後續項目；本次連線驗收涵蓋建房、加入、Presence、Ready、Start 及 Snapshot，未涵蓋完整比賽結算與 Rematch 壓力驗收。
