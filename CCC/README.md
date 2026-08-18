# GitHub 專案檔案管理器

這是一個純前端 HTML 工具，可以：

- 讀取 GitHub Repository 的檔案 / 資料夾
- 點進資料夾瀏覽
- 每個檔案旁顯示核取方塊
- 勾選多個檔案後刪除
- 刪除會直接寫入指定 Branch 並產生 Commit

## 預設專案

- Owner: `youjianchonglangshou-design`
- Repository: `testjs`
- Branch: `main`

都可以在畫面上修改。

## GitHub Token

公開 Repository 可不登入直接讀取，但「刪除」一定需要 Token。

建議建立 Fine-grained personal access token，只授權你要管理的 Repository，Repository permissions 至少設定：

- Contents: Read and write

Token 不會寫進程式碼，也不會存到 localStorage；重新整理頁面後就會消失。

## 使用方法

1. 把 `index.html`、`styles.css`、`app.js` 放在同一資料夾。
2. 可直接用 GitHub Pages 或一般靜態網頁主機。
3. 打開頁面。
4. 輸入 GitHub Token。
5. 按「讀取專案」。
6. 勾選要刪除的檔案。
7. 按「刪除已勾選檔案」。
8. 再次確認後執行。

## 注意

目前「資料夾」本身沒有核取方塊。要刪除資料夾，先點進資料夾，再把裡面的檔案勾選刪除。Git 本身不保存空資料夾，因此裡面的檔案刪完後，該資料夾自然會消失。

多個檔案目前會逐檔呼叫 GitHub Contents API，因此每個檔案各自形成一個 commit。
