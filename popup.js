var extensionApi = globalThis.browser ?? globalThis.chrome;

const captureName = document.querySelector("#captureName");
const capturePage = document.querySelector("#capturePage");
const popupSearch = document.querySelector("#popupSearch");
const recentBoards = document.querySelector("#recentBoards");
const popupStatus = document.querySelector("#popupStatus");
const saveTabButton = document.querySelector("#saveTab");
const chooseBoardButton = document.querySelector("#chooseBoard");
const boardMenu = document.querySelector("#boardMenu");
const newBoardForm = document.querySelector("#newBoardForm");
const newBoardName = document.querySelector("#newBoardName");

let popupState = createDefaultState();
let popupWallpaperUrl = "";
let popupAppearanceKey = "";
let currentTab = null;

function showPopupStatus(message, warning = false) {
  popupStatus.textContent = message;
  popupStatus.classList.toggle("warning", warning);
  popupStatus.hidden = false;
  setTimeout(() => { popupStatus.hidden = true; }, 3200);
}

async function initPopup() {
  const [state, windowTabs] = await Promise.all([getTaboraState(), extensionApi.tabs.query({ currentWindow: true })]);
  popupState = state;
  currentTab = windowTabs.find((tab) => tab.active) || null;
  await applyPopupAppearance();
  renderCurrentTab();
  renderSelectors();
  renderRecentBoards();
  const savableCount = windowTabs.filter((tab) => normalizeUrl(tab.url)).length;
  document.querySelector("#windowSaveLabel").textContent = `Save whole window (${savableCount} ${savableCount === 1 ? "tab" : "tabs"}) as a board`;
}

function quickSavePageId() {
  return popupState.settings.quickSaveDestination === "home" ? "home" : popupState.settings.activePageId;
}

function boardLabel(board) {
  const page = popupState.pages.find((item) => item.id === board.pageId);
  return `${page?.name || "Home"} / ${board.name}`;
}

// The last board saved to from the popup; without one, saves go to Quick Saves like the shortcut.
function defaultSaveBoard() {
  return popupState.boards.find((board) => board.id === popupState.settings.lastSaveBoardId) || null;
}

function renderCurrentTab() {
  const url = normalizeUrl(currentTab?.url);
  const duplicate = url ? findDuplicateLink(popupState, url) : null;
  const canSave = Boolean(url) && !duplicate;
  const icon = document.querySelector("#currentTabIcon");
  if (url) icon.replaceChildren(faviconNode({ title: currentTab.title, url, favIconUrl: currentTab.favIconUrl || "" }));
  else icon.replaceChildren();
  document.querySelector("#currentTabTitle").textContent = currentTab?.title || "This tab";
  document.querySelector("#currentTabDomain").textContent = url ? getDomain(url) : "";
  document.querySelector("#unsavableNotice").hidden = Boolean(url);
  document.querySelector("#saveTabControls").hidden = !canSave;
  if (!canSave) {
    closeBoardMenu();
    newBoardForm.hidden = true;
  }

  const notice = document.querySelector("#duplicateNotice");
  notice.hidden = !duplicate;
  if (duplicate) {
    document.querySelector("#duplicateTitle").textContent = `Already in ${duplicate.board.name}`;
    document.querySelector("#duplicateDetail").textContent = `Saved on ${duplicate.page?.name || "Home"}.`;
    notice.dataset.pageId = duplicate.board.pageId;
    notice.dataset.linkId = duplicate.link.id;
  }

  const board = defaultSaveBoard();
  saveTabButton.textContent = `Save to ${board ? board.name : TABORA_QUICK_SAVE_BOARD_NAME}`;
  saveTabButton.title = board ? `Save to ${boardLabel(board)}` : "Save to the Quick Saves board";
}

