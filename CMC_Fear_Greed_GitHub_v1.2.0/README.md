# CMC 加密貨幣恐懼貪婪指數 v1.2.0

## 使用方式
將 `index.html` 與 `VERSION.json` 放到 GitHub Repository 根目錄，開啟 Settings → Pages → Deploy from a branch → main / (root)。開啟網頁時自動取得 CMC 官方一年歷史與最新數值，不需要 GitHub Actions、不需要 YAML、不需要事前產生 JSON。

## 資料來源
- CMC 官方免金鑰 API：`https://pro-api.coinmarketcap.com/public-api/v3/fear-and-greed/historical?limit=370` 與 `/latest`
- 預設先嘗試直接呼叫，受 CORS 限制時再依序嘗試 cors.dev、AllOrigins、corsproxy.io 與 CodeTabs 公開 CORS 代理。
- BTC USD 價格與成交額：CryptoCompare 公開 API，與 CMC 官方報價不同。若該 API 無法使用，僅顯示 CMC 指數曲線。

**重要限制**：公開 CORS 代理屬第三方服務，可能有流量限制、停止服務、拒絕代轉 CMC 或資料過長等問題。本版本在無法讀取時顯示錯誤，不會用其他指數或假資料代替。由於製作環境不能連接這些 API，尚未完成 GitHub Pages 線上實際驗證。
