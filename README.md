# Arcadia → GitHub 雙 JSON 測試版

此版本按一次 `enter` 會：

1. 由目前瀏覽器直接抓取 Arcadia `matchups`。
2. 由目前瀏覽器直接抓取 Arcadia `markets/straight`。
3. 將兩份資料製成：
   - `matchups.json`
   - `markets.json`
4. 透過 GitHub REST API，以**同一個 Git commit**更新到：
   - `youjianchonglangshou-design/testjs`
   - `main` 分支
   - 儲存庫根目錄

## 先修改 app.js

打開 `app.js`，在最上方找到：

```js
const ARCADIA_API_KEY = "請把你的 Arcadia API Key 貼在這裡";
const GITHUB_TOKEN = "請把你的 GitHub Fine-grained Token 貼在這裡";
```

改成自己的內容後儲存。

## GitHub Token 權限

建立 Fine-grained personal access token：

- Repository access：只選 `testjs`
- Repository permissions：`Contents` → `Read and write`

此專案使用 Git Database API，把兩份 JSON 放在同一個 commit；不需要 `Workflows` 權限，除非日後程式本身要修改 `.github/workflows/`。

## 上傳到儲存庫

把壓縮包中的檔案放到 `testjs` 根目錄：

```text
index.html
app.js
styles.css
.nojekyll
README.md
```

原本的 `LICENSE` 可以保留。

## 開啟 GitHub Pages

到儲存庫：

```text
Settings → Pages
```

設定：

```text
Source：Deploy from a branch
Branch：main
Folder：/ (root)
```

頁面網址預計是：

```text
https://youjianchonglangshou-design.github.io/testjs/
```

## 操作

1. 開啟 GitHub Pages 網址。
2. 頁面先顯示上一次 GitHub 根目錄保存的 JSON。
3. 按 `enter`。
4. 兩個 Arcadia API 都成功後，程式會以單一 commit 更新根目錄兩份 JSON。
5. 畫面會提供本次 commit 連結。

## 重要安全提醒

目前是快速測試版。`app.js` 放在公開 GitHub Pages 後，裡面的 Arcadia API Key 與 GitHub Token 都能被任何人查看。

測試完成後應立即撤銷 GitHub Token。正式版應改成：

- GitHub Token 由頁面輸入並只保存在使用者瀏覽器；或
- 使用 GitHub App／OAuth；或
- 其他不把 Token 寫進公開 JavaScript 的方式。
