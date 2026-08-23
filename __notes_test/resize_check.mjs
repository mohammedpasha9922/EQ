// NOTES TABLE RESIZE verification harness (test-only artifact, modifies nothing).
// Drives the real UI in Chrome via Puppeteer and verifies column/row resize,
// persistence (auto-save / close / reopen / refresh), merge/split compatibility,
// formatting preservation and resize-value normalization/security.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe';
const STORAGE_KEY = 'eq-note-manager-notes';
const FOLDERS_KEY = 'eq-note-folders';
const PORT = 8290;
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
}

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  const ext = path.extname(urlPath).toLowerCase();
  const mimeMap = {
    '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
    '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
    '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg'
  };
  const mime = mimeMap[ext] || 'application/octet-stream';
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime + '; charset=utf-8' });
    res.end(data);
  } catch (e) { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, r));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function readNotes(page) {
  return page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } }, STORAGE_KEY);
}
async function clearStorage(page) {
  await page.evaluate((a, b) => { localStorage.removeItem(a); localStorage.removeItem(b); }, STORAGE_KEY, FOLDERS_KEY);
}
function noteByTitle(notes, title) { return notes.find((n) => n.title === title) || null; }
async function tableBlock0(page, title) {
  const notes = await readNotes(page);
  const n = noteByTitle(notes, title);
  if (!n || !Array.isArray(n.bodyBlocks)) return null;
  return n.bodyBlocks.find((b) => b && b.type === 'table') || null;
}

async function openNotes(page) {
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 6000 });
}
async function newNote(page) {
  await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 6000 });
}
async function openNoteByTitle(page, title) {
  await page.evaluate((t) => {
    const items = Array.from(document.querySelectorAll('#notesList .note-item'));
    const it = items.find((el) => el.querySelector('.note-item-title').textContent.trim() === t);
    if (it) it.click();
  }, title);
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 6000 });
}
async function closeEditor(page) { await page.click('#closeFullScreenNote').catch(() => {}); }
async function closeNotesManager(page) { await page.click('#closeNotesManager').catch(() => {}); }

async function clickTableBtn(page) {
  await page.evaluate(() => {
    const b = document.getElementById('noteBodyInput');
    if (b) b.focus();
    const tb = document.getElementById('noteTableBtn');
    if (tb) tb.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
  });
  await page.click('#noteTableBtn');
}
async function setTableDims(page, r, c, header) {
  await page.evaluate((rr, cc, h) => {
    const ri = document.getElementById('noteTableRows'); if (ri) ri.value = rr;
    const ci = document.getElementById('noteTableCols'); if (ci) ci.value = cc;
    const hi = document.getElementById('noteTableHeader'); if (hi) hi.checked = h;
  }, r, c, !!header);
  await page.click('#noteTableInsertBtn');
  await page.waitForFunction(() => !document.getElementById('noteTablePanel') || document.getElementById('noteTablePanel').classList.contains('hidden'), { timeout: 3000 });
}
async function focusCell(page, ti, r, c) {
  await page.evaluate((ti, ri, ci) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    if (!t) return;
    const tr = t.querySelectorAll('tr')[ri];
    const cell = tr ? tr.querySelectorAll('td, th')[ci] : null;
    if (cell) cell.focus();
  }, ti, r, c);
}
async function typeInCell(page, ti, r, c, text) {
  await focusCell(page, ti, r, c);
  await page.keyboard.type(text);
}
async function selectCellWord(page, ti, r, c, word) {
  await page.evaluate((ti, ri, ci, w) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    const tr = t.querySelectorAll('tr')[ri];
    const cell = tr.querySelectorAll('td, th')[ci];
    const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const idx = node.nodeValue.indexOf(w);
      if (idx >= 0) {
        const rng = document.createRange();
        rng.setStart(node, idx);
        rng.setEnd(node, idx + w.length);
        const sel = document.getSelection();
        sel.removeAllRanges(); sel.addRange(rng);
        break;
      }
    }
  }, ti, r, c, word);
}
async function clickFormat(page, id) {
  await page.evaluate((btnId) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
  }, id);
  await page.click('#' + id);
}
async function applyTextColor(page, hex) {
  await page.evaluate((h) => {
    const input = document.getElementById('noteTextColorInput');
    if (!input) return;
    input.value = h;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, hex);
}
async function applyCellBg(page, hex) {
  await page.evaluate((h) => {
    const input = document.getElementById('noteCellBgColorInput');
    if (!input) return;
    input.value = h;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, hex);
}

async function setHAlign(page, ti, value) {
  return page.evaluate((ti, value) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    const wrap = t && t.closest('.note-table-wrap');
    const sel = wrap && wrap.querySelector('[data-table-h-align-select]');
    if (!sel) return false;
    sel.value = value; sel.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, ti, value);
}
async function setVAlign(page, ti, value) {
  return page.evaluate((ti, value) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    const wrap = t && t.closest('.note-table-wrap');
    const sel = wrap && wrap.querySelector('[data-table-v-align-select]');
    if (!sel) return false;
    sel.value = value; sel.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, ti, value);
}
async function setBorder(page, ti, value) {
  return page.evaluate((ti, value) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    const wrap = t && t.closest('.note-table-wrap');
    const sel = wrap && wrap.querySelector('[data-table-border-select]');
    if (!sel) return false;
    sel.value = value; sel.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, ti, value);
}
async function clickTableCellAction(page, ti, action) {
  await page.evaluate((ti, act) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    const wrap = t && t.closest('.note-table-wrap');
    const btn = wrap && wrap.querySelector('[data-table-action="' + act + '"]');
    if (btn) btn.click();
  }, ti, action);
}
async function anchorCell(page, ti, r, c) {
  await page.evaluate((ti, ri, ci) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    const tr = t.querySelectorAll('tr')[ri];
    const cell = tr ? tr.querySelectorAll('td, th')[ci] : null;
    if (cell) cell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, shiftKey: false }));
  }, ti, r, c);
}
async function shiftClickCell(page, ti, r, c) {
  await page.evaluate((ti, ri, ci) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    const tr = t.querySelectorAll('tr')[ri];
    const cell = tr ? tr.querySelectorAll('td, th')[ci] : null;
    if (cell) cell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, shiftKey: true }));
  }, ti, r, c);
}

