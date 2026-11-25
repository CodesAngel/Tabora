const assert = require("node:assert/strict");
const fs = require("node:fs");

const port = Number(process.env.TABORA_DEBUG_PORT || 9333);
const screenshotPath = process.env.TABORA_SCREENSHOT || "";
const searchScreenshotPath = process.env.TABORA_SEARCH_SCREENSHOT || "";
const lightMenuScreenshotPath = process.env.TABORA_LIGHT_MENU_SCREENSHOT || "";
const lightDialogScreenshotPath = process.env.TABORA_LIGHT_DIALOG_SCREENSHOT || "";
const popupScreenshotPath = process.env.TABORA_POPUP_SCREENSHOT || "";

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) { this.events.push(message); return; }
      const request = this.pending.get(message.id);
      if (!request) return;
      this.pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  }

  close() { this.socket.close(); }
}

async function waitForTargets() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
      const page = targets.find((target) => target.type === "page");
      if (page) return page;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Brave DevTools endpoint did not become ready");
}

(async () => {
  const target = await waitForTargets();
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Page.navigate", { url: "chrome://newtab" });
  await new Promise((resolve) => setTimeout(resolve, 2200));

  const page = await client.evaluate(`({
    title: document.title,
    url: location.href,
    tool: Boolean(document.querySelector("#featureTool")),
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth
  })`);
  assert.equal(page.title, "Tabora");
  assert.match(page.url, /^chrome-extension:\/\//);
  assert.equal(page.tool, true);
  assert.equal(page.horizontalOverflow, false);

  const manifest = await client.evaluate(`chrome.runtime.getManifest()`);
  assert.equal(manifest.manifest_version, 3);
  assert.ok(!manifest.permissions.includes("alarms"));
  assert.equal(manifest.host_permissions, undefined);
  assert.deepEqual(manifest.optional_host_permissions, ["http://*/*", "https://*/*"]);

  const tour = await client.evaluate(`(async () => {
    await updateTaboraState((state) => {
      state.boards = [];
      state.settings.onboardingComplete = false;
    });
    await refresh();
    await new Promise((resolve) => setTimeout(resolve, 80));
    const card = document.querySelector("#onboardingCard");
    const initial = {
      visible: !card.hidden,
      title: document.querySelector("#onboardingTitle").textContent,
      actions: [...document.querySelectorAll("[data-onboarding-action]")].map((button) => button.textContent)
    };
    document.querySelector('[data-onboarding-action="2"]').click();
    const editorOpened = document.querySelector("#boardDialog").open;
    document.querySelector("#boardDialog").close();
    await addBoard(activePage().id, "Tour board");
    await refresh();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const afterBoard = document.querySelector("#onboardingTitle").textContent;
    document.querySelector("[data-onboarding-dismiss]").click();
    await new Promise((resolve) => setTimeout(resolve, 80));
    const state = await getTaboraState();
    return { initial, editorOpened, afterBoard, complete: state.settings.onboardingComplete, closed: card.hidden };
  })()`);
  assert.equal(tour.initial.visible, true);
  assert.equal(tour.initial.title, "Bring your bookmarks in");
  assert.deepEqual(tour.initial.actions, ["Import bookmarks", "Save open tabs", "Start empty"]);
  assert.equal(tour.editorOpened, true);
  assert.equal(tour.afterBoard, "Add a useful link");
  assert.equal(tour.complete, true);
  assert.equal(tour.closed, true);

  const accessibility = await client.evaluate(`(() => {
    const dialogs = [...document.querySelectorAll("dialog")];
    const namedDialogs = dialogs.every((dialog) => {
      const labelId = dialog.getAttribute("aria-labelledby");
      return Boolean(labelId && document.getElementById(labelId)?.textContent.trim());
    });
    const trigger = document.querySelector('[data-page-options="home"]');
    trigger.click();
    const menu = document.querySelector("#contextMenu");
    const items = [...menu.querySelectorAll('[role="menuitem"]')];
    const firstLabel = document.activeElement?.textContent.trim();
    menu.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    const secondLabel = document.activeElement?.textContent.trim();
    menu.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    return {
      namedDialogs,
      menuRole: menu.getAttribute("role"),
      itemCount: items.length,
      firstLabel,
      secondLabel,
      menuClosed: menu.hidden,
      focusRestored: document.activeElement === trigger,
      expanded: trigger.getAttribute("aria-expanded")
    };
  })()`);
  assert.equal(accessibility.namedDialogs, true);
  assert.equal(accessibility.menuRole, "menu");
  assert.ok(accessibility.itemCount >= 2);
  assert.notEqual(accessibility.firstLabel, accessibility.secondLabel);
  assert.equal(accessibility.menuClosed, true);
  assert.equal(accessibility.focusRestored, true);
  assert.equal(accessibility.expanded, "false");

  const sharing = await client.evaluate(`(async () => {
    const page = activePage();
    let board = appState.boards.find((item) => item.name === "Share Test");
    if (!board) {
      const added = await addBoard(page.id, "Share Test", [{ title: "Example", url: "https://example.com" }], { column: 0, order: 0 });
      board = added.result;
      await refresh();
    }
    const toastText = () => document.querySelector("#toast .toast-copy")?.textContent || "";
    const chooseMenuItem = async (anchor, label) => {
      anchor.click();
      await new Promise((resolve) => setTimeout(resolve, 40));
      const item = [...document.querySelectorAll("#contextMenu button")].find((button) => button.textContent.trim() === label);
      if (!item) return "missing";
      item.click();
      await new Promise((resolve) => setTimeout(resolve, 140));
      return toastText();
    };
    const pageResult = await chooseMenuItem(document.querySelector('[data-page-options="home"]'), "Copy page links");
    const boardResult = await chooseMenuItem(document.querySelector('[data-board-menu="' + board.id + '"]'), "Copy board links");
    document.querySelector('[data-share-link][data-board-id="' + board.id + '"]').click();
    await new Promise((resolve) => setTimeout(resolve, 140));
    return { pageResult, boardResult, linkResult: toastText(), shareButton: Boolean(document.querySelector("[data-share-link]")) };
  })()`);
  assert.equal(sharing.pageResult, "Page links copied");
  assert.equal(sharing.boardResult, "Board links copied");
  assert.equal(sharing.linkResult, "Link copied");
  assert.equal(sharing.shareButton, true);

  const selectiveImport = await client.evaluate(`(() => {
    prepareImport([
      { name: "Bookmarks bar", links: [
        { title: "Alpha", url: "https://selective-import.test/alpha" },
        { title: "Beta", url: "https://selective-import.test/beta" }
      ] },
      { name: "Other bookmarks", links: [
        { title: "Gamma", url: "https://selective-import.test/gamma" }
      ] }
    ], { selectable: true });
    const commit = document.querySelector("#commitImport");
    const initial = {
      groups: document.querySelectorAll("[data-import-group]").length,
      selected: document.querySelectorAll("[data-import-link]:checked").length,
      disabled: commit.disabled
    };
    document.querySelector('[data-import-expand="0"]').click();
    const childList = document.querySelector("#import-group-0-links");
    document.querySelector('[data-import-link-group="0"][data-import-link="0"]').click();
    document.querySelector('[data-import-group="1"]').click();
    const firstGroup = document.querySelector('[data-import-group="0"]');
    const selected = {
      count: document.querySelectorAll("[data-import-link]:checked").length,
      disabled: commit.disabled,
      indeterminate: firstGroup.indeterminate,
      title: document.querySelector("#importPreviewTitle").textContent,
      expanded: !childList.hidden
    };
    document.querySelector("#selectAllImports").click();
    const allSelected = document.querySelectorAll("[data-import-link]:checked").length;
    document.querySelector("#clearImportSelection").click();
    const cleared = {
      count: document.querySelectorAll("[data-import-link]:checked").length,
      disabled: commit.disabled
    };
    document.querySelector("#cancelImportPreview").click();
    return { initial, selected, allSelected, cleared };
  })()`);
  assert.deepEqual(selectiveImport.initial, { groups: 2, selected: 0, disabled: true });
  assert.equal(selectiveImport.selected.count, 2);
  assert.equal(selectiveImport.selected.disabled, false);
  assert.equal(selectiveImport.selected.indeterminate, true);
  assert.match(selectiveImport.selected.title, /2 of 3 links selected in 2 boards/);
  assert.equal(selectiveImport.selected.expanded, true);
  assert.equal(selectiveImport.allSelected, 3);
  assert.deepEqual(selectiveImport.cleared, { count: 0, disabled: true });

  const search = await client.evaluate(`(async () => {
    const tool = document.querySelector("#searchTool");
    const boardCountBefore = document.querySelectorAll(".board-card").length;
    tool.click();
    await new Promise((resolve) => setTimeout(resolve, 250));
    const panel = document.querySelector("#searchPanel");
    const rect = panel.getBoundingClientRect();
    const input = document.querySelector("#globalSearch");
    const opened = {
      visible: !panel.hidden,
      active: document.body.classList.contains("search-active"),
      expanded: tool.getAttribute("aria-expanded"),
      focused: document.activeElement === input,
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
    input.value = "Example";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 220));
    const inputRect = document.querySelector(".search-input-row").getBoundingClientRect();
    const results = document.querySelector("#searchResults");
    const resultsRect = results.getBoundingClientRect();
    opened.resultCount = document.querySelectorAll("#searchResultsList .search-result-link").length;
    opened.resultsBelowInput = resultsRect.top >= inputRect.bottom - 1;
    opened.resultsVisible = !results.hidden;
    opened.boardGridUnchanged = document.querySelectorAll(".board-card").length === boardCountBefore;
    opened.resultsBackground = getComputedStyle(results).backgroundColor;
    document.querySelector(".workspace-main").click();
    await new Promise((resolve) => setTimeout(resolve, 50));
    return { ...opened, closedOutside: panel.hidden, inactive: !document.body.classList.contains("search-active") };
  })()`);
  assert.equal(search.visible, true);
  assert.equal(search.active, true);
  assert.equal(search.expanded, "true");
  assert.equal(search.focused, true);
  assert.ok(search.width >= 500 && search.width <= 720 && search.height >= 50 && search.height <= 80);
  assert.ok(search.resultCount >= 1);
  assert.equal(search.resultsBelowInput, true);
  assert.equal(search.resultsVisible, true);
  assert.equal(search.boardGridUnchanged, true);
  assert.notEqual(search.resultsBackground, "rgba(0, 0, 0, 0)");
  assert.equal(search.closedOutside, true);
  assert.equal(search.inactive, true);

  if (searchScreenshotPath) {
    await client.evaluate(`document.querySelector("#searchTool").click()`);
    await client.evaluate(`(() => { const input = document.querySelector("#globalSearch"); input.value = "Example"; input.dispatchEvent(new Event("input", { bubbles: true })); })()`);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const screenshot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    fs.writeFileSync(searchScreenshotPath, Buffer.from(screenshot.data, "base64"));
    await client.evaluate(`document.querySelector("#searchTool").click()`);
  }

  const themes = await client.evaluate(`(async () => {
    document.querySelector("#wallpaperTool").click();
    await new Promise((resolve) => setTimeout(resolve, 250));
    document.querySelector('#appearancePanel [data-theme="dark"]').click();
    await new Promise((resolve) => setTimeout(resolve, 300));
    const count = document.querySelectorAll("#wallpaperGrid [data-wallpaper]").length;
    document.querySelector('[data-wallpaper="titan-last-wall"]').click();
    await new Promise((resolve) => setTimeout(resolve, 300));
    const darkPalette = document.body.dataset.palette;
    const darkImage = getComputedStyle(document.querySelector("#dashboardBackdrop")).backgroundImage;
    document.querySelector('#appearancePanel [data-theme="light"]').click();
    await new Promise((resolve) => setTimeout(resolve, 300));
    document.querySelector('[data-wallpaper="northern-oath"]').click();
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      darkCount: count,
      lightCount: document.querySelectorAll("#wallpaperGrid [data-wallpaper]").length,
      darkPalette,
      darkImage,
      lightPalette: document.body.dataset.palette,
      lightImage: getComputedStyle(document.querySelector("#dashboardBackdrop")).backgroundImage
    };
  })()`);
  assert.equal(themes.darkCount, 32);
  assert.equal(themes.lightCount, 30);
  assert.equal(themes.darkPalette, "titan");
  assert.match(themes.darkImage, /titan-last-wall\.webp/);
  assert.equal(themes.lightPalette, "northern");
  assert.match(themes.lightImage, /northern-oath\.webp/);

  const lightSurfaces = await client.evaluate(`(async () => {
    const luminance = (value) => {
      const channels = value.match(/[\\d.]+/g).slice(0, 3).map(Number);
      const scale = Math.max(...channels) <= 1 ? 255 : 1;
      return (channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722) * scale;
    };
    document.querySelector("#appearancePanel").hidden = true;
    document.querySelector("[data-page-options]").click();
    await new Promise((resolve) => setTimeout(resolve, 80));
    const menu = document.querySelector("#contextMenu");
    const menuButton = menu.querySelector("button");
    const result = {
      menuBackground: luminance(getComputedStyle(menu).backgroundColor),
      menuText: luminance(getComputedStyle(menuButton).color)
    };
    document.querySelector("#addPageButton").click();
    await new Promise((resolve) => setTimeout(resolve, 80));
    const dialog = document.querySelector("#pageDialog");
    const input = document.querySelector("#pageName");
    result.dialogOpen = dialog.open;
    result.dialogBackground = luminance(getComputedStyle(dialog).backgroundColor);
    result.inputBackground = luminance(getComputedStyle(input).backgroundColor);
    result.inputText = luminance(getComputedStyle(input).color);
    dialog.close();
    return result;
  })()`);
  assert.ok(lightSurfaces.menuBackground > 180 && lightSurfaces.menuText < 120);
  assert.equal(lightSurfaces.dialogOpen, true);
  assert.ok(lightSurfaces.dialogBackground > 180);
  assert.ok(lightSurfaces.inputBackground > 180 && lightSurfaces.inputText < 120);

  if (lightMenuScreenshotPath) {
    await client.evaluate(`document.querySelector("[data-page-options]").click()`);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const screenshot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    fs.writeFileSync(lightMenuScreenshotPath, Buffer.from(screenshot.data, "base64"));
  }
  if (lightDialogScreenshotPath) {
    await client.evaluate(`document.querySelector("#addPageButton").click()`);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const screenshot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    fs.writeFileSync(lightDialogScreenshotPath, Buffer.from(screenshot.data, "base64"));
    await client.evaluate(`document.querySelector("#pageDialog").close()`);
  }

  const hub = await client.evaluate(`(async () => {
    document.querySelector("#appearancePanel").hidden = true;
    document.querySelector("#featureTool").click();
    await new Promise((resolve) => setTimeout(resolve, 500));
    const dialog = document.querySelector("#featureDialog");
    return {
      open: dialog.open,
      views: dialog.querySelectorAll("[data-feature-section]").length,
      width: Math.round(dialog.getBoundingClientRect().width),
      height: Math.round(dialog.getBoundingClientRect().height),
      clipped: dialog.scrollWidth > dialog.clientWidth
    };
  })()`);
  assert.equal(hub.open, true);
  assert.equal(hub.views, 6);
  assert.equal(hub.clipped, false);
  assert.ok(hub.width > 700 && hub.height > 500);

  // Tools overview cards open their tab; the Map is gone.
  const toolsNav = await client.evaluate(`(async () => {
    document.querySelector('[data-feature-goto="vaults"]').click();
    const vaultsActive = document.querySelector('[data-feature-section="vaults"]').classList.contains("active");
    const current = document.querySelector('[data-feature-view][aria-current="page"]')?.dataset.featureView;
    const statuses = [...document.querySelectorAll(".feature-tool-status")].map((node) => node.textContent);
    document.querySelector("#featureDialog").close();
    return { vaultsActive, current, statuses, hasMap: Boolean(document.querySelector('[data-feature-view="knowledge"], #knowledgeGraph')) };
  })()`);
  assert.equal(toolsNav.vaultsActive, true);
  assert.equal(toolsNav.current, "vaults");
  assert.equal(toolsNav.statuses.every(Boolean), true);
  assert.equal(toolsNav.hasMap, false);

  // Reversible deletes never claim they can't be undone; permanent ones do, in red.
  const confirmTones = await client.evaluate(`(async () => {
    const read = () => ({
      tone: nodes.deleteConfirmDialog.dataset.tone,
      caution: document.querySelector("#deleteConfirmCaution").hidden ? "" : document.querySelector("#deleteConfirmCaution").textContent,
      submit: document.querySelector("#deleteConfirmSubmit").textContent
    });
    const trash = requestDeleteConfirmation({ title: "Move?", prompt: "Goes to Trash." });
    const trashState = read();
    document.querySelector("#deleteConfirmCancel").click();
    const cancelled = await trash;
    const forever = requestDeleteConfirmation({ title: "Delete forever?", prompt: "Gone.", caution: "You can't undo this.", tone: "danger", submitLabel: "Delete forever" });
    const dangerState = read();
    document.querySelector("#deleteConfirmSubmit").click();
    return { trashState, cancelled, dangerState, confirmed: await forever };
  })()`);
  assert.deepEqual(confirmTones.trashState, { tone: "trash", caution: "", submit: "Move to Trash" });
  assert.equal(confirmTones.cancelled, false);
  assert.deepEqual(confirmTones.dangerState, { tone: "danger", caution: "You can't undo this.", submit: "Delete forever" });
  assert.equal(confirmTones.confirmed, true);

  // Pasted text: plain lines are skipped and counted, and the button says how many links it found.
  const paste = await client.evaluate(`(async () => {
    document.querySelector("#importTool").click();
    document.querySelector('[data-import="text"]').click();
    const pressed = document.querySelector('[data-import="text"]').getAttribute("aria-pressed");
    nodes.importText.value = ["Docs | https://paste-check.test/docs", "meeting notes for friday", "hello"].join(String.fromCharCode(10));
    nodes.importText.dispatchEvent(new Event("input"));
    const result = { pressed, status: document.querySelector("#importTextStatus").textContent, button: document.querySelector("#confirmTextImport").textContent };
    nodes.importDialog.close();
    return result;
  })()`);
  assert.equal(paste.pressed, "true");
  assert.equal(paste.status, "1 link found · 2 lines skipped (not a web address)");
  assert.equal(paste.button, "Review 1 link");

  // At phone width the tools dialog fits and its close button stays on screen.
  await client.send("Emulation.setDeviceMetricsOverride", { width: 400, height: 800, deviceScaleFactor: 1, mobile: false });
  const narrowTools = await client.evaluate(`(async () => {
    await openFeatureCenter("overview");
    await new Promise((resolve) => setTimeout(resolve, 200));
    const dialog = document.querySelector("#featureDialog").getBoundingClientRect();
    const close = document.querySelector("#featureDialog .settings-close").getBoundingClientRect();
    document.querySelector("#featureDialog").close();
    return { fits: dialog.right <= innerWidth && dialog.left >= 0, closeVisible: close.right <= innerWidth && close.top >= 0 && close.width > 0 };
  })()`);
  await client.send("Emulation.clearDeviceMetricsOverride");
  assert.deepEqual(narrowTools, { fits: true, closeVisible: true });

  const persistenceId = await client.evaluate(`(async () => {
    let board = appState.boards.find((item) => item.name === "Persistence Test");
    if (!board) {
      const added = await addBoard(activePage().id, "Persistence Test", [{ title: "Persistent Example", url: "https://example.com/persist" }]);
      board = added.result;
    }
    return board.id;
  })()`);
  await client.send("Page.reload", { ignoreCache: true });
  await new Promise((resolve) => setTimeout(resolve, 1600));
  const persisted = await client.evaluate(`(async () => {
    const state = await getTaboraState();
    const board = state.boards.find((item) => item.id === ${JSON.stringify(persistenceId)});
    return Boolean(board && board.links.some((link) => link.url === "https://example.com/persist"));
  })()`);
  assert.equal(persisted, true);

  if (screenshotPath) {
    const screenshot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, "base64"));
  }

  const discovery = await client.evaluate(`(async () => {
    const board = (await addBoard(activePage().id, "Discovery board", [{ title: "Example docs", url: "https://example.com/docs" }])).result;
    await recordLinkOpened(board.id, board.links[0].id);
    await refresh();
    await new Promise((resolve) => setTimeout(resolve, 120));
    const chips = [...document.querySelectorAll("#recentStripList .recent-chip")].map((chip) => chip.lastElementChild.textContent);
    const icon = document.querySelector(".recent-chip .favicon");
    document.querySelector("#headerSearch").click();
    nodes.globalSearch.value = "zzz-no-match";
    nodes.globalSearch.dispatchEvent(new Event("input"));
    await new Promise((resolve) => setTimeout(resolve, 220));
    const webRow = document.querySelector("[data-web-search] strong")?.textContent;
    const searchOpen = !nodes.searchPanel.hidden;
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "?", bubbles: true }));
    const shortcutsOpen = nodes.shortcutsDialog.open;
    nodes.shortcutsDialog.close();
    await deleteBoard(board.id);
    await refresh();
    return { chips, hasIcon: Boolean(icon), iconUrl: browserFaviconUrl("https://example.com/docs"), webRow, searchOpen, shortcutsOpen };
  })()`);
  assert.deepEqual(discovery.chips, ["Example docs"]);
  assert.equal(discovery.hasIcon, true);
  assert.match(discovery.iconUrl, /\/_favicon\/\?pageUrl=https%3A%2F%2Fexample\.com%2Fdocs&size=32$/);
  assert.equal(discovery.searchOpen, true);
  assert.equal(discovery.webRow, "Search the web for “zzz-no-match”");
  assert.equal(discovery.shortcutsOpen, true);

  // Search covers every page, with the current page first; tips appear one at a time and retire.
  const allPages = await client.evaluate(`(async () => {
    const here = (await addBoard(activePage().id, "Here board", [{ title: "Crosspage here", url: "https://example.com/cross-here" }])).result;
    const { result: otherPage } = await addPage("Elsewhere");
    const there = (await addBoard(otherPage.id, "There board", [{ title: "Crosspage there", url: "https://example.com/cross-there" }])).result;
    await refresh();
    openSearch();
    nodes.globalSearch.value = "crosspage";
    nodes.globalSearch.dispatchEvent(new Event("input"));
    await new Promise((resolve) => setTimeout(resolve, 220));
    const titles = [...document.querySelectorAll("#searchResultsList [data-search-open-link] strong")].map((node) => node.textContent);
    const labels = [...document.querySelectorAll("#searchResultsList [data-search-open-link] .search-result-board")].map((node) => node.textContent);
    const summary = nodes.searchResultsSummary.textContent;
    closeSearch();

    hintsAllowedThisSession = true;
    await updateTaboraState((state) => { state.settings.hintsSeen = []; state.settings.showHints = true; });
    await refresh();
    const firstHint = { hidden: nodes.hintStrip.hidden, text: nodes.hintText.textContent, action: nodes.hintAction.textContent };
    openSearch();
    closeSearch();
    const afterSearch = nodes.hintText.textContent;
    document.querySelector("#hintDismiss").click();
    const afterDismiss = nodes.hintText.textContent;
    await new Promise((resolve) => setTimeout(resolve, 300));
    const seen = (await getTaboraState()).settings.hintsSeen;
    await setSetting("showHints", false);
    await refresh();
    const hiddenWhenOff = nodes.hintStrip.hidden;
    await setSetting("showHints", true);

    await deleteBoard(here.id);
    await deleteBoard(there.id);
    await updateTaboraState((state) => { state.pages = state.pages.filter((page) => page.id !== otherPage.id); });
    await refresh();
    return { titles, labels, summary, firstHint, afterSearch, afterDismiss, seen, hiddenWhenOff };
  })()`);
  assert.deepEqual(allPages.titles, ["Crosspage here", "Crosspage there"]);
  assert.deepEqual(allPages.labels, ["Here board", "Elsewhere / There board"]);
  assert.equal(allPages.summary, "2 matching links · 1 on other pages");
  assert.equal(allPages.firstHint.hidden, false);
  assert.match(allPages.firstHint.text, /search every page/);
  assert.equal(allPages.firstHint.action, "Try it");
  assert.doesNotMatch(allPages.afterSearch, /search every page/);
  assert.notEqual(allPages.afterDismiss, allPages.afterSearch);
  assert.equal(allPages.seen.includes("search"), true);
  assert.equal(allPages.seen.length >= 2, true);
  assert.equal(allPages.hiddenWhenOff, true);

  const popupUrl = new URL("popup.html", page.url).href;
  await client.send("Page.navigate", { url: popupUrl });
  await new Promise((resolve) => setTimeout(resolve, 800));
  const lightPopup = await client.evaluate(`({
    palette: document.body.dataset.palette,
    light: document.body.classList.contains("light-theme"),
    wallpaper: getComputedStyle(document.body).backgroundImage,
    font: getComputedStyle(document.body).fontFamily,
    fontLoaded: document.fonts.check('14px "Nunito Sans"'),
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth
  })`);
  assert.equal(lightPopup.palette, "northern");
  assert.equal(lightPopup.light, true);
  assert.match(lightPopup.wallpaper, /northern-oath\.webp/);
  assert.match(lightPopup.font, /Nunito Sans/);
  assert.equal(lightPopup.fontLoaded, true);
  assert.equal(lightPopup.horizontalOverflow, false);
  const popupLayout = await client.evaluate(`({
    saveLabel: document.querySelector("#saveTab").textContent,
    windowRow: document.querySelector("#windowSaveLabel").textContent,
    hasOldControls: Boolean(document.querySelector("#addCurrentTab, #targetBoard"))
  })`);
  assert.match(popupLayout.saveLabel, /^Save to /);
  assert.match(popupLayout.windowRow, /^Save whole window \(\d+ tabs?\) as a board$/);
  assert.equal(popupLayout.hasOldControls, false);

  if (popupScreenshotPath) {
    const screenshot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    fs.writeFileSync(popupScreenshotPath, Buffer.from(screenshot.data, "base64"));
  }

  await client.evaluate(`(async () => {
    await setSetting("theme", "dark");
    await setSetting("wallpaper", "chrome-afterglow");
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 500));
  const darkPopup = await client.evaluate(`({
    palette: document.body.dataset.palette,
    light: document.body.classList.contains("light-theme"),
    wallpaper: getComputedStyle(document.body).backgroundImage
  })`);
  assert.equal(darkPopup.palette, "chrome");
  assert.equal(darkPopup.light, false);
  assert.match(darkPopup.wallpaper, /chrome-afterglow\.webp/);

  await client.evaluate(`(async () => {
    await setSetting("theme", "light");
    await setSetting("wallpaper", "sakura-drift");
  })()`);

  const exceptions = client.events.filter((event) => event.method === "Runtime.exceptionThrown");
  assert.equal(exceptions.length, 0, exceptions.map((event) => event.params.exceptionDetails.text).join("\n"));
  client.close();
  console.log(`browser smoke test passed (${page.url}, ${hub.width}x${hub.height})`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