async function applyPopupAppearance() {
  const { theme, wallpaper } = popupState.settings;
  const appearanceKey = `${theme}:${wallpaper}`;
  if (appearanceKey === popupAppearanceKey) return;
  const appearance = TABORA_WALLPAPERS.find((item) => item.id === wallpaper && item.image);
  document.body.classList.toggle("light-theme", theme === "light");
  document.body.dataset.palette = appearance?.palette || `${theme}-default`;

  if (popupWallpaperUrl) {
    URL.revokeObjectURL(popupWallpaperUrl);
    popupWallpaperUrl = "";
  }

  let image = appearance ? extensionApi.runtime.getURL(appearance.image) : "";
  if (wallpaper.startsWith("custom")) {
    try {
      const blob = await getWallpaperBlob(wallpaper);
      if (blob) {
        popupWallpaperUrl = URL.createObjectURL(blob);
        image = popupWallpaperUrl;
      }
    } catch {
      image = "";
    }
  }
  document.body.style.setProperty("--popup-wallpaper", image ? `url("${image}")` : "none");
  popupAppearanceKey = appearanceKey;
}

function renderSelectors() {
  const selectedPage = capturePage.value || popupState.settings.activePageId;
  capturePage.innerHTML = "";
  for (const page of ordered(popupState.pages)) {
    const option = document.createElement("option");
    option.value = page.id;
    option.textContent = page.name;
    capturePage.append(option);
  }
  capturePage.value = popupState.pages.some((page) => page.id === selectedPage) ? selectedPage : popupState.pages[0].id;

}

function renderRecentBoards() {
  const query = popupSearch.value;
  const boards = [...popupState.boards]
    .filter((board) => boardMatches(board, query))
    .sort((a, b) => (b.lastUsedAt || b.createdAt || 0) - (a.lastUsedAt || a.createdAt || 0))
    .slice(0, 6);
  recentBoards.innerHTML = "";

  if (!boards.length) {
    recentBoards.innerHTML = '<div class="popup-empty">No boards match your search.</div>';
    return;
  }

  for (const board of boards) {
    const row = document.createElement("article");
    row.className = "popup-board-row";
    const openButton = board.links.length ? '<button class="popup-open-button" data-open-board><svg class="popup-button-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4 11 13"></path><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"></path></svg>Open all</button>' : "";
    row.innerHTML = `<span></span><div class="popup-board-copy"><strong></strong><span></span></div>${openButton}`;
    setText(row, "strong", board.name);
    if (openButton) row.querySelector("[data-open-board]").dataset.openBoard = board.id;
    const page = popupState.pages.find((item) => item.id === board.pageId);
    setText(row, ".popup-board-copy span", `${page?.name || "Home"} · ${board.links.length} ${board.links.length === 1 ? "link" : "links"}`);
    recentBoards.append(row);
  }
}

document.querySelector("#saveWindow").addEventListener("click", async () => {
  const saved = await saveCurrentWindowAsBoard(capturePage.value, captureName.value || "Current Window");
  if (!saved?.board) { showPopupStatus(saved?.duplicateCount ? "All open tabs are already saved" : "No tabs are available to save", true); return; }
  captureName.value = "";
  document.querySelector("#windowSave").open = false;
  showPopupStatus(saved.duplicateCount ? `Session saved · ${saved.duplicateCount} duplicates skipped` : "Session saved");
  await initPopup();
});

async function saveTabToBoard(boardId) {
  const url = normalizeUrl(currentTab?.url);
  if (!url) return;
  const targetId = boardId || (await ensureQuickSaveBoard(quickSavePageId())).result.id;
  const added = await addLink(targetId, { title: currentTab.title, url, favIconUrl: currentTab.favIconUrl || "" });
  if (added.result?.duplicate) {
    showPopupStatus(`Already saved in ${added.result.page?.name || "Home"} / ${added.result.board.name}`, true);
    await initPopup();
    return;
  }
  if (!added.result) {
    showPopupStatus("That board no longer exists", true);
    await initPopup();
    return;
  }
  await setSetting("lastSaveBoardId", targetId);
  const board = added.state.boards.find((item) => item.id === targetId);
  showPopupStatus(`Saved to ${board ? boardLabel(board) : "Tabora"}`);
  await initPopup();
}

function closeBoardMenu({ restoreFocus = false } = {}) {
  boardMenu.hidden = true;
  chooseBoardButton.setAttribute("aria-expanded", "false");
  if (restoreFocus) chooseBoardButton.focus();
}

