const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const storage = {};
let storageDelayMs = 0;
const pause = () => (storageDelayMs ? new Promise((resolve) => setTimeout(resolve, storageDelayMs)) : Promise.resolve());
const chrome = {
  storage: {
    local: {
      async get(keys) {
        await pause();
        const list = Array.isArray(keys) ? keys : [keys];
        return Object.fromEntries(list.filter((key) => key in storage).map((key) => [key, structuredClone(storage[key])]));
      },
      async set(values) { await pause(); Object.assign(storage, structuredClone(values)); },
      async remove(key) { delete storage[key]; }
    }
  }
};

// Node 22 has no Web Locks; this FIFO stand-in has the same request(name, task) contract.
const lockQueues = new Map();
const navigator = {
  locks: {
    request(name, task) {
      const previous = lockQueues.get(name) || Promise.resolve();
      const run = previous.then(() => task());
      lockQueues.set(name, run.catch(() => {}));
      return run;
    }
  }
};

const context = vm.createContext({ chrome, navigator, console, structuredClone, URL, setTimeout, clearTimeout });
const source = `${fs.readFileSync("shared.js", "utf8")}
globalThis.tabora = { createDefaultState, getTaboraState, saveTaboraState, addBoard, addLink, updateLink, customizeBoard, deleteBoard, undoLastAction, createTaboraBoardPackage, createTaboraPagePackage, parseTaboraPackage, importTaboraPackage, addPage, ensureQuickSaveBoard, revertOrganizeChanges, parseTaboraBackup, restoreTaboraBackup, importLinkGroups, deleteLink, restoreTrashItem, deleteTrashItem, safeFavIconUrl, normalizeState, TABORA_TRASH_RETENTION_MS };`;
vm.runInContext(source, context);

