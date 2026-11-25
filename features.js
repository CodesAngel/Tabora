/* Loaded after shared.js and dashboard.js; relies on their globals:
   appState, nodes, activePage, setCurrentPage, currentPageId, refresh, renderBoards, showToast,
   requestDeleteConfirmation, copyShareText, applyAppearance. */
var extensionApi = globalThis.browser ?? globalThis.chrome;

const VAULT_PBKDF2_ITERATIONS = 600_000;
const LEGACY_PBKDF2_ITERATIONS = 180_000;

const featureNodes = {
  dialog: document.querySelector("#featureDialog"),
  recent: document.querySelector("#recentActivity"),
  organizeResults: document.querySelector("#organizeResults"),
  moodList: document.querySelector("#moodList"),
  vaultPage: document.querySelector("#vaultPage"),
  vaultList: document.querySelector("#vaultList"),
  roomCode: document.querySelector("#roomCode"),
  roomPassword: document.querySelector("#roomPassword"),
  roomShareOutput: document.querySelector("#roomShareOutput"),
  roomShareCode: document.querySelector("#roomShareCode"),
  roomSharePassword: document.querySelector("#roomSharePassword")
};

function showFeatureView(view) {
  const target = document.querySelector(`[data-feature-section="${view}"]`) ? view : "overview";
  document.querySelectorAll("[data-feature-view]").forEach((button) => {
    const active = button.dataset.featureView === target;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  document.querySelectorAll("[data-feature-section]").forEach((section) => section.classList.toggle("active", section.dataset.featureSection === target));
  document.querySelector(".feature-content").scrollTop = 0;
}

function setFeatureStatus(view, text, tone = "") {
  const node = document.querySelector(`#featureStatus-${view}`);
  if (!node) return;
  node.textContent = text;
  node.dataset.tone = tone;
}

function renderOverviewStatus() {
  const opened = appState.recentlyOpened.length;
  setFeatureStatus("activity", opened ? `${countLabel(opened, "link")} opened recently` : "Nothing opened yet");
  const links = appState.boards.flatMap((board) => board.links);
  const checked = links.filter((link) => link.health?.checkedAt);
  const lastChecked = Math.max(0, ...checked.map((link) => link.health.checkedAt));
  const problems = checked.filter((link) => link.health.status !== "ok").length;
  setFeatureStatus("organize", !checked.length ? "Not checked yet"
    : `Checked ${formatRelativeTime(lastChecked)}${problems ? ` · ${problems} need attention` : " · all healthy"}`, problems ? "warning" : "");
  setFeatureStatus("spaces", appState.moods.length ? `${countLabel(appState.moods.length, "mood")} saved` : "None saved yet");
  setFeatureStatus("vaults", appState.vaults.length ? `${countLabel(appState.vaults.length, "locked page")}` : "No locked pages");
  setFeatureStatus("rooms", "Share or join");
  document.querySelector("#smartOrganizeDetail").textContent = `Groups the links on ${activePage().name} into boards like Reading or Development. You can undo it.`;
  document.querySelector("#roomShareDetail").textContent = `Creates an encrypted copy of ${activePage().name} with its ${countLabel(appState.boards.filter((board) => board.pageId === activePage().id).length, "board")}.`;
}

function featureRow(title, meta, actions = []) {
  const row = document.createElement("article");
  row.className = "feature-list-row";
  const copy = document.createElement("span");
  copy.className = "feature-row-copy";
  const strong = document.createElement("strong");
  strong.textContent = title;
  const small = document.createElement("small");
  small.textContent = meta;
  copy.append(strong, small);
  const controls = document.createElement("span");
  controls.className = "feature-row-actions";
  for (const action of actions) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = action.label;
    button.className = action.danger ? "danger" : "";
    button.addEventListener("click", action.run);
    controls.append(button);
  }
  row.append(copy, controls);
  return row;
}

async function renderFeatureCenter() {
  appState = await getTaboraState();
  await renderUndoStatus();
  renderRecentActivity();
  renderMoods();
  renderVaults();
  renderVaultPages();
  renderOverviewStatus();
}

async function openFeatureCenter(view = "overview") {
  if (typeof markHintSeen === "function") markHintSeen("tools");
  showFeatureView(view);
  if (!featureNodes.dialog.open) featureNodes.dialog.showModal();
  await renderFeatureCenter();
}

async function renderUndoStatus() {
  const snapshot = await getUndoSnapshot();
  const button = document.querySelector("#featureUndo");
  button.disabled = !snapshot;
  document.querySelector("#featureUndoLabel").textContent = snapshot ? snapshot.label : "Nothing to undo";
}

function renderRecentActivity() {
  featureNodes.recent.replaceChildren();
  if (!appState.recentlyOpened.length) {
    featureNodes.recent.innerHTML = '<div class="feature-empty"><strong>Nothing opened yet</strong><span>Links you open from your boards show up here.</span></div>';
    return;
  }
  for (const item of appState.recentlyOpened.slice(0, 20)) {
    featureNodes.recent.append(featureRow(item.title, `${item.pageName} / ${item.boardName} · opened ${formatRelativeTime(item.openedAt)}`, [{
      label: "Open",
      run: async () => extensionApi.tabs.create({ url: item.url })
    }]));
  }
}

async function checkAllLinks() {
  const links = appState.boards.flatMap((board) => board.links.map((link) => ({ board, link })));
  featureNodes.organizeResults.innerHTML = `<div class="feature-progress"><span></span><strong>Checking ${countLabel(links.length, "link")}…</strong></div>`;
  const results = [];
  async function checkEntry(entry) {
    if (entry.link.url.startsWith("http:")) return { ...entry, health: { status: "insecure", checkedAt: Date.now(), finalUrl: entry.link.url } };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const request = { redirect: "follow", cache: "no-store", credentials: "omit", signal: controller.signal };
      let response = await fetch(entry.link.url, { ...request, method: "HEAD" });
      if (response.status === 405) response = await fetch(entry.link.url, { ...request, method: "GET" });
      return { ...entry, health: { status: !response.ok ? "broken" : response.url !== entry.link.url ? "redirected" : "ok", code: response.status, finalUrl: response.url, checkedAt: Date.now() } };
    } catch {
      return { ...entry, health: { status: "broken", code: 0, finalUrl: entry.link.url, checkedAt: Date.now() } };
    } finally {
      clearTimeout(timeout);
    }
  }
  for (let index = 0; index < links.length; index += 6) {
    results.push(...await Promise.all(links.slice(index, index + 6).map(checkEntry)));
  }
  await updateTaboraState((state) => {
    for (const result of results) {
      const link = state.boards.find((board) => board.id === result.board.id)?.links.find((item) => item.id === result.link.id);
      if (link) link.health = result.health;
    }
  });
  appState = await getTaboraState();
  featureNodes.organizeResults.replaceChildren();
  const problemLinks = results.filter((result) => result.health.status !== "ok");
  if (!problemLinks.length) featureNodes.organizeResults.innerHTML = `<div class="feature-empty"><strong>All ${countLabel(results.length, "link")} are healthy</strong><span>Nothing is broken or has moved.</span></div>`;
  else {
    const heading = document.createElement("h3");
    heading.className = "feature-subheading";
    heading.textContent = `${problemLinks.length} of ${countLabel(results.length, "link")} need attention`;
    featureNodes.organizeResults.append(heading);
  }
  for (const result of problemLinks) {
    const pageName = appState.pages.find((page) => page.id === result.board.pageId)?.name || "Home";
    const status = result.health.status === "redirected" ? `Moved to ${getDomain(result.health.finalUrl)}`
      : result.health.status === "insecure" ? "Uses an insecure http:// address"
        : result.health.code ? `Broken (error ${result.health.code})` : "Could not be reached";
    const actions = [{ label: "Open", run: async () => extensionApi.tabs.create({ url: result.link.url }) }];
    if (result.health.status === "redirected") actions.push({
      label: "Use new address",
      run: async () => {
        await updateLink(result.board.id, result.link.id, { ...result.link, url: result.health.finalUrl });
        await refresh("Bookmark address updated");
        await renderFeatureCenter();
      }
    });
    const row = featureRow(result.link.title, `${status} · ${result.board.name} · ${pageName}`, actions);
    row.dataset.health = result.health.status;
    featureNodes.organizeResults.append(row);
  }
  renderOverviewStatus();
  await refresh(`${links.length} links checked`);
}

