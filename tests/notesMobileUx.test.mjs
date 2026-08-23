import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// ---------------------------------------------------------------------------
// PHASE 07 — Notes Mobile UX + PDF Export + Editor Controls
// Source-inspection tests (no browser, no network). Reads app.js as text and
// verifies the mobile table toolbar, color picker controls, and PDF-export
// handler are wired correctly and free of regressions.
// ---------------------------------------------------------------------------

const appSource = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const htmlSource = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const cssSource = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

function check(name, condition, detail) {
  if (condition) {
    console.log('PASS  ' + name);
  } else {
    console.error('FAIL  ' + name + (detail ? '  -> ' + detail : ''));
  }
  assert.ok(condition, name + (detail ? '  -> ' + detail : ''));
}

// --- Mobile table toolbar structure ---------------------------------------
test('Mobile table toolbar: structure and wiring', () => {
  check('note-mobile-table-toolbar class used in app.js', /note-mobile-table-toolbar/.test(appSource), 'class not referenced');
  check('createMobileTableToolbar function defined', /function createMobileTableToolbar/.test(appSource), 'missing');
  check('showMobileTableToolbar function defined', /function showMobileTableToolbar/.test(appSource), 'missing');
  check('hideMobileTableToolbar function defined', /function hideMobileTableToolbar/.test(appSource), 'missing');
  check('mobileTableWrap state variable declared', /let mobileTableWrap = null/.test(appSource), 'missing');

  // Toolbar must be created inside the noteBodyInput guard block
  const noteBodyInputIdx = appSource.indexOf('if (noteBodyInput) {');
  const toolbarCloseIdx = appSource.indexOf('function createMobileTableToolbar', noteBodyInputIdx);
  check('toolbar functions inside if (noteBodyInput) block', noteBodyInputIdx !== -1 && toolbarCloseIdx !== -1 && toolbarCloseIdx > noteBodyInputIdx, 'placement wrong');

  // CSS class in styles.css
    check('CSS: .note-mobile-table-toolbar defined', /\.note-mobile-table-toolbar\s*\{/.test(cssSource), 'CSS missing');
});

// --- Mobile table toolbar button actions -----------------------------------
test('Mobile table toolbar: buttons reuse handleTableAction', () => {
  check('Toolbar has data-table-action="add-row"', /data-table-action="add-row"/.test(appSource), 'add-row button missing');
  check('Toolbar has data-table-action="add-col"', /data-table-action="add-col"/.test(appSource), 'add-col button missing');
  check('Toolbar has data-table-action="del-row"', /data-table-action="del-row"/.test(appSource), 'del-row button missing');
  check('Toolbar has data-table-action="del-col"', /data-table-action="del-col"/.test(appSource), 'del-col button missing');
  check('Toolbar has data-table-action="merge-cells"', /data-table-action="merge-cells"/.test(appSource), 'merge-cells button missing');

  // Toolbar click handler must delegate to handleTableAction
  check('Toolbar click handler calls handleTableAction', /handleTableAction\(btn\.dataset\.tableAction/.test(appSource), 'not delegating');
  // No duplicate table action implementations
  check('No duplicate add-row logic', !appSource.includes('function addRowOnlyForMobile'), 'duplicate logic');
  check('No duplicate merge logic', !appSource.includes('function mergeCellsOnlyForMobile'), 'duplicate logic');
});

// --- Mobile table toolbar focus handlers -----------------------------------
test('Mobile table toolbar: focus handlers manage visibility', () => {
  check('focusin handler shows toolbar on cell focus', /addEventListener\('focusin'/.test(appSource), 'focusin not registered');
  check('focusout handler hides toolbar', /addEventListener\('focusout'/.test(appSource), 'focusout not registered');
  check('focusout uses state.noteTableFocus.cell (no undefined cell)', /state\.noteTableFocus && state\.noteTableFocus\.cell/.test(appSource), 'cell reference broken');
  check('focusout checks stillOverToolbar', /stillOverToolbar/.test(appSource), 'toolbar check missing');
  check('mousedown handler hides toolbar on outside click', /addEventListener\('mousedown'/.test(appSource), 'mousedown not registered');
  check('resize listener updates toolbar position', /addEventListener\('resize'/.test(appSource), 'resize not registered');
  check('orientationchange listener updates toolbar', /addEventListener\('orientationchange'/.test(appSource), 'orientationchange not registered');
});

// --- Mobile table toolbar: scroll jump prevention --------------------------
test('Mobile table toolbar: no body scroll lock', () => {
  const showStart = appSource.indexOf('function showMobileTableToolbar');
  const showEnd = appSource.indexOf('function hideMobileTableToolbar', showStart);
  const showCode = appSource.slice(showStart, showEnd);
  check('showMobileTableToolbar avoids body.position=fixed (no scroll jump)', !showCode.includes('document.body.style.position'), 'body position locked');
});

// --- Mobile table toolbar preserves original handlers ----------------------
test('Mobile table toolbar: original table handlers preserved', () => {
  check('Original table change handler preserved', /addEventListener\('change'/.test(appSource), 'change handler missing');
  check('Original table mousedown preserved (cell selection)', /t\.closest\('\.note-cell'\)/.test(appSource), 'cell selection mousedown missing');
  check('Original table click handler preserved', /addEventListener\('click'/.test(appSource) && /handleTableAction\(ctl\.dataset\.tableAction/.test(appSource), 'click handler missing');
  check('saveFullScreenNote handler preserved', /saveFullScreenNote\.addEventListener/.test(appSource), 'saveFullScreenNote broken');
  check('if (noteBodyInput) block closes before saveFullScreenNote', /}\s*\n\s*if \(saveFullScreenNote\)/.test(appSource), 'brace misplacement');
});

// --- Color picker controls (showPicker) ------------------------------------
test('Text color button uses showPicker, not click', () => {
  check('noteTextColorBtn click uses showPicker', /noteTextColorInput\.showPicker\(\)/.test(appSource), 'showPicker not used');
  check('Text color input has input event listener', /noteTextColorInput\.addEventListener\('input'/.test(appSource), 'input listener missing');
  check('Text color input listener calls applyNoteTextColor', /applyNoteTextColor\(color\)/.test(appSource), 'applyNoteTextColor not called');
  check('Text color button has mousedown preventDefault', /noteTextColorBtn\.addEventListener\('mousedown', \(e\) => e\.preventDefault\(\)\)/.test(appSource), 'mousedown preventDefault missing');
});

test('Text color click handler opens the REAL picker (no default color)', () => {
  const handlerStart = appSource.indexOf("noteTextColorBtn.addEventListener('click'");
  const handlerEnd = appSource.indexOf('});', handlerStart);
  const handlerCode = appSource.slice(handlerStart, handlerEnd);
  // Primary path: showPicker() opens the native color picker.
  check('Text color click handler uses showPicker (primary)', handlerCode.includes('showPicker'), 'showPicker not in click handler');
  // Fallback path must open the REAL native picker via a programmatic click,
  // and must NOT auto-apply a default color.
  check('Text color fallback opens real picker via .click()', handlerCode.includes('noteTextColorInput.click()'), 'fallback .click() missing');
  check('Text color fallback does NOT auto-apply a default color', !handlerCode.includes('applyNoteTextColor(noteTextColorInput.value'), 'default color applied in fallback');
  // Selection retention: the selected range is captured before opening the picker.
  check('Text color range captured before opening picker', /pendingNoteTextColorRange = preserveActiveSelectionRange/.test(handlerCode), 'preserve not set in click handler');
});

test('Cell background color button uses showPicker, not click', () => {
  check('noteCellBgColorInput.showPicker() used', /noteCellBgColorInput\.showPicker\(\)/.test(appSource), 'showPicker not used');
  check('Cell bg color input has input event listener', /noteCellBgColorInput\.addEventListener\('input'/.test(appSource), 'input listener missing');
  check('Cell bg color input listener calls applyCellBackgroundColor', /applyCellBackgroundColor\(color, cell\)/.test(appSource), 'applyCellBackgroundColor not called');
  check('Cell bg color button uses getSelectedNoteTableCellForBackground', /getSelectedNoteTableCellForBackground\(\)/.test(appSource), 'cell selection helper not used');
  check('Cell bg color button has mousedown preventDefault', /noteCellBgColorBtn\.addEventListener\('mousedown', \(e\) => e\.preventDefault\(\)\)/.test(appSource), 'mousedown preventDefault missing');
});

test('Cell bg color click handler opens the REAL picker (no default color)', () => {
  const handlerStart = appSource.indexOf("noteCellBgColorBtn.addEventListener('click'");
  const handlerEnd = appSource.indexOf('});', handlerStart);
  const handlerCode = appSource.slice(handlerStart, handlerEnd);
  // Primary path: showPicker() opens the native color picker.
  check('Cell bg color click handler uses showPicker (primary)', handlerCode.includes('showPicker'), 'showPicker not in click handler');
  // Fallback path must open the REAL native picker via a programmatic click,
  // and must NOT auto-apply a default color.
  check('Cell bg fallback opens real picker via .click()', handlerCode.includes('noteCellBgColorInput.click()'), 'fallback .click() missing');
  check('Cell bg fallback does NOT auto-apply a default color', !handlerCode.includes('applyCellBackgroundColor(noteCellBgColorInput.value'), 'default color applied in fallback');
  // Target retention: the selected cell is captured before opening the picker.
  check('Cell bg target cell captured before opening picker', /pendingTargetCell = cell/.test(handlerCode), 'pendingTargetCell not set in click handler');
});

test('Cell bg color input applies color to the captured target cell', () => {
  const start = appSource.indexOf("noteCellBgColorInput.addEventListener('input'");
  const end = appSource.indexOf('});', start);
  const code = appSource.slice(start, end);
  check('input listener uses captured pendingTargetCell first', /pendingTargetCell\s*\|\|\s*getSelectedNoteTableCellForBackground/.test(code), 'pendingTargetCell not used');
  check('input listener applies color to that same cell', /applyCellBackgroundColor\(color, cell\)/.test(code), 'applyCellBackgroundColor not called');
});

// --- Color picker fallbacks preserve selection range -----------------------
test('Color pickers preserve selection range', () => {
  check('Text color fallback uses preserveActiveSelectionRange', /preserveActiveSelectionRange\(\)/.test(appSource), 'preserve missing');
  check('Text color fallback uses restoreActiveSelectionRange', /restoreActiveSelectionRange\(saved\)/.test(appSource), 'restore missing');
  check('Cell bg color fallback uses preserve/restore', appSource.includes('preserveActiveSelectionRange') && appSource.includes('restoreActiveSelectionRange'), 'preserve/restore missing in cell bg');
});

// --- PDF export handler: download, no navigator.share --------------------
test('PDF export handler uses download, not navigator.share', () => {
  const handlerStart = appSource.indexOf("exportNotePdfBtn.addEventListener('click'");
  const handlerEnd = appSource.indexOf('}', handlerStart);
  const handlerCode = appSource.slice(handlerStart, handlerEnd);
  check('PDF handler does NOT call navigator.share', !handlerCode.includes('navigator.share'), 'navigator.share present');
  check('PDF handler uses createObjectURL', /URL\.createObjectURL\(blob\)/.test(appSource), 'createObjectURL missing');
  check('PDF handler uses a.download', /a\.download\s*=/.test(appSource), 'download attr missing');
  check('PDF handler uses a.click()', /a\.click\(\)/.test(appSource), 'a.click() missing');
  check('PDF handler uses position:fixed (not display:none)', /a\.style\.position\s*=\s*'fixed'/.test(appSource), 'position fixed missing');
  check('PDF handler uses setTimeout for cleanup', /setTimeout\(\(\) => \{\s*document\.body\.removeChild\(a\)/.test(appSource), 'setTimeout cleanup missing');
  check('PDF handler calls URL.revokeObjectURL', /URL\.revokeObjectURL\(url\)/.test(appSource), 'revokeObjectURL missing');
});

// --- Translation keys exist for toolbar buttons ---------------------------
test('Mobile table toolbar: translation keys exist', () => {
  check('noteTableAddRow key exists', /noteTableAddRow\s*:/.test(appSource), 'missing noteTableAddRow');
  check('noteTableAddCol key exists', /noteTableAddCol\s*:/.test(appSource), 'missing noteTableAddCol');
  check('noteTableDelRow key exists', /noteTableDelRow\s*:/.test(appSource), 'missing noteTableDelRow');
  check('noteTableDelCol key exists', /noteTableDelCol\s*:/.test(appSource), 'missing noteTableDelCol');
  check('noteTableMergeCells key exists', /noteTableMergeCells\s*:/.test(appSource), 'missing noteTableMergeCells');
});

// --- Mobile table toolbar reuses .note-table-ctl class -------------------
test('Mobile table toolbar: reuses .note-table-ctl class', () => {
    const toolbarSection = appSource.split('function createMobileTableToolbar')[1]?.split('function showMobileTableToolbar')[0];
  check('Toolbar buttons use note-table-ctl class', toolbarSection && /note-table-ctl/.test(toolbarSection), 'class not used in toolbar');
  check('Toolbar buttons do not create new CSS classes', toolbarSection && !/note-mobile-toolbar-ctl/.test(toolbarSection), 'new class created');
});
// --- Mobile table toolbar: borders & alignment (reused controls) ----------
test('Mobile table toolbar: reuses border/alignment selects and handlers', () => {
  const toolbarSection = appSource.split('function createMobileTableToolbar')[1]?.split('function showMobileTableToolbar')[0];
  check('Toolbar builds border select via noteTableBorderSelectHTML', toolbarSection && /noteTableBorderSelectHTML\(\)/.test(toolbarSection), 'border builder not reused');
  check('Toolbar builds H-align select via noteTableHAlignSelectHTML', toolbarSection && /noteTableHAlignSelectHTML\(\)/.test(toolbarSection), 'h-align builder not reused');
  check('Toolbar builds V-align select via noteTableVAlignSelectHTML', toolbarSection && /noteTableVAlignSelectHTML\(\)/.test(toolbarSection), 'v-align builder not reused');
  check('Toolbar change handler delegates to applyNoteTableBorderStyle', /applyNoteTableBorderStyle\(wrap, t\.value\)/.test(appSource), 'border handler not delegated');
  check('Toolbar change handler delegates to applyCellAlign', /applyCellAlign\('h', t\.value\)/.test(appSource) && /applyCellAlign\('v', t\.value\)/.test(appSource), 'align handler not delegated');
  check('syncMobileTableBorderSelect defined', /function syncMobileTableBorderSelect/.test(appSource), 'border sync missing');
  check('toolbar mousedown keeps cell focus', /toolbar\.addEventListener\('mousedown'/.test(appSource), 'mousedown keep-focus missing');
});

// --- Mobile table toolbar: docking / no scroll-lock / RTL ------------------
test('Mobile table toolbar: docked flex row (no body scroll-lock, scrollable)', () => {
  check('CSS toolbar no longer position:fixed (docked, not overlay)', !/\.note-mobile-table-toolbar\s*\{[^}]*position:\s*fixed/.test(cssSource), 'still position:fixed');
  check('CSS toolbar uses flex-direction row', /\.note-mobile-table-toolbar\s*\{[^}]*flex-direction:\s*row/.test(cssSource), 'flex row missing');
  check('CSS toolbar is nowrap + overflow-x scrollable', /\.note-mobile-table-toolbar\s*\{[^}]*overflow-x:\s*auto/.test(cssSource) && /\.note-mobile-table-toolbar\s*\{[^}]*flex-wrap:\s*nowrap/.test(cssSource), 'scroll/wrap missing');
  check('CSS toolbar controls do not shrink', /\.note-mobile-table-toolbar \.note-table-(ctl|border-select)\s*\{[^}]*flex-shrink:\s*0/.test(cssSource), 'controls shrink');
  check('createMobileTableToolbar dedupes (no duplicate toolbar)', /if \(mobileTableToolbar\) return mobileTableToolbar/.test(appSource), 'duplicate creation possible');
});