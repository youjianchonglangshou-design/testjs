(() => {
  "use strict";

  // ============================================================
  // 請自行填入 Arcadia API Key。
  // ============================================================
  const ARCADIA_API_KEY =
    "請把你的 Arcadia API Key 貼在這裡";

  const WORKER_URL =
    "https://tennis-json-store.youjianchonglangshou.workers.dev";

  // ============================================================
  // 請填入和 Cloudflare Secret UPLOAD_TOKEN 完全相同的值。
  // ============================================================
  const WORKER_UPLOAD_TOKEN =
    "請把你的 UPLOAD_TOKEN 貼在這裡";

  const ALLOWED_ARCADIA_HOST =
    "guest.api.arcadia.pinnacle.com";
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
    workerName: document.getElementById("workerName"),
    storageName: document.getElementById("storageName"),
    matchupsCount: document.getElementById("matchupsCount"),
    marketsCount: document.getElementById("marketsCount"),
    oddsTableBody: document.getElementById("oddsTableBody"),
    oddsTableCount: document.getElementById("oddsTableCount"),
    oddsTableCaption: document.getElementById("oddsTableCaption"),
    statusDot: document.getElementById("statusDot"),
    statusTitle: document.getElementById("statusTitle"),
    statusStage: document.getElementById("statusStage"),
    statusMessage: document.getElementById("statusMessage"),
    progressBar: document.getElementById("progressBar"),
    workerLink: document.getElementById("workerLink"),
    errorPanel: document.getElementById("errorPanel"),
    errorMessage: document.getElementById("errorMessage"),
    errorDetails: document.getElementById("errorDetails")
  };

  let latestFiles = null;

  function setStatus({
    type = "idle",
    title,
    stage,
    message,
    progress
  }) {
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
    const message = error instanceof Error
      ? error.message
      : String(error);
    const details = error instanceof Error && error.stack
      ? error.stack
      : String(error);

    elements.errorPanel.hidden = false;
    elements.errorMessage.textContent = message;
    elements.errorDetails.textContent = details;
  }

  function validateConfiguration() {
    if (
      !ARCADIA_API_KEY.trim() ||
      ARCADIA_API_KEY.includes("請把你的")
    ) {
      throw new Error(
        "請先打開 app.js，填入 ARCADIA_API_KEY。"
      );
    }

    if (
      !WORKER_UPLOAD_TOKEN.trim() ||
      WORKER_UPLOAD_TOKEN.includes("請把你的")
    ) {
      throw new Error(
        "請先打開 app.js，填入 WORKER_UPLOAD_TOKEN。"
      );
    }

    let parsed;

    try {
      parsed = new URL(WORKER_URL);
    } catch {
      throw new Error("WORKER_URL 格式不正確。");
    }

    if (parsed.protocol !== "https:") {
      throw new Error("WORKER_URL 必須使用 HTTPS。");
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
      throw new Error(
        `${label} API 只允許 ${ALLOWED_ARCADIA_HOST}。`
      );
    }

    return parsed.toString();
  }

  async function readResponseError(response, fallback) {
    const text = await response.text();

    try {
      const payload = JSON.parse(text);
      return (
        payload.error ||
        payload.message ||
        payload.detail ||
        payload.title ||
        fallback
      );
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
      throw new Error(
        `${label} HTTP ${response.status}：${detail}`
      );
    }

    const text = await response.text();

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(
        `${label} API 回傳內容不是有效 JSON。`
      );
    }
  }

  async function uploadJsonToWorker(
    matchupsData,
    marketsData
  ) {
    const response = await fetch(`${WORKER_URL}/upload`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization:
          `Bearer ${WORKER_UPLOAD_TOKEN.trim()}`
      },
      body: JSON.stringify({
        matchups: matchupsData,
        markets: marketsData
      }),
      cache: "no-store"
    });

    if (!response.ok) {
      const detail = await readResponseError(
        response,
        "Worker 上傳失敗"
      );

      if (response.status === 401) {
        throw new Error(
          `Worker HTTP 401：${detail}。` +
          "請確認 app.js 裡的 WORKER_UPLOAD_TOKEN，" +
          "和 Cloudflare Secret 的 UPLOAD_TOKEN 完全相同。"
        );
      }

      throw new Error(
        `Worker HTTP ${response.status}：${detail}`
      );
    }

    return response.json();
  }

  async function fetchWorkerJson(filename) {
    const response = await fetch(
      `${WORKER_URL}/${filename}?v=${Date.now()}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      const detail = await readResponseError(
        response,
        `${filename} 讀取失敗`
      );
      throw new Error(
        `${filename} HTTP ${response.status}：${detail}`
      );
    }

    return response.json();
  }

  function decimalOdds(americanPrice) {
    if (
      americanPrice === null ||
      americanPrice === undefined ||
      americanPrice === "鎖盤中"
    ) {
      return "鎖盤中";
    }

    const value = Number(americanPrice);

    if (!Number.isFinite(value) || value === 0) {
      return "鎖盤中";
    }

    const decimal = value > 0
      ? value / 100 + 1
      : 100 / Math.abs(value) + 1;

    return decimal.toFixed(3);
  }

  function getTaipeiDateParts(date) {
    const formatter = new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Asia/Taipei",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
      }
    );

    return Object.fromEntries(
      formatter
        .formatToParts(date)
        .filter(part => part.type !== "literal")
        .map(part => [part.type, part.value])
    );
  }

  function getMatchStart(matchup) {
    let raw = matchup?.startTime;

    if (!raw && Array.isArray(matchup?.periods)) {
      const mainPeriod = matchup.periods.find(
        period =>
          period &&
          Number(period.period) === 0 &&
          period.cutoffAt
      );

      raw = mainPeriod?.cutoffAt;
    }

    if (!raw) {
      return {
        text: "未知",
        sortValue: Number.MAX_SAFE_INTEGER
      };
    }

    const date = new Date(raw);

    if (Number.isNaN(date.getTime())) {
      return {
        text: "時間錯誤",
        sortValue: Number.MAX_SAFE_INTEGER
      };
    }

    const parts = getTaipeiDateParts(date);

    return {
      text:
        `${parts.year}-${parts.month}-${parts.day} ` +
        `${parts.hour}:${parts.minute}`,
      sortValue: date.getTime()
    };
  }

  function getParticipants(matchup) {
    const result = {
      home: "未知",
      away: "未知"
    };

    if (!Array.isArray(matchup?.participants)) {
      return result;
    }

    for (const participant of matchup.participants) {
      if (!participant || !participant.name) continue;

      if (participant.alignment === "home") {
        result.home = participant.name;
      }

      if (participant.alignment === "away") {
        result.away = participant.name;
      }
    }

    return result;
  }

  function marketScore(market, prices) {
    let score = 0;

    if (String(market?.status || "").toLowerCase() === "open") {
      score += 4;
    }

    if (market?.isAlternate !== true) {
      score += 2;
    }

    if (
      prices.home !== undefined &&
      prices.away !== undefined
    ) {
      score += 1;
    }

    return score;
  }

  function buildMoneylineMap(marketsData) {
    const moneylines = new Map();

    if (!Array.isArray(marketsData)) {
      return moneylines;
    }

    for (const market of marketsData) {
      if (
        !market ||
        market.type !== "moneyline" ||
        Number(market.period) !== 0
      ) {
        continue;
      }

      const prices = {};

      if (Array.isArray(market.prices)) {
        for (const item of market.prices) {
          if (!item?.designation) continue;
          prices[item.designation] = item.price;
        }
      }

      const matchupId = String(
        market.matchupId ?? ""
      );

      if (!matchupId) continue;

      const candidate = {
        homeOdds: decimalOdds(prices.home),
        awayOdds: decimalOdds(prices.away),
        score: marketScore(market, prices)
      };

      const current = moneylines.get(matchupId);

      if (!current || candidate.score >= current.score) {
        moneylines.set(matchupId, candidate);
      }
    }

    return moneylines;
  }

  function buildOddsRows(matchupsData, marketsData) {
    if (!Array.isArray(matchupsData)) {
      return [];
    }

    const moneylines = buildMoneylineMap(marketsData);
    const rows = [];

    for (const matchup of matchupsData) {
      const matchupId = String(matchup?.id ?? "");
      const market = moneylines.get(matchupId);

      // 目前表格只顯示有全場 moneyline 的比賽。
      if (!market) continue;

      const participants = getParticipants(matchup);
      const start = getMatchStart(matchup);

      rows.push({
        matchupId,
        dateTime: start.text,
        sortValue: start.sortValue,
        home: participants.home,
        away: participants.away,
        homeOdds: market.homeOdds,
        awayOdds: market.awayOdds
      });
    }

    rows.sort((left, right) => {
      if (left.sortValue !== right.sortValue) {
        return left.sortValue - right.sortValue;
      }

      return left.matchupId.localeCompare(
        right.matchupId
      );
    });

    return rows;
  }

  function addCell(row, text, className = "") {
    const cell = document.createElement("td");
    cell.textContent = text;

    if (className) {
      cell.className = className;
    }

    row.appendChild(cell);
  }

  function renderOddsTable(
    matchupsData,
    marketsData,
    caption
  ) {
    const rows = buildOddsRows(
      matchupsData,
      marketsData
    );

    elements.oddsTableBody.textContent = "";
    elements.oddsTableCount.textContent =
      `${rows.length} 場`;
    elements.oddsTableCaption.textContent = caption;

    if (rows.length === 0) {
      const row = document.createElement("tr");
      row.className = "empty-row";

      const cell = document.createElement("td");
      cell.colSpan = 4;
      cell.textContent =
        "目前沒有可配對的全場勝負賠率。";

      row.appendChild(cell);
      elements.oddsTableBody.appendChild(row);
      return;
    }

    const fragment = document.createDocumentFragment();

    for (const item of rows) {
      const row = document.createElement("tr");

      addCell(row, item.dateTime, "date-cell");
      addCell(
        row,
        `${item.home}  vs  ${item.away}`,
        "match-cell"
      );
      addCell(row, item.homeOdds, "odds-cell");
      addCell(row, item.awayOdds, "odds-cell");

      fragment.appendChild(row);
    }

    elements.oddsTableBody.appendChild(fragment);
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

  function displayData(
    matchupsData,
    marketsData,
    caption
  ) {
    const files = {
      matchups: JSON.stringify(
        matchupsData,
        null,
        2
      ),
      markets: JSON.stringify(
        marketsData,
        null,
        2
      )
    };

    latestFiles = files;

    elements.jsonViewer.textContent = formatCombined(
      files.matchups,
      files.markets
    );
    elements.viewerCaption.textContent = caption;
    elements.copyButton.disabled = false;
    elements.downloadButton.disabled = false;

    renderOddsTable(
      matchupsData,
      marketsData,
      caption
    );
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

    window.setTimeout(
      () => URL.revokeObjectURL(url),
      10000
    );
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
        message:
          `已複製 ${text.length.toLocaleString()} 個字元。`,
        progress: 100
      });
    } catch (error) {
      showError(error);
    }
  }

  function downloadBoth() {
    if (!latestFiles) return;

    triggerDownload(
      latestFiles.matchups,
      MATCHUPS_PATH
    );
    window.setTimeout(
      () => triggerDownload(
        latestFiles.markets,
        MARKETS_PATH
      ),
      250
    );
  }

  async function loadPreviousFiles() {
    try {
      const [matchupsData, marketsData] =
        await Promise.all([
          fetchWorkerJson(MATCHUPS_PATH),
          fetchWorkerJson(MARKETS_PATH)
        ]);

      displayData(
        matchupsData,
        marketsData,
        "顯示 Cloudflare R2 裡上次保存的資料"
      );

      elements.matchupsCount.textContent =
        Array.isArray(matchupsData)
          ? matchupsData.length
          : "物件";
      elements.marketsCount.textContent =
        Array.isArray(marketsData)
          ? marketsData.length
          : "物件";

      setStatus({
        type: "success",
        title: "已載入 R2 上次資料",
        stage: "待命",
        message:
          "已組合比賽日期時間、對陣與雙方賠率；按 enter 才會重新抓取。",
        progress: 100
      });
    } catch (error) {
      latestFiles = null;
      elements.copyButton.disabled = true;
      elements.downloadButton.disabled = true;
      elements.jsonViewer.textContent =
        "Cloudflare R2 尚無 matchups.json 與 markets.json。";
      elements.oddsTableBody.innerHTML =
        '<tr class="empty-row"><td colspan="4">R2 尚無可顯示資料。</td></tr>';
      elements.oddsTableCount.textContent = "0 場";
      elements.oddsTableCaption.textContent =
        "按 enter 完成第一次抓取與上傳後，這裡會顯示表格。";

      setStatus({
        type: "idle",
        title: "R2 尚無上次資料",
        stage: "待命",
        message:
          "按 enter 完成第一次抓取與上傳後，資料會出現在這裡。",
        progress: 8
      });

      console.info(error);
    }
  }

  async function run() {
    clearError();
    elements.workerLink.hidden = true;
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
        stage: "1 / 5",
        message:
          "使用目前瀏覽器所在電腦的網路，同時取得兩份資料。",
        progress: 18
      });

      const [matchupsData, marketsData] =
        await Promise.all([
          fetchArcadiaJson(matchupsUrl, "賽事"),
          fetchArcadiaJson(marketsUrl, "賠率")
        ]);

      setStatus({
        type: "running",
        title: "Arcadia 抓取成功",
        stage: "2 / 5",
        message:
          "正在依 matchupId 組合比賽與全場勝負賠率。",
        progress: 38
      });

      elements.matchupsCount.textContent =
        Array.isArray(matchupsData)
          ? matchupsData.length
          : "物件";
      elements.marketsCount.textContent =
        Array.isArray(marketsData)
          ? marketsData.length
          : "物件";

      displayData(
        matchupsData,
        marketsData,
        "顯示本次剛取得、準備送入 Cloudflare R2 的資料"
      );

      setStatus({
        type: "running",
        title: "正在送往 Cloudflare Worker",
        stage: "3 / 5",
        message:
          "Worker 驗證 UPLOAD_TOKEN 後，會覆蓋 R2 兩份檔案。",
        progress: 58
      });

      const uploadResult = await uploadJsonToWorker(
        matchupsData,
        marketsData
      );

      setStatus({
        type: "running",
        title: "R2 寫入成功",
        stage: "4 / 5",
        message:
          "正在從 Worker 重新讀取兩份 JSON，確認保存結果。",
        progress: 78
      });

      const [savedMatchups, savedMarkets] =
        await Promise.all([
          fetchWorkerJson(MATCHUPS_PATH),
          fetchWorkerJson(MARKETS_PATH)
        ]);

      displayData(
        savedMatchups,
        savedMarkets,
        "已從 Cloudflare R2 讀回並驗證本次保存的資料"
      );

      elements.workerLink.href =
        `${WORKER_URL}/meta.json?v=${Date.now()}`;
      elements.workerLink.hidden = false;

      setStatus({
        type: "success",
        title: "Cloudflare R2 更新完成",
        stage: "5 / 5",
        message:
          `matchups：${uploadResult.matchupCount} 筆；` +
          `markets：${uploadResult.marketCount} 筆；` +
          `表格：${buildOddsRows(savedMatchups, savedMarkets).length} 場。`,
        progress: 100
      });
    } catch (error) {
      console.error(error);
      showError(error);

      setStatus({
        type: "error",
        title: "執行失敗",
        stage: "中止",
        message: error instanceof Error
          ? error.message
          : String(error),
        progress: 100
      });
    } finally {
      elements.enterButton.disabled = false;
      elements.enterButton.textContent = "enter";
    }
  }

  elements.workerName.textContent =
    new URL(WORKER_URL).hostname;
  elements.storageName.textContent = "R2 / tennis-json";
  elements.workerLink.href = `${WORKER_URL}/health`;

  elements.enterButton.addEventListener("click", run);
  elements.copyButton.addEventListener("click", copyBoth);
  elements.downloadButton.addEventListener(
    "click",
    downloadBoth
  );

  for (const input of [
    elements.matchupsUrl,
    elements.marketsUrl
  ]) {
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") run();
    });
  }

  loadPreviousFiles();
})();
