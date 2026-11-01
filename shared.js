const TABORA_STORAGE_KEY = "taboraV2";
const TABORA_UNDO_KEY = "taboraUndo";
const TABORA_SCHEMA_VERSION = 4;
const TABORA_BOARD_COLUMNS = 4;
const TABORA_SHARE_FORMAT = "tabora-share";
const TABORA_SHARE_VERSION = 1;
const TABORA_QUICK_SAVE_BOARD_NAME = "Quick Saves";
const TABORA_STATE_LOCK = "tabora-state";
const TABORA_TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const TABORA_MAX_SHARED_LINKS = 2000;
const TABORA_MAX_FAVICON_LENGTH = 4096;
const TABORA_BOARD_COLORS = ["green", "blue", "amber", "rose", "violet", "slate"];
const TABORA_BOARD_ICONS = ["folder", "briefcase", "book", "star", "code", "spark"];
const TABORA_BOARD_SIZES = ["small", "medium", "large"];
var taboraApi = globalThis.browser ?? globalThis.chrome;

// Built-in wallpapers; the popup and dashboard both derive their palette and image from this table.
const TABORA_WALLPAPERS = [
  { id: "none", name: "Default", theme: "dark", palette: "dark-default", image: "" },
  { id: "digital-ocean", name: "Digital Ocean", theme: "dark", palette: "forest", image: "assets/tabora-background.webp", thumbnail: "assets/wallpaper-thumbs/tabora-background.webp" },
  { id: "crimson-realm", name: "Crimson Realm", theme: "dark", palette: "crimson", image: "assets/crimson-realm.webp", thumbnail: "assets/wallpaper-thumbs/crimson-realm.webp" },
  { id: "aurora-station", name: "Aurora Station", theme: "dark", palette: "aurora", image: "assets/aurora-station.webp" },
  { id: "moonlit-garden", name: "Moonlit Garden", theme: "dark", palette: "garden", image: "assets/moonlit-garden.webp" },
  { id: "eclipse-forge", name: "Eclipse Forge", theme: "dark", palette: "eclipse", image: "assets/eclipse-forge.webp" },
  { id: "abyss-bloom", name: "Abyss Bloom", theme: "dark", palette: "abyss", image: "assets/abyss-bloom.webp" },
  { id: "neon-monsoon", name: "Neon Monsoon", theme: "dark", palette: "monsoon", image: "assets/neon-monsoon.webp" },
  { id: "ember-crown", name: "Ember Crown", theme: "dark", palette: "ember", image: "assets/ember-crown.webp", thumbnail: "assets/wallpaper-thumbs/ember-crown.webp" },
  { id: "cobalt-tide", name: "Cobalt Tide", theme: "dark", palette: "cobalt", image: "assets/cobalt-tide.webp", thumbnail: "assets/wallpaper-thumbs/cobalt-tide.webp" },
  { id: "verdant-vault", name: "Verdant Vault", theme: "dark", palette: "verdant", image: "assets/verdant-vault.webp", thumbnail: "assets/wallpaper-thumbs/verdant-vault.webp" },
  { id: "nocturne-archive", name: "Nocturne Archive", theme: "dark", palette: "nocturne", image: "assets/nocturne-archive.webp", thumbnail: "assets/wallpaper-thumbs/nocturne-archive.webp" },
  { id: "lunar-tide", name: "Lunar Tide", theme: "dark", palette: "lunar", image: "assets/lunar-tide.webp", thumbnail: "assets/wallpaper-thumbs/lunar-tide.webp" },
  { id: "wisteria-moon", name: "Wisteria Moon", theme: "dark", palette: "wisteria", image: "assets/wisteria-moon.webp", thumbnail: "assets/wallpaper-thumbs/wisteria-moon.webp" },
  { id: "shadow-ascension", name: "Shadow Ascension", theme: "dark", palette: "ascension", image: "assets/shadow-ascension.webp", thumbnail: "assets/wallpaper-thumbs/shadow-ascension.webp" },
  { id: "grail-mirage", name: "Grail Mirage", theme: "dark", palette: "grail", image: "assets/grail-mirage.webp", thumbnail: "assets/wallpaper-thumbs/grail-mirage.webp" },
  { id: "crimson-ghoul", name: "Crimson Ghoul", theme: "dark", palette: "ghoul", image: "assets/crimson-ghoul.webp", thumbnail: "assets/wallpaper-thumbs/crimson-ghoul.webp" },
  { id: "soul-divide", name: "Soul Divide", theme: "dark", palette: "soul", image: "assets/soul-divide.webp", thumbnail: "assets/wallpaper-thumbs/soul-divide.webp" },
  { id: "titan-last-wall", name: "Titan's Last Wall", theme: "dark", palette: "titan", image: "assets/titan-last-wall.webp", thumbnail: "assets/wallpaper-thumbs/titan-last-wall.webp" },
  { id: "virtual-skyline", name: "Virtual Skyline", theme: "dark", palette: "virtual", image: "assets/virtual-skyline.webp", thumbnail: "assets/wallpaper-thumbs/virtual-skyline.webp" },
  { id: "bizarre-stardust", name: "Bizarre Stardust", theme: "dark", palette: "stardust", image: "assets/bizarre-stardust.webp", thumbnail: "assets/wallpaper-thumbs/bizarre-stardust.webp" },
  { id: "clover-grimoire", name: "Clover Grimoire", theme: "dark", palette: "clover", image: "assets/clover-grimoire.webp", thumbnail: "assets/wallpaper-thumbs/clover-grimoire.webp" },
  { id: "reader-apocalypse", name: "Reader's Apocalypse", theme: "dark", palette: "reader", image: "assets/reader-apocalypse.webp", thumbnail: "assets/wallpaper-thumbs/reader-apocalypse.webp" },
  { id: "midnight-verdict", name: "Midnight Verdict", theme: "dark", palette: "verdict", image: "assets/midnight-verdict.webp", thumbnail: "assets/wallpaper-thumbs/midnight-verdict.webp" },
  { id: "cursed-meridian", name: "Cursed Meridian", theme: "dark", palette: "cursed", image: "assets/cursed-meridian.webp", thumbnail: "assets/wallpaper-thumbs/cursed-meridian.webp" },
  { id: "hollow-paradise", name: "Hollow Paradise", theme: "dark", palette: "paradise", image: "assets/hollow-paradise.webp", thumbnail: "assets/wallpaper-thumbs/hollow-paradise.webp" },
  { id: "infernal-brigade", name: "Infernal Brigade", theme: "dark", palette: "infernal", image: "assets/infernal-brigade.webp", thumbnail: "assets/wallpaper-thumbs/infernal-brigade.webp" },
  { id: "ashen-eclipse", name: "Ashen Eclipse", theme: "dark", palette: "eclipse-ash", image: "assets/ashen-eclipse.webp", thumbnail: "assets/wallpaper-thumbs/ashen-eclipse.webp" },
  { id: "chrome-afterglow", name: "Chrome Afterglow", theme: "dark", palette: "chrome", image: "assets/chrome-afterglow.webp", thumbnail: "assets/wallpaper-thumbs/chrome-afterglow.webp" },
  { id: "engine-dusk", name: "Engine Dusk", theme: "dark", palette: "engine", image: "assets/engine-dusk.webp", thumbnail: "assets/wallpaper-thumbs/engine-dusk.webp" },
  { id: "jazz-orbit", name: "Jazz Orbit", theme: "dark", palette: "jazz", image: "assets/jazz-orbit.webp", thumbnail: "assets/wallpaper-thumbs/jazz-orbit.webp" },
  { id: "alchemist-equation", name: "Alchemist's Equation", theme: "dark", palette: "alchemy", image: "assets/alchemist-equation.webp", thumbnail: "assets/wallpaper-thumbs/alchemist-equation.webp" },
  { id: "none", name: "Default", theme: "light", palette: "light-default", image: "" },
  { id: "mist-valley", name: "Mist Valley", theme: "light", palette: "mist", image: "assets/mist-valley.webp", thumbnail: "assets/wallpaper-thumbs/mist-valley.webp" },
  { id: "amber-voyager", name: "Amber Voyager", theme: "light", palette: "amber", image: "assets/amber-voyager.webp", thumbnail: "assets/wallpaper-thumbs/amber-voyager.webp" },
  { id: "alpine-clear", name: "Alpine Clear", theme: "light", palette: "alpine", image: "assets/alpine-clear.webp" },
  { id: "coral-coast", name: "Coral Coast", theme: "light", palette: "coast", image: "assets/coral-coast.webp" },
  { id: "glass-horizon", name: "Glass Horizon", theme: "light", palette: "glass", image: "assets/glass-horizon.webp" },
  { id: "sakura-drift", name: "Sakura Drift", theme: "light", palette: "sakura", image: "assets/sakura-drift.webp" },
  { id: "arctic-prism", name: "Arctic Prism", theme: "light", palette: "arctic", image: "assets/arctic-prism.webp" },
  { id: "soleil-courtyard", name: "Soleil Courtyard", theme: "light", palette: "soleil", image: "assets/soleil-courtyard.webp", thumbnail: "assets/wallpaper-thumbs/soleil-courtyard.webp" },
  { id: "petal-mist", name: "Petal Mist", theme: "light", palette: "petal", image: "assets/petal-mist.webp", thumbnail: "assets/wallpaper-thumbs/petal-mist.webp" },
  { id: "glacier-house", name: "Glacier House", theme: "light", palette: "glacier", image: "assets/glacier-house.webp", thumbnail: "assets/wallpaper-thumbs/glacier-house.webp" },
  { id: "linen-conservatory", name: "Linen Conservatory", theme: "light", palette: "linen", image: "assets/linen-conservatory.webp", thumbnail: "assets/wallpaper-thumbs/linen-conservatory.webp" },
  { id: "opal-headlands", name: "Opal Headlands", theme: "light", palette: "opal", image: "assets/opal-headlands.webp", thumbnail: "assets/wallpaper-thumbs/opal-headlands.webp" },
  { id: "meteor-hero", name: "Meteor Hero", theme: "light", palette: "meteor", image: "assets/meteor-hero.webp", thumbnail: "assets/wallpaper-thumbs/meteor-hero.webp" },
  { id: "hero-academy", name: "Hero Academy", theme: "light", palette: "academy", image: "assets/hero-academy.webp", thumbnail: "assets/wallpaper-thumbs/hero-academy.webp" },
  { id: "neon-revival", name: "Neon Revival", theme: "light", palette: "revival", image: "assets/neon-revival.webp", thumbnail: "assets/wallpaper-thumbs/neon-revival.webp" },
  { id: "grand-voyage", name: "Grand Voyage", theme: "light", palette: "voyage", image: "assets/grand-voyage.webp", thumbnail: "assets/wallpaper-thumbs/grand-voyage.webp" },
  { id: "ballroom-radiance", name: "Ballroom Radiance", theme: "light", palette: "ballroom", image: "assets/ballroom-radiance.webp", thumbnail: "assets/wallpaper-thumbs/ballroom-radiance.webp" },
  { id: "frontier-odyssey", name: "Frontier Odyssey", theme: "light", palette: "frontier", image: "assets/frontier-odyssey.webp", thumbnail: "assets/wallpaper-thumbs/frontier-odyssey.webp" },
  { id: "wandspire-legacy", name: "Wandspire Legacy", theme: "light", palette: "wandspire", image: "assets/wandspire-legacy.webp", thumbnail: "assets/wallpaper-thumbs/wandspire-legacy.webp" },
  { id: "shieldbound-horizon", name: "Shieldbound Horizon", theme: "light", palette: "shieldbound", image: "assets/shieldbound-horizon.webp", thumbnail: "assets/wallpaper-thumbs/shieldbound-horizon.webp" },
  { id: "breaker-dawn", name: "Breaker Dawn", theme: "light", palette: "breaker", image: "assets/breaker-dawn.webp", thumbnail: "assets/wallpaper-thumbs/breaker-dawn.webp" },
  { id: "striker-blue", name: "Striker Blue", theme: "light", palette: "striker", image: "assets/striker-blue.webp", thumbnail: "assets/wallpaper-thumbs/striker-blue.webp" },
  { id: "emerald-vanguard", name: "Emerald Vanguard", theme: "light", palette: "vanguard", image: "assets/emerald-vanguard.webp", thumbnail: "assets/wallpaper-thumbs/emerald-vanguard.webp" },
  { id: "hidden-leaf-dawn", name: "Hidden Leaf Dawn", theme: "light", palette: "leafdawn", image: "assets/hidden-leaf-dawn.webp", thumbnail: "assets/wallpaper-thumbs/hidden-leaf-dawn.webp" },
  { id: "celestial-surge", name: "Celestial Surge", theme: "light", palette: "surge", image: "assets/celestial-surge.webp", thumbnail: "assets/wallpaper-thumbs/celestial-surge.webp" },
  { id: "psychic-bloom", name: "Psychic Bloom", theme: "light", palette: "psychic", image: "assets/psychic-bloom.webp", thumbnail: "assets/wallpaper-thumbs/psychic-bloom.webp" },
  { id: "unknown-continent", name: "Unknown Continent", theme: "light", palette: "continent", image: "assets/unknown-continent.webp", thumbnail: "assets/wallpaper-thumbs/unknown-continent.webp" },
  { id: "sunbreak-archipelago", name: "Sunbreak Archipelago", theme: "light", palette: "sunbreak", image: "assets/sunbreak-archipelago.webp", thumbnail: "assets/wallpaper-thumbs/sunbreak-archipelago.webp" },
  { id: "northern-oath", name: "Northern Oath", theme: "light", palette: "northern", image: "assets/northern-oath.webp", thumbnail: "assets/wallpaper-thumbs/northern-oath.webp" }
];

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createDefaultState() {
  return {
    schemaVersion: TABORA_SCHEMA_VERSION,
    pages: [{ id: "home", name: "Home", order: 0, protected: true }],
    boards: [],
    trash: [],
    recentlyOpened: [],
    moods: [],
    vaults: [],
    settings: {
      activePageId: "home",
      theme: "dark",
      wallpaper: "digital-ocean",
      privacyMode: false,
      incognitoMode: false,
      compactMode: true,
      groupRightTools: false,
      hideExtraBookmarks: false,
      shortenLongTitles: true,
      openLinksInNewTab: false,
      showBookmarkDescriptions: true,
      closeTabsAfterSaveAll: false,
      quickSaveDestination: "current-page",
      activeMoodId: "",
      onboardingComplete: false,
      showRecentlyOpened: true,
      lastSaveBoardId: ""
    }
  };
}

