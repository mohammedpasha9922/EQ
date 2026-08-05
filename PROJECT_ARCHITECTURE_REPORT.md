# EQ Calculator — Project Architecture Report

**Generated:** Comprehensive inspection of the `EQ` project (no code modified).

---

## 1. Project Folder Tree

```
EQ/
├── index.html                     # Main HTML shell (single-page app)
├── styles.css                     # All styling (themes, layout, components) — ~1954 lines
├── app.js                         # Main application logic (ES module) — 2476 lines
├── numberToWords.js               # Number-to-words conversion utility (ES module) — 220 lines
├── currencyService.js             # Currency conversion service (ES module) — 854 lines
├── manifest.json                  # PWA web app manifest
├── sw.js                          # Service worker (offline caching)
├── favicon.ico                    # Favicon
├── apple-touch-icon.png.png       # Apple touch icon
├── icon-192.png.png               # PWA app icon (192x192)
└── tests/
    ├── currencyService.test.mjs   # Currency service tests (custom runner)
    ├── scientificMath.test.mjs    # Expression evaluator tests (node:test)
    ├── numberToWords.test.mjs     # Number-to-words tests (node:test)
    └── notesUi.test.mjs           # Quick-note localization tests (node:test)
```

---

## 2. All HTML Sections and Their Purpose

| Section ID / Element | Purpose |
|----------------------|---------|
| `.app-shell` | Main application container, applies global layout/viewport constraints |
| `header.top-bar` | Top app bar containing title, drawer toggle, and notes button |
| `.mode-switcher` | Tab list for switching between calculator modes (currently only "General Calculator") |
| `#generalCalculatorPanel` | Contains the main calculator card UI |
| `main.calculator-card` | The calculator display + keypad surface |
| `section.display-section` | Holds speech button, primary display, expression display, secondary (word) display |
| `.scientific-toggle-row` | Toggles for "Scientific" and "Percentage" panels |
| `#scientificPanel` | Scientific tools (square root, square, parentheses) |
| `section.control-row` | AC, backspace, copy, paste buttons |
| `section.keypad-grid` | Main numeric/operator keypad (0-9, +, -, ×, ÷, =, .) |
| `#percentPanel` | Percentage Calculator panel (amount, rate, result, word output) |
| `#historyPanel` | 24-hour history screen with list, select-all, and export controls |
| `#currencyConverterModal` | Direct Currency Converter modal (From/To selects, amount, swap, favorites, recent) |
| `#currencyDirectoryModal` | Global currencies directory modal with search |
| `#settingsModal` | Settings: language selector, theme options, sound/haptics toggle |
| `#iosInstallModal` | Install-on-iPhone instructions modal |
| `#notesManagerModal` | Notes manager with folders and notes list |
| `#fullScreenNoteModal` | Full-screen note editor (title, folder select, body textarea) |
| `#drawerOverlay` | Backdrop overlay for the navigation drawer |
| `aside#drawer` | Navigation drawer with 6 menu items (EQ Tools) |

---

## 3. All JavaScript Modules / Functions

### Modules
| Module | Exports | Role |
|--------|---------|------|
| `app.js` | `evaluateExpression`, `getQuickNoteLabels` (named) + runs `initialize()` | Main application logic, UI wiring, state, locale, themes |
| `numberToWords.js` | `numberToWords` (named default-style single export) | Converts a number to its written form in ~7 languages |
| `currencyService.js` | Default object with ~23 methods + named `initializeCurrencyService`, `refreshCurrencyData`, `loadCachedRates`, `startAutoRefresh`, `stopAutoRefresh` | Currency catalog, live rates, conversion, favorites/recent, caching |

