const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync("background.js", "utf8");

function loadBackground({ useBrowserNamespace = false, workerContext = true } = {}) {
  const listeners = { recorded: [] };
  const chrome = {
    action: {
      setBadgeBackgroundColor: async () => {},
      setBadgeText: async () => {},
      setTitle: async () => {}
    },
    commands: { onCommand: { addListener: (listener) => { listeners.command = listener; } } },
    runtime: { id: "tabora-test", onMessage: { addListener: (listener) => { listeners.message = listener; } } },
    tabs: { query: async () => [] }
  };
  const context = {
    ensureQuickSaveBoard: async () => ({ result: null }),
    addLink: async () => ({ result: null }),
    console,
    findDuplicateLink: () => null,
    getTaboraState: async () => ({ boards: [], settings: {} }),
    normalizeUrl: () => "",
    recordLinkOpened: async (boardId, linkId) => { listeners.recorded.push([boardId, linkId]); },
    setTimeout
  };
  if (workerContext) context.importScripts = () => {};
  context[useBrowserNamespace ? "browser" : "chrome"] = chrome;
  vm.runInNewContext(source, context, { filename: "background.js" });
  return listeners;
}

test("background starts without installation or alarms APIs", () => {
  const listeners = loadBackground();
  assert.equal(typeof listeners.command, "function");
  assert.doesNotMatch(source, /chrome\.alarms|onInstalled/);
});

test("background records opened links only for its own extension's messages", () => {
  const listeners = loadBackground();
  const responses = [];
  listeners.message({ type: "tabora:record-link-opened", boardId: "board-1", linkId: "link-1" }, { id: "tabora-test" }, (value) => responses.push(value));
  listeners.message({ type: "tabora:record-link-opened", boardId: "board-2", linkId: "link-2" }, { id: "someone-else" }, (value) => responses.push(value));
  listeners.message({ type: "unrelated" }, { id: "tabora-test" }, (value) => responses.push(value));
  assert.deepEqual(listeners.recorded, [["board-1", "link-1"]]);
  assert.equal(responses.length, 1);
});

test("background starts with Firefox's browser namespace", () => {
  const listeners = loadBackground({ useBrowserNamespace: true, workerContext: false });
  assert.equal(typeof listeners.command, "function");
});