function normalizeState(value) {
  const fallback = createDefaultState();
  const state = value && typeof value === "object" ? value : fallback;
  state.schemaVersion = TABORA_SCHEMA_VERSION;
  state.pages = Array.isArray(state.pages) && state.pages.length ? state.pages : fallback.pages;
  state.boards = Array.isArray(state.boards) ? state.boards : [];
  for (const board of state.boards) {
    board.color = TABORA_BOARD_COLORS.includes(board.color) ? board.color : "green";
    board.icon = TABORA_BOARD_ICONS.includes(board.icon) ? board.icon : "folder";
    board.size = TABORA_BOARD_SIZES.includes(board.size) ? board.size : "medium";
    board.pinned = Boolean(board.pinned || board.starred);
    if (board.quickSave) board.quickSave = true;
    else delete board.quickSave;
    board.links = Array.isArray(board.links) ? board.links : [];
    for (const link of board.links) {
      link.health = link.health && typeof link.health === "object" ? link.health : null;
    }
  }
  const boardsByPage = new Map(state.pages.map((page) => [page.id, []]));
  for (const board of state.boards) {
    boardsByPage.get(board.pageId)?.push(board);
  }
  for (const page of state.pages) {
    const pageBoards = (boardsByPage.get(page.id) || [])
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    pageBoards.forEach((board, index) => {
      if (!Number.isInteger(board.column)) board.column = index % TABORA_BOARD_COLUMNS;
      board.column = Math.max(0, Math.min(TABORA_BOARD_COLUMNS - 1, board.column));
      if (!Number.isInteger(board.columnOrder)) {
        board.columnOrder = pageBoards.slice(0, index).filter((item) => item.column === board.column).length;
      }
    });
    for (let column = 0; column < TABORA_BOARD_COLUMNS; column += 1) {
      pageBoards
        .filter((board) => board.column === column)
        .sort((a, b) => (a.columnOrder || 0) - (b.columnOrder || 0) || (a.order || 0) - (b.order || 0))
        .forEach((board, index) => { board.columnOrder = index; });
    }
  }
  const trashCutoff = Date.now() - TABORA_TRASH_RETENTION_MS;
  state.trash = (Array.isArray(state.trash) ? state.trash : [])
    .filter((item) => item && typeof item === "object" && !(item.deletedAt && item.deletedAt < trashCutoff));
  state.trash.forEach((item, index) => {
    // Older entries have no id; derive a stable one so the UI and storage agree before the next save.
    if (!item.id) item.id = `trash-${item.deletedAt || 0}-${item.value?.id || index}`;
  });
  state.recentlyOpened = Array.isArray(state.recentlyOpened) ? state.recentlyOpened.slice(0, 50) : [];
  state.moods = Array.isArray(state.moods) ? state.moods : [];
  state.vaults = Array.isArray(state.vaults) ? state.vaults : [];
  state.settings = { ...fallback.settings, ...(state.settings || {}) };
  // Organize mode is per-tab and the language picker was never wired up.
  delete state.settings.organizeMode;
  delete state.settings.language;
  if (!state.pages.some((page) => page.id === state.settings.activePageId)) {
    state.settings.activePageId = state.pages[0].id;
  }
  return state;
}