### Key Functions in `app.js`
- **Lifecycle:** `initialize`, `wireEvents`, `registerServiceWorker`, `syncViewportHeight`, `initializeCurrencyServiceInBackground`
- **Calculator:** `appendDigit`, `applyOperator`, `handleEquals`, `handlePercent`, `clearAll`, `backspace`, `appendScientificValue`, `evaluateExpression`, `tokenizeExpression`, `displayOperator`
- **Scientific parsing:** `parseExpression`, `parseTerm`, `parseUnary`, `parsePower`, `parsePrimary` (recursive descent)
- **Display:** `updatePrimaryDisplay`, `updateSecondaryDisplay`, `updateExpressionDisplay`, `syncExpressionDisplay`, `buildExpressionString`, `formatNumber`
- **Language/i18n:** `setLanguage`, `updateTexts`, `updateInstallModalContent`
- **Theme:** `setTheme`
- **Speech:** `speakCurrentResult`, `triggerButtonFeedback`
- **Percentage:** `updatePercentPanel`, `calculatePercent`, `setPercentPanelOpen`, `togglePercentPanel`
- **Panels:** `setScientificPanelOpen`, `toggleScientificPanel`, `setActiveMode`
- **Clipboard:** `copyResult`, `pasteNumber`
- **History:** `addHistory`, `renderHistory`, `loadHistory`, `saveHistory`, `openHistory`, `closeHistory`, `selectAllHistory`, `exportHistory`, `updateEntryNote`, `shareEntry`, `startHistoryCountdown`, `stopHistoryCountdown`, `updateHistoryCountdown`, `formatRemainingTime`
- **Notes:** `openNotesManager`, `closeNotesManager`, `openFullScreenNote`, `closeFullScreenNote`, `saveCurrentOpenNote`, `scheduleNoteSave`, `deleteNote`, `addFolder`, `createFolder`, `renderFolders`, `renderNotes`, `getNotesForActiveFolder`, `getFolderOptions`, `setActiveFolder`, `getActiveFolder`, `handleNotesListClick`, `handleFolderClick`
- **Quick Notes:** `addQuickNote`, `addGeneralQuickNote`, `deleteQuickNote`, `renderQuickNotes`, `toggleQuickNotesPanel`, `getQuickNoteLabels`
- **Currency UI:** `updateCurrencyUI`, `updateConverterOutput`, `updateFavoriteButtons`, `swapCurrencies`, `toggleFavorite`, `showFavoritesList`, `showRecentList`, `handleCurrencySearch`, `renderCurrencyDirectoryWithService`, `openCurrencyDirectory`, `closeCurrencyDirectory`, `fetchCurrencyRates`, `setCurrencyStatus`, `focusCurrencyConverter`, `openCurrencyConverter`, `closeCurrencyConverter`
- **Drawer/Modals:** `toggleDrawer`, `closeDrawer`, `handleDrawerMenuItem`, `openSettingsModal`, `closeSettingsModal`, `openInstallModal`, `closeInstallModal`, `isIOSDevice`
- **Toast:** `showToast`
- **Persist:** `persistNoteData`, `loadNoteData`, `loadCurrencyRates` (via service)
- **Utility:** `formatNumber`, `formatCurrency`, `triggerButtonFeedback`, `handleKeydown`

### Key Functions in `currencyService.js`
- `initializeCurrencyService` — load cache, fetch fresh data, start auto-refresh
- `refreshCurrencyData` — refresh catalog + rates with fallbacks
- `fetchCurrencyCatalog` / `fetchExchangeRates` — API calls with retry/backoff (exchangerate-api.com)
- `searchCurrencies`, `getCurrencyByCode` — lookup
- `convertCurrency`, `getExchangeRate`, `getRateText` — conversion
- `addToFavorites`, `removeFromFavorites`, `isFavorite`, `getFavorites` — favorites
- `addToRecent`, `getRecent` — recent history
- `getCatalog`, `getState` — state accessors
- `isUsingCachedData`, `getLastUpdated`, `getError`, `isLoading` — status
- `startAutoRefresh` / `stopAutoRefresh` — timer control
- `loadCachedRates` (exported), `loadCachedCatalog`, `saveCatalogToCache`, `saveRatesToCache` — persistence
- `getCurrencyName`, `getCountryName`, `getCountryFlag` — metadata lookups
- `formatNumber` — number formatting using `Intl.NumberFormat`

### Key Functions in `numberToWords.js`
- `numberToWords(value, locale)` — main exported function
- `convertIntegerToWords`, `convertArabicIntegerToWords`, `convertTurkishChunk`, `convertArabicChunk`, `convertChunk` — internal conversion helpers
- Uses `BigInt` for large number support; per-locale `numberMaps` object

---

## 4. All Major UI Panels