async function smartOrganizeCurrentPage() {
  const page = activePage();
  const sourceBoards = appState.boards.filter((board) => board.pageId === page.id);
  const counts = new Map();
  for (const board of sourceBoards) for (const link of board.links) counts.set(categorizeLink(link), (counts.get(categorizeLink(link)) || 0) + 1);
  if (!counts.size) { showToast("No bookmarks to organize", "warning"); return; }
  const summary = [...counts].map(([name, count]) => `${name}: ${count}`).join(" · ");
  const confirmed = await requestDeleteConfirmation({
    title: `Organize "${page.name}" by topic?`,
    prompt: summary,
    warning: "Bookmarks move into one board per topic. Boards that end up empty stay on the page.",
    caution: "You can undo this right after.",
    tone: "neutral",
    submitLabel: "Organize page"
  });
  if (!confirmed) return;
  await updateTaboraState((state) => {
    const boards = state.boards.filter((board) => board.pageId === page.id);
    const categorized = boards.flatMap((board) => board.links.map((link) => ({ link, category: categorizeLink(link) })));
    // Use categories from the fresh state so links saved while the dialog was open are never dropped.
    const categories = [...new Set(categorized.map((item) => item.category))];
    for (const board of boards) board.links = [];
    for (const category of categories) {
      let target = boards.find((board) => board.name.toLowerCase() === category.toLowerCase());
      if (!target) {
        const column = state.boards.filter((board) => board.pageId === page.id).length % TABORA_BOARD_COLUMNS;
        target = { id: makeId("board"), pageId: page.id, name: category, order: state.boards.length, column, columnOrder: state.boards.filter((board) => board.pageId === page.id && board.column === column).length, pinned: false, color: "green", icon: "folder", size: "medium", createdAt: Date.now(), links: [] };
        state.boards.push(target);
      }
      target.links = categorized.filter((item) => item.category === category).map((item, index) => ({ ...item.link, order: index }));
    }
  }, { undoLabel: "Smart organization" });
  await refresh("Page organized");
  await renderFeatureCenter();
}