function migrateV1Data(sessions = [], workspaces = []) {
  const state = createDefaultState();
  const workspacePageIds = new Map();

  for (const [index, workspace] of workspaces.entries()) {
    const page = {
      id: workspace.id || makeId("page"),
      name: workspace.name || `Page ${index + 1}`,
      order: index + 1,
      protected: false
    };
    state.pages.push(page);
    workspacePageIds.set(workspace.id, page.id);
  }

  for (const [index, session] of sessions.entries()) {
    const pageId = workspacePageIds.get(session.workspaceId) || "home";
    state.boards.push({
      id: session.id || makeId("board"),
      pageId,
      name: session.name || "Imported session",
      order: state.boards.filter((board) => board.pageId === pageId).length,
      column: index % TABORA_BOARD_COLUMNS,
      columnOrder: Math.floor(index / TABORA_BOARD_COLUMNS),
      starred: Boolean(session.starred),
      pinned: Boolean(session.starred),
      color: "green",
      icon: "folder",
      size: "medium",
      createdAt: session.createdAt || Date.now() + index,
      links: (session.tabs || []).map((tab, linkIndex) => ({
        id: makeId(`link-${linkIndex}`),
        title: tab.title || tab.url || "Untitled link",
        url: tab.url || "",
        favIconUrl: safeFavIconUrl(tab.favIconUrl),
        note: "",
        order: linkIndex
      }))
    });
  }

  state.settings.onboardingComplete = state.boards.length > 0;
  return state;
}

async function getTaboraState() {
  const data = await taboraApi.storage.local.get([
    TABORA_STORAGE_KEY,
    "taboraSessions",
    "taboraWorkspaces"
  ]);

  if (data[TABORA_STORAGE_KEY]) return normalizeState(data[TABORA_STORAGE_KEY]);

  const state = migrateV1Data(data.taboraSessions || [], data.taboraWorkspaces || []);
  await taboraApi.storage.local.set({
    [TABORA_STORAGE_KEY]: state,
    taboraV1Backup: {
      sessions: data.taboraSessions || [],
      workspaces: data.taboraWorkspaces || [],
      migratedAt: Date.now()
    },
    taboraNeedsMigration: false
  });
  return state;
}

async function saveTaboraState(state) {
  const normalized = normalizeState(state);
  await taboraApi.storage.local.set({ [TABORA_STORAGE_KEY]: normalized });
  return normalized;
}

async function saveUndoSnapshot(state, label = "Last change") {
  const snapshot = structuredClone(state);
  await taboraApi.storage.local.set({ [TABORA_UNDO_KEY]: { label, state: snapshot, savedAt: Date.now() } });
}

async function getUndoSnapshot() {
  const data = await taboraApi.storage.local.get(TABORA_UNDO_KEY);
  return data[TABORA_UNDO_KEY] || null;
}

// The dashboard, popup, and background all write the same key, so serialize read-modify-write cycles.
// Web Locks are not re-entrant: never call updateTaboraState from inside an updater.
function withStateLock(task) {
  const locks = globalThis.navigator?.locks;
  return locks ? locks.request(TABORA_STATE_LOCK, task) : task();
}