(async () => {
  const api = context.tabora;
  const initial = await api.getTaboraState();
  assert.equal(initial.schemaVersion, 4);
  assert.equal(initial.recentlyOpened.length, 0);
  assert.equal(initial.settings.onboardingComplete, false);

  const created = await api.addBoard("home", "Research", [], { column: 3, order: 8 });
  const boardId = created.result.id;
  assert.equal((await api.getTaboraState()).settings.onboardingComplete, false);
  assert.equal(created.result.column, 0);
  assert.equal(created.result.columnOrder, 0);
  await api.customizeBoard(boardId, { color: "blue", icon: "book", size: "large", pinned: true });
  let state = await api.getTaboraState();
  assert.equal(state.boards[0].color, "blue");
  assert.equal(state.boards[0].pinned, true);

  const first = await api.addLink(boardId, { title: "Example", url: "https://example.com" });
  assert.equal(first.result.title, "Example");
  const duplicate = await api.addLink(boardId, { title: "Duplicate", url: "https://example.com/" });
  assert.equal(duplicate.result.duplicate, true);
  state = await api.getTaboraState();
  assert.equal(state.boards[0].links.length, 1);
  await api.updateLink(boardId, first.result.id, { title: "Example", url: "https://example.com", note: "", favIconUrl: "https://example.com/favicon.ico" });
  state = await api.getTaboraState();
  assert.equal(state.boards[0].links[0].favIconUrl, "https://example.com/favicon.ico");

  const boardPackage = api.createTaboraBoardPackage(state.boards[0]);
  assert.equal(boardPackage.type, "board");
  assert.equal(boardPackage.board.links[0].id, undefined);
  const importedBoard = await api.importTaboraPackage(boardPackage, "home");
  state = await api.getTaboraState();
  assert.equal(importedBoard.result.boardCount, 1);
  assert.equal(state.boards.length, 2);
  assert.notEqual(state.boards[0].id, state.boards[1].id);
  assert.notEqual(state.boards[0].links[0].id, state.boards[1].links[0].id);
  assert.equal(state.boards[1].color, "blue");
  assert.equal(state.boards[1].size, "large");
  assert.equal(state.boards[1].links[0].url, "https://example.com/");

  const pagePackage = api.createTaboraPagePackage({ name: "Shared Research" }, [state.boards[0]]);
  const importedPage = await api.importTaboraPackage(pagePackage, "home");
  state = await api.getTaboraState();
  assert.equal(importedPage.result.type, "page");
  assert.ok(state.pages.some((page) => page.name === "Shared Research"));
  assert.throws(() => api.parseTaboraPackage({ type: "board" }), /Unsupported Tabora package/);

  await api.deleteBoard(boardId);
  state = await api.getTaboraState();
  assert.equal(state.boards.length, 2);
  assert.equal(state.trash.length, 1);
  assert.equal(await api.undoLastAction(), "Board deletion");
  state = await api.getTaboraState();
  assert.equal(state.boards.length, 3);
  assert.equal(state.trash.length, 0);

  // Quick Save adopts a legacy board by name, then keeps finding it after a rename.
  const legacy = await api.addBoard("home", "Quick Saves");
  const adopted = await api.ensureQuickSaveBoard("home");
  assert.equal(adopted.result.id, legacy.result.id);
  await api.customizeBoard(legacy.result.id, { name: "Inbox" });
  const renamed = await api.ensureQuickSaveBoard("home");
  assert.equal(renamed.result.id, legacy.result.id);
  assert.equal(renamed.result.name, "Inbox");

  // Cancelling organize mode reverts its moves and deletions but keeps links saved elsewhere.
  state = await api.getTaboraState();
  const [boardA, boardB] = state.boards;
  const snapshot = structuredClone(state);
  const movedLink = boardA.links[0];
  boardA.links = [];
  boardB.links.push(movedLink);
  const deletedLink = boardB.links[0];
  boardB.links = boardB.links.filter((link) => link.id !== deletedLink.id);
  state.trash.unshift({ type: "link", value: structuredClone(deletedLink), deletedAt: Date.now() });
  boardA.links.push({ id: "link-external", title: "Saved elsewhere", url: "https://example.org/", order: 0 });
  api.revertOrganizeChanges(state, snapshot, new Set([deletedLink.id]));
  assert.deepEqual([...boardA.links.map((link) => link.id)], [movedLink.id, "link-external"]);
  assert.deepEqual([...boardB.links.map((link) => link.id)], [...snapshot.boards[1].links.map((link) => link.id)]);
  assert.equal(state.trash.some((entry) => entry.value?.id === deletedLink.id), false);

  // Backups round-trip, drop unsafe links, and strip settings that are no longer stored.
  const exported = structuredClone(await api.getTaboraState());
  exported.settings.organizeMode = true;
  exported.settings.language = "en";
  exported.boards[0].links.push({ id: "bad", title: "Bad", url: "javascript:alert(1)" });
  await api.addPage("Temporary");
  const restored = await api.restoreTaboraBackup(exported);
  state = await api.getTaboraState();
  assert.equal(restored.result.boardCount, exported.boards.length);
  assert.equal(state.pages.some((page) => page.name === "Temporary"), false);
  assert.equal(state.boards[0].links.some((link) => link.id === "bad"), false);
  assert.equal("organizeMode" in state.settings, false);
  assert.equal("language" in state.settings, false);
  assert.throws(() => api.parseTaboraBackup({ boards: [] }), /Unsupported Tabora backup/);
  assert.equal(await api.undoLastAction(), "Backup restore");
  assert.ok((await api.getTaboraState()).pages.some((page) => page.name === "Temporary"));

  // Concurrent writers (popup, background, several tabs) must not overwrite each other.
  const concurrentBoard = (await api.addBoard("home", "Concurrent")).result;
  storageDelayMs = 2;
  await Promise.all(Array.from({ length: 12 }, (_, index) => api.addLink(concurrentBoard.id, { url: `https://concurrent.test/${index}` })));
  storageDelayMs = 0;
  state = await api.getTaboraState();
  assert.equal(state.boards.find((board) => board.id === concurrentBoard.id).links.length, 12);

  // Imports and new boards skip links already saved on any page, and drop boards left empty.
  const deduped = await api.addBoard("home", "Dedupe", [
    { url: "https://concurrent.test/0" },
    { url: "https://fresh.test/a" },
    { url: "https://FRESH.test/a" }
  ], null, { color: "rose", icon: "code", pinned: true });
  assert.deepEqual([...deduped.result.links.map((link) => link.url)], ["https://fresh.test/a"]);
  assert.equal(deduped.result.color, "rose");
  assert.equal(deduped.result.pinned, true);
  const boardCountBeforeImport = (await api.getTaboraState()).boards.length;
  const imported = await api.importLinkGroups("home", [
    { name: "All duplicates", links: [{ url: "https://fresh.test/a" }] },
    { name: "New links", links: [{ url: "https://fresh.test/b" }, { url: "https://fresh.test/c" }] }
  ]);
  assert.equal(imported.result.boardCount, 1);
  assert.equal(imported.result.linkCount, 2);
  assert.equal((await api.getTaboraState()).boards.length, boardCountBeforeImport + 1);
  assert.equal(await api.undoLastAction(), "Link import");
  assert.equal((await api.getTaboraState()).boards.length, boardCountBeforeImport);

  // Trash entries are addressed by id, legacy entries get a stable id, and expired ones are dropped.
  const freshLink = deduped.result.links[0];
  await api.deleteLink(deduped.result.id, freshLink.id);
  state = await api.getTaboraState();
  const trashId = state.trash[0].id;
  assert.match(trashId, /^trash-/);
  const restoredItem = await api.restoreTrashItem(trashId);
  assert.equal(restoredItem.result.value.id, freshLink.id);
  assert.equal((await api.restoreTrashItem(trashId)).result, null);
  const legacyTrash = api.normalizeState({ pages: [{ id: "home", name: "Home" }], boards: [], trash: [
    { type: "link", value: { id: "old-link" }, deletedAt: Date.now() },
    { type: "link", value: { id: "expired" }, deletedAt: Date.now() - api.TABORA_TRASH_RETENTION_MS - 1000 }
  ] });
  assert.equal(legacyTrash.trash.length, 1);
  assert.equal(legacyTrash.trash[0].id, api.normalizeState({ pages: [{ id: "home", name: "Home" }], boards: [], trash: [{ type: "link", value: { id: "old-link" }, deletedAt: legacyTrash.trash[0].deletedAt }] }).trash[0].id);

  // Favicons: only web URLs and small raster data URIs survive.
  assert.equal(api.safeFavIconUrl("https://example.com/icon.png"), "https://example.com/icon.png");
  assert.equal(api.safeFavIconUrl("data:image/png;base64,AAAA"), "data:image/png;base64,AAAA");
  assert.equal(api.safeFavIconUrl("javascript:alert(1)"), "");
  assert.equal(api.safeFavIconUrl("data:text/html;base64,AAAA"), "");
  assert.equal(api.safeFavIconUrl(`data:image/png;base64,${"A".repeat(5000)}`), "");

  // Shared packages are capped per board.
  const huge = api.createTaboraBoardPackage({ name: "Huge", links: [] });
  huge.board.links = Array.from({ length: 2001 }, (_, index) => ({ url: `https://huge.test/${index}` }));
  assert.throws(() => api.parseTaboraPackage(huge), /Too many shared links/);

  console.log("shared state tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
