# Arcadia → Cloudflare Worker → R2
https://youjianchonglangshou-design.github.io/testjs/
此版本按一次 `enter` 會：

1. 由目前瀏覽器直接抓取 Arcadia `matchups`。
2. 由目前瀏覽器直接抓取 Arcadia `markets/straight`。
3. 將兩份資料送到 Cloudflare Worker。
4. Worker 驗證 `UPLOAD_TOKEN`。
5. Worker 將資料寫入 R2 Bucket `tennis-json`：
   - `matchups.json`
   - `markets.json`
   - `meta.json`
6. 頁面再從 Worker 讀回兩份 JSON，確認保存成功。

## app.js 必填兩個位置

打開 `app.js`，在最上方填入：

```js
const ARCADIA_API_KEY =
  "你的 Arcadia API Key";

const WORKER_UPLOAD_TOKEN =
  "你在 Cloudflare Secret 設定的 UPLOAD_TOKEN 值";
```

`WORKER_UPLOAD_TOKEN` 必須和 Cloudflare Worker：

```text
Settings
→ Variables and secrets
→ UPLOAD_TOKEN
```

裡面設定的 Secret 值完全相同。

此版本不再跳出輸入視窗，也不再使用 `localStorage`。

## Worker 設定

R2 Binding：

```text
Name：JSON_BUCKET
Bucket：tennis-json
```

Secret：

```text
UPLOAD_TOKEN
```

## Worker 網址

```text
https://tennis-json-store.youjianchonglangshou.workers.dev
```

## 安全提醒

若把此版本上傳到公開 GitHub，`app.js` 裡的 `ARCADIA_API_KEY` 與
`WORKER_UPLOAD_TOKEN` 都能被任何人查看。

此版本只適合快速測試。正式版應改成頁面臨時輸入、登入驗證，
或由其他安全後端管理憑證。