async function undoLastAction() {
  return withStateLock(async () => {
    const snapshot = await getUndoSnapshot();
    if (!snapshot?.state) return null;
    await saveTaboraState(snapshot.state);
    await taboraApi.storage.local.remove(TABORA_UNDO_KEY);
    return snapshot.label;
  });
}

async function updateTaboraState(updater, options = {}) {
  return withStateLock(async () => {
    const state = await getTaboraState();
    if (options.undoLabel) await saveUndoSnapshot(state, options.undoLabel);
    const result = await updater(state);
    await saveTaboraState(state);
    return { state, result };
  });
}

function ordered(items) {
  return [...items].sort((a, b) => (a.order || 0) - (b.order || 0));
}

function cleanName(value, fallback) {
  return String(value || "").trim().slice(0, 60) || fallback;
}

function normalizeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)) return "";
    return url.href;
  } catch {
    return "";
  }
}

function safeFavIconUrl(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.length > TABORA_MAX_FAVICON_LENGTH) return "";
  if (/^data:image\/(png|gif|jpeg|webp|x-icon|vnd\.microsoft\.icon);base64,/i.test(raw)) return raw;
  try {
    const url = new URL(raw);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function getDomain(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "Invalid URL";
  }
}

function sharedLinkSnapshot(link, index) {
  const url = normalizeUrl(link?.url);
  if (!url) return null;
  return {
    title: cleanName(link.title, getDomain(url)),
    url,
    favIconUrl: safeFavIconUrl(link.favIconUrl),
    note: String(link.note || "").trim().slice(0, 2000),
    order: index
  };
}

function sharedBoardSnapshot(board, index = 0) {
  const links = (Array.isArray(board?.links) ? board.links : [])
    .map(sharedLinkSnapshot)
    .filter(Boolean)
    .sort((a, b) => a.order - b.order)
    .map((link, linkIndex) => ({ ...link, order: linkIndex }));
  return {
    name: cleanName(board?.name, `Shared Board ${index + 1}`),
    color: TABORA_BOARD_COLORS.includes(board?.color) ? board.color : "green",
    icon: TABORA_BOARD_ICONS.includes(board?.icon) ? board.icon : "folder",
    size: TABORA_BOARD_SIZES.includes(board?.size) ? board.size : "medium",
    pinned: Boolean(board?.pinned),
    column: Math.max(0, Math.min(TABORA_BOARD_COLUMNS - 1, Number(board?.column) || 0)),
    columnOrder: Math.max(0, Number(board?.columnOrder) || 0),
    links
  };
}

function createTaboraBoardPackage(board) {
  return {
    format: TABORA_SHARE_FORMAT,
    version: TABORA_SHARE_VERSION,
    type: "board",
    exportedAt: new Date().toISOString(),
    board: sharedBoardSnapshot(board)
  };
}

function createTaboraPagePackage(page, boards) {
  return {
    format: TABORA_SHARE_FORMAT,
    version: TABORA_SHARE_VERSION,
    type: "page",
    exportedAt: new Date().toISOString(),
    page: { name: cleanName(page?.name, "Shared Page") },
    boards: ordered(Array.isArray(boards) ? boards : [])
      .sort((a, b) => a.column - b.column || a.columnOrder - b.columnOrder)
      .map(sharedBoardSnapshot)
  };
}

function assertSharedLinkLimit(board) {
  if (Array.isArray(board?.links) && board.links.length > TABORA_MAX_SHARED_LINKS) throw new Error("Too many shared links");
}

function parseTaboraPackage(value) {
  if (!value || typeof value !== "object" || value.format !== TABORA_SHARE_FORMAT || value.version !== TABORA_SHARE_VERSION) {
    throw new Error("Unsupported Tabora package");
  }
  if (value.type === "board") {
    if (!value.board || typeof value.board !== "object") throw new Error("Missing shared board");
    assertSharedLinkLimit(value.board);
    return { type: "board", board: sharedBoardSnapshot(value.board) };
  }
  if (value.type === "page") {
    if (!value.page || typeof value.page !== "object" || !Array.isArray(value.boards)) throw new Error("Missing shared page");
    if (value.boards.length > 100) throw new Error("Too many shared boards");
    value.boards.forEach(assertSharedLinkLimit);
    return {
      type: "page",
      page: { name: cleanName(value.page.name, "Shared Page") },
      boards: value.boards.map(sharedBoardSnapshot)
    };
  }
  throw new Error("Unknown Tabora package type");
}

async function importTaboraPackage(value, destinationPageId) {
  const shared = parseTaboraPackage(value);
  return updateTaboraState((state) => {
    let page;
    if (shared.type === "page") {
      page = {
        id: makeId("page"),
        name: cleanName(shared.page.name, "Shared Page"),
        order: state.pages.length,
        protected: false
      };
      state.pages.push(page);
    } else {
      page = state.pages.find((item) => item.id === destinationPageId)
        || state.pages.find((item) => item.id === state.settings.activePageId)
        || state.pages[0];
    }

    const sharedBoards = shared.type === "board" ? [shared.board] : shared.boards;
    const existingBoards = state.boards.filter((board) => board.pageId === page.id);
    const boardsByColumn = new Map(Array.from({ length: TABORA_BOARD_COLUMNS }, (_, column) => [column, []]));
    for (const board of existingBoards) boardsByColumn.get(board.column)?.push(board);

    const importedBoards = sharedBoards.map((source, index) => {
      const column = source.column;
      const columnBoards = boardsByColumn.get(column);
      const columnOrder = shared.type === "page" && columnBoards.length === 0
        ? source.columnOrder
        : columnBoards.length;
      const board = {
        id: makeId("board"),
        pageId: page.id,
        name: source.name,
        order: existingBoards.length + index,
        column,
        columnOrder,
        starred: false,
        pinned: source.pinned,
        color: source.color,
        icon: source.icon,
        size: source.size,
        createdAt: Date.now() + index,
        links: source.links.map((link, linkIndex) => ({ ...link, id: makeId("link"), order: linkIndex }))
      };
      columnBoards.push(board);
      state.boards.push(board);
      return board;
    });
    state.settings.activePageId = page.id;
    return {
      type: shared.type,
      page,
      boardCount: importedBoards.length,
      linkCount: importedBoards.reduce((count, board) => count + board.links.length, 0)
    };
  }, { undoLabel: shared.type === "page" ? "Shared page import" : "Shared board import" });
}

