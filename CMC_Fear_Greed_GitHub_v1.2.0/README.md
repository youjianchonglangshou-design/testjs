# CMC Fear & Greed v1.3.1

只要將 `index.html` 覆蓋 GitHub Pages 上既有專案的同名檔案即可。`VERSION.json` 可一起更新。

Worker 網址已內建：`https://cmc-fear-greed.youjianchonglangshou.workers.dev`。不需要再次部署 Worker。

在 GitHub Pages 重新整理頁面，即透過 `/api/historical`、`/api/latest`、`/api/btc` 讀取資料。若頁面報錯，先在瀏覽器分別開啟三個 API URL 查看回傳。

注意：已確認 Worker `/` 回傳健康狀態，資料端點尚未驗證成功，不能視為資料載入測試通過。