// Real drag on the in-table resize handles via synthetic pointer events so the
// interaction goes through the exact same listeners a mouse/touch drag would.
async function dragCol(page, ti, colIndex, dx) {
  return page.evaluate((ti, ci, dx) => {
    const wrap = document.querySelectorAll('.note-table-wrap')[ti];
    const layer = wrap && wrap.querySelector('.note-table-resize');
    const handle = layer && layer.querySelector('[data-resize="col"][data-col="' + ci + '"]');
    if (!handle) return 'no-handle';
    const r = handle.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + Math.min(20, r.height / 2);
    const mv = (X, Y) => new PointerEvent('pointermove', { bubbles: true, cancelable: true, view: window, pointerId: 1, isPrimary: true, clientX: X, clientY: Y, button: 0, buttons: 1 });
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, view: window, pointerId: 1, isPrimary: true, clientX: x, clientY: y, button: 0, buttons: 1 }));
    window.dispatchEvent(mv(x + dx, y));
    window.dispatchEvent(mv(x + dx, y));
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, view: window, pointerId: 1, isPrimary: true, clientX: x + dx, clientY: y, button: 0, buttons: 0 }));
    return 'ok';
  }, ti, colIndex, dx);
}
async function dragRow(page, ti, rowIndex, dy) {
  return page.evaluate((ti, ri, dy) => {
    const wrap = document.querySelectorAll('.note-table-wrap')[ti];
    const layer = wrap && wrap.querySelector('.note-table-resize');
    const handle = layer && layer.querySelector('[data-resize="row"][data-row="' + ri + '"]');
    if (!handle) return 'no-handle';
    const r = handle.getBoundingClientRect();
    const x = r.left + Math.min(20, r.width / 2), y = r.top + r.height / 2;
    const mv = (X, Y) => new PointerEvent('pointermove', { bubbles: true, cancelable: true, view: window, pointerId: 2, isPrimary: true, clientX: X, clientY: Y, button: 0, buttons: 1 });
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, view: window, pointerId: 2, isPrimary: true, clientX: x, clientY: y, button: 0, buttons: 1 }));
    window.dispatchEvent(mv(x, y + dy));
    window.dispatchEvent(mv(x, y + dy));
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, view: window, pointerId: 2, isPrimary: true, clientX: x, clientY: y + dy, button: 0, buttons: 0 }));
    return 'ok';
  }, ti, rowIndex, dy);
}