| Panel | How Triggered | Notes |
|-------|---------------|-------|
| `#scientificPanel` | "Scientific" toggle button | Opens/closes; contains sqrt, x², parentheses buttons |
| `#percentPanel` | "Percentage" toggle button / Back button | Inline panel above/alongside keypad; amount, rate, result, word display |
| `#historyPanel` | Drawer → History | Overlay with 24-hour auto-expiring history list |
| `#currencyConverterModal` | Drawer → Direct Currency Converter | Modal with From/To selects, amount input, swap, favorites, recent, rates status |
| `#currencyDirectoryModal` | Drawer → Global Currency Directory & Search / converter button | Searchable list of supported currencies |
| `#settingsModal` | Drawer → Settings | Language select, theme buttons, sound & haptics toggle |
| `#iosInstallModal` | Drawer → Install App | iOS-specific install instructions |
| `#notesManagerModal` | Top bar Notes button / Drawer → Notes | Folders list + notes list |
| `#fullScreenNoteModal` | Notes Manager → New Full Screen Note / open note | Full editor with auto-save |
| `#drawer` (aside) | Top bar hamburger | Slide-in navigation drawer |

---

## 5. Navigation Drawer Items

| Action | Label (`data-i18n`) | Opens |
|--------|---------------------|-------|
| `open-history` | History | `#historyPanel` |
| `open-notes` | Notes | `#notesManagerModal` |
| `open-converter` | Direct Currency Converter | `#currencyConverterModal` |
| `open-directory` | Global Currency Directory & Search | `#currencyDirectoryModal` |
| `open-install` | Install App | `#iosInstallModal` |
| `open-settings` | Settings | `#settingsModal` |

All items are `<button class="drawer-menu-item" data-action="...">` with inline SVG icons. Selecting an item closes the drawer then opens the corresponding panel via `handleDrawerMenuItem`.

---

## 6. Calculator Features

1. **Basic arithmetic:** `+`, `−`, `×`, `÷`, `=`, decimal point, negative sign handling.
2. **Scientific functions:** Square root (`sqrt(`), square (`^2`), parentheses for grouping.
3. **Expression evaluator:** Recursive-descent parser (`evaluateExpression`) supporting operator precedence, unary operators, powers, sqrt, and parentheses, using `decimal.js` for precision with a built-in fallback class.
4. **Keypad:** On-screen buttons + full **keyboard input** (`0-9`, `.`, `+`, `-`, `*`, `/`, `%`, `Enter`/`=`, `Backspace`, `Escape`).
5. **Control actions:** `AC` (clear all), backspace (`⌫`), **copy result** to clipboard, **paste number** from clipboard.
6. **Display layers:** Primary numeric display (comma-formatted), expression display, secondary display showing the number **written in words**.
7. **Speech:** 🔊 button speaks the result aloud via Web Speech API, localized.
8. **Percent operator:** `%` divides current value by 100 when pressed as an operator.
9. **Live evaluation:** Expression result is shown as you type (intermediate evaluation).
10. **Number formatting:** Thousands separators via regex; scientific notation expanded via `Decimal.toFixed()`.

---

## 7. Currency Converter Features

1. **From/To selectors** populated from the currency catalog (flag + ISO code + name), defaulting `USD` → `EGP`.
2. **Live conversion** as the amount is typed, using `CurrencyService.convertCurrency`.
3. **Conversion rate display:** Shows `1 USD = X <Currency>` for USD conversions.
4. **Swap** button to swap From/To currencies.
5. **Favorites:** Star buttons per side to add/remove currencies to favorites (persisted, max 10).
6. **Recent list:** Tracks recently used currencies (max 10, persisted).
7. **Global directory search** — searchable by country name, currency name, or ISO code.
8. **Refresh rates** button with manual refresh.
9. **Cache indicator** (`#cacheIndicator`) shown when using offline/cached data.
10. **Status message** showing loading/updated/failed states with last-updated time.
11. **Automatic rate refresh** every 30 minutes (`REFRESH_INTERVAL`).
12. **Resilience:** Retries with exponential backoff (max 2 retries, 10s timeout via `AbortController`), cache TTL of 12 hours, and static fallback catalog + fallback rates when offline with no cache.

---

## 8. Percentage Calculator Features

1. Located in sliding `#percentPanel` toggled by the "Percentage" button.
2. **Amount** field and **Percentage Rate** field (decimal inputs).
3. **Result** computed as `amount × rate / 100` using `Decimal`.
4. **Word display** of the result in the current language.
5. **Live updates** on input change; **Back** button returns to keypad; automatically updates on language change.
6. Keypad grid shifts (`percent-open` class) to accommodate the panel.