function renderMoods() {
  featureNodes.moodList.replaceChildren();
  if (!appState.moods.length) featureNodes.moodList.innerHTML = '<div class="feature-empty"><strong>No moods yet</strong><span>Set up a page and wallpaper you like, then name it above.</span></div>';
  for (const mood of appState.moods) {
    const theme = mood.theme === "light" ? "Light" : "Dark";
    const active = appState.settings.activeMoodId === mood.id ? " · In use" : "";
    featureNodes.moodList.append(featureRow(mood.name, `${appState.pages.find((page) => page.id === mood.pageId)?.name || "Home"} · ${theme} theme${active}`, [
      { label: "Apply", run: async () => applyMood(mood.id) },
      { label: "Delete", danger: true, run: async () => { await updateTaboraState((state) => { state.moods = state.moods.filter((item) => item.id !== mood.id); }); await renderFeatureCenter(); } }
    ]));
  }
}

async function applyMood(moodId) {
  const { result: pageId } = await updateTaboraState((state) => {
    const mood = state.moods.find((item) => item.id === moodId);
    if (!mood) return null;
    state.settings.activeMoodId = mood.id;
    state.settings.activePageId = state.pages.some((page) => page.id === mood.pageId) ? mood.pageId : "home";
    state.settings.theme = mood.theme;
    state.settings.wallpaper = mood.wallpaper;
    state.settings.privacyMode = mood.privacyMode;
    state.settings.incognitoMode = mood.incognitoMode;
    return state.settings.activePageId;
  }, { undoLabel: "Mood change" });
  if (pageId) setCurrentPage(pageId);
  await refresh("Mood applied");
  await applyAppearance();
  await renderFeatureCenter();
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function deriveVaultKey(password, salt, iterations) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

async function encryptWithPassword(value, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const iterations = VAULT_PBKDF2_ITERATIONS;
  const key = await deriveVaultKey(password, salt, iterations);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(value)));
  return { salt: bytesToBase64(salt), iv: bytesToBase64(iv), cipher: bytesToBase64(new Uint8Array(cipher)), iterations };
}

