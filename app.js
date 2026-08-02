(() => {
  "use strict";

  // ============================================================
  // 測試設定：請自行把兩組憑證貼在下方雙引號中。
  // 注意：此檔案若放在公開 GitHub，任何人都能看見內容。
  // ============================================================
  const ARCADIA_API_KEY = "CmX2KcMrXuFmNg6YFbmTxE0y9CIrOi0R";
  const GITHUB_TOKEN = "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";

  // 目標 GitHub 儲存庫已依照你的測試專案設定完成。
  const GITHUB_OWNER = "youjianchonglangshou-design";
  const GITHUB_REPO = "testjs";
  const GITHUB_BRANCH = "main";
  const GITHUB_API_VERSION = "2026-03-10";

  const ALLOWED_ARCADIA_HOST = "guest.api.arcadia.pinnacle.com";
  const MATCHUPS_PATH = "matchups.json";
  const MARKETS_PATH = "markets.json";

  const elements = {
    matchupsUrl: document.getElementById("matchupsUrl"),
    marketsUrl: document.getElementById("marketsUrl"),
    enterButton: document.getElementById("enterButton"),
    copyButton: document.getElementById("copyButton"),
    downloadButton: document.getElementById("downloadButton"),
    jsonViewer: document.getElementById("jsonViewer"),
    viewerCaption: document.getElementById("viewerCaption"),
    repoName: document.getElementById("repoName"),
    branchName: document.getElementById("branchName"),
    matchupsCount: document.getElementById("matchupsCount"),
    marketsCount: document.getElementById("marketsCount"),
    statusDot: document.getElementById("statusDot"),
    statusTitle: document.getElementById("statusTitle"),
    statusStage: document.getElementById("statusStage"),
    statusMessage: document.getElementById("statusMessage"),
    progressBar: document.getElementById("progressBar"),
    commitLink: document.getElementById("commitLink"),
    errorPanel: document.getElementById("errorPanel"),
    errorMessage: document.getElementById("errorMessage"),
    errorDetails: document.getElementById("errorDetails")
  };

  let latestFiles = null;

  function setStatus({ type = "idle", title, stage, message, progress }) {
    elements.statusDot.className = `status-dot ${type}`;
    elements.statusTitle.textContent = title;
    elements.statusStage.textContent = stage;
    elements.statusMessage.textContent = message;
    elements.progressBar.style.width = `${progress}%`;
  }

  function clearError() {
    elements.errorPanel.hidden = true;
    elements.errorMessage.textContent = "";
    elements.errorDetails.textContent = "";
  }

  function showError(error) {
    const message = error instanceof Error ? error.message : String(error);
    const details = error instanceof Error && error.stack ? error.stack : String(error);

    elements.errorPanel.hidden = false;
    elements.errorMessage.textContent = message;
    elements.errorDetails.textContent = details;
  }

  function validateConfiguration() {
    if (
      !ARCADIA_API_KEY.trim() ||
      ARCADIA_API_KEY.includes("請把你的")
    ) {
      throw new Error("請先打開 app.js，填入 ARCADIA_API_KEY。");
    }

    if (
      !GITHUB_TOKEN.trim() ||
      GITHUB_TOKEN.includes("請把你的")
    ) {
      throw new Error("請先打開 app.js，填入 GITHUB_TOKEN。");
    }
  }

  function validateArcadiaUrl(rawValue, label) {
    const value = rawValue.trim();

    if (!value) {
      throw new Error(`${label} API 網址不可空白。`);
    }

    let parsed;

    try {
      parsed = new URL(value);
    } catch {
      throw new Error(`${label} API 網址格式不正確。`);
    }

    if (parsed.protocol !== "https:") {
      throw new Error(`${label} API 只允許 HTTPS。`);
    }

    if (parsed.hostname !== ALLOWED_ARCADIA_HOST) {
      throw new Error(`${label} API 只允許 ${ALLOWED_ARCADIA_HOST}。`);
    }

    return parsed.toString();
  }

  function githubHeaders(includeJson = false) {
    return {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${GITHUB_TOKEN.trim()}`,
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
      ...(includeJson ? { "Content-Type": "application/json" } : {})
    };
  }

  async function readResponseError(response, fallback) {
    const text = await response.text();

    try {
      const payload = JSON.parse(text);
      return payload.message || payload.detail || payload.title || fallback;
    } catch {
      return text || fallback;
    }
  }

  async function fetchArcadiaJson(url, label) {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-api-key": ARCADIA_API_KEY.trim()
      },
      cache: "no-store"
    });

    if (!response.ok) {
      const detail = await readResponseError(
        response,
        `${label} API 抓取失敗`
      );
      throw new Error(`${label} HTTP ${response.status}：${detail}`);
    }

    const text = await response.text();

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`${label} API 回傳內容不是有效 JSON。`);
    }
  }

  async function githubRequest(path, options = {}) {
    const response = await fetch(`https://api.github.com${path}`, {
      ...options,
      headers: {
        ...githubHeaders(Boolean(options.body)),
        ...(options.headers || {})
      },
      cache: "no-store"
    });

    if (!response.ok) {
      const detail = await readResponseError(
        response,
        "GitHub API 請求失敗"
      );
      throw new Error(`GitHub HTTP ${response.status}：${detail}`);
    }

    return response.json();
  }

  async function createBlob(content) {
    const result = await githubRequest(
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/blobs`,
      {
        method: "POST",
        body: JSON.stringify({
          content,
          encoding: "utf-8"
        })
      }
    );

    return result.sha;
  }

  async function commitBothFilesToGitHub(matchupsText, marketsText) {
    setStatus({
      type: "running",
      title: "正在讀取 GitHub 分支",
      stage: "4 / 8",
      message: `取得 ${GITHUB_BRANCH} 的最新 commit。`,
      progress: 52
    });

    const ref = await githubRequest(
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/ref/heads/${encodeURIComponent(GITHUB_BRANCH)}`
    );
    const currentCommitSha = ref.object.sha;

    const currentCommit = await githubRequest(
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/commits/${currentCommitSha}`
    );
    const currentTreeSha = currentCommit.tree.sha;

    setStatus({
      type: "running",
      title: "正在建立兩份 Git blob",
      stage: "5 / 8",
      message: "將 matchups.json 與 markets.json 轉成 Git 物件。",
      progress: 64
    });

    const [matchupsBlobSha, marketsBlobSha] = await Promise.all([
      createBlob(matchupsText),
      createBlob(marketsText)
    ]);

    setStatus({
      type: "running",
      title: "正在建立 Git tree",
      stage: "6 / 8",
      message: "把兩份 JSON 放到儲存庫根目錄。",
      progress: 75
    });

    const tree = await githubRequest(
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees`,
      {
        method: "POST",
        body: JSON.stringify({
          base_tree: currentTreeSha,
          tree: [
            {
              path: MATCHUPS_PATH,
              mode: "100644",
              type: "blob",
              sha: matchupsBlobSha
            },
            {
              path: MARKETS_PATH,
              mode: "100644",
              type: "blob",
              sha: marketsBlobSha
            }
          ]
        })
      }
    );

    setStatus({
      type: "running",
      title: "正在建立單一 commit",
      stage: "7 / 8",
      message: "兩份 JSON 會在同一次 commit 一起更新。",
      progress: 86
    });

    const now = new Intl.DateTimeFormat("zh-TW", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(new Date());

    const commit = await githubRequest(
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/commits`,
      {
        method: "POST",
        body: JSON.stringify({
          message: `Update Arcadia JSON ${now}`,
          tree: tree.sha,
          parents: [currentCommitSha]
        })
      }
    );

    setStatus({
      type: "running",
      title: "正在更新 main 分支",
      stage: "8 / 8",
      message: "將分支指向剛建立的新 commit。",
      progress: 94
    });

    await githubRequest(
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/refs/heads/${encodeURIComponent(GITHUB_BRANCH)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          sha: commit.sha,
          force: false
        })
      }
    );

    return {
      sha: commit.sha,
      url: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/commit/${commit.sha}`
    };
  }

  function formatCombined(matchupsText, marketsText) {
    return [
      "========== matchups.json ==========",
      matchupsText,
      "",
      "========== markets.json ==========",
      marketsText
    ].join("\n");
  }

  function displayFiles(files, caption) {
    latestFiles = files;
    elements.jsonViewer.textContent = formatCombined(
      files.matchups,
      files.markets
    );
    elements.viewerCaption.textContent = caption;
    elements.copyButton.disabled = false;
    elements.downloadButton.disabled = false;
  }

  function triggerDownload(text, filename) {
    const blob = new Blob([text], {
      type: "application/json;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  async function copyBoth() {
    if (!latestFiles) return;

    const text = formatCombined(
      latestFiles.matchups,
      latestFiles.markets
    );

    try {
      await navigator.clipboard.writeText(text);
      setStatus({
        type: "success",
        title: "已複製兩份 JSON",
        stage: "完成",
        message: `已複製 ${text.length.toLocaleString()} 個字元。`,
        progress: 100
      });
    } catch (error) {
      showError(error);
    }
  }

  function downloadBoth() {
    if (!latestFiles) return;

    triggerDownload(latestFiles.matchups, MATCHUPS_PATH);
    window.setTimeout(
      () => triggerDownload(latestFiles.markets, MARKETS_PATH),
      250
    );
  }

  async function loadPreviousFiles() {
    try {
      const cacheBuster = Date.now();
      const [matchupsResponse, marketsResponse] = await Promise.all([
        fetch(`./${MATCHUPS_PATH}?v=${cacheBuster}`, { cache: "no-store" }),
        fetch(`./${MARKETS_PATH}?v=${cacheBuster}`, { cache: "no-store" })
      ]);

      if (!matchupsResponse.ok || !marketsResponse.ok) {
        throw new Error("尚無上次 JSON");
      }

      const [matchupsData, marketsData] = await Promise.all([
        matchupsResponse.json(),
        marketsResponse.json()
      ]);

      const files = {
        matchups: JSON.stringify(matchupsData, null, 2),
        markets: JSON.stringify(marketsData, null, 2)
      };

      displayFiles(files, "顯示 GitHub 根目錄裡上次保存的資料");
      elements.matchupsCount.textContent = Array.isArray(matchupsData)
        ? matchupsData.length
        : "物件";
      elements.marketsCount.textContent = Array.isArray(marketsData)
        ? marketsData.length
        : "物件";

      setStatus({
        type: "success",
        title: "已載入上次資料",
        stage: "待命",
        message: "只有按 enter 才會重新抓 Arcadia 並更新 GitHub。",
        progress: 100
      });
    } catch {
      elements.jsonViewer.textContent = "目前 GitHub 根目錄尚無 matchups.json 與 markets.json。";
      setStatus({
        type: "idle",
        title: "尚無上次資料",
        stage: "待命",
        message: "填好 app.js 內兩組憑證後，按 enter 開始第一次更新。",
        progress: 8
      });
    }
  }

  async function run() {
    clearError();
    elements.commitLink.hidden = true;
    elements.enterButton.disabled = true;
    elements.enterButton.textContent = "執行中";

    try {
      validateConfiguration();

      const matchupsUrl = validateArcadiaUrl(
        elements.matchupsUrl.value,
        "賽事"
      );
      const marketsUrl = validateArcadiaUrl(
        elements.marketsUrl.value,
        "賠率"
      );

      setStatus({
        type: "running",
        title: "正在抓取 Arcadia",
        stage: "1 / 8",
        message: "使用目前瀏覽器所在電腦的網路，同時取得兩份資料。",
        progress: 16
      });

      const [matchupsData, marketsData] = await Promise.all([
        fetchArcadiaJson(matchupsUrl, "賽事"),
        fetchArcadiaJson(marketsUrl, "賠率")
      ]);

      setStatus({
        type: "running",
        title: "Arcadia 抓取成功",
        stage: "2 / 8",
        message: "正在格式化 matchups.json 與 markets.json。",
        progress: 31
      });

      const files = {
        matchups: JSON.stringify(matchupsData, null, 2),
        markets: JSON.stringify(marketsData, null, 2)
      };

      elements.matchupsCount.textContent = Array.isArray(matchupsData)
        ? matchupsData.length
        : "物件";
      elements.marketsCount.textContent = Array.isArray(marketsData)
        ? marketsData.length
        : "物件";

      displayFiles(files, "顯示本次剛取得、準備送入 GitHub 的兩份 JSON");

      setStatus({
        type: "running",
        title: "準備寫入 GitHub",
        stage: "3 / 8",
        message: "驗證 testjs 儲存庫與 main 分支。",
        progress: 42
      });

      const commit = await commitBothFilesToGitHub(
        files.matchups,
        files.markets
      );

      elements.commitLink.href = commit.url;
      elements.commitLink.hidden = false;

      setStatus({
        type: "success",
        title: "GitHub 更新完成",
        stage: "完成",
        message: "matchups.json 與 markets.json 已在同一次 commit 寫入儲存庫根目錄。",
        progress: 100
      });

      elements.viewerCaption.textContent = "本次資料已成功寫入 GitHub 根目錄";
    } catch (error) {
      console.error(error);
      showError(error);

      setStatus({
        type: "error",
        title: "執行失敗",
        stage: "中止",
        message: error instanceof Error ? error.message : String(error),
        progress: 100
      });
    } finally {
      elements.enterButton.disabled = false;
      elements.enterButton.textContent = "enter";
    }
  }

  elements.repoName.textContent = `${GITHUB_OWNER}/${GITHUB_REPO}`;
  elements.branchName.textContent = GITHUB_BRANCH;
  elements.enterButton.addEventListener("click", run);
  elements.copyButton.addEventListener("click", copyBoth);
  elements.downloadButton.addEventListener("click", downloadBoth);

  for (const input of [elements.matchupsUrl, elements.marketsUrl]) {
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") run();
    });
  }

  loadPreviousFiles();
})();
