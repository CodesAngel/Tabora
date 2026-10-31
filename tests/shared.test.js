const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const storage = {};
const chrome = {
  storage: {
    local: {
      async get(keys) {
        const list = Array.isArray(keys) ? keys : [keys];
        return Object.fromEntries(list.filter((key) => key in storage).map((key) => [key, storage[key]]));
      },
      async set(values) { Object.assign(storage, structuredClone(values)); },
      async remove(key) { delete storage[key]; }
    }
  }
};

const context = vm.createContext({ chrome, console, structuredClone, URL, setTimeout, clearTimeout });
const source = `${fs.readFileSync("shared.js", "utf8")}
globalThis.tabora = { createDefaultState, getTaboraState, saveTaboraState, addBoard, addLink, updateLink, customizeBoard, deleteBoard, undoLastAction, createTaboraBoardPackage, createTaboraPagePackage, parseTaboraPackage, importTaboraPackage, addPage, ensureQuickSaveBoard, revertOrganizeChanges, parseTaboraBackup, restoreTaboraBackup };`;
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

  console.log("shared state tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
