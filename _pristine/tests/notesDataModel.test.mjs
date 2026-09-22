import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// ---------------------------------------------------------------------------
// PHASE 01 — NOTES DATA MODEL ROUND-TRIP INTEGRITY
// Source-inspection tests (no browser, no network, no ESM import of app.js).
// Verify the serialization/rendering seam that moves a Note through
//   EDITOR -> SERIALIZE -> STORAGE -> LOAD -> RENDER -> EDIT -> SERIALIZE
// preserves plain text, formatting runs, tables, spans (colspan/rowSpan),
// widths/heights, borders, alignment, background and legacy body notes.
// Mirror of the existing notesSend / notesPdfExport / notesMobileUx tests.
// ---------------------------------------------------------------------------

const appSource = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');

function check(name, condition, detail) {
  if (condition) {
    console.log('PASS  ' + name);
  } else {
    console.error('FAIL  ' + name + (detail ? '  -> ' + detail : ''));
  }
  assert.ok(condition, name + (detail ? '  -> ' + detail : ''));
}

// --- Core seam functions exist --------------------------------------------
test('Notes data model: serialization/rendering seam functions exist', () => {
  check('serializeNoteEditor defined', /function serializeNoteEditor/.test(appSource), 'missing');
  check('renderNoteBody defined', /function renderNoteBody/.test(appSource), 'missing');
  check('buildNoteBlocksHTML defined', /function buildNoteBlocksHTML/.test(appSource), 'missing');
  check('buildNoteBodyHTML defined', /function buildNoteBodyHTML/.test(appSource), 'missing');
  check('parseTableBlock defined', /function parseTableBlock/.test(appSource), 'missing');
  check('buildTableBlockHTML defined', /function buildTableBlockHTML/.test(appSource), 'missing');
  check('flattenBlocksForPreview defined', /function flattenBlocksForPreview/.test(appSource), 'missing');
  check('noteTableCellSpanAttr defined', /function noteTableCellSpanAttr/.test(appSource), 'missing');
});

// --- Merge/split span round-trip (the PHASE 01 fix) ------------------------
test('Notes data model: colspan/rowSpan spans round-trip on re-render', () => {
  // parseTableBlock writes camelCase rowSpan (source of truth for merged cells).
  check('parseTableBlock stores rowSpan (camelCase)', /cell\.rowSpan = rowSpan/.test(appSource), 'rowSpan key changed');
  check('parseTableBlock stores colspan (lowercase)', /cell\.colspan = colSpan/.test(appSource), 'colspan key changed');
  // buildTableBlockHTML re-renders via noteTableCellSpanAttr for both axes.
  check('render reads colspan via noteTableCellSpanAttr', /noteTableCellSpanAttr\(cell, 'colspan'\)/.test(appSource), 'colspan render missing');
  check('render reads rowspan via noteTableCellSpanAttr', /noteTableCellSpanAttr\(cell, 'rowspan'\)/.test(appSource), 'rowspan render missing');
  // noteTableCellSpanAttr must accept BOTH camelCase and lowercase keys so a
  // merged rowSpan cell survives save -> load -> render without data loss.
  const spanFnMatch = appSource.match(/function noteTableCellSpanAttr\(cell, prop\) \{[\s\S]*?\n\}/);
  const spanFn = spanFnMatch ? spanFnMatch[0] : '';
  check('reader reads exact key', /cell\[prop\]/.test(spanFn), 'exact-key read missing');
  check('reader reads camelCase fallback', /prop === 'colspan' \? 'colSpan' : 'rowSpan'/.test(spanFn), 'camelCase fallback missing');
  check('reader coerces to integer > 1 only', /Number\.isFinite\(v\) && v > 1/.test(spanFn), 'safety guard missing');
});

