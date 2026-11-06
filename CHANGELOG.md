# Changelog

All notable changes to Tabora are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and Tabora uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [3.2.0] - 2026-11-06

A reliability, privacy and polish release, based on a full code audit. It also brings in four designs from the UX proposals (real favicons, search up front, a current-tab-first popup and import-first onboarding). It adds the `unlimitedStorage`, `favicon` and `search` permissions.

### Added

- **Real site icons.** In Chromium browsers, links show the icon the browser already has cached for the site: no network request and no site-access prompt. Sites the browser has never cached keep the saved icon or the letter tile. Icons sit on a light tile so dark ones (GitHub, Stack Overflow) stay visible on dark wallpapers. Adds the `favicon` permission.
- **Search in the header.** A search field now sits in the page header. <kbd>Enter</kbd> opens the first result, and the last row (or <kbd>Shift</kbd>+<kbd>Enter</kbd>) hands the query to your default search engine, in the same tab (or a new tab if *Open links in new tab* is on). Adds the `search` permission.
- **Keyboard shortcuts.** <kbd>Alt</kbd>+<kbd>1</kbd>–<kbd>9</kbd> switches pages, <kbd>N</kbd> creates a board, and <kbd>?</kbd> lists every shortcut.
- **Recently opened** links appear as a row above your boards. It can be turned off in *Settings → Appearance*.
- **Settings → Tools** lists every workspace tool by name (Link health, Smart organize, Moods, Vaults, Rooms and more) instead of hiding them all behind the sparkle icon.
- **Restore from backup.** The import dialog now accepts the `.json` file from *Settings → Export backup*. You see what the backup contains before restoring, and the restore can be undone.
- **Quick Save confirmation.** <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Y</kbd> now shows a green ✓ badge with the page and board the tab was saved to.
- **Password-protected Shared Rooms.** New room codes (`TABORA2`) no longer contain their password. The password is shown separately, with a Copy button, so it can be sent through a different channel. Older `TABORA1` codes still open.
- **Compact search panel.** Results appear in a focused panel under the search field, without replacing the board view, with full keyboard navigation.
- **`unlimitedStorage` permission.** Lifts the browser's 10 MB local storage limit so large collections, trash and undo history keep saving. No data leaves the browser.

### Changed

- **The popup puts the current tab first.** It shows the tab's icon and title with one "Save to [last board]" button; the arrow beside it lists every board plus "New board…". If the tab is already saved, the popup says where before you click, with a "Show it" button that opens the dashboard on that bookmark. Saving the whole window is now a secondary row.
- **Popup board list** is sorted by last use, hides "Open all" on empty boards, and says "1 link" instead of "1 links".
- **Onboarding starts with import.** The first step offers Import bookmarks, Save open tabs or Start empty; the last step points to search and shortcuts.
- **Renaming a wallpaper** uses an inline field instead of the browser's prompt.

- **Each tab keeps its own page.** Switching pages in one new tab no longer switches every other open tab. New tabs open on the page you used last.
- **Organize mode belongs to the tab that started it.** Cancelling now undoes only that session's moves and deletions, and keeps links saved from the popup, the shortcut or other tabs in the meantime.
- **One rule for duplicates.** Manual saves, window saves and browser-bookmark imports all skip addresses already saved on any page. Shared files, rooms and backups are still copied in full.
- **Faster, undoable imports.** A browser-bookmark import is now one save that can be undone ("Link import"). Folders containing only duplicates no longer create empty boards, and the message reports the number of links actually imported.
- **Creating a customized board** from the dialog is now a single save instead of two.
- **Smarter Smart Organize.** Links are sorted by known website first, then by whole words in the title or description. For example, Dropbox no longer counts as "Social" and Google Docs no longer counts as "Development".
- **Links open instantly.** Tabora navigates straight away; the "recently opened" record is saved by the background worker, so it isn't lost when the tab navigates away.
- **Lighter link-detail fetching.** When fetching a page's title and icon, Tabora stops reading at the end of the page `<head>` (at most 512 KB) instead of downloading the whole page.
- **Trash cleans itself up.** Items older than 30 days are removed automatically, instead of only when the Trash dialog was opened.
- **Stronger vault encryption.** New vaults use 600,000 PBKDF2 iterations (previously 180,000). Existing vaults still unlock.
- **One wallpaper list for the dashboard and popup.**
- **Reset preferences** now uses Tabora's own confirmation dialog instead of the browser prompt.
- **"Change shortcut"** opens the right page in Firefox and in every Chromium browser (Chrome, Edge, Brave, Opera).
- **Messages no longer assume Brave or Chrome.** Failures with private opening off now say "Could not open this link" instead of giving private-window advice.