const TABORA_ID_PATTERN = /^[\w.-]{1,120}$/;

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseTaboraBackup(value) {
  if (!isRecord(value) || !Array.isArray(value.pages) || !Array.isArray(value.boards)) {
    throw new Error("Unsupported Tabora backup");
  }
  const backup = structuredClone(value);
  backup.pages = backup.pages
    .filter((page) => isRecord(page) && TABORA_ID_PATTERN.test(String(page.id)))
    .map((page, index) => ({
      id: String(page.id),
      name: cleanName(page.name, `Page ${index + 1}`),
      order: Number.isFinite(page.order) ? page.order : index,
      protected: page.id === "home"
    }));
  if (!backup.pages.some((page) => page.id === "home")) backup.pages.unshift(createDefaultState().pages[0]);
  const pageIds = new Set(backup.pages.map((page) => page.id));
  backup.boards = backup.boards
    .filter((board) => isRecord(board) && TABORA_ID_PATTERN.test(String(board.id)) && pageIds.has(board.pageId))
    .map((board) => ({
      ...board,
      id: String(board.id),
      name: cleanName(board.name, "Restored Board"),
      links: (Array.isArray(board.links) ? board.links : [])
        .filter((link) => isRecord(link) && normalizeUrl(link.url))
        .map((link, index) => ({
          ...link,
          id: TABORA_ID_PATTERN.test(String(link.id)) ? String(link.id) : makeId("link"),
          title: cleanName(link.title, getDomain(normalizeUrl(link.url))),
          url: normalizeUrl(link.url),
          favIconUrl: safeFavIconUrl(link.favIconUrl),
          note: String(link.note || "").trim().slice(0, 2000),
          order: Number.isFinite(link.order) ? link.order : index
        }))
    }));
  for (const key of ["trash", "recentlyOpened", "moods", "vaults"]) {
    backup[key] = Array.isArray(backup[key]) ? backup[key].filter(isRecord) : [];
  }
  backup.settings = isRecord(backup.settings) ? backup.settings : {};
  return normalizeState(backup);
}

async function restoreTaboraBackup(value) {
  const backup = parseTaboraBackup(value);
  return updateTaboraState((state) => {
    for (const key of ["pages", "boards", "trash", "recentlyOpened", "moods", "vaults", "settings"]) {
      state[key] = backup[key];
    }
    return {
      pageCount: backup.pages.length,
      boardCount: backup.boards.length,
      linkCount: backup.boards.reduce((count, board) => count + board.links.length, 0)
    };
  }, { undoLabel: "Backup restore" });
}

async function addPage(name) {
  return updateTaboraState((state) => {
    const page = {
      id: makeId("page"),
      name: cleanName(name, "New Page"),
      order: state.pages.length,
      protected: false
    };
    state.pages.push(page);
    state.settings.activePageId = page.id;
    return page;
  });
}

async function renamePage(pageId, name) {
  return updateTaboraState((state) => {
    const page = state.pages.find((item) => item.id === pageId);
    if (page) page.name = cleanName(name, page.name);
  });
}

async function deletePage(pageId) {
  return updateTaboraState((state) => {
    const page = state.pages.find((item) => item.id === pageId);
    if (!page || page.protected) return false;
    const removedBoards = state.boards.filter((board) => board.pageId === pageId);
    for (const board of removedBoards) {
      state.trash.unshift(createTrashEntry({ type: "board", value: board, pageName: page.name }));
    }
    state.boards = state.boards.filter((board) => board.pageId !== pageId);
    state.pages = state.pages.filter((item) => item.id !== pageId);
    state.settings.activePageId = "home";
    return true;
  }, { undoLabel: "Page deletion" });
}

async function addBoard(pageId, name, links = [], placement = null, customization = null) {
  return updateTaboraState((state) => {
    const board = createBoardInState(state, pageId, name, links, placement);
    if (customization) applyBoardCustomization(board, customization);
    return board;
  });
}

async function importLinkGroups(pageId, groups) {
  return updateTaboraState((state) => {
    const created = groups.map((group) => createBoardInState(state, pageId, group.name, group.links));
    // Drop boards whose links were all already saved elsewhere.
    const emptyIds = new Set(created.filter((board) => !board.links.length).map((board) => board.id));
    state.boards = state.boards.filter((board) => !emptyIds.has(board.id));
    const boards = created.filter((board) => !emptyIds.has(board.id));
    return { boardCount: boards.length, linkCount: boards.reduce((count, board) => count + board.links.length, 0) };
  }, { undoLabel: "Link import" });
}

async function ensureQuickSaveBoard(pageId) {
  return updateTaboraState((state) => {
    const page = state.pages.find((item) => item.id === pageId) || state.pages[0];
    const pageBoards = state.boards.filter((item) => item.pageId === page.id);
    // Older versions found this board by name, so adopt a legacy "Quick Saves" board once.
    const board = pageBoards.find((item) => item.quickSave)
      || pageBoards.find((item) => item.name === TABORA_QUICK_SAVE_BOARD_NAME)
      || createBoardInState(state, page.id, TABORA_QUICK_SAVE_BOARD_NAME);
    board.quickSave = true;
    return board;
  });
}

// Saved links are unique across all pages; shared packages, rooms, and backups are copied as-is.
function createBoardInState(state, pageId, name, links = [], placement = null) {
  const page = state.pages.find((item) => item.id === pageId) || state.pages[0];
  const pageBoards = ordered(state.boards.filter((item) => item.pageId === page.id));
  const isFirstBoard = pageBoards.length === 0;
  const requestedColumn = isFirstBoard ? 0 : typeof placement === "object" && placement !== null ? placement.column : pageBoards.length % TABORA_BOARD_COLUMNS;
  const column = Math.max(0, Math.min(TABORA_BOARD_COLUMNS - 1, Number(requestedColumn) || 0));
  const columnBoards = pageBoards.filter((item) => item.column === column).sort((a, b) => (a.columnOrder || 0) - (b.columnOrder || 0));
  const requestedOrder = isFirstBoard ? 0 : typeof placement === "object" && placement !== null ? placement.order : columnBoards.length;
  const columnOrder = Math.max(0, Math.min(Number(requestedOrder) || 0, columnBoards.length));
  for (const item of columnBoards) {
    if ((item.columnOrder || 0) >= columnOrder) item.columnOrder += 1;
  }
  const savedUrls = new Set(state.boards.flatMap((item) => item.links.map((link) => normalizeUrl(link.url))));
  const board = {
    id: makeId("board"),
    pageId: page.id,
    name: cleanName(name, "New Board"),
    order: pageBoards.length,
    column,
    columnOrder,
    starred: false,
    pinned: false,
    color: "green",
    icon: "folder",
    size: "medium",
    createdAt: Date.now(),
    links: links
      .map((link) => ({
        id: link.id || makeId("link"),
        title: cleanName(link.title, getDomain(link.url)),
        url: normalizeUrl(link.url),
        favIconUrl: safeFavIconUrl(link.favIconUrl),
        note: String(link.note || "").trim().slice(0, 2000)
      }))
      .filter((link) => {
        if (!link.url || savedUrls.has(link.url)) return false;
        savedUrls.add(link.url);
        return true;
      })
      .map((link, index) => ({ ...link, order: index }))
  };
  state.boards.push(board);
  return board;
}