---

## 9. Notes System

Two overlapping note systems exist:

### Notes Manager (primary)
- **Folders:** Create folders (`+ Folder`), select active folder via list; a default "Personal" folder is auto-created if none exist.
- **Notes:** Each note has `id`, `title`, `body`, `folderId`, `createdAt`, `updatedAt`.
- **Full-screen editor** (`#fullScreenNoteModal`) with title input (max 80 chars), folder select, and body textarea.
- **Auto-save:** Debounced save (350ms) on title/body input; folder-change forces save; save on close.
- **Open/delete** notes from list; open creates new note or edits existing.
- Persistence via `localStorage` (`eq-note-folders`, `eq-note-manager-notes`).

### Quick Notes / History Notes (legacy)
- Quick-add notes from input (`addQuickNote`) and a "Quick Notes" panel (`addGeneralQuickNote`), each capped at 20 entries.
- History entries can carry an inline editable note tag.
- Persisted via `eq-notes` and `eq-quick-notes` keys.

> **Note:** Some UI references (e.g. `quickNoteInput`, `quickNotesPanel`) point to elements not present in `index.html`, so those legacy quick-note UI paths are effectively dormant.

---

## 10. History System

1. Records each `=` evaluation as an entry: `{ id, expression, result, timestamp, note }`.
2. **Capped at 40 entries** and **auto-expires after 24 hours** (filtered on load).
3. **Live countdown** per entry showing remaining time (h/m/s) while the history screen is open; auto-prunes expired entries (interval of 1s).
4. **Checkbox selection** per entry; **Select All** toggles.
5. **Share / Export:** Uses `navigator.share` when available (files share as `eq-history.json`), otherwise downloads the JSON blob; only checked entries are included, else all.
6. **Inline editing:** Edit note icon replaces the note text with an input; blur/Enter saves.
7. **Share entry:** Shares `expression = result` (plus note) via Web Share API or clipboard fallback.
8. Persisted under `eq-history`.

---

## 11. Theme System

- Three themes: **Dark** (default), **Light**, **Violet**.
- Implemented via `data-theme` attribute on `<body>`; CSS overrides under `body[data-theme='...']`.
- Theme buttons in Settings (`.theme-option[data-theme]`) toggle an `.active` class; `setTheme` updates both state and DOM.
- `color-scheme` CSS property set per theme for native form controls.
- Currently theme choice is **not** persisted to `localStorage` (always resets to dark on load).

---

## 12. Language System

- **7 supported languages:** English (`en`), Spanish (`es`), Arabic (`ar`), French (`fr`), Russian (`ru`), German (`de`), Turkish (`tr`).
- Translation dictionary embedded in `app.js` (`translations` object) with keys for ~90 UI strings per language.
- Applied via `data-i18n` (text) and `data-i18n-placeholder` (placeholder) attributes; `updateTexts()` loops and sets text/placeholder.
- Language switch sets `<html>` `lang` and `dir` (RTL for Arabic), and `body[data-language]`.
- **Persisted** in `localStorage` under `eq-language`; re-applied on load.
- Changing language re-renders history, notes, folders, percent panel, countdown labels, and install modal content; closes the drawer to avoid layout freeze.
- `numberToWords` supports the same set plus additional locales (it, pt, zh, ja, ko, hi, bn, nl, pl, vi, th, id, ms).

---

## 13. Storage System

All persistence is via **`localStorage`** (no IndexedDB):

| Key | Content | Owner |
|-----|---------|-------|
| `eq-language` | Saved language code | app.js |
| `eq-history` | 24-hour history array | app.js |
| `eq-notes` | Legacy quick notes array | app.js |
| `eq-quick-notes` | Quick notes array (legacy UI) | app.js |
| `eq-note-folders` | Notes Manager folders | app.js |
| `eq-note-manager-notes` | Notes Manager notes | app.js |
| `eq-currency-catalog` | Cached currency catalog (12h TTL) | currencyService.js |
| `eq-currency-rates` | Cached exchange rates (12h TTL) | currencyService.js |
| `eq-currency-favorites` | Favorites currency codes (max 10) | currencyService.js |
| `eq-currency-recent` | Recent currency codes (max 10) | currencyService.js |

- All reads/writes are wrapped in `try/catch` to guard against quota/availability errors.
- Theme is *not currently persisted*.

---