// --- Column widths + row heights round-trip -------------------------------
test('Notes data model: colWidths / rowHeights round-trip', () => {
  check('colgroup emits width as NNpx', /<col style="width:' \+ w \+ 'px;"/.test(appSource), 'col width emission changed');
  check('col widths parsed back from col style', /normalizeNoteTableColWidth\(col\.style && col\.style\.width/.test(appSource), 'col width parse changed');
  check('row height emitted on <tr>', /style="height:' \+ h \+ 'px;"/.test(appSource), 'row height emission changed');
  check('row heights parsed back from tr style', /normalizeNoteTableRowHeight\(tr\.style && tr\.style\.height/.test(appSource), 'row height parse changed');
});
// --- PHASE 04: Notes -> PDF compatibility ---------------------------------
test('Notes PDF compatibility: wide-table column widths stay on the A4 page', () => {
  // PDF builds a percentage colgroup (never absolute px) so explicit column
  // widths cannot push a wide table beyond the printable page width.
  check('notePdfColgroupHTML defined (PDF-only helper)', /function notePdfColgroupHTML/.test(appSource), 'missing');
  const pdfColFn = appSource.match(/function notePdfColgroupHTML\(block, colCount\) \{[\s\S]*?\n\}/);
  const fn = pdfColFn ? pdfColFn[0] : '';
  check('PDF colgroup emits percentage widths', fn.includes('width:\' + (weights[i] * 100 / sum).toFixed(4) + \'%;'), 'px emission in PDF path');
  check('PDF colgroup does not emit absolute px widths', !/width:' \+ w \+ 'px/.test(fn), 'absolute px leaked into PDF');
  check('PDF path uses notePdfColgroupHTML, not the editor px colgroup', /'>' \+ notePdfColgroupHTML\(block, colCount\)/.test(appSource), 'PDF still using editor colgroup');
  check('editor colgroup unchanged (px, on-screen fidelity kept)', /function noteTableColgroupHTML/.test(appSource) && /width:' \+ w \+ 'px;"/.test(appSource), 'editor rendering altered');
  check('fixed-layout PDF table constrained to page width', /\.eq-pdf-note-table\.eq-pdf-fixed \{ table-layout:fixed; width:100%; max-width:100%; \}/.test(appSource), 'width:auto overflow possible');
});


// --- Serializer preserves block order + legacy fallback -------------------
test('Notes data model: serializer preserves ordered text/table blocks', () => {
  check('serializer walks childNodes in order', /Array\.from\(root\.childNodes\)\.forEach/.test(appSource), 'child walk missing');
  check('table wrap pushed as a table block', /blocks\.push\(parseTableBlock\(tableEl\)\)/.test(appSource), 'table block push missing');
  check('text between tables becomes a text block', /blocks\.push\(\{ type: 'text', body: ex\.body/.test(appSource), 'text block push missing');
  check('legacy path returned when no table present', /return extractNoteBodyAndFormatting\(root\)/.test(appSource), 'legacy fallback missing');
  check('preview flattened from blocks', /flattenBlocksForPreview\(blocks\)/.test(appSource), 'flatten preview missing');
});

// --- Render path prefers bodyBlocks, else legacy --------------------------
test('Notes data model: render prefers bodyBlocks else legacy body', () => {
  check('bodyBlocks branch renders via buildNoteBlocksHTML', /noteBodyInput\.innerHTML = buildNoteBlocksHTML\(note\.bodyBlocks\)/.test(appSource), 'bodyBlocks branch missing');
  check('legacy branch renders via buildNoteBodyHTML', /noteBodyInput\.innerHTML = buildNoteBodyHTML\(note\.body, note\.bodyFormatting\)/.test(appSource), 'legacy branch missing');
  check('resizers reinited after render', /initNoteTableResizers\(noteBodyInput\)/.test(appSource), 'resizer re-init missing');
});

// --- Save path maps serializer output to bodyBlocks / legacy --------------
test('Notes data model: save maps blocks -> bodyBlocks, else legacy fields', () => {
  check('save assigns note.bodyBlocks from blocks', /note\.bodyBlocks = res\.blocks/.test(appSource), 'bodyBlocks assign missing');
  check('save writes note.body preview', /note\.body = res\.body/.test(appSource), 'body assign missing');
  check('save writes bodyFormatting for legacy', /note\.bodyFormatting = res\.formatting/.test(appSource), 'legacy formatting write missing');
  check('save clears bodyFormatting when bodyBlocks used', /delete note\.bodyFormatting/.test(appSource), 'bodyFormatting cleanup missing');
  check('legacy path clears bodyBlocks', /delete note\.bodyBlocks/.test(appSource), 'bodyBlocks cleanup missing');
});