async function initialColWidths(page, ti) {
  return page.evaluate((ti) => Array.from(document.querySelectorAll('table.note-table')[ti].querySelectorAll('col')).map((c) => c.offsetWidth || 0), ti);
}
async function initialRowHeights(page, ti) {
  return page.evaluate((ti) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    return Array.from(t.querySelectorAll('tbody tr')).map((tr) => tr.offsetHeight || 0);
  }, ti);
}
async function colCount(page, ti) {
  return page.evaluate((ti) => document.querySelectorAll('table.note-table')[ti].querySelectorAll('col').length, ti);
}
async function rowCount(page, ti) {
  return page.evaluate((ti) => document.querySelectorAll('table.note-table')[ti].querySelectorAll('tbody tr').length, ti);
}
async function cellTexts(page, ti) {
  return page.evaluate((ti) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    if (!t) return null;
    return Array.from(t.querySelectorAll('tr')).map((tr) =>
      Array.from(tr.querySelectorAll('td, th')).map((td) => td.innerText)
    );
  }, ti);
}
async function cellOuterHTMLs(page, ti) {
  return page.evaluate((ti) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    if (!t) return null;
    return Array.from(t.querySelectorAll('tr')).map((tr) =>
      Array.from(tr.querySelectorAll('td, th')).map((td) => td.outerHTML)
    );
  }, ti);
}
async function resizeLayerInfo(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('.note-table-wrap')).map((w) => ({
    layers: w.querySelectorAll('.note-table-resize').length,
    colHandles: w.querySelectorAll('.note-col-handle').length,
    rowHandles: w.querySelectorAll('.note-row-handle').length,
    fixed: !!(w.querySelector('table.note-table') && w.querySelector('table.note-table').classList.contains('note-table-fixed'))
  })), page);
}

let browser;
let pageError = null;
const pageErrHandler = (e) => { pageError = (pageError || '') + e.message + '\n'; };