async function decryptWithPassword(value, password) {
  const iterations = Number.isInteger(value.iterations) && value.iterations > 0 ? value.iterations : LEGACY_PBKDF2_ITERATIONS;
  const key = await deriveVaultKey(password, base64ToBytes(value.salt), iterations);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(value.iv) }, key, base64ToBytes(value.cipher));
  return JSON.parse(new TextDecoder().decode(plain));
}

function renderVaultPages() {
  featureNodes.vaultPage.replaceChildren();
  for (const page of ordered(appState.pages).filter((item) => !item.protected)) {
    const option = document.createElement("option");
    option.value = page.id;
    option.textContent = page.name;
    featureNodes.vaultPage.append(option);
  }
  document.querySelector("#vaultForm").querySelector("button").disabled = !featureNodes.vaultPage.options.length;
}

function renderVaults() {
  featureNodes.vaultList.replaceChildren();
  if (!appState.vaults.length) featureNodes.vaultList.innerHTML = '<div class="feature-empty"><strong>No locked pages</strong><span>Pages you lock show up here until you unlock them.</span></div>';
  for (const vault of appState.vaults) {
    // The page name is encrypted too, so only the lock date is shown.
    const row = featureRow("Locked page", `Locked ${formatRelativeTime(vault.createdAt) || "earlier"}`);
    const controls = row.querySelector(".feature-row-actions");
    const form = document.createElement("form");
    form.className = "vault-unlock-form";
    const password = document.createElement("input");
    password.type = "password";
    password.placeholder = "Password";
    password.autocomplete = "current-password";
    password.required = true;
    password.className = "dark-input vault-unlock-input";
    password.setAttribute("aria-label", "Vault password");
    const unlock = document.createElement("button");
    unlock.type = "submit";
    unlock.className = "secondary-button";
    unlock.textContent = "Unlock";
    form.append(password, unlock);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const payload = await decryptWithPassword(vault, password.value);
        await updateTaboraState((state) => {
          state.pages.push(payload.page);
          state.boards.push(...payload.boards);
          // Vaults made before v3.2 did not carry activity or trash.
          state.recentlyOpened = [...state.recentlyOpened, ...(payload.recentlyOpened || [])]
            .sort((a, b) => (b.openedAt || 0) - (a.openedAt || 0))
            .slice(0, 50);
          state.trash = [...state.trash, ...(payload.trash || [])]
            .sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
          state.vaults = state.vaults.filter((item) => item.id !== vault.id);
          state.settings.activePageId = payload.page.id;
        });
        setCurrentPage(payload.page.id);
        await refresh("Private page unlocked");
        await renderFeatureCenter();
      } catch {
        showToast("That password doesn't unlock this page", "warning");
        password.select();
      }
    });
    controls.append(form);
    featureNodes.vaultList.append(row);
  }
}

async function createRoomPackage() {
  const page = structuredClone(activePage());
  const boards = structuredClone(appState.boards.filter((board) => board.pageId === page.id));
  const password = bytesToBase64(crypto.getRandomValues(new Uint8Array(18)));
  const encrypted = await encryptWithPassword({ page, boards, expiresAt: Date.now() + 86_400_000 }, password);
  const packageValue = `TABORA2.${btoa(JSON.stringify(encrypted))}`;
  featureNodes.roomShareCode.value = packageValue;
  featureNodes.roomSharePassword.value = password;
  featureNodes.roomShareOutput.hidden = false;
  document.querySelector("#createRoom").textContent = "Create a new package";
  await copyShareText(packageValue, "Package copied. Send the password separately.");
}

