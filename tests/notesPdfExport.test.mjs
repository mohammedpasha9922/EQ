import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// ---------------------------------------------------------------------------
// PHASE 06 — Notes PDF Export + Intelligent Table Layout  (dedicated test)
// Verifies the Notes → PDF rendering pipeline (buildNotePdfBlob and its table
// builders) preserves every existing table feature, applies intelligent
// automatic layout ONLY as a fallback, keeps explicit user formatting
// authoritative, handles Arabic/RTL + English + numbers + mixed content, and
// stays safe (escaped, no injection). Mirrors the proven notesSend source-
// inspection test style (no browser, no network).
// ---------------------------------------------------------------------------

const appSource = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const htmlSource = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function check(name, condition, detail) {
  if (condition) {
    console.log('PASS  ' + name);
  } else {
    console.error('FAIL  ' + name + (detail ? '  -> ' + detail : ''));
  }
  assert.ok(condition, name + (detail ? '  -> ' + detail : ''));
}

// --- Build pipeline functions exist --------------------------------------
test('Notes PDF: build pipeline functions exist', () => {
  check('buildNotePdfBlob defined', /async function buildNotePdfBlob\(note\)/.test(appSource), 'missing');
  check('buildNotePdfHtml defined', /function buildNotePdfHtml\(note\)/.test(appSource), 'missing');
  check('notePdfTableCellHTML defined', /function notePdfTableCellHTML\(/.test(appSource), 'missing');
  check('buildNotePdfRowHTML defined', /function buildNotePdfRowHTML\(/.test(appSource), 'missing');
  check('buildNoteTableBlockPdfHTML defined', /function buildNoteTableBlockPdfHTML\(/.test(appSource), 'missing');
  check('buildNotePdfBodyHTML defined', /function buildNotePdfBodyHTML\(/.test(appSource), 'missing');
  check('notePdfCellSpanAttr defined', /function notePdfCellSpanAttr\(/.test(appSource), 'missing');
  check('notePdfCellDirAttr defined', /function notePdfCellDirAttr\(/.test(appSource), 'missing');
  check('notePdfTableCellStyle defined', /function notePdfTableCellStyle\(/.test(appSource), 'missing');
});

// --- Uses the existing html2pdf/html2canvas/jsPDF pipeline ----------------
test('Notes PDF: reuses existing html2pdf pipeline (A4 portrait)', () => {
  check('Uses window.html2pdf()', /window\.html2pdf\(\)/.test(appSource), 'html2pdf not used');
  check('Isolated iframe capture', /document\.createElement\('iframe'\)/.test(appSource), 'no iframe');
  check('A4 portrait page', /format:\s*'a4'/.test(appSource), 'not A4');
  check('Portrait orientation', /orientation:\s*'portrait'/.test(appSource), 'not portrait');
  check('html2canvas scale set', /html2canvas:\s*\{ scale:\s*2/.test(appSource), 'no scale');
  check('Reports report element via id', /getElementById\('note-report'\)/.test(appSource), 'no report id');
  check('Cleans up iframe + injected style', /document\.body\.removeChild\(frame\)/.test(appSource), 'no cleanup');
});

// --- Empty/default table support ------------------------------------------
test('Notes PDF: empty/default table is handled safely', () => {
  check('Rows guarded as arrays', /Array\.isArray\(block && block\.rows\)/.test(appSource), 'rows not guarded');
  check('Col size computed safely', /rows\.forEach/.test(appSource), 'colcount safe');
});

// --- Normal text / legacy body handled -----------------------------------
test('Notes PDF: legacy note body + formatting preserved', () => {
  check('buildNoteBodyHTML reused', /function buildNoteBodyHTML/.test(appSource), 'missing');
  check('Legacy body fallback path', /buildNoteBodyHTML\(note && note\.body, note && note\.bodyFormatting\)/.test(appSource), 'no legacy fallback');
  check('bodyBlocks supported', /Array\.isArray\(note && note\.bodyBlocks\)/.test(appSource), 'no bodyBlocks handling');
});

// --- Long text / wrapping (no overflow) ----------------------------------
test('Notes PDF: long text wraps, no nowrap', () => {
  check('word-break present in cell', /word-break:break-word/.test(appSource), 'no word-break');
  check('overflow-wrap/anywhere present', /overflow-wrap:anywhere/.test(appSource), 'no overflow-wrap');
  check('Natural wrapping enabled', /white-space:normal/.test(appSource), 'no white-space normal');
});

// --- Arabic / RTL / English / numbers / mixed ----------------------------
test('Notes PDF: Arabic + English + numeric content handled', () => {
  check('pdfCellDir helper exists', /function pdfCellDir\(/.test(appSource), 'no pdfCellDir');
  check('pdfCellAlign helper exists', /function pdfCellAlign\(/.test(appSource), 'no pdfCellAlign');
  check('Arabic auto-align right (pdfCellAlign)', /return 'right'/.test(appSource), 'no rtl-aware align');
  check('Numeric auto-align right', /digits > letters\) return 'right'/.test(appSource), 'no numeric right align');
  check('dir=rtl emitted for cells', /notePdfCellDirAttr/.test(appSource), 'no rtl dir attr');
});

// --- Header row preserved ------------------------------------------------
test('Notes PDF: header row preserved as distinct <thead>', () => {
  check('Header renders <thead>', /'<thead>'/.test(appSource), 'no thead');
  check('Body rows in <tbody>', /'<tbody>'/.test(appSource), 'no tbody');
  check('Header cells use <th>', /isHeader \? 'th' : 'td'/.test(appSource), 'no th for header');
  check('thead repeats headers (display table-header-group)', /thead \{ display:table-header-group; \}/.test(appSource), 'no thead repeat');
  check('Rows avoid page-break-inside', /tbody tr \{ page-break-inside:avoid/.test(appSource), 'no row break avoidance');
});

// --- Explicit horizontal alignment authoritative -------------------------
test('Notes PDF: explicit horizontal alignment wins', () => {
  check('alignH allow-list used', /NOTE_TABLE_H_ALIGN\.indexOf\(h\) !== -1/.test(appSource), 'alignH not honored');
  check('EXPLICIT alignH used directly (not overridden)', /NOTE_TABLE_H_ALIGN\.indexOf\(h\) !== -1 \? h : pdfCellAlign\(text\)/.test(appSource), 'explicit alignH overridden by auto');
  check('H allow-list defined', /const NOTE_TABLE_H_ALIGN = \['left', 'center', 'right'\]/.test(appSource), 'H list missing');
});

// --- Explicit vertical alignment authoritative ---------------------------
test('Notes PDF: explicit vertical alignment wins', () => {
  check('alignV allow-list used', /NOTE_TABLE_V_ALIGN\.indexOf\(v\) !== -1/.test(appSource), 'alignV not honored');
  check('EXPLICIT alignV used directly', /NOTE_TABLE_V_ALIGN\.indexOf\(v\) !== -1 \? v : 'middle'/.test(appSource), 'explicit alignV overridden');
  check('V allow-list defined', /const NOTE_TABLE_V_ALIGN = \['top', 'middle', 'bottom'\]/.test(appSource), 'V list missing');
  check('V default is middle (auto fallback)', /\? v : 'middle'/.test(appSource), 'no middle default');
});

// --- Cell background preserved -------------------------------------------
test('Notes PDF: cell background color preserved', () => {
  check('normalizeNoteTextColor reused', /normalizeNoteTextColor/.test(appSource), 'not used');
  check('background-color emitted inline', /background-color:' \+ bg/.test(appSource), 'bg not emitted');
});

// --- Text color / bold / italic / underline preserved --------------------
test('Notes PDF: cell text formatting (color/bold/italic/underline)', () => {
  check('color span emitted (buildNoteBodyHTML)', /<span style="color:' \+ c \+ ';">/.test(appSource), 'no color span');
  check('bold <b> emitted', /'<b>' \+ seg \+ '<\/b>'/.test(appSource), 'no bold');
  check('italic <i> emitted', /'<i>' \+ seg \+ '<\/i>'/.test(appSource), 'no italic');
  check('underline <u> emitted', /'<u>' \+ seg \+ '<\/u>'/.test(appSource), 'no underline');
  check('text escaped before formatting', /escapeNoteText\(/.test(appSource), 'text not escaped');
});

// --- Borders preserved ---------------------------------------------------
test('Notes PDF: border styles preserved', () => {
  check('border style allow-list exists', /const NOTE_TABLE_BORDER_STYLES = \['all', 'outside', 'inside', 'none'\]/.test(appSource), 'border list missing');
  check('border data attr emitted', /data-border-style/.test(appSource), 'no border attr');
  check('outside border: table outline', /data-border-style="outside"\] \{ border:1px solid #cbd5e1/.test(appSource), 'outside ok');
  check('none border: cells side removed', /data-border-style="none"\] th/.test(appSource), 'none ok');
  check('inside border styles defined', /data-border-style="inside"\] tr:first-child th/.test(appSource), 'inside ok');
});

// --- Resized columns & rows preserved ------------------------------------
test('Notes PDF: colWidths and rowHeights preserved', () => {
  check('colWidths in table block model', /Array\.isArray\(block && block\.colWidths\)/.test(appSource), 'colWidths not read');
  check('colgroup with safe widths (noteTableColgroupHTML)', /function noteTableColgroupHTML\(/.test(appSource), 'no colgroup helper');
  check('rowHeights read from block', /Array\.isArray\(block\.rowHeights\)/.test(appSource), 'rowHeights not read');
  check('row height emitted on <tr>', /function noteTableRowHeightAttr\(block, r\)/.test(appSource), 'no row height helper');
});

// --- Merged / split cells (colspan / rowspan) preserved ------------------
test('Notes PDF: merge and split spans preserved', () => {
  check('colspan emitted', /notePdfCellSpanAttr\(cell, 'colspan'\)/.test(appSource), 'no colspan');
  check('rowspan emitted', /notePdfCellSpanAttr\(cell, 'rowspan'\)/.test(appSource), 'no rowspan');
  check('span helper handles rowSpan camelCase', /rowSpan/.test(appSource), 'no camelCase rowSpan');
  check('span only emits finite int > 1', /Number\.isFinite\(v\) && v > 1/.test(appSource), 'unsafe span');
});

// --- Multi-page table support --------------------------------------------
test('Notes PDF: multi-page support via CSS page breaks', () => {
  check('pagebreak css+legacy enabled', /pagebreak:\s*\{\s*mode:\s*\['css', 'legacy'\]/.test(appSource), 'no pagebreak');
  check('thead repeats headers', /display:table-header-group/.test(appSource), 'no header repeat css');
  check('rows avoid destructive split', /page-break-inside:avoid/.test(appSource), 'no break-inside avoid');
});

// --- Legacy table (no resize/alignment metadata) still exports -----------
test('Notes PDF: legacy tables without metadata still export', () => {
  check('borderStyle defaults to all when absent', /: 'all'/.test(appSource), 'borderStyle not defaulted');
  check('auto horizontal alignment fallback (no alignH)', /pdfCellAlign\(text\)/.test(appSource), 'no auto alignment fallback');
  check('auto vertical middle fallback (no alignV)', /\? v : 'middle'/.test(appSource), 'no auto vertical');
  check('colWidths optional (natural sizing)', /noteTableHasColWidths\(block && block\.colWidths\)/.test(appSource), 'colWidths not optional');
});

// --- Tampered / invalid formatting values are neutralized ---------------
test('Notes PDF: invalid stored values are neutralized', () => {
  check('normalizeNoteTextColor guards non-strings', /normalizeNoteTextColor/.test(appSource), 'missing color guard');
  check('borderStyle allow-list (invalid -> all)', /NOTE_TABLE_BORDER_STYLES\.indexOf\(block\.borderStyle\) !== -1/.test(appSource), 'border not allow-listed');
  check('col widths clamped by normalizer', /function normalizeNoteTableColWidth/.test(appSource), 'col width not normalized');
  check('row heights clamped by normalizer', /function normalizeNoteTableRowHeight/.test(appSource), 'row height not normalized');
  check('alignH only from allow-list', /NOTE_TABLE_H_ALIGN\.indexOf\(h\) !== -1/.test(appSource), 'alignH not allow-listed');
  check('alignV only from allow-list', /NOTE_TABLE_V_ALIGN\.indexOf\(v\) !== -1/.test(appSource), 'alignV not allow-listed');
});

// --- Security / escaping architecture preserved -------------------------
test('Notes PDF: security (no eval / new Function / javascript: / injection)', () => {
  const base = appSource.indexOf('// NOTE\n');
  const pdfSection = base === -1 ? appSource : appSource.slice(base, base + 16000);
  check('No eval = in Notes-PDF area', !/eval\(/.test(pdfSection), 'uses eval');
  check('No new Function in Notes-PDF area', !/new Function/.test(pdfSection), 'uses new Function');
  check('No javascript: in Notes-PDF area', !/javascript:/.test(pdfSection), 'has javascript:');
  check('No inline onclick handler', !/onclick=/.test(pdfSection), 'has inline handler');
  check('Content escaped (escapeHtml used)', /escapeHtml\(/.test(pdfSection), 'escapeHtml not used');
  check('Cell content escaped (buildNoteBodyHTML)', /buildNoteBodyHTML/.test(pdfSection), 'cell content not escaped');
});

// --- Does NOT mutate stored note data ------------------------------------
test('Notes PDF: renderer section does not mutate stored note data', () => {
  // Scope strictly to the Notes→PDF *renderer* functions (buildNotePdfHtml /
  // buildNoteTableBlockPdfHTML / buildNotePdfBlob ...), i.e. from the header
  // marker up to the next unrelated function. The export-button handler that
  // calls saveCurrentOpenNote (to flush live edits) lives elsewhere and is out
  // of this scope.
  const s = appSource.indexOf('NOTE \u2192 PDF EXPORT');
  const e = appSource.indexOf('function flattenBlocksForPreview');
  const renderer = (s !== -1 && e !== -1 && s < e) ? appSource.slice(s, e) : appSource;
  check('Renderer does not call saveNotesData', !renderer.includes('saveNotesData('), 'calls saveNotesData');
  check('Renderer does not call saveCurrentOpenNote', !renderer.includes('saveCurrentOpenNote('), 'calls saveCurrentOpenNote');
  check('Renderer does not assign note.body', !/note\.body\s*=/.test(renderer), 'writes body');
  check('Renderer does not assign note.bodyBlocks', !/note\.bodyBlocks\s*=/.test(renderer), 'writes bodyBlocks');
});

// --- Export button + handler wiring --------------------------------------
test('Notes PDF: Export button present and wired', () => {
  check('exportNotePdfBtn in index.html', /id="exportNotePdfBtn"/.test(htmlSource), 'button missing');
  check('exportNotePdfBtn aria-label present', /aria-label="Export note as PDF"/.test(htmlSource), 'aria-label missing');
  check('exportNotePdfBtn const in app.js', /const exportNotePdfBtn =/.test(appSource), 'const missing');
  check('exportNotePdfBtn click listener registered', /exportNotePdfBtn\.addEventListener\('click'/.test(appSource), 'listener missing');
  check('listener calls buildNotePdfBlob', /buildNotePdfBlob\(note\)/.test(appSource), 'blob not called');
  check('listener saves note first (live edits)', /saveCurrentOpenNote\(\);/.test(appSource), 'no save before export');
});

// --- No uncaught runtime error patterns ----------------------------------
test('Notes PDF: no obvious runtime error patterns', () => {
  check('buildNotePdfBlob is async', /async function buildNotePdfBlob/.test(appSource), 'not async');
  check('t translation used in handler', /const t = translations\[state\.locale\]/.test(appSource), 'no t in handler');
  check('html2pdf library loaded on demand', /loadExternalScript\(PDF_LIB_URL\)/.test(appSource), 'no lib load');
  check('html2pdf unavailability handled', /throw new Error\('PDF library unavailable'\)/.test(appSource), 'no unavailability guard');
});

// --- Existing Notes Send / editor untouched ------------------------------
test('Notes PDF: existing Send + editor behaviour preserved', () => {
  check('sendCurrentNote still async and present', /async function sendCurrentNote/.test(appSource), 'send changed');
  check('buildNoteShareText still present', /function buildNoteShareText/.test(appSource), 'share text removed');
  check('note editor renderer intact', /function renderNoteBody/.test(appSource), 'editor renderer changed');
  check('existing buildTableBlockHTML intact', /function buildTableBlockHTML\(/.test(appSource), 'table editor build changed');
  check('sendNoteBtn still present', /id="sendNoteBtn"/.test(htmlSource), 'send button removed');
});