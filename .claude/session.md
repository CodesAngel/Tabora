# Tabora: session notes

Last updated: 2026-11-04

## Where the designs live

Both folders are local only (listed in `.gitignore`).

- `ux-mockups/`: **"Tabora UX Proposals"**. A combined dashboard (`Main.html`) plus 8 "now vs proposed" pages.
- `ux-mockups-2/`: **"Tabora 2.0 Concepts"**. A more premium look (frosted glass, Tabora wallpapers, accent `#5ee39b`, Nunito Sans; see `shared.css`) with a new home page and 8 feature concepts.

## Done

From **ux-mockups**, proposals 04, 05, 06 and 08 are built (commits `2538ce7` and `124e5d1`, plus the follow-up README and CHANGELOG edits).

### 04 · Real favicons
- `browserFaviconUrl()` in `shared.js` reads Chromium's icon cache (`/_favicon/?pageUrl=…&size=32`). Adds the `favicon` permission.
- When the browser has never cached a site, it returns a generic page icon. That placeholder is detected by comparing pixels (`isPlaceholderFavicon`) and replaced with the saved icon or the letter tile.
- `img.favicon` sits on a light tile so dark icons (GitHub, Stack Overflow) stay visible on dark wallpapers.
- Firefox has no icon cache, so it keeps the saved icon or the letter tile.

### 05 · Search up front + shortcuts
- `#headerSearch` field in the page header; it opens the existing floating search panel.
- `Enter` opens the first result. A "Search the web for …" row at the bottom, also reached with `Shift+Enter`, uses `search.query` with this tab's `tabId` (or a new tab). Older Firefox falls back to `search.search`. Adds the `search` permission.
- Shortcuts: `Alt+1–9` switches pages, `N` creates a board, `?` opens the shortcuts dialog (`#shortcutsDialog`).

### 06 · Popup: current tab first
- `popup.html` / `popup.js` rewritten.
  - Current-tab card with a split button, "Save to [last board]", and a ▾ menu listing every board plus "+ New board…".
  - Duplicates are flagged before you click, with a "Show it" button that opens `dashboard.html?page=…&link=…` and highlights the bookmark.
  - Saving the whole window is a collapsible `<details>` row.
- New setting `lastSaveBoardId`. Without one, saves go to Quick Saves like the shortcut does.
- `board.lastUsedAt` is set in `addLink` and `recordLinkOpened`, and the popup sorts boards by it. Empty boards have no "Open all", and counts read "1 link".

### 08 · Onboarding + discovery
- `ONBOARDING_STEPS` now hold action lists. Step 1 offers Import bookmarks, Save open tabs or Start empty. The last step points to search and shortcuts.
- "Recently opened" row of chips above the boards (`renderRecentStrip`), with a new setting `showRecentlyOpened`.
- *Settings → Tools* lists every tool by name (`data-open-feature`, opens the feature dialog on that view).
- Renaming a custom wallpaper uses an inline field instead of `window.prompt`.

### Tests and docs
- `tests/browser-smoke.js` covers the new onboarding, recent strip, favicon URL, web-search row, `?` dialog and the popup layout. All unit tests and the smoke test pass.
- README (features, getting started, shortcuts, permissions, test note, schema, roadmap), CHANGELOG `[Unreleased]`, CHROMEWEBSTORE permission justifications and BROWSER_SUPPORT are updated.

## Testing notes
- **Google Chrome 137 and later ignore `--load-extension`.** Use Edge or Chromium for the smoke test.
- In Edge, also pass `--disable-sync --disable-features=msImplicitSignin,msEdgeSync`. Otherwise a fresh profile signs in to the Windows Microsoft account and starts syncing extensions.
- Driving Edge over CDP: in Node, `new URL("chrome-extension://…").origin` is `"null"`, so build the origin from the string. MV3 service workers drop out of `/json/list` when they go idle.

## Tried and dropped

Proposals **02** and **03** from `ux-mockups` were built on 2026-11-04 and then rolled back. They looked fine in the mockups but not in the real app. Don't rebuild either one as it was designed.

- **02 · Simpler toolbar + mode banner:** the right-hand icon rail and the wallpaper button were replaced by a header with + Board, ⋯ More (a menu of named tools showing On/Off) and Settings. An amber banner with "Turn off" showed while private opening or blur was on.
- **03 · Undo instead of confirm:** deleting a link, board or page happened at once, with an Undo toast for 8 seconds. Boards and links could be dragged by a hover grip without Organize mode.

The rail, the confirmation dialogs and Organize mode stay as they are.

## Left to do

### Remaining proposals in ux-mockups
- [ ] 01 · Make hidden actions visible (link and board actions only appear on hover today)
- [ ] 07 · Adaptive columns + density

### ux-mockups-2 (Tabora 2.0 concepts)
- [ ] 00 New home: clock, speed dial, continue, resurface
- [ ] 01 Command palette (`Ctrl+K`)
- [ ] 02 Session timeline
- [ ] 03 Link peek
- [ ] 04 Tags, smart filters and board views
- [ ] 05 Library insights
- [ ] 06 Theme studio
- [ ] 07 Quick capture with highlights and reminders
- [ ] 08 Backup, restore points and export

### Open questions and follow-ups
- [ ] Should search cover **all pages** instead of only the current one? The mockup didn't say.
- [ ] The mockup's first-use **hint strip** became the last onboarding step plus the `?` dialog. Add a real strip if wanted.
- [ ] Test by hand in **Firefox**: favicon fallback, `search.search` fallback, and the new popup.
- [ ] Test by hand: commit a bookmark import from the onboarding card (it asks for site access).
- [ ] The popup's "already saved" notice can't say *when* a link was saved, because links have no `createdAt` yet.
- [ ] Bump the version in `manifest.json` (new permissions mean a minor version) and release.
