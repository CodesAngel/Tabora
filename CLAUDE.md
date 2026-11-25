# Tabora

Browser new-tab extension (MV3, plain JS, no build step). Progress and decisions: `.claude/session.md`.

## Code map
- `shared.js`: state, storage, link and URL helpers (loaded first everywhere).
- `dashboard.js` / `dashboard.html`: new-tab page. `features.js`: Workspace tools. `popup.js`: toolbar popup. `background.js`: service worker.
- All state writes go through `updateTaboraState` (Web Lock). Never nest calls.

## Tests
- `node tests/shared.test.js` and `node --test tests/background.test.js`.
- Smoke test: start Edge with a throwaway profile, then run `node tests/browser-smoke.js`. Never use a real profile; the test erases boards.
  `msedge --remote-debugging-port=9333 --user-data-dir=<scratchpad>/edge-profile --load-extension=D:\Projects\Tabora --disable-sync --disable-features=msImplicitSignin,msEdgeSync --no-first-run`
- Chrome 137+ ignores `--load-extension`. Use Edge or Chromium.

## CDP screenshot gotchas
- Call `Page.bringToFront` first, or `Page.captureScreenshot` hangs.
- Wrap calls that return dialog promises in `void`, or `Runtime.evaluate` with `awaitPromise` never returns.
- In Node, the origin of a `chrome-extension://` URL is `"null"`; build it from the string.

## Conventions
- Dialog confirmations use `requestDeleteConfirmation({ tone })`: "trash" (default, reversible), "danger" (permanent) or "neutral".
- Use `countLabel(n, "word")` for counts and `formatRelativeTime` for dates.