function applyBoardCustomization(board, values = {}) {
  if (values.name !== undefined) board.name = cleanName(values.name, board.name);
  if (TABORA_BOARD_COLORS.includes(values.color)) board.color = values.color;
  if (TABORA_BOARD_ICONS.includes(values.icon)) board.icon = values.icon;
  if (TABORA_BOARD_SIZES.includes(values.size)) board.size = values.size;
  if (values.pinned !== undefined) board.pinned = Boolean(values.pinned);
  return board;
}

function createTrashEntry(fields) {
  return { id: makeId("trash"), deletedAt: Date.now(), ...fields };
}

async function renameBoard(boardId, name) {
  return updateTaboraState((state) => {
    const board = state.boards.find((item) => item.id === boardId);
    if (board) board.name = cleanName(name, board.name);
  });
}

async function customizeBoard(boardId, values = {}) {
  return updateTaboraState((state) => {
    const board = state.boards.find((item) => item.id === boardId);
    return board ? applyBoardCustomization(board, values) : null;
  }, { undoLabel: "Board customization" });
}

async function moveBoard(boardId, pageId) {
  return updateTaboraState((state) => {
    const board = state.boards.find((item) => item.id === boardId);
    if (!board || !state.pages.some((page) => page.id === pageId)) return;
    board.pageId = pageId;
    board.order = state.boards.filter((item) => item.pageId === pageId).length;
    const destinationBoards = state.boards.filter((item) => item.pageId === pageId && item.id !== board.id);
    board.column = destinationBoards.length % TABORA_BOARD_COLUMNS;
    board.columnOrder = destinationBoards.filter((item) => item.column === board.column).length;
  }, { undoLabel: "Board move" });
}

async function deleteBoard(boardId) {
  return updateTaboraState((state) => {
    const board = state.boards.find((item) => item.id === boardId);
    if (!board) return;
    const page = state.pages.find((item) => item.id === board.pageId);
    state.trash.unshift(createTrashEntry({ type: "board", value: structuredClone(board), pageName: page?.name || "Home" }));
    state.boards = state.boards.filter((item) => item.id !== boardId);
  }, { undoLabel: "Board deletion" });
}

async function restoreTrashItem(trashId) {
  return updateTaboraState((state) => {
    const index = state.trash.findIndex((entry) => entry.id === trashId);
    if (index < 0) return null;
    const [item] = state.trash.splice(index, 1);
    if (item.type === "link") {
      let board = state.boards.find((entry) => entry.id === item.boardId);
      if (!board) {
        const pageId = state.pages.some((page) => page.id === item.pageId) ? item.pageId : "home";
        const pageBoards = state.boards.filter((entry) => entry.pageId === pageId);
        board = {
          id: makeId("board"),
          pageId,
          name: cleanName(item.boardName, "Restored bookmarks"),
          order: pageBoards.length,
          column: pageBoards.length % TABORA_BOARD_COLUMNS,
          columnOrder: pageBoards.filter((entry) => entry.column === pageBoards.length % TABORA_BOARD_COLUMNS).length,
          starred: false,
          pinned: false,
          color: "green",
          icon: "folder",
          size: "medium",
          createdAt: Date.now(),
          links: []
        };
        state.boards.push(board);
      }
      const link = structuredClone(item.value);
      link.order = board.links.length;
      board.links.push(link);
      return item;
    }
    if (item.type !== "board") return item;
    const board = item.value;
    if (!state.pages.some((page) => page.id === board.pageId)) board.pageId = "home";
    board.order = state.boards.filter((entry) => entry.pageId === board.pageId).length;
    const destinationBoards = state.boards.filter((entry) => entry.pageId === board.pageId);
    board.column = destinationBoards.length % TABORA_BOARD_COLUMNS;
    board.columnOrder = destinationBoards.filter((entry) => entry.column === board.column).length;
    state.boards.push(board);
    return item;
  });
}

async function emptyTrash() {
  return updateTaboraState((state) => {
    state.trash = [];
  });
}

async function deleteTrashItem(trashId) {
  return updateTaboraState((state) => {
    state.trash = state.trash.filter((entry) => entry.id !== trashId);
  });
}

async function addLink(boardId, values) {
  const url = normalizeUrl(values.url);
  if (!url) return { state: await getTaboraState(), result: null };
  return updateTaboraState((state) => {
    const board = state.boards.find((item) => item.id === boardId);
    if (!board) return null;
    const duplicate = findDuplicateLink(state, url);
    if (duplicate) return { duplicate: true, ...duplicate };
    const link = {
      id: makeId("link"),
      title: cleanName(values.title, getDomain(url)),
      url,
      favIconUrl: safeFavIconUrl(values.favIconUrl),
      note: String(values.note || "").trim().slice(0, 2000),
      order: board.links.length
    };
    board.links.push(link);
    board.lastUsedAt = Date.now();
    return link;
  });
}

async function updateLink(boardId, linkId, values) {
  return updateTaboraState((state) => {
    const board = state.boards.find((item) => item.id === boardId);
    const link = board?.links.find((item) => item.id === linkId);
    if (!link) return;
    const url = normalizeUrl(values.url);
    const duplicate = url ? findDuplicateLink(state, url, linkId) : null;
    if (duplicate) return { duplicate: true, ...duplicate };
    if (url) link.url = url;
    link.title = cleanName(values.title, link.title);
    link.note = String(values.note || "").trim().slice(0, 2000);
    if (Object.hasOwn(values, "favIconUrl")) link.favIconUrl = safeFavIconUrl(values.favIconUrl);
  });
}

async function deleteLink(boardId, linkId) {
  return updateTaboraState((state) => {
    const board = state.boards.find((item) => item.id === boardId);
    const link = board?.links.find((item) => item.id === linkId);
    if (!board || !link) return;
    const page = state.pages.find((item) => item.id === board.pageId);
    state.trash.unshift(createTrashEntry({
      type: "link",
      value: structuredClone(link),
      boardId: board.id,
      boardName: board.name,
      pageId: board.pageId,
      pageName: page?.name || "Home"
    }));
    board.links = board.links.filter((item) => item.id !== linkId);
    board.links.forEach((item, index) => { item.order = index; });
  }, { undoLabel: "Bookmark deletion" });
}

function findDuplicateLink(state, value, excludeLinkId = "") {
  const url = normalizeUrl(value);
  if (!url) return null;
  for (const board of state.boards) {
    const link = board.links.find((item) => item.id !== excludeLinkId && normalizeUrl(item.url) === url);
    if (!link) continue;
    const page = state.pages.find((item) => item.id === board.pageId);
    return { link, board, page };
  }
  return null;
}

async function recordLinkOpened(boardId, linkId) {
  return updateTaboraState((state) => {
    const board = state.boards.find((item) => item.id === boardId);
    const link = board?.links.find((item) => item.id === linkId);
    if (!board || !link) return;
    const page = state.pages.find((item) => item.id === board.pageId);
    state.recentlyOpened = state.recentlyOpened.filter((item) => item.linkId !== linkId);
    state.recentlyOpened.unshift({
      linkId,
      boardId,
      pageId: board.pageId,
      title: link.title,
      url: link.url,
      boardName: board.name,
      pageName: page?.name || "Home",
      openedAt: Date.now()
    });
    state.recentlyOpened = state.recentlyOpened.slice(0, 50);
    board.lastUsedAt = Date.now();
  });
}