try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  page.on('pageerror', pageErrHandler);
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'networkidle0', timeout: 20000 });
  await clearStorage(page);
  await page.reload({ waitUntil: 'networkidle0', timeout: 20000 });
  await sleep(500);

  // ---------- NOTE A: create 3x3, content, formatting ----------
  await openNotes(page);
  await newNote(page);
  const title = 'Resize Main';
  await page.click('#noteTitleInput');
  await page.type('#noteTitleInput', title);
  await page.click('#noteBodyInput');
  await clickTableBtn(page);
  await setTableDims(page, 3, 3, false);

  const layerInfo = await resizeLayerInfo(page);
  check('NO DUPLICATE RESIZE: exactly one resize layer per table',
    layerInfo.length === 1 && layerInfo[0].layers === 1, JSON.stringify(layerInfo));
  check('HANDLES: (cols-1) col handles + (rows-1) row handles',
    layerInfo.length === 1 && layerInfo[0].colHandles === 2 && layerInfo[0].rowHandles === 2, JSON.stringify(layerInfo));

  // Arabic / English / Numbers / Mixed
  await typeInCell(page, 0, 0, 0, 'مرحبا');
  await typeInCell(page, 0, 0, 1, 'Hello');
  await typeInCell(page, 0, 0, 2, '12345');
  await typeInCell(page, 0, 1, 0, 'سلام hello 99');
  await typeInCell(page, 0, 1, 1, 'Plain text');
  await typeInCell(page, 0, 1, 2, 'X86 mixed 42');
  await sleep(400);

  await selectCellWord(page, 0, 0, 0, 'مرحبا'); await clickFormat(page, 'noteBoldBtn'); await sleep(150);
  await selectCellWord(page, 0, 0, 1, 'Hello'); await clickFormat(page, 'noteItalicBtn'); await sleep(150);
  await selectCellWord(page, 0, 0, 2, '12345'); await clickFormat(page, 'noteUnderlineBtn'); await sleep(150);
  await selectCellWord(page, 0, 0, 1, 'Hello'); await applyTextColor(page, '#ff0000'); await sleep(200);
  await focusCell(page, 0, 1, 1); await applyCellBg(page, '#00ffff'); await sleep(200);
  await focusCell(page, 0, 0, 0); await setHAlign(page, 0, 'center'); await sleep(120); await setVAlign(page, 0, 'middle'); await sleep(120);
  await setBorder(page, 0, 'outside'); await sleep(250);

  const beforeWidths = await initialColWidths(page, 0);
  const beforeHeights = await initialRowHeights(page, 0);
  const beforeText = await cellTexts(page, 0);
  const beforeHtml = await cellOuterHTMLs(page, 0);

  // Resize a column and a row, then a second column and second row (multiple).
  await dragCol(page, 0, 0, 120);
  await sleep(250);
  await dragRow(page, 0, 0, 60);
  await sleep(250);
  await dragCol(page, 0, 1, 80);
  await sleep(250);
  await dragRow(page, 0, 1, 50);
  await sleep(900); // autosave debounce (350ms) + buffer

  const layerAfter = await resizeLayerInfo(page);
  check('RESIZE COLUMN: table enters fixed-layout mode after a column drag',
    layerAfter.length === 1 && layerAfter[0].fixed === true, JSON.stringify(layerAfter));

  let tb = await tableBlock0(page, title);
  const cw = tb && tb.colWidths;
  const rh = tb && tb.rowHeights;
  check('RESIZE COLUMN: auto-saved colWidths array (length 3, bounded ints)',
    Array.isArray(cw) && cw.length === 3 && cw.every((v) => Number.isInteger(v) && v >= 60 && v <= 800),
    cw ? JSON.stringify(cw) : 'missing');
  check('RESIZE ROW: auto-saved rowHeights array (length 3, bounded ints)',
    Array.isArray(rh) && rh.length === 3 && rh.every((v) => Number.isInteger(v) && v >= 20 && v <= 800),
    rh ? JSON.stringify(rh) : 'missing');
  check('MULTIPLE COLUMNS: both resized column widths increased',
    Array.isArray(cw) && cw[0] > beforeWidths[0] && cw[1] > beforeWidths[1],
    'cw=' + JSON.stringify(cw) + ' before=' + JSON.stringify(beforeWidths));
  check('MULTIPLE ROWS: both resized row heights increased',
    Array.isArray(rh) && rh[0] > beforeHeights[0] && rh[1] > beforeHeights[1],
    'rh=' + JSON.stringify(rh) + ' before=' + JSON.stringify(beforeHeights));

  const afterText = await cellTexts(page, 0);
  const afterHtml = await cellOuterHTMLs(page, 0);
  check('NO DATA LOSS: cell text unchanged after resize',
    JSON.stringify(beforeText) === JSON.stringify(afterText),
    JSON.stringify(beforeText) + ' vs ' + JSON.stringify(afterText));
  const joined = JSON.stringify(afterHtml);
  check('B/I/U PRESERVED after resize', joined.includes('<b') && joined.includes('<i') && joined.includes('<u'), '');
  check('TEXT COLOR PRESERVED after resize',
    !!(tb && tb.rows && tb.rows[0] && tb.rows[0][1] && Array.isArray(tb.rows[0][1].formatting) && tb.rows[0][1].formatting.some((r) => r.color)),
    'fmt=' + JSON.stringify(tb && tb.rows && tb.rows[0] && tb.rows[0][1] && tb.rows[0][1].formatting));
  check('BACKGROUND COLOR PRESERVED after resize',
    !!(tb && tb.rows && tb.rows[1] && tb.rows[1][1] && tb.rows[1][1].backgroundColor),
    'bg=' + (tb && tb.rows && tb.rows[1] && tb.rows[1][1] && tb.rows[1][1].backgroundColor));
  check('H-ALIGN PRESERVED after resize',
    !!(tb && tb.rows && tb.rows[0] && tb.rows[0][0] && tb.rows[0][0].alignH === 'center'),
    'cell=' + JSON.stringify(tb && tb.rows && tb.rows[0] && tb.rows[0][0]));
  check('V-ALIGN PRESERVED after resize',
    !!(tb && tb.rows && tb.rows[0] && tb.rows[0][0] && tb.rows[0][0].alignV === 'middle'),
    'cell=' + JSON.stringify(tb && tb.rows && tb.rows[0] && tb.rows[0][0]));
  check('BORDER PRESERVED after resize', !!(tb && tb.borderStyle === 'outside'), 'border=' + (tb && tb.borderStyle));

  const storedAfterResize = { cw: cw ? cw.slice() : null, rh: rh ? rh.slice() : null };

