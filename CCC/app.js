const API_BASE = "https://api.github.com";

const els = {
  owner: document.getElementById("ownerInput"),
  repo: document.getElementById("repoInput"),
  branch: document.getElementById("branchInput"),
  token: document.getElementById("tokenInput"),
  loadBtn: document.getElementById("loadBtn"),
  refreshBtn: document.getElementById("refreshBtn"),
  deleteBtn: document.getElementById("deleteBtn"),
  fileBody: document.getElementById("fileBody"),
  selectAll: document.getElementById("selectAll"),
  status: document.getElementById("status"),
  breadcrumb: document.getElementById("breadcrumb"),
  openGithubLink: document.getElementById("openGithubLink"),
  confirmDialog: document.getElementById("confirmDialog"),
  confirmText: document.getElementById("confirmText"),
  confirmList: document.getElementById("confirmList"),
  commitMessage: document.getElementById("commitMessage"),
  confirmDeleteBtn: document.getElementById("confirmDeleteBtn"),
};

let currentPath = "";
let currentItems = [];
let selectedFiles = new Map();

function cfg() {
  return {
    owner: els.owner.value.trim(),
    repo: els.repo.value.trim(),
    branch: els.branch.value.trim() || "main",
    token: els.token.value.trim(),
  };
}

function headers(requireAuth = false) {
  const { token } = cfg();

  if (requireAuth && !token) {
    throw new Error("刪除檔案前，請輸入 GitHub Token。");
  }

  const h = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2026-03-10",
  };

  if (token) {
    h.Authorization = `Bearer ${token}`;
  }

  return h;
}

function setStatus(message, type = "info") {
  els.status.textContent = message;
  els.status.dataset.type = type;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatBytes(size) {
  if (size === null || size === undefined) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 ** 2).toFixed(1)} MB`;
}

function apiPath(path = currentPath) {
  const { owner, repo, branch } = cfg();
  if (!owner || !repo) {
    throw new Error("Owner 與 Repository 不能空白。");
  }

  const encodedPath = path
    ? "/" + path.split("/").map(encodeURIComponent).join("/")
    : "";

  return `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents${encodedPath}?ref=${encodeURIComponent(branch)}`;
}

async function githubRequest(url, options = {}) {
  const response = await fetch(url, options);

  let data = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await response.json();
  }

  if (!response.ok) {
    const message = data?.message || `${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return data;
}

async function loadDirectory(path = "") {
  currentPath = path;
  selectedFiles.clear();
  updateSelectionUI();
  setStatus("正在讀取 GitHub 專案…", "working");

  try {
    const data = await githubRequest(apiPath(path), {
      headers: headers(false),
    });

    if (!Array.isArray(data)) {
      throw new Error("目前路徑不是資料夾。");
    }

    currentItems = data.sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name, "zh-Hant");
    });

    renderBreadcrumb();
    renderItems();

    const { owner, repo, branch } = cfg();
    els.openGithubLink.href = `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/tree/${encodeURIComponent(branch)}${path ? "/" + path.split("/").map(encodeURIComponent).join("/") : ""}`;

    setStatus(`讀取完成：${currentItems.length} 個項目。`, "success");
  } catch (error) {
    currentItems = [];
    renderItems();
    renderBreadcrumb();
    setStatus(`讀取失敗：${error.message}`, "error");
  }
}

function renderBreadcrumb() {
  const parts = currentPath ? currentPath.split("/") : [];
  const crumbs = [{ label: "ROOT", path: "" }];

  let acc = "";
  for (const part of parts) {
    acc = acc ? `${acc}/${part}` : part;
    crumbs.push({ label: part, path: acc });
  }

  els.breadcrumb.innerHTML = crumbs
    .map((crumb, index) => {
      const isCurrent = index === crumbs.length - 1;
      return `
        ${index ? '<span class="muted">/</span>' : ""}
        <button
          type="button"
          class="crumb ${isCurrent ? "current" : ""}"
          data-path="${escapeHtml(crumb.path)}"
          ${isCurrent ? "disabled" : ""}
        >${escapeHtml(crumb.label)}</button>
      `;
    })
    .join("");

  els.breadcrumb.querySelectorAll(".crumb:not(.current)").forEach((btn) => {
    btn.addEventListener("click", () => loadDirectory(btn.dataset.path || ""));
  });
}