### Fixed

- **Lost saves:** saves made at the same time from the popup, the shortcut and several tabs could overwrite each other; in testing, 11 of 12 simultaneous saves were lost. All changes are now saved one at a time.
- **Smart Organize** could drop links saved while its confirmation dialog was open.
- **Locking a page in a vault** could delete links saved to that page while it was being encrypted.
- **Cancelling Organize mode** overwrote changes made elsewhere during the session.
- **Custom wallpapers** never appeared in the toolbar popup.
- **The popup** showed the default colors for six wallpapers.
- **Site icons** fetched with relative paths (such as `/favicon.ico`) were always discarded.
- **Renaming the "Quick Saves" board** made the next Quick Save create a new one.
- **Restoring or permanently deleting** a trash item could act on the wrong item if the trash had changed in another tab.
- **Confirmation dialogs** closed by other means left their action waiting forever.
- **Dragging a text selection** out of a dialog field onto the backdrop closed the dialog; so did clicking the dialog's own padding.
- **The dashboard always scrolled by 82 px**, even with only a few boards, because its minimum heights ignored the header and top padding.
- **"Export backup"** had no matching restore. (See *Added*.)

### Security and privacy

- **Locked pages leave no trace.** A locked page's recent-activity and trash entries now go into the vault, and come back when it's unlocked.
- **Private opening leaves no history.** Links opened while private opening is on are no longer added to recent activity.
- **Site icon addresses are checked everywhere.** Only web addresses and small PNG, GIF, JPEG, WebP or ICO images are kept, including in shared files and rooms.
- **Shared files and backups are validated.** Shared files are capped at 2,000 links per board. Backups drop non-web links and reject malformed IDs.
- **No IDs in HTML strings.** Board, link, trash and wallpaper IDs are written through `dataset` instead of HTML strings.
- **No cookies on link checks.** The link health checker no longer sends cookies to the sites it checks.

### Removed

- **The Language setting**, which had no effect.
- **The hidden full copy of the workspace** stored after every import, which was never used. Existing copies are deleted automatically.

### Developer

- New unit tests for: Quick Save board tracking, Organize revert, backup restore, simultaneous saves, duplicate handling, import undo, trash IDs and expiry, site icon filtering, shared-file limits, Smart Organize categories, and background-worker messages.
- The browser smoke test uses the current menu labels.

## [3.1.0] - 2026-09-15

### Added

- **Selective browser-bookmark import**: import whole folders, or expand them and pick individual links.
- **60 wallpapers**, an even dark and light collection, each with a matching interface palette, including six premium presets with glass surfaces.
- **Portable `.tabora` files** for exporting and importing individual boards and pages.
- **Guided first-run tour.**
- **Automatic link details**: title, description and icon are fetched when saving or importing, after optional site access is granted.
- **Extension icons** in all required sizes.
- **Documentation**: browser support, contributing guide, code of conduct and license.

### Changed

- **Refreshed toolbar popup** with new icons and layout.
- **Faster dashboard**: board cards are cached between renders.
- **The onboarding card** is hidden once the tour is finished or skipped.

## [3.0.2] - 2026-08-31

### Added

- Background-worker tests and an updated browser smoke test.

## [3.0.1] - 2026-08-31

### Changed

- Updated to the Manifest V3 platform.

## [3.0.0] - 2026-08-31

### Added

- **Duplicate detection**: Tabora tells you where a link is already saved.
- **Board customization**: color, icon, size and pinning.
- **Ten new starter themes**; wallpapers renamed to themes.
- **Light theme.**
- **Link sharing**: copy a link, a board or a whole page.

### Changed

- **More accessible search.**

## [2.0.0] - 2026-08-28

### Added

- **Pages and boards**: a multi-column board layout with inline board creation.
- **Appearance panel**, with your own uploaded wallpapers.
- **Inline link editor**, with longer notes.
- **Page menu**: rename, share and delete, with a proper rename dialog.
- **Import options** for bookmarks, open tabs, pasted text and files.
- **Organize mode** for dragging boards and links and deleting several at once.
- **Trash**: restore or permanently delete, with confirmations.
- **Privacy blur** for boards.
- **Board reflow animation.**

## [0.1.0] - 2026-08-27

- First version of Tabora.

[Unreleased]: https://github.com/mehmoodulhaq570/tabora/compare/v3.2.0...HEAD
[3.2.0]: https://github.com/mehmoodulhaq570/tabora/releases/tag/v3.2.0
[3.1.0]: https://github.com/mehmoodulhaq570/tabora/releases/tag/v3.1.0