async function setLinkHealth(boardId, linkId, health) {
  return updateTaboraState((state) => {
    const link = state.boards.find((board) => board.id === boardId)?.links.find((item) => item.id === linkId);
    if (link) link.health = health;
  });
}

async function reorderBoard(boardId, beforeBoardId) {
  return updateTaboraState((state) => {
    const board = state.boards.find((item) => item.id === boardId);
    const target = state.boards.find((item) => item.id === beforeBoardId);
    if (!board || !target || board.pageId !== target.pageId || board.id === target.id) return;
    const sourceColumn = board.column;
    const list = state.boards
      .filter((item) => item.pageId === board.pageId && item.column === target.column && item.id !== board.id)
      .sort((a, b) => (a.columnOrder || 0) - (b.columnOrder || 0));
    const targetIndex = list.findIndex((item) => item.id === target.id);
    list.splice(targetIndex, 0, board);
    board.column = target.column;
    list.forEach((item, index) => { item.columnOrder = index; });
    state.boards
      .filter((item) => item.pageId === board.pageId && item.column === sourceColumn && item.id !== board.id)
      .sort((a, b) => (a.columnOrder || 0) - (b.columnOrder || 0))
      .forEach((item, index) => { item.columnOrder = index; });
  }, { undoLabel: "Board reorder" });
}

async function moveBoardToColumn(boardId, column) {
  return updateTaboraState((state) => {
    const board = state.boards.find((item) => item.id === boardId);
    if (!board) return;
    const sourceColumn = board.column;
    const destinationColumn = Math.max(0, Math.min(TABORA_BOARD_COLUMNS - 1, Number(column) || 0));
    const destination = state.boards.filter((item) => item.pageId === board.pageId && item.column === destinationColumn && item.id !== board.id);
    board.column = destinationColumn;
    board.columnOrder = destination.length;
    state.boards
      .filter((item) => item.pageId === board.pageId && item.column === sourceColumn && item.id !== board.id)
      .sort((a, b) => (a.columnOrder || 0) - (b.columnOrder || 0))
      .forEach((item, index) => { item.columnOrder = index; });
  }, { undoLabel: "Board move" });
}

async function moveLink(linkId, fromBoardId, toBoardId, beforeLinkId = null) {
  return updateTaboraState((state) => {
    const source = state.boards.find((board) => board.id === fromBoardId);
    const target = state.boards.find((board) => board.id === toBoardId);
    const link = source?.links.find((item) => item.id === linkId);
    if (!source || !target || !link) return;
    source.links = source.links.filter((item) => item.id !== linkId);
    const targetLinks = ordered(target.links.filter((item) => item.id !== linkId));
    const targetIndex = beforeLinkId ? targetLinks.findIndex((item) => item.id === beforeLinkId) : targetLinks.length;
    targetLinks.splice(targetIndex < 0 ? targetLinks.length : targetIndex, 0, link);
    source.links.forEach((item, index) => { item.order = index; });
    target.links = targetLinks.map((item, index) => ({ ...item, order: index }));
  }, { undoLabel: "Bookmark move" });
}

// Undo one organize session without discarding changes saved elsewhere meanwhile.
function revertOrganizeChanges(state, snapshot, deletedLinkIds = new Set()) {
  const currentBoards = new Map(state.boards.map((board) => [board.id, board]));
  const currentLinks = new Map(state.boards.flatMap((board) => board.links.map((link) => [link.id, link])));
  const trashedLinks = new Map(state.trash
    .filter((entry) => entry.type === "link" && deletedLinkIds.has(entry.value?.id))
    .map((entry) => [entry.value.id, entry.value]));
  const placedLinkIds = new Set();
  const restoredBoardLinks = new Map();
  for (const snapshotBoard of snapshot.boards) {
    const board = currentBoards.get(snapshotBoard.id);
    if (!board) continue;
    board.column = snapshotBoard.column;
    board.columnOrder = snapshotBoard.columnOrder;
    board.order = snapshotBoard.order;
    const links = ordered(snapshotBoard.links)
      .map((link) => currentLinks.get(link.id) || trashedLinks.get(link.id))
      .filter(Boolean);
    for (const link of links) placedLinkIds.add(link.id);
    restoredBoardLinks.set(board.id, links);
  }
  for (const board of state.boards) {
    const otherLinks = ordered(board.links).filter((link) => !placedLinkIds.has(link.id));
    board.links = [...(restoredBoardLinks.get(board.id) || []), ...otherLinks]
      .map((link, index) => ({ ...link, order: index }));
  }
  state.trash = state.trash.filter((entry) => !(entry.type === "link" && placedLinkIds.has(entry.value?.id) && deletedLinkIds.has(entry.value.id)));
  return state;
}

async function setSetting(key, value) {
  return updateTaboraState((state) => {
    state.settings[key] = value;
  });
}

async function saveCurrentWindowAsBoard(pageId, name) {
  const tabs = await taboraApi.tabs.query({ currentWindow: true });
  const savableTabs = tabs.filter((tab) => normalizeUrl(tab.url));
  const state = await getTaboraState();
  const existingUrls = new Set(state.boards.flatMap((board) => board.links.map((link) => normalizeUrl(link.url))));
  const seenUrls = new Set(existingUrls);
  const uniqueTabs = savableTabs.filter((tab) => {
    const url = normalizeUrl(tab.url);
    if (seenUrls.has(url)) return false;
    seenUrls.add(url);
    return true;
  });
  const links = uniqueTabs
    .map((tab) => ({ title: tab.title, url: tab.url, favIconUrl: tab.favIconUrl || "" }));
  const duplicateCount = savableTabs.length - uniqueTabs.length;
  if (!links.length) return { board: null, duplicateCount };
  const board = await addBoard(pageId, name || "Current Window", links);
  const latestState = await getTaboraState();
  if (latestState.settings.closeTabsAfterSaveAll && uniqueTabs.length) {
    await taboraApi.tabs.remove(uniqueTabs.map((tab) => tab.id));
  }
  return { board: board.result, duplicateCount };
}

async function openLinks(links, incognito = false) {
  const urls = links.map((link) => normalizeUrl(link.url)).filter(Boolean);
  if (!urls.length) return;
  if (incognito) {
    await taboraApi.windows.create({ url: urls, incognito: true, focused: true });
    return;
  }
  for (const [index, url] of urls.entries()) {
    await taboraApi.tabs.create({ url, active: index === 0 });
  }
}