function openBoardMenu() {
  boardMenu.replaceChildren();
  for (const page of ordered(popupState.pages)) {
    for (const board of ordered(popupState.boards.filter((item) => item.pageId === page.id))) {
      const item = document.createElement("button");
      item.type = "button";
      item.setAttribute("role", "menuitem");
      item.className = "board-menu-item";
      item.dataset.saveBoard = board.id;
      item.textContent = `${page.name} / ${board.name}`;
      item.classList.toggle("current", board.id === popupState.settings.lastSaveBoardId);
      boardMenu.append(item);
    }
  }
  const create = document.createElement("button");
  create.type = "button";
  create.setAttribute("role", "menuitem");
  create.className = "board-menu-item board-menu-create";
  create.dataset.newBoard = "true";
  create.textContent = "+ New board…";
  boardMenu.append(create);
  boardMenu.hidden = false;
  chooseBoardButton.setAttribute("aria-expanded", "true");
  (boardMenu.querySelector(".current") || boardMenu.firstElementChild).focus();
}

saveTabButton.addEventListener("click", () => saveTabToBoard(defaultSaveBoard()?.id || ""));
chooseBoardButton.addEventListener("click", () => {
  if (boardMenu.hidden) openBoardMenu();
  else closeBoardMenu();
});

boardMenu.addEventListener("click", async (event) => {
  const item = event.target.closest(".board-menu-item");
  if (!item) return;
  closeBoardMenu();
  if (item.dataset.newBoard) {
    newBoardForm.hidden = false;
    newBoardName.focus();
    return;
  }
  await saveTabToBoard(item.dataset.saveBoard);
});

boardMenu.addEventListener("keydown", (event) => {
  const items = [...boardMenu.querySelectorAll(".board-menu-item")];
  const index = items.indexOf(document.activeElement);
  if (event.key === "Escape") { event.preventDefault(); closeBoardMenu({ restoreFocus: true }); return; }
  let next = index;
  if (event.key === "ArrowDown") next = Math.min(index + 1, items.length - 1);
  else if (event.key === "ArrowUp") next = Math.max(index - 1, 0);
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = items.length - 1;
  else return;
  event.preventDefault();
  items[next]?.focus();
});

document.addEventListener("click", (event) => {
  if (!boardMenu.hidden && !event.target.closest("#boardMenu, #chooseBoard")) closeBoardMenu();
});

newBoardForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const url = normalizeUrl(currentTab?.url);
  if (!url || !newBoardName.value.trim()) return;
  const created = await addBoard(quickSavePageId(), newBoardName.value, [{ title: currentTab.title, url, favIconUrl: currentTab.favIconUrl || "" }]);
  const board = created.result;
  if (!board?.links.length) {
    showPopupStatus("This tab is already saved", true);
    await initPopup();
    return;
  }
  await setSetting("lastSaveBoardId", board.id);
  newBoardName.value = "";
  newBoardForm.hidden = true;
  showPopupStatus(`Saved to new board ${board.name}`);
  await initPopup();
});
newBoardForm.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  event.preventDefault();
  newBoardForm.hidden = true;
  saveTabButton.focus();
});

document.querySelector("#showDuplicate").addEventListener("click", () => {
  const notice = document.querySelector("#duplicateNotice");
  const target = new URL(extensionApi.runtime.getURL("dashboard.html"));
  target.searchParams.set("page", notice.dataset.pageId);
  target.searchParams.set("link", notice.dataset.linkId);
  extensionApi.tabs.create({ url: target.href });
  window.close();
});

document.querySelector("#openDashboard").addEventListener("click", () => {
  extensionApi.tabs.create({ url: extensionApi.runtime.getURL("dashboard.html") });
});

recentBoards.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-open-board]");
  if (!button) return;
  const board = popupState.boards.find((item) => item.id === button.dataset.openBoard);
  if (board) await openLinks(ordered(board.links), popupState.settings.incognitoMode);
});

popupSearch.addEventListener("input", renderRecentBoards);
extensionApi.storage.onChanged.addListener((changes) => {
  if (!changes[TABORA_STORAGE_KEY]) return;
  void initPopup().catch((error) => console.error("Tabora popup could not refresh", error));
});
void initPopup().catch((error) => console.error("Tabora popup could not start", error));
