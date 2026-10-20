# CMC 恐懼貪婪指數 1 年 — v1.3.0

**僅一個新的 Cloudflare Worker + 一個 GitHub Pages HTML。無 YAML、無 GitHub Actions、無 R2。**

## 1. 建立新的 Cloudflare Worker

Cloudflare Dashboard → 左側 **Compute** → **Workers & Pages** → **Create** → **Start with Hello World**（或 Worker）→ 名稱可用 `cmc-fear-greed` → **Deploy**。

在新 Worker 中按 **Edit code**，把 `worker.js` 的全部內容覆蓋進去 → 按 **Deploy**。

打開新 Worker 的網址（例如 `https://cmc-fear-greed.XXX.workers.dev/health`），應看到 `"ok":true`。

打開 `https://cmc-fear-greed.XXX.workers.dev/api/historical`，應看到 `data` 陣列；若顯示 `error`，請截圖，此時要排查 CMC 對 Worker 來源的存取（Worker 並不保證能繞過上游封鎖）。

## 2. 更新 GitHub Pages

用記事本開啟 `index.html`，搜尋 `WORKER_BASE`，將：

`https://YOUR-NEW-WORKER.YOUR-SUBDOMAIN.workers.dev`

換成你的實際 Worker 網址，**不要在後面加 `/health` 或 `/api`**。

將 `index.html` 上傳覆蓋 GitHub Pages 目前所在資料夾的 `index.html`（例如 `testjs/CMC_Fear_Greed_GitHub_v1.2.0/index.html`）。

開啟既有 GitHub Pages URL，重新整理。瀏覽器讀取 Worker；Worker 即時讀取 CMC 免費 API，並緩存歷史 6 小時、最新 15 分鐘。

## 技術與測試

- CMC 恐懼貪婪數據不替換為其他指數；時間戳支援 Unix 秒／毫秒及 ISO 日期。
- BTC 價格與交易量來自 CryptoCompare，與 CMC 的圖表可能略有差異。
- Worker 只允許 3 個固定 API 路由，沒有任意 URL 代理功能。
- 程式做過語法與 ZIP 檢查；需實際部署後才能驗證 Worker 是否成功連上 CMC。