function readRoomPackage(code, typedPassword) {
  const parts = code.trim().split(".");
  if (parts[0] === "TABORA2" && parts.length === 2 && parts[1]) {
    if (!typedPassword.trim()) throw new Error("Missing password");
    return { password: typedPassword.trim(), encoded: parts[1] };
  }
  // TABORA1 packages from older versions carry their password inline.
  if (parts[0] === "TABORA1" && parts.length === 3 && parts[1] && parts[2]) return { password: parts[1], encoded: parts[2] };
  throw new Error("Invalid package");
}

async function joinRoomPackage() {
  try {
    const { password, encoded } = readRoomPackage(featureNodes.roomCode.value, featureNodes.roomPassword.value);
    const encrypted = JSON.parse(atob(encoded));
    const payload = await decryptWithPassword(encrypted, password);
    if (payload.expiresAt < Date.now()) throw new Error("Expired package");
    const { result: roomPageId } = await updateTaboraState((state) => {
      const pageId = makeId("page");
      state.pages.push({ id: pageId, name: cleanName(`${payload.page?.name || "Shared"} Room`, "Shared Room"), protected: false, order: state.pages.length });
      for (const [index, board] of (Array.isArray(payload.boards) ? payload.boards : []).slice(0, 100).entries()) {
        const column = Math.max(0, Math.min(TABORA_BOARD_COLUMNS - 1, Number(board.column) || index % TABORA_BOARD_COLUMNS));
        const links = (Array.isArray(board.links) ? board.links : []).slice(0, TABORA_MAX_SHARED_LINKS).map((link, linkIndex) => ({
          id: makeId("link"),
          title: cleanName(link.title, getDomain(link.url)),
          url: normalizeUrl(link.url),
          favIconUrl: safeFavIconUrl(link.favIconUrl),
          note: String(link.note || "").slice(0, 2000),
          order: linkIndex,
          createdAt: Date.now()
        })).filter((link) => link.url);
        state.boards.push({
          id: makeId("board"),
          pageId,
          name: cleanName(board.name, `Shared Board ${index + 1}`),
          order: index,
          column,
          columnOrder: state.boards.filter((item) => item.pageId === pageId && item.column === column).length,
          pinned: Boolean(board.pinned),
          color: TABORA_BOARD_COLORS.includes(board.color) ? board.color : "green",
          icon: TABORA_BOARD_ICONS.includes(board.icon) ? board.icon : "folder",
          size: TABORA_BOARD_SIZES.includes(board.size) ? board.size : "medium",
          createdAt: Date.now(),
          links
        });
      }
      state.settings.activePageId = pageId;
      return pageId;
    }, { undoLabel: "Room import" });
    setCurrentPage(roomPageId);
    featureNodes.roomCode.value = "";
    featureNodes.roomPassword.value = "";
    featureNodes.dialog.close();
    await refresh("Room joined");
  } catch (error) {
    const message = error.message === "Expired package" ? "This room package has expired"
      : error.message === "Missing password" ? "Enter the room password"
        : "Check the room package and password";
    showToast(message, "warning");
  }
}

document.querySelector("#featureTool").addEventListener("click", () => openFeatureCenter());
document.querySelectorAll("[data-open-feature]").forEach((button) => button.addEventListener("click", () => {
  nodes.settingsDialog.close();
  void openFeatureCenter(button.dataset.openFeature);
}));
document.querySelectorAll("[data-feature-view]").forEach((button) => button.addEventListener("click", () => showFeatureView(button.dataset.featureView)));
document.querySelectorAll("[data-feature-goto]").forEach((button) => button.addEventListener("click", () => showFeatureView(button.dataset.featureGoto)));

document.querySelector("#featureSaveSession").addEventListener("click", async () => {
  const date = new Date().toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const result = await saveCurrentWindowAsBoard(activePage().id, `Session · ${date}`);
  if (!result?.board) { showToast(result?.duplicateCount ? "All open tabs are already saved" : "No browser tabs are available to save", "warning"); return; }
  featureNodes.dialog.close();
  await refresh(result.duplicateCount ? `Session saved · ${result.duplicateCount} duplicates skipped` : "Current session saved");
});