// Smart Organize: known hostnames win, then whole-word keywords in the title or description.
const SMART_CATEGORIES = [
  {
    name: "Development",
    domains: ["github.com", "gitlab.com", "bitbucket.org", "stackoverflow.com", "stackexchange.com", "npmjs.com", "pypi.org", "developer.mozilla.org", "vercel.com", "netlify.com", "codepen.io", "dev.to"],
    keywords: /\b(developer|programming|coding|code|api|sdk|repository|documentation)\b/i
  },
  {
    name: "Videos",
    domains: ["youtube.com", "youtu.be", "vimeo.com", "netflix.com", "twitch.tv", "primevideo.com", "disneyplus.com"],
    keywords: /\b(video|videos|streaming|movie|movies|episode)\b/i
  },
  {
    name: "Shopping",
    domains: ["amazon.com", "ebay.com", "etsy.com", "aliexpress.com", "walmart.com", "bestbuy.com"],
    keywords: /\b(shop|shopping|store|product|cart|checkout|deals?)\b/i
  },
  {
    name: "Social",
    domains: ["facebook.com", "instagram.com", "linkedin.com", "reddit.com", "twitter.com", "x.com", "threads.net", "discord.com", "bsky.app", "mastodon.social"],
    keywords: /\b(social|community|forum)\b/i
  },
  {
    name: "Reading",
    domains: ["medium.com", "substack.com", "wikipedia.org", "news.ycombinator.com", "nytimes.com", "bbc.com", "theguardian.com"],
    keywords: /\b(article|blog|news|newsletter|wiki)\b/i
  },
  {
    name: "Productivity",
    domains: ["notion.so", "trello.com", "asana.com", "slack.com", "zoom.us", "docs.google.com", "drive.google.com", "calendar.google.com", "mail.google.com", "dropbox.com", "figma.com", "airtable.com"],
    keywords: /\b(calendar|tasks?|todo|meeting|notes|planner)\b/i
  }
];

function categorizeLink(link) {
  let hostname = "";
  try {
    hostname = new URL(link.url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    hostname = "";
  }
  const byDomain = SMART_CATEGORIES.find((category) => category.domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`)));
  if (byDomain) return byDomain.name;
  const text = `${link.title || ""} ${link.note || ""}`;
  return SMART_CATEGORIES.find((category) => category.keywords.test(text))?.name || "Other";
}

const boardSearchTextCache = new WeakMap();

function boardMatches(board, query) {
  const normalized = String(query || "").trim().toLowerCase();
  if (!normalized) return true;
  let searchText = boardSearchTextCache.get(board);
  if (!searchText) {
    searchText = [board.name, ...board.links.flatMap((link) => [link.title, link.url, link.note])]
      .map((value) => String(value || "").toLowerCase())
      .join("\n");
    boardSearchTextCache.set(board, searchText);
  }
  return searchText.includes(normalized);
}

// Chromium serves the site icons it has cached from the extension's own origin ("favicon" permission):
// no network request and no site access. Firefox has no equivalent, so it keeps the saved icon or the letter tile.
function browserFaviconUrl(pageUrl, size = 32) {
  if (globalThis.location?.protocol !== "chrome-extension:" || !normalizeUrl(pageUrl)) return "";
  const url = new URL("/_favicon/", location.origin);
  url.searchParams.set("pageUrl", pageUrl);
  url.searchParams.set("size", String(size));
  return url.href;
}

function letterFaviconNode(link) {
  const fallback = document.createElement("span");
  fallback.className = "favicon fallback";
  fallback.textContent = (link.title || getDomain(link.url) || "?").slice(0, 1).toUpperCase();
  return fallback;
}

function faviconPixels(image) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, canvas.width, canvas.height).data;
}

// For sites it has never cached, the browser answers with a generic page icon instead of an error.
let placeholderFaviconPromise = null;
function placeholderFaviconPixels() {
  placeholderFaviconPromise ??= new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(faviconPixels(image));
    image.onerror = () => resolve(null);
    image.src = browserFaviconUrl("https://tabora.invalid/");
  });
  return placeholderFaviconPromise;
}

async function isPlaceholderFavicon(image) {
  const placeholder = await placeholderFaviconPixels();
  if (!placeholder || placeholder.length !== image.naturalWidth * image.naturalHeight * 4) return false;
  const pixels = faviconPixels(image);
  return pixels.every((value, index) => value === placeholder[index]);
}

function imageFaviconNode(link, source, onFailure) {
  const image = document.createElement("img");
  image.className = "favicon";
  image.src = source;
  image.alt = "";
  image.loading = "lazy";
  image.decoding = "async";
  image.referrerPolicy = "no-referrer";
  image.addEventListener("error", () => image.replaceWith(onFailure()), { once: true });
  return image;
}

function faviconNode(link) {
  const savedIconNode = () => (link.favIconUrl ? imageFaviconNode(link, link.favIconUrl, () => letterFaviconNode(link)) : letterFaviconNode(link));
  const browserSource = browserFaviconUrl(link.url);
  if (!browserSource) return savedIconNode();
  const image = imageFaviconNode(link, browserSource, savedIconNode);
  image.addEventListener("load", async () => {
    if (await isPlaceholderFavicon(image).catch(() => false)) image.replaceWith(savedIconNode());
  }, { once: true });
  return image;
}

function setText(parent, selector, value) {
  const node = parent.querySelector(selector);
  if (node) node.textContent = value;
}

// Custom wallpapers live in IndexedDB so the dashboard and the popup can both read them.
function openWallpaperDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("tabora-assets", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("wallpapers");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveWallpaperBlob(blob) {
  const database = await openWallpaperDatabase();
  const id = `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await new Promise((resolve, reject) => {
    const transaction = database.transaction("wallpapers", "readwrite");
    transaction.objectStore("wallpapers").put({ blob, name: blob.name || "Uploaded wallpaper", createdAt: Date.now() }, id);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
  return id;
}

async function getWallpaperBlob(id = "custom") {
  const database = await openWallpaperDatabase();
  const value = await new Promise((resolve, reject) => {
    const request = database.transaction("wallpapers").objectStore("wallpapers").get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return value instanceof Blob ? value : value?.blob || null;
}

async function getCustomWallpapers() {
  const database = await openWallpaperDatabase();
  const wallpapers = await new Promise((resolve, reject) => {
    const store = database.transaction("wallpapers").objectStore("wallpapers");
    const request = store.openCursor();
    const result = [];
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) { resolve(result); return; }
      const value = cursor.value;
      const blob = value instanceof Blob ? value : value?.blob;
      if (blob) result.push({ id: String(cursor.key), blob, name: value?.name || blob.name || "Uploaded wallpaper", createdAt: value?.createdAt || 0 });
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
  database.close();
  return wallpapers.sort((a, b) => b.createdAt - a.createdAt);
}

async function deleteCustomWallpaper(id) {
  const database = await openWallpaperDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction("wallpapers", "readwrite");
    transaction.objectStore("wallpapers").delete(id);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

async function renameCustomWallpaper(id, name) {
  const database = await openWallpaperDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction("wallpapers", "readwrite");
    const store = transaction.objectStore("wallpapers");
    const request = store.get(id);
    request.onsuccess = () => {
      const value = request.result;
      const blob = value instanceof Blob ? value : value?.blob;
      if (blob) store.put({ blob, name, createdAt: value?.createdAt || Date.now() }, id);
    };
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}