## 14. PWA Files

### `manifest.json`
- `name`: "EQ Smart Calculator"
- `short_name`: "EQ Calc"
- `start_url`: `./index.html`
- `display`: `standalone`
- `background_color` / `theme_color`: `#0f172a`
- Icons: `icon-192.png` (192x192, any maskable) and `apple-touch-icon.png` (180x180)

### `sw.js` (Service Worker)
- **Cache name:** `eq-calculator-v2`
- **App shell pre-cached on install:** `./`, `./index.html`, `./styles.css`, `./app.js`, `./numberToWords.js`, `./manifest.json`, `./favicon.ico`, `./apple-touch-icon.png`, `./icon-192.png`
- **Install:** opens cache, `addAll(APP_SHELL)`, then `skipWaiting()`.
- **Activate:** deletes old caches, `clients.claim()`.
- **Message:** listens for `{ type: 'SKIP_WAITING' }` and calls `skipWaiting()`.
- **Fetch:** cache-first for GET requests; on miss, fetches network, caches successful responses, and falls back to `./index.html` on failure (offline SPA fallback).
- **Note:** `currencyService.js` is *not* in the app shell pre-cache list (will be cached opportunistically on first fetch).
- **Registration:** in `app.js`, registers `./sw.js` at `window.load` with `updateViaCache: 'none'`, posts `SKIP_WAITING` if a waiting worker exists, and auto-reloads on `controllerchange`.

---

## 15. Reusable Components

1. **`showToast(message)`** — ephemeral toast notification (auto-removes after 1600ms).
2. **`triggerButtonFeedback()`** — button haptics (vibration 10ms) + synthesized click sound via Web Audio API.
3. **`formatNumber(value)`** — number formatting with thousands separators and scientific-notation expansion.
4. **`formatCurrency(value)`** — USD-currency formatting via `Intl.NumberFormat`.
5. **`Decimal` wrapper** — uses `decimal.js` from CDN with an in-memory fallback class for environments without it.
6. **Modal pattern** — consistent `.modal-backdrop` + `.show` + `body.modal-open` + backdrop-click-to-close + `aria-hidden` toggling.
7. **`getQuickNoteLabels(locale)`** — localized label lookup (exported for testing).
8. **`evaluateExpression(expr)`** — pure, testable expression evaluator (exported for testing).
9. **Recursive-descent parser** — tokenizer + Pratt-style parser reused for all expression evaluation.
10. **`isIOSDevice()`** — platform detection helper for install instructions.

---

## 16. Current Application Architecture

- **Type:** Client-side, single-page, mobile-first web application (progressive web app).
- **No build step / no framework.** Vanilla JavaScript ES modules, plain HTML/CSS.
- **Third-party CDN dependencies:** Font Awesome 6.5.2 (icons), `decimal.js@10.4.3` (precision math). External API: `exchangerate-api.com/v4/latest/USD`.
- **Module graph:**
  - `index.html` → loads `app.js` (type=module)
  - `app.js` → imports `numberToWords.js`, `currencyService.js`
  - `currencyService.js` → self-contained service module (no imports)
  - `numberToWords.js` → self-contained utility module (no imports)
- **State management:** Central mutable `state` object in `app.js` + separate `state` object inside `currencyService.js`.
- **Rendering:** Direct DOM manipulation via `innerHTML` and `createElement` in render functions (no templating/ViewModel).
- **Event wiring:** Centralized `wireEvents()` runs once at init.
- **Initialization flow:** `initialize()` → load history/notes/language → updateTexts → setTheme(dark) → init currency service in background (non-blocking) → initial renders → `wireEvents()` → register SW → viewport sync.
- **Design:** Component-oriented CSS classes; themeable via `data-theme`; i18n via `data-i18n` attributes; responsive via `clamp()`/viewport units plus `--app-height` JS-driven CSS variable.
- **Tests:** Hybrid — `node:test` runner for pure functions (expression evaluator, number-to-words, note labels) and a custom async runner in `currencyService.test.mjs` with mocked `fetch`/`localStorage`.

---

## 17. Known Limitations

