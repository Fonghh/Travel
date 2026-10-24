# 旅遊手帖

大家一起排的旅遊行程 app：日系繪本風、手機優先、繁體中文。

- **主線／支線行程**：每筆行程可以是全員或部分成員，大家看得到彼此的支線，還有「會合點」
- **貼網址匯入**：Google Maps（含 `maps.app.goo.gl` 短網址）自動帶入名稱＋座標，其他網址抓標題
- **吃喝玩樂**：每個行程旁一鍵搜尋附近的餐廳、咖啡、景點、購物（Google Maps）
- **旅程地圖**：每個人一條手繪虛線路線，打卡去過的變實線
- **航班卡**、**住宿**、**三種待辦**（共用／每人／私人）、**公告＋動態**
- **記帳分帳**：多幣別、平分／指定金額／不分攤，用最少轉帳次數結算，保留還款紀錄
- **身分**：邀請連結＋4 位數 PIN，30 隻動物頭像；團長可重設 PIN、鎖定結算、結案
- **PWA**：可加到主畫面，離線時能看最後一次同步的資料
- **動畫**：跟隨系統「減少動態效果」，也能在 app 內手動切換

## 架構

一個 Cloudflare Worker 同時提供前端（`dist/` 靜態檔）和 API（`/api/*`），資料存在 D1。

```
src/        前端（Vite + React + TypeScript）
worker/     Worker API（Hono）
shared/     前後端共用：型別、Google Maps 網址解析、分帳演算法
migrations/ D1 資料表
tests/      單元測試（node --test）
```

## 本機開發

```bash
npm install
echo 'CREATE_CODE=test1234' > .dev.vars   # 本機的開團密碼
npm run preview                           # 建置＋本機 D1＋wrangler dev（http://localhost:8787）
npm test                                  # 單元測試
npm run typecheck
```

`/art` 可以看到所有插圖和動物頭像。

## 部署到 Cloudflare（第一次）

1. Cloudflare 後台 → **Workers & Pages → Create → Import a repository**，選 `fonghh/travel`
2. 設定：
   - Project name：`travel`（要跟 `wrangler.jsonc` 的 `name` 一樣）
   - Build command：`npm run build`
   - Deploy command：`npm run deploy`（會先套用 D1 資料表，再部署）
3. 部署完成後 → 該 Worker 的 **Settings → Variables and Secrets → Add**：
   - Type 選 **Secret**，名稱 `CREATE_CODE`，值是你自己的開團密碼
4. 打開 `https://travel.<你的子網域>.workers.dev`，用開團密碼建立第一趟旅行

之後每次合併到 `main` 就會自動部署。