function renderItems() {
  if (!currentItems.length) {
    els.fileBody.innerHTML = `<tr><td colspan="5" class="empty">這個資料夾沒有項目</td></tr>`;
    els.selectAll.checked = false;
    els.selectAll.disabled = true;
    return;
  }

  const rows = currentItems.map((item) => {
    const isDir = item.type === "dir";
    const icon = isDir ? "📁" : "📄";
    const nameCell = isDir
      ? `<button class="folder-name" type="button" data-folder="${escapeHtml(item.path)}">${icon} ${escapeHtml(item.name)}</button>`
      : `<span class="file-name">${icon} ${escapeHtml(item.name)}</span>`;

    return `
      <tr>
        <td class="check-col">
          ${
            isDir
              ? ""
              : `<input
                    type="checkbox"
                    class="file-check"
                    data-path="${escapeHtml(item.path)}"
                    aria-label="選取 ${escapeHtml(item.name)}"
                 />`
          }
        </td>
        <td>${nameCell}</td>
        <td>${isDir ? "資料夾" : "檔案"}</td>
        <td>${isDir ? "—" : formatBytes(item.size)}</td>
        <td class="muted">${escapeHtml(item.sha.slice(0, 12))}</td>
      </tr>
    `;
  });

  els.fileBody.innerHTML = rows.join("");

  els.fileBody.querySelectorAll(".folder-name").forEach((button) => {
    button.addEventListener("click", () => loadDirectory(button.dataset.folder));
  });

  els.fileBody.querySelectorAll(".file-check").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const item = currentItems.find((x) => x.path === checkbox.dataset.path);
      if (!item) return;

      if (checkbox.checked) {
        selectedFiles.set(item.path, item);
      } else {
        selectedFiles.delete(item.path);
      }

      updateSelectionUI();
    });
  });

  els.selectAll.disabled = !currentItems.some((item) => item.type === "file");
  updateSelectionUI();
}

function updateSelectionUI() {
  const checks = [...document.querySelectorAll(".file-check")];
  const checkedCount = checks.filter((x) => x.checked).length;

  els.deleteBtn.disabled = selectedFiles.size === 0;
  els.deleteBtn.textContent = selectedFiles.size
    ? `刪除已勾選檔案 (${selectedFiles.size})`
    : "刪除已勾選檔案";

  els.selectAll.checked = checks.length > 0 && checkedCount === checks.length;
  els.selectAll.indeterminate = checkedCount > 0 && checkedCount < checks.length;
}

els.selectAll.addEventListener("change", () => {
  const shouldCheck = els.selectAll.checked;

  document.querySelectorAll(".file-check").forEach((checkbox) => {
    checkbox.checked = shouldCheck;
    const item = currentItems.find((x) => x.path === checkbox.dataset.path);
    if (!item) return;

    if (shouldCheck) {
      selectedFiles.set(item.path, item);
    } else {
      selectedFiles.delete(item.path);
    }
  });

  updateSelectionUI();
});

function openDeleteDialog() {
  const files = [...selectedFiles.values()];
  if (!files.length) return;

  els.confirmText.textContent = `你準備從 ${cfg().owner}/${cfg().repo} 的 ${cfg().branch} 分支刪除 ${files.length} 個檔案。`;
  els.confirmList.innerHTML = files
    .map((file) => `<div>${escapeHtml(file.path)}</div>`)
    .join("");

  els.confirmDialog.showModal();
}

async function deleteOneFile(file, commitMessage) {
  const { owner, repo, branch } = cfg();
  const encodedPath = file.path.split("/").map(encodeURIComponent).join("/");
  const url = `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`;

  return githubRequest(url, {
    method: "DELETE",
    headers: {
      ...headers(true),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: commitMessage,
      sha: file.sha,
      branch,
    }),
  });
}

async function deleteSelected() {
  const files = [...selectedFiles.values()];
  if (!files.length) return;

  const commitMessage = els.commitMessage.value.trim() || "Delete selected files via web manager";

  els.confirmDialog.close();
  els.loadBtn.disabled = true;
  els.refreshBtn.disabled = true;
  els.deleteBtn.disabled = true;

  let deleted = 0;
  const failed = [];

  try {
    headers(true);

    for (const file of files) {
      setStatus(`正在刪除 ${deleted + 1}/${files.length}：${file.path}`, "working");

      try {
        await deleteOneFile(file, commitMessage);
        deleted++;
      } catch (error) {
        failed.push(`${file.path}：${error.message}`);
      }
    }

    if (failed.length) {
      setStatus(
        `完成 ${deleted} 個，失敗 ${failed.length} 個。${failed.join(" ｜ ")}`,
        "error"
      );
    } else {
      setStatus(`已成功刪除 ${deleted} 個檔案。`, "success");
    }

    await loadDirectory(currentPath);
  } catch (error) {
    setStatus(`刪除失敗：${error.message}`, "error");
  } finally {
    els.loadBtn.disabled = false;
    els.refreshBtn.disabled = false;
  }
}

els.loadBtn.addEventListener("click", () => loadDirectory(""));
els.refreshBtn.addEventListener("click", () => loadDirectory(currentPath));
els.deleteBtn.addEventListener("click", openDeleteDialog);

els.confirmDeleteBtn.addEventListener("click", (event) => {
  event.preventDefault();
  deleteSelected();
});

[els.owner, els.repo, els.branch].forEach((input) => {
  input.addEventListener("change", () => {
    currentPath = "";
    selectedFiles.clear();
    updateSelectionUI();
  });
});