// ---------- REOPEN / REFRESH persistence ----------
  const editorOffsets = await initialColWidths(page, 0);
  const editorHeights = await initialRowHeights(page, 0);
  check('PERSISTENCE (current editor): stored colWidths match rendered width (within tolerance)',
    Array.isArray(storedAfterResize.cw) && editorOffsets.every((v, i) => Math.abs(v - storedAfterResize.cw[i]) <= 40),
    'stored=' + JSON.stringify(storedAfterResize.cw) + ' rendered=' + JSON.stringify(editorOffsets));

  // Close and reopen the note
  await closeEditor(page);
  await sleep(300);
  await openNoteByTitle(page, title);
  await sleep(500);
  const roOffsets = await initialColWidths(page, 0);
  const roHeights = await initialRowHeights(page, 0);
  check('REOPEN: same column sizes after close->reopen',
    roOffsets.length === editorOffsets.length && roOffsets.every((v, i) => Math.abs(v - editorOffsets[i]) <= 6),
    'rendered=' + JSON.stringify(roOffsets) + ' pre-close=' + JSON.stringify(editorOffsets));
  check('REOPEN: same row sizes after close->reopen',
    roHeights.length === editorHeights.length && roHeights.every((v, i) => Math.abs(v - editorHeights[i]) <= 8),
    'rendered=' + JSON.stringify(roHeights) + ' pre-close=' + JSON.stringify(editorHeights));
  const roHtml = await cellOuterHTMLs(page, 0);
  const roText = await cellTexts(page, 0);
  const roJoined = JSON.stringify(roHtml);
  check('REOPEN: content + B/I/U + text color preserved',
    JSON.stringify(roText) === JSON.stringify(beforeText)
    && roJoined.includes('<b') && roJoined.includes('<i') && roJoined.includes('<u')
    && roJoined.toLowerCase().includes('color'), '');

  // ---------- REFRESH persistence ----------
  await closeEditor(page);
  await sleep(200);
  await page.reload({ waitUntil: 'networkidle0', timeout: 20000 });
  await sleep(500);
  await openNotes(page);
  await openNoteByTitle(page, title);
  await sleep(500);
  const rfOffsets = await initialColWidths(page, 0);
  const rfHeights = await initialRowHeights(page, 0);
  check('REFRESH: same column sizes after full page refresh',
    rfOffsets.length === editorOffsets.length && rfOffsets.every((v, i) => Math.abs(v - editorOffsets[i]) <= 6),
    'rendered=' + JSON.stringify(rfOffsets) + ' pre-refresh=' + JSON.stringify(editorOffsets));
  check('REFRESH: same row sizes after full page refresh',
    rfHeights.length === editorHeights.length && rfHeights.every((v, i) => Math.abs(v - editorHeights[i]) <= 8),
    'rendered=' + JSON.stringify(rfHeights) + ' pre-refresh=' + JSON.stringify(editorHeights));
  const rfHtml = await cellOuterHTMLs(page, 0);
  const rfText = await cellTexts(page, 0);
  const rfJoined = JSON.stringify(rfHtml);
  const rfFlags = {
    text: JSON.stringify(rfText) === JSON.stringify(beforeText),
    b: rfJoined.includes('<b'), i: rfJoined.includes('<i'), u: rfJoined.includes('<u'),
    color: rfJoined.toLowerCase().includes('color')
  };
  const rfAttrs = await page.evaluate(() => {
    const t = document.querySelector('table.note-table');
    const rows = Array.from(t.querySelectorAll('tbody tr'));
    const td0 = rows[0].querySelectorAll('td, th')[0];
    const td11 = rows[1].querySelectorAll('td, th')[1];
    return {
      h: td0 ? td0.getAttribute('data-h-align') : null,
      v: td0 ? td0.getAttribute('data-v-align') : null,
      bg: (td11 && td11.getAttribute('style')) || ''
    };
  });
  check('REFRESH: content + formatting + colors + align preserved',
    rfFlags.text && rfFlags.b && rfFlags.i && rfFlags.u && rfFlags.color
    && await page.evaluate(() => { const r0 = document.querySelector('table.note-table tbody tr'); const td0 = r0 ? r0.querySelectorAll('td, th')[0] : null; return !!td0 && td0.getAttribute('data-h-align') === 'center'; }) && await page.evaluate(() => { const r0 = document.querySelector('table.note-table tbody tr'); const td0 = r0 ? r0.querySelectorAll('td, th')[0] : null; return !!td0 && td0.getAttribute('data-v-align') === 'middle'; }) && /background-color/i.test(rfAttrs.bg),
    JSON.stringify(rfFlags) + ' attrs=' + JSON.stringify(rfAttrs));

  // ---------- LEGACY table (no resize data) ----------
  await closeEditor(page);
  await sleep(200);
  await newNote(page);
  const legTitle = 'Legacy NoResize';
  await page.click('#noteTitleInput');
  await page.type('#noteTitleInput', legTitle);
  await page.click('#noteBodyInput');
  await clickTableBtn(page);
  await setTableDims(page, 2, 2, false);
  await typeInCell(page, 0, 0, 0, 'legacy text');
  await sleep(800);
  const legacyBlock = await tableBlock0(page, legTitle);
  check('LEGACY: no colWidths stored when never resized',
    !!legacyBlock && legacyBlock.colWidths === undefined && Array.isArray(legacyBlock.rows) && legacyBlock.rows.length === 2,
    'block=' + JSON.stringify(legacyBlock));
  check('LEGACY: no rowHeights stored when never resized',
    !!legacyBlock && legacyBlock.rowHeights === undefined, '');
  await closeEditor(page);
  await sleep(300);
  await openNoteByTitle(page, legTitle);
  await sleep(400);
  const legacyCols = await colCount(page, 0);
  const legacyRows = await rowCount(page, 0);
  check('LEGACY: legacy table still opens and renders (2x2)',
    legacyCols === 2 && legacyRows === 2, '' + legacyRows + 'x' + legacyCols);
  await closeEditor(page);
  await sleep(200);

  // ---------- TAMPERED / INVALID resize values ----------
  const pageErrorBeforeTamper = pageError || '';
  await page.evaluate((t, key) => {
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    const n = arr.find((x) => x.title === t);
    if (n && Array.isArray(n.bodyBlocks)) {
      const b = n.bodyBlocks.find((x) => x && x.type === 'table');
      if (b) {
        b.colWidths = ['javascript:alert(1)', 999999, -5, '90em', '50px'];
        b.rowHeights = ['javascript:throw 1', -9999, '80px'];
      }
    }
    localStorage.setItem(key, JSON.stringify(arr));
  }, title, STORAGE_KEY);
  await page.reload({ waitUntil: 'networkidle0', timeout: 20000 });
  await sleep(500);
  await openNotes(page);
  await openNoteByTitle(page, title);
  await sleep(500);
  const tamperColgroup = await page.evaluate(() => {
    const colgroup = document.querySelector('table.note-table colgroup');
    return colgroup ? colgroup.outerHTML : 'none';
  });
  check('SECURITY: tampered resize values never become HTML/CSS or JS',
    !/(javascript\s*:|expression\s*\(|url\s*\(|on(?:error|load|click|mouseover|mousedown|mouseup|keydown|keyup)\s*=|behavior\s*:|<(script|iframe|object|embed)\b|{%|{{)/i.test(tamperColgroup),
    tamperColgroup.slice(0, 200));
  const tamperOffsets = await initialColWidths(page, 0);
  check('SECURITY: tampered widths normalized + bounded (60..800)',
    Array.isArray(tamperOffsets) && tamperOffsets.length === 3 && tamperOffsets.every((v) => v >= 60 && v <= 800 && Number.isFinite(v)),
    JSON.stringify(tamperOffsets));
  const tamperText = await cellTexts(page, 0);
  check('SECURITY + NO DATA LOSS: table still renders with all content',
    Array.isArray(tamperText) && tamperText.some((r) => r.some((c) => c.includes('مرحبا'))),
    JSON.stringify(tamperText));
  const pageErrorAfterTamper = pageError || '';
  check('SECURITY: no uncaught JS error after tampering resize values',
    pageErrorAfterTamper === pageErrorBeforeTamper,
    (pageErrorAfterTamper || '').split('\n').slice(0, 3).join('|'));
  await closeEditor(page);
  await sleep(200);

// ---------- MERGE / SPLIT compatibility ----------
  await newNote(page);
  const msTitle = 'MergeSplitResize';
  await page.click('#noteTitleInput');
  await page.type('#noteTitleInput', msTitle);
  await page.click('#noteBodyInput');
  await clickTableBtn(page);
  await setTableDims(page, 3, 3, false);
  await typeInCell(page, 0, 0, 0, 'A');
  await typeInCell(page, 0, 0, 1, 'B');
  await sleep(300);
  await dragCol(page, 0, 0, 100);
  await sleep(200);
  await dragRow(page, 0, 0, 60);
  await sleep(900);
  const msBefore = await tableBlock0(page, msTitle);
  check('MERGE PRECONDITION: resize data present before merge',
    !!(msBefore && msBefore.colWidths && msBefore.rowHeights), '');

  await anchorCell(page, 0, 0, 0);
  await shiftClickCell(page, 0, 0, 1);
  await sleep(200);
  await clickTableCellAction(page, 0, 'merge-cells');
  await sleep(900);
  const mergedDom = await page.evaluate(() => {
    const t = document.querySelector('table.note-table');
    const row0 = Array.from(t.querySelectorAll('tbody tr'))[0];
    const c0 = row0.querySelectorAll('td, th')[0];
    return { colspan: c0.colSpan, rowspan: c0.rowSpan, text: c0.innerText, rowCells: row0.querySelectorAll('td,th').length };
  });
  check('MERGE COMPAT: merged cell is colspan 2 + rowspan 1',
    mergedDom.colspan === 2 && mergedDom.rowspan === 1, JSON.stringify(mergedDom));
  check('MERGE COMPAT: merged text preserved (no data loss)',
    mergedDom.text.includes('A') && mergedDom.text.includes('B'), mergedDom.text);
  const msMerged = await tableBlock0(page, msTitle);
  check('MERGE COMPAT: colWidths preserved after merge',
    !!(msMerged && msMerged.colWidths && msMerged.colWidths.length === 3), JSON.stringify(msMerged && msMerged.colWidths));
  check('MERGE COMPAT: rowHeights preserved after merge',
    !!(msMerged && msMerged.rowHeights && msMerged.rowHeights.length === 3), JSON.stringify(msMerged && msMerged.rowHeights));

  await focusCell(page, 0, 0, 0);
  await sleep(200);
  await clickTableCellAction(page, 0, 'split-cell');
  await sleep(900);
  const splitDom = await page.evaluate(() => {
    const t = document.querySelector('table.note-table');
    const rows = Array.from(t.querySelectorAll('tbody tr'));
    const c0 = rows[0].querySelectorAll('td, th')[0];
    return { colspan: c0.colSpan, rowspan: c0.rowSpan, text: c0.innerText, totalRows: rows.length, firstRowCells: rows[0].querySelectorAll('td,th').length };
  });
  check('SPLIT COMPAT: merged cell split back + grid valid (3x3)',
    splitDom.colspan <= 1 && splitDom.rowspan <= 1 && splitDom.totalRows === 3 && splitDom.firstRowCells === 3,
    JSON.stringify(splitDom));
  check('SPLIT COMPAT: content preserved after split (anchor keeps text)',
    splitDom.text.includes('A') && splitDom.text.includes('B'), splitDom.text);
  const msSplit = await tableBlock0(page, msTitle);
  check('SPLIT COMPAT: colWidths still present after split',
    !!(msSplit && msSplit.colWidths && msSplit.colWidths.length === 3), JSON.stringify(msSplit && msSplit.colWidths));
  check('SPLIT COMPAT: rowHeights still present after split',
    !!(msSplit && msSplit.rowHeights && msSplit.rowHeights.length === 3), JSON.stringify(msSplit && msSplit.rowHeights));
  await closeEditor(page);
  await sleep(200);

  const fatal = pageError ? pageError.split('\n').filter(Boolean).join(' ') : '';
  check('RUNTIME: no uncaught page errors', !pageError, fatal ? fatal.slice(0, 300) : 'clean');

} catch (err) {
  console.error('HARNESS ERROR:', err && err.stack ? err.stack : err);
  results.push({ name: 'HARNESS', ok: false, detail: err && err.message ? err.message : String(err) });
} finally {
  if (browser) await browser.close();
  server.close();
}

const pass = results.filter((r) => r.ok).length;
const fail = results.length - pass;
const lines = results.map((r) => `${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  -> ' + r.detail : ''}`).join('\n');
const report = [lines, '', '==== RESULT: ' + pass + ' passed, ' + fail + ' failed, ' + results.length + ' total ====', '', 'FINAL: ' + pass + '/' + results.length + ' passed'].join('\n') + '\n';
fs.writeFileSync(path.join(HERE, 'resize_results.txt'), report, 'utf8');
console.log('\n' + report);
process.exit(pass === results.length ? 0 : 1);