1. **Theme not persisted** — `setTheme('dark')` always resets on load; user theme choice is lost on refresh.
2. **Dead/legacy code & DOM references** — Several elements queried in `app.js` do not exist in `index.html` (e.g., `quickNoteInput`, `quickNotesPanel`, `collapseQuickNotes`, `addNoteButton`, `noteInput`, `quickNotesList`, `saveQuickNoteButton`, currency `amountField`), leaving unused event listeners and dormant feature paths.
3. **Mixed testing frameworks** — `currencyService.test.mjs` uses a custom async runner (not `node:test`), inconsistent with the other three test files; this file is not auto-discovered by `node --test` conventions.
4. **Icons have double extensions** — `apple-touch-icon.png.png` and `icon-192.png.png` are referenced as `.png` in the shell; manifest references `icon-192.png`/`apple-touch-icon.png` which don't exactly match on-disk names (potential 404 on some platforms).
5. **`currencyService.js` not pre-cached** — Omitting it from `APP_SHELL` means first offline load may fail for currency features until it's been fetched once.
6. **No data export/import for notes** — Only history supports share/export.
7. **All state in a monolithic `app.js`** — ~2,476 lines with mixed responsibilities (rendering, state, i18n, currency UI, notes, history), making isolated testing harder; only 2 functions are exported.
8. **Currency conversion uses plain `parseFloat`** inside `currencyService.convertCurrency` (loses `Decimal` precision), while the app display path uses `Decimal`.
9. **`navigator.platform` deprecation** in `isIOSDevice()` may yield false negatives on newer iPads/some browsers.
10. **No offline-manifest pre-cache of external CDN scripts** — Font Awesome and `decimal.js` load from CDN; offline they must come from HTTP cache or cause missing icons/math fallback.
11. **History pruning only on load/countdown** — entries older than 24h are removed only when history is viewed or during countdown tick, not proactively in background.
12. **Translation completeness varies** — some strings fall back to English when missing (e.g. certain Spanish/Arabic quick-note keys), and a few UI strings are hard-coded in English (`Rates updated: ...` by locale not translated).

---

## 18. Suggestions for Future Modular Expansion

1. **Split `app.js` into feature modules** (e.g., `src/state.js`, `src/renderer.js`, `src/calculator.js`, `src/history.js`, `src/notes.js`, `src/settings.js`, `src/currency-ui.js`, `src/i18n.js`) while keeping a thin orchestrator.
2. **Move i18n dictionaries into a separate `locales/*.json` or `locales/*.js` module** and lazy-load them; add fallback chaining and a missing-key log.
3. **Persist theme** (`eq-theme`) alongside language and apply it on initialization; expose a small `SettingsStore`.
4. **Centralize localStorage access** behind a storage module (get/set with JSON + TTL) to unify cache keys and add quota error handling.
5. **Use `Intl` proper number/currency formatting** in `formatCurrency`/`convertCurrency`; align precision by using `Decimal` consistently in the currency service.
6. **Add proper build tooling** (e.g., Vite/Rollup) for bundling, minification, and tree-shaking; enables the removal of CDN dependencies via local vendoring for offline.
7. **Add an event bus or tiny pub/sub** to decouple UI updates from state changes and simplify cross-feature refresh (e.g., after language change).
8. **Web Components for reusable pieces** (modal, toast, keypad, currency-select) to reduce repeated visual code and improve testability.
9. **Adopt `node:test` style across all tests** (rewrite `currencyService.test.mjs` to use `node:test` + mocks) and add a `tests/package.json`/script `npm test` for one-command runs.
10. **Add IndexedDB via `idb-keyval`** for the notes system to scale beyond localStorage limits and support larger note bodies.
11. **Expand calculator modes** — the `.mode-switcher` and `setActiveMode` already scaffold multiple modes; add Scientific, Programmer, or Unit-converter modes that reuse the keypad/expression pipeline.
12. **Add currency to settings/integrations** — expose base-currency selection, rate-source configuration, and manual rate overrides in Settings.
13. **Improve service worker** — pre-cache `currencyService.js` and use a network-first strategy for `index.html` (to pick up updates) with cache-first for static assets; add a versioning/cleanup strategy for the 12h caches.
14. **Introduce a lightweight state management layer** (e.g., a tiny store with `subscribe`) so re-renders are targeted rather than full-list re-renders on every change.
15. **Create UI accessibility pass** — ensure keyboard focus traps in modals, ARIA live regions for displays, and focus management consistent across all overlays.
16. **Add a settings-driven "reset/export all data"** panel and migrate legacy quick-note/notes to the unified Notes Manager, removing dead code paths.