document.querySelector("#featureUndo").addEventListener("click", async () => {
  const label = await undoLastAction();
  if (!label) return;
  featureNodes.dialog.close();
  await refresh(`${label} undone`);
  await applyAppearance();
});

document.querySelector("#checkLinks").addEventListener("click", async () => {
  try {
    const granted = await extensionApi.permissions.request({ origins: ["http://*/*", "https://*/*"] });
    if (!granted) {
      showToast("Site access is required to check bookmark health", "warning");
      return;
    }
    await checkAllLinks();
  } catch (error) {
    console.error("Tabora link permission request failed", error);
    showToast("Could not request site access", "warning");
  }
});
document.querySelector("#smartOrganize").addEventListener("click", smartOrganizeCurrentPage);

document.querySelector("#moodForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = document.querySelector("#moodName").value.trim();
  if (!name) return;
  await updateTaboraState((state) => {
    state.moods.push({ id: makeId("mood"), name: cleanName(name, "New Mood"), pageId: activePage().id, theme: state.settings.theme, wallpaper: state.settings.wallpaper, privacyMode: state.settings.privacyMode, incognitoMode: state.settings.incognitoMode, createdAt: Date.now() });
  });
  document.querySelector("#moodName").value = "";
  await renderFeatureCenter();
  showToast("Mood saved");
});

document.querySelector("#vaultForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const pageId = featureNodes.vaultPage.value;
  const password = document.querySelector("#vaultPassword").value;
  if (!appState.pages.some((item) => item.id === pageId) || password.length < 8) return;
  const { result: locked } = await updateTaboraState(async (state) => {
    const page = state.pages.find((item) => item.id === pageId);
    if (!page) return false;
    const boards = state.boards.filter((board) => board.pageId === pageId);
    const boardIds = new Set(boards.map((board) => board.id));
    const belongsToPage = (entry) => entry.pageId === pageId || boardIds.has(entry.boardId) || entry.value?.pageId === pageId;
    const recentlyOpened = state.recentlyOpened.filter(belongsToPage);
    const trash = state.trash.filter(belongsToPage);
    const encrypted = await encryptWithPassword({ page, boards, recentlyOpened, trash }, password);
    state.vaults.push({ id: makeId("vault"), createdAt: Date.now(), ...encrypted });
    state.pages = state.pages.filter((item) => item.id !== pageId);
    state.boards = state.boards.filter((board) => board.pageId !== pageId);
    state.recentlyOpened = state.recentlyOpened.filter((entry) => !belongsToPage(entry));
    state.trash = state.trash.filter((entry) => !belongsToPage(entry));
    state.settings.activePageId = "home";
    return true;
  });
  if (!locked) return;
  // The undo snapshot would still hold the page in plain text.
  await extensionApi.storage.local.remove(TABORA_UNDO_KEY);
  if (pageId === currentPageId) setCurrentPage("home");
  document.querySelector("#vaultPassword").value = "";
  await refresh("Page locked in private vault");
  await renderFeatureCenter();
});

document.querySelector("#createRoom").addEventListener("click", createRoomPackage);
document.querySelector("#joinRoom").addEventListener("click", joinRoomPackage);
document.querySelector("#copyRoomCode").addEventListener("click", () => {
  if (featureNodes.roomShareCode.value) void copyShareText(featureNodes.roomShareCode.value, "Package copied");
});
document.querySelector("#copyRoomPassword").addEventListener("click", () => {
  if (featureNodes.roomSharePassword.value) void copyShareText(featureNodes.roomSharePassword.value, "Password copied");
});

document.addEventListener("keydown", async (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.target.matches("input, textarea, select")) {
    event.preventDefault();
    const label = await undoLastAction();
    if (label) { await refresh(`${label} undone`); await applyAppearance(); }
  }
});
