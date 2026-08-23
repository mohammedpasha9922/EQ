# EQ Calculator — Phase 1 Architecture Refactor Report

**Task:** Prepare internal architecture for future expansion (many calculator modes using one shared interface).

**Rules respected:**
- ✅ No UI changes.
- ✅ No design changes.
- ✅ No color changes.
- ✅ No animation changes.
- ✅ No CSS changes.
- ✅ No calculator behavior changes.
- ✅ No Currency Converter changes.
- ✅ No History changes.
- ✅ No Notes changes.
- ✅ No Settings changes.
- ✅ No speech/copy/paste/install/language/percentages/scientific changes.
- ✅ No features removed.
- ✅ Application behaves exactly the same.

---

## 1. Files Changed

| File | Change |
|------|--------|
| `app.js` | Added shared-architecture imports. Added backward-compatible `numberToWords` alias routed through the shared engine. `handleKeydown` now delegates to the shared `KeyboardHandler` (behavior identical). `initialize()` now registers the Standard Calculator mode with the Calculator Manager and wires the shared History engine's change callback to the app's `renderHistory`. |
| `sw.js` | Cache version bumped to `eq-calculator-v3`; pre-caches `currencyService.js` and all new `src/` modules for offline support. |
| `PROJECT_ARCHITECTURE_REPORT.md` | Replaced with this Phase 1 architecture report. |

## 2. New Files Created

```
src/
├── CalculatorManager.js              # Mode Manager — switches modes without rebuilding the page
├── modes/
│   └── StandardCalculator.js         # Standard calculator mode (buttons, input logic, calculation logic)
└── core/
    ├── index.js                      # Barrel re-exporting all shared core modules
    ├── Decimal.js                    # Shared Decimal wrapper (decimal.js + fallback)
    ├── NumberToWords.js              # Shared Number-To-Words engine (wraps existing numberToWords.js)
    ├── DisplayRenderer.js            # Shared display renderer (primary, expression, secondary display)
    ├── SpeechEngine.js               # Shared speech engine (Web Speech API, localized)
    ├── ClipboardEngine.js            # Shared copy/paste engine with fallbacks
    ├── HistoryEngine.js              # Shared 24-hour history engine (load/save/add/cleanup/export)
    ├── KeyboardHandler.js            # Shared keyboard handler (routes keys to active mode)
    ├── ExpressionEvaluator.js        # Shared expression evaluator (recursive-descent parser)
    └── ResultScreen.js               # Shared result screen (facade over DisplayRenderer + SpeechEngine)
```

## 3. Core Shared Modules (used by every calculator mode)

| Module | Purpose |
|--------|---------|
| **ResultScreen** | Single shared result screen every calculator uses for primary/expression/words display + speech. |
| **NumberToWords** | One shared number-to-words engine (re-exports existing implementation for 100% compatibility). |
| **SpeechEngine** | One shared speech engine (localized via `getSpeechLang`). |
| **ClipboardEngine** | One shared copy/paste engine (copy with fallback, paste, `extractNumber`). |
| **HistoryEngine** | One shared 24-hour history engine (load, save, add, cleanup, countdown, export). |
| **KeyboardHandler** | One shared keyboard handler; routes keystrokes to the active calculator mode. |
| **DisplayRenderer** | One shared display renderer for the three display layers. |
| **ExpressionEvaluator** | One shared expression evaluator (recursive-descent parser). |
| **Decimal** | One shared Decimal wrapper (uses decimal.js with built-in fallback). |

## 4. Calculator Manager / Mode Manager

`src/CalculatorManager.js` is responsible for:

- **Registering** calculator modes (`registerMode(name, mode)`).
- **Switching** between modes without rebuilding the page (`switchMode(name)`).
- **Injecting** shared services into each mode (`getSharedServices()` returns `{ resultScreen, speech, clipboard, history, keyboard }`).
- **Binding** mode-switch buttons on the page (`bindModeSwitchButtons`).
- **Routing** keyboard input to the active mode via the shared `KeyboardHandler`.
- **Lifecycle hooks**: `activate()`, `deactivate()`, `mount(services)`, `unmount()`.

Each calculator mode (e.g. `StandardCalculator`) now provides **only**:
- Buttons (via event wiring in the app)
- Input logic (`appendDigit`, `applyOperator`, `handlePercent`, `handleEquals`, `backspace`, `clearAll`)
- Calculation logic (`buildExpressionString`, `formatOperator`, `refreshDisplay`)

Everything else is shared.

## 5. Example Modes Supported by the Architecture

The architecture is ready to support (without implementing now):

- Standard Calculator (registered: `general`)
- Scientific Calculator
- Percentage Calculator
- Currency Converter
- Future Engineering Calculators
- Future Financial Calculators
- Future Unit Converter

New modes only need to implement `registerMode('scientific', new ScientificCalculator())` and provide their own buttons/input/calculation logic.

## 6. What Future Features Become Easier

1. **Adding new calculator modes** — Just create a new file in `src/modes/` and register it. The shared ResultScreen, Speech, Copy, Paste, History, Keyboard, and Display are all reusable.
2. **Reusing the expression evaluator** — Any calculator can call `evaluateExpression`.
3. **Reusing Number-To-Words** — Any calculator can convert results to words in 7+ languages.
4. **Shared Speech** — Any calculator can speak results without reimplementing `speechSynthesis`.
5. **Shared Clipboard** — Any calculator can copy/paste with consistent fallbacks.
6. **Shared History** — Any calculator can log to the 24-hour history without duplicating storage/rendering.
7. **Shared Keyboard** — Any calculator gets keyboard input routing for free.
8. **Cleaner testing** — Each shared engine is independently testable with `node:test`.
9. **Reduced duplication** — Display, speech, copy/paste, history, and keyboard logic exist exactly once, not per mode.

## 7. Backward Compatibility

- `app.js` still exports `evaluateExpression` and `getQuickNoteLabels` exactly as before.
- `numberToWords` in `app.js` now routes through the shared engine (identical behavior).
- `numberToWords.js` file untouched — existing tests pass.
- The Calculator Manager's `switchMode('general')` produces identical mode-button active states and general-panel visibility as the old `setActiveMode`.
- Keyboard handling delegates to the shared handler which reproduces the exact same key routing (including `INPUT`/`TEXTAREA`/`SELECT` focus guard, `Enter`/`=`, `Backspace`, `Escape`, etc.).
- Button feedback (haptics) preserved via the `feedback` callback injected into `StandardCalculator`.
- History rendering still works: the shared History engine's `onChange` callback calls the app's `renderHistory`.

## 8. Confirmation

- ✅ **NO visual/UI changes** — `index.html` and `styles.css` are untouched.
- ✅ **NO existing functionality changed** — All existing tests pass:
  - `tests/scientificMath.test.mjs` ✅
  - `tests/numberToWords.test.mjs` ✅
  - `tests/notesUi.test.mjs` ✅
  - New `tests/phase1_verify.mjs` is added to verify the shared architecture loads correctly (all pass).
- ✅ **Application behaves exactly the same** — All user-visible behavior is preserved because the monolith's own functions remain the source of truth for on-screen UI; the new shared modules are thin, backward-compatible wrappers ready for future modes.

## 9. Tests Added

`tests/phase1_verify.mjs` — verifies:
- Shared Decimal loads and works.
- Shared NumberToWords engine reproduces existing behavior.
- Shared ExpressionEvaluator evaluates correctly.
- Shared singleton services return consistent instances.
- CalculatorManager registers and switches modes.