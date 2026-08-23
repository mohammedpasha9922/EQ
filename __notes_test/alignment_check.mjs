// NOTES TABLE CELL ALIGNMENT verification harness (test-only artifact, modifies nothing).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const STORAGE_KEY = 'eq-note-manager-notes';
const FOLDERS_KEY = 'eq-note-folders';
const PORT = 8268;
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

async function openNotes(page) {
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 5000 });
}
async function newNote(page) {
  await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
}
async function openNoteByTitle(page, title) {
  await page.evaluate((t) => {
    const items = Array.from(document.querySelectorAll('#notesList .note-item'));
    const it = items.find((el) => el.querySelector('.note-item-title').textContent.trim() === t);
    if (it) it.click();
  }, title);
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
}
async function closeEditor(page) { await page.click('#closeFullScreenNote').catch(() => {}); }

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
  await page.waitForFunction(() => !document.getElementById('noteTablePanel') || document.getElementById('noteTablePanel').classList.contains('hidden'), { timeout: 2000 });
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
    if (!cell) return;
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

async function anchorCell(page, ti, r, c) {
  await page.evaluate((ti, ri, ci) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    if (!t) return;
    const tr = t.querySelectorAll('tr')[ri];
    const cell = tr ? tr.querySelectorAll('td, th')[ci] : null;
    if (!cell) return;
    cell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, shiftKey: false }));
  }, ti, r, c);
}
async function shiftClickCell(page, ti, r, c) {
  await page.evaluate((ti, ri, ci) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    if (!t) return;
    const tr = t.querySelectorAll('tr')[ri];
    const cell = tr ? tr.querySelectorAll('td, th')[ci] : null;
    if (!cell) return;
    cell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, shiftKey: true }));
  }, ti, r, c);
}
async function clickTableCellAction(page, ti, action) {
  await page.evaluate((ti, act) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    const wrap = t.closest('.note-table-wrap');
    const btn = wrap && wrap.querySelector('[data-table-action="' + act + '"]');
    if (btn) btn.click();
  }, ti, action);
}
async function setHAlign(page, ti, value) {
  await page.evaluate((ti, value) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    const wrap = t.closest('.note-table-wrap');
    const sel = wrap && wrap.querySelector('[data-table-h-align-select]');
    if (!sel) return false;
    sel.value = value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, ti, value);
}
async function setVAlign(page, ti, value) {
  await page.evaluate((ti, value) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    const wrap = t.closest('.note-table-wrap');
    const sel = wrap && wrap.querySelector('[data-table-v-align-select]');
    if (!sel) return false;
    sel.value = value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, ti, value);
}

async function allCellAlignAttrs(page, ti) {
  return page.evaluate((ti) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    if (!t) return [];
    return Array.from(t.querySelectorAll('tr')).map((tr) =>
      Array.from(tr.querySelectorAll('td, th')).map((td) => ({ h: td.getAttribute('data-h-align'), v: td.getAttribute('data-v-align') }))
    );
  }, ti);
}
async function cellComputedAlign(page, ti, r, c) {
  return page.evaluate((ti, r, c) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    const tr = t.querySelectorAll('tr')[r];
    const cell = tr ? tr.querySelectorAll('td, th')[c] : null;
    if (!cell) return null;
    const cs = getComputedStyle(cell);
    return { h: cs.textAlign, v: cs.verticalAlign };
  }, ti, r, c);
}
async function tableInfo(page, ti) {
  return page.evaluate((ti) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    if (!t) return null;
    return Array.from(t.querySelectorAll('tr')).map((tr) =>
      Array.from(tr.querySelectorAll('td, th')).map((td) => ({ text: td.innerText, colspan: td.colSpan || 1, rowspan: td.rowSpan || 1 }))
    );
  }, ti);
}
async function tableCellTexts(page, ti) {
  return page.evaluate((ti) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    if (!t) return null;
    return Array.from(t.querySelectorAll('tr')).map((tr) =>
      Array.from(tr.querySelectorAll('td, th')).map((td) => td.innerText)
    );
  }, ti);
}
async function cellHTML(page, ti, r, c) {
  return page.evaluate((ti, r, c) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    const tr = t.querySelectorAll('tr')[r];
    const cell = tr ? tr.querySelectorAll('td, th')[c] : null;
    return cell ? cell.innerHTML : '';
  }, ti, r, c);
}

async function cellBg(page, ti, r, c) {
  return page.evaluate((ti, r, c) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    const tr = t.querySelectorAll('tr')[r];
    const cell = tr ? tr.querySelectorAll('td, th')[c] : null;
    return cell ? (cell.style.backgroundColor || '') : '';
  }, ti, r, c);
}
async function computedBorders(page, ti) {
  return page.evaluate((ti) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    if (!t) return [];
    return Array.from(t.querySelectorAll('td, th')).map((td) => {
      const cs = getComputedStyle(td);
      return {
        top: parseFloat(cs.borderTopWidth) || 0,
        right: parseFloat(cs.borderRightWidth) || 0,
        bottom: parseFloat(cs.borderBottomWidth) || 0,
        left: parseFloat(cs.borderLeftWidth) || 0
      };
    });
  }, ti);
}
async function tableBorderAttr(page, ti) {
  return page.evaluate((ti) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    return t ? t.getAttribute('data-border-style') : null;
  }, ti);
}

let browser;
let pageError = null;

try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  page.on('pageerror', (e) => { pageError = (pageError || '') + e.message + '\n'; });
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'networkidle0', timeout: 20000 });
  await clearStorage(page);
  await page.reload({ waitUntil: 'networkidle0', timeout: 20000 });
  await sleep(400);

  // ---------- 1) CREATE table + verify alignment controls in toolbar ----------
  await openNotes(page);
  await newNote(page);
  const title = 'Alignment Note';
  await page.click('#noteTitleInput');
  await page.type('#noteTitleInput', title);
  await page.click('#noteBodyInput');
  await clickTableBtn(page);
  await setTableDims(page, 3, 3, false);
  const created = await page.evaluate(() => document.querySelectorAll('table.note-table').length);
  check('CREATE: table inserted', created === 1, 'tables=' + created);
  const hasH = await page.evaluate(() => !!document.querySelector('[data-table-h-align-select]'));
  const hasV = await page.evaluate(() => !!document.querySelector('[data-table-v-align-select]'));
  check('UI: horizontal alignment control present', hasH, '');
  check('UI: vertical alignment control present', hasV, '');

  // Fill content (Arabic / English / Numbers / Mixed)
  await typeInCell(page, 0, 0, 0, 'مرحبا');
  await typeInCell(page, 0, 0, 1, 'Hello');
  await typeInCell(page, 0, 0, 2, '12345');
  await typeInCell(page, 0, 1, 0, 'سلام');
  await typeInCell(page, 0, 1, 1, 'Mixed: سلام 99');
  await sleep(300);

  // Formatting: Bold (Arabic), Italic (English), Underline (Numbers), Text color (English)
  await selectCellWord(page, 0, 0, 0, 'مرحبا');
  await clickFormat(page, 'noteBoldBtn');
  await selectCellWord(page, 0, 0, 1, 'Hello');
  await clickFormat(page, 'noteItalicBtn');
  await selectCellWord(page, 0, 0, 2, '12345');
  await clickFormat(page, 'noteUnderlineBtn');
  await selectCellWord(page, 0, 0, 1, 'Hello');
  await applyTextColor(page, '#ff0000');
  await sleep(300);
  // Cell background on (1,1)
  await focusCell(page, 0, 1, 1);
  await applyCellBg(page, '#ffff00');
  await sleep(300);

  const bordersBefore = await computedBorders(page, 0);

  // ---------- 2) Horizontal alignment: Left / Center / Right on normal cells ----------
  await anchorCell(page, 0, 0, 0);
  await setHAlign(page, 0, 'center');
  await setVAlign(page, 0, 'middle');
  await sleep(250);
  let attrs = await cellComputedAlign(page, 0, 0, 0);
  check('NORMAL CELL: H center applied (computed)', attrs && attrs.h === 'center', JSON.stringify(attrs));
  check('NORMAL CELL: V middle applied (computed)', attrs && attrs.v === 'middle', JSON.stringify(attrs));
  const afterOne = await allCellAlignAttrs(page, 0);
  const only00 = afterOne.every((row, ri) => row.every((a, ci) => (ri === 0 && ci === 0) ? (a.h === 'center' && a.v === 'middle') : (a.h === null && a.v === null)));
  check('TARGETED-ONLY: only the targeted cell (0,0) changed; all other cells unchanged', only00, JSON.stringify(afterOne));

  await anchorCell(page, 0, 0, 1);
  await setHAlign(page, 0, 'right');
  await setVAlign(page, 0, 'bottom');
  await sleep(250);
  attrs = await cellComputedAlign(page, 0, 0, 1);
  check('NORMAL CELL: H right applied (computed)', attrs && attrs.h === 'right', JSON.stringify(attrs));
  check('NORMAL CELL: V bottom applied (computed)', attrs && attrs.v === 'bottom', JSON.stringify(attrs));

  await anchorCell(page, 0, 0, 2);
  await setHAlign(page, 0, 'left');
  await setVAlign(page, 0, 'top');
  await sleep(250);
  attrs = await cellComputedAlign(page, 0, 0, 2);
  check('NORMAL CELL: H left applied (computed)', attrs && attrs.h === 'left', JSON.stringify(attrs));
  check('NORMAL CELL: V top applied (computed)', attrs && attrs.v === 'top', JSON.stringify(attrs));

  // ---------- 3) Multiple selected cells ----------
  await anchorCell(page, 0, 1, 0);
  await shiftClickCell(page, 0, 1, 2);
  await sleep(100);
  await setHAlign(page, 0, 'center');
  await setVAlign(page, 0, 'middle');
  await sleep(250);
  attrs = await allCellAlignAttrs(page, 0);
  const row1ok = attrs[1] && attrs[1].length === 3 && attrs[1].every((a) => a.h === 'center' && a.v === 'middle');
  check('MULTI-SELECT: alignment applied to ALL selected cells', !!row1ok, 'row1=' + JSON.stringify(attrs[1]));

  // ---------- 4) Merged cell ----------
  await anchorCell(page, 0, 2, 0);
  await shiftClickCell(page, 0, 2, 1);
  await sleep(80);
  await clickTableCellAction(page, 0, 'merge-cells');
  await sleep(400);
  let info = await tableInfo(page, 0);
  const mergedOk = info[2] && info[2][0] && info[2][0].colspan === 2;
  check('MERGE: cells merged before alignment', !!mergedOk, 'info=' + JSON.stringify(info));

  await anchorCell(page, 0, 2, 0);
  await setHAlign(page, 0, 'right');
  await setVAlign(page, 0, 'bottom');
  await sleep(250);
  attrs = await cellComputedAlign(page, 0, 2, 0);
  check('MERGED CELL: H right applied (computed)', attrs && attrs.h === 'right', JSON.stringify(attrs));
  check('MERGED CELL: V bottom applied (computed)', attrs && attrs.v === 'bottom', JSON.stringify(attrs));

  // ---------- 5) Borders still intact after alignment ----------
  const bordersAfter = await computedBorders(page, 0);
  const bordersOk = bordersBefore.every((c) => c.top > 0 && c.right > 0 && c.bottom > 0 && c.left > 0)
    && bordersAfter.every((c) => c.top > 0 && c.right > 0 && c.bottom > 0 && c.left > 0);
  check('BORDERS: borders intact before and after alignment', bordersOk, 'before=' + JSON.stringify(bordersBefore) + ' after=' + JSON.stringify(bordersAfter));
  const bAttr = await tableBorderAttr(page, 0);
  check('BORDERS: table data-border-style untouched', bAttr === null, 'attr=' + bAttr);

  // ---------- 6) B/I/U + Text color + Background still intact ----------
  const html00 = await cellHTML(page, 0, 0, 0);
  check('B/I/U: Bold preserved in cell (0,0)', /<\s*b\b/.test(html00), html00);
  const html01 = await cellHTML(page, 0, 0, 1);
  check('B/I/U: Italic preserved in cell (0,1)', /<\s*i\b/.test(html01), html01);
  check('TEXT COLOR: red preserved in cell (0,1)', /color:\s*(#?ff0000|rgb\(\s*255,\s*0,\s*0\))/i.test(html01), html01);
  const html02 = await cellHTML(page, 0, 0, 2);
  check('B/I/U: Underline preserved in cell (0,2)', /<\s*u\b/.test(html02), html02);
  const bg11 = await cellBg(page, 0, 1, 1);
  check('BACKGROUND: cell (1,1) background preserved', /yellow/.test(bg11) || /#ffff00|255,\s*255,\s*0/i.test(bg11), 'bg=' + bg11);

  const texts = await tableCellTexts(page, 0);
  const flat = JSON.stringify(texts);
  check('CONTENT: Arabic/English/Numbers/Mixed intact', flat.includes('مرحبا') && flat.includes('Hello') && flat.includes('12345') && flat.includes('سلام'), 'texts=' + flat);

  // ---------- 7) Auto-save persistence (alignment stored in the data model) ----------
  await sleep(800);
  let notes = await readNotes(page);
  let stored = noteByTitle(notes, title);
  let blk = stored && stored.bodyBlocks && stored.bodyBlocks[0];
  const sa = blk && blk.rows && blk.rows[0] && blk.rows[0][0];
  check('AUTO-SAVE: alignment stored in cell data model', !!(sa && sa.alignH === 'center' && sa.alignV === 'middle'), 'cell0=' + JSON.stringify(sa));
  const sb = blk && blk.rows && blk.rows[2] && blk.rows[2][0];
  check('AUTO-SAVE: merged-cell alignment stored', !!(sb && sb.alignH === 'right' && sb.alignV === 'bottom'), 'merged=' + JSON.stringify(sb));

  // ---------- 8) Close -> Reopen persistence ----------
  await closeEditor(page);
  await sleep(300);
  await openNotes(page);
  await openNoteByTitle(page, title);
  await sleep(300);
  attrs = await cellComputedAlign(page, 0, 0, 0);
  check('REOPEN: H center + V middle restored', attrs && attrs.h === 'center' && attrs.v === 'middle', JSON.stringify(attrs));
  const reopenMerged = await cellComputedAlign(page, 0, 2, 0);
  check('REOPEN: merged H right + V bottom restored', reopenMerged && reopenMerged.h === 'right' && reopenMerged.v === 'bottom', JSON.stringify(reopenMerged));
  const reFmt00 = await cellHTML(page, 0, 0, 0);
  check('REOPEN: Bold preserved', /<\s*b\b/.test(reFmt00), reFmt00);
  const reBg = await cellBg(page, 0, 1, 1);
  check('REOPEN: background preserved', /yellow|#ffff00|255,\s*255,\s*0/i.test(reBg), 'bg=' + reBg);

  // ---------- 9) Refresh persistence ----------
  await closeEditor(page);
  await sleep(300);
  await page.reload({ waitUntil: 'networkidle0', timeout: 20000 });
  await sleep(400);
  await openNotes(page);
  await openNoteByTitle(page, title);
  await sleep(300);
  attrs = await cellComputedAlign(page, 0, 0, 0);
  check('REFRESH: H center + V middle restored', attrs && attrs.h === 'center' && attrs.v === 'middle', JSON.stringify(attrs));
  const refreshRow1 = await allCellAlignAttrs(page, 0);
  check('REFRESH: multi-select alignment restored', refreshRow1[1] && refreshRow1[1].length === 3 && refreshRow1[1].every((a) => a.h === 'center' && a.v === 'middle'), JSON.stringify(refreshRow1[1]));
  const refreshMerged = await cellComputedAlign(page, 0, 2, 0);
  check('REFRESH: merged alignment restored', refreshMerged && refreshMerged.h === 'right' && refreshMerged.v === 'bottom', JSON.stringify(refreshMerged));
  const reFmt01 = await cellHTML(page, 0, 0, 1);
  check('REFRESH: italic + text color preserved', /<\s*i\b/.test(reFmt01) && /color:\s*(#?ff0000|rgb\(\s*255,\s*0,\s*0\))/i.test(reFmt01), reFmt01);
  const refBg = await cellBg(page, 0, 1, 1);
  check('REFRESH: background preserved', /yellow|#ffff00|255,\s*255,\s*0/i.test(refBg), 'bg=' + refBg);
  const refBorders = await computedBorders(page, 0);
  check('REFRESH: borders preserved', refBorders.every((c) => c.top > 0 && c.right > 0 && c.bottom > 0 && c.left > 0), 'cells=' + JSON.stringify(refBorders));

  // ---------- 10) Split still works after alignment ----------
  info = await tableInfo(page, 0);
  if (info[2] && info[2][0] && info[2][0].colspan === 2) {
    await anchorCell(page, 0, 2, 0);
    await sleep(60);
    await clickTableCellAction(page, 0, 'split-cell');
    await sleep(400);
    info = await tableInfo(page, 0);
    const splitOk = info[2] && info[2].length === 3 && info[2].every((c) => c.colspan === 1);
    check('SPLIT: merged cell splits back into individual cells', !!splitOk, 'info=' + JSON.stringify(info));
  } else {
    check('SPLIT: merged cell splits back into individual cells', false, 'merge was not present');
  }

  // ---------- 11) Legacy table compatibility (no alignment fields -> default) ----------
  await closeEditor(page);
  await sleep(300);
  await newNote(page);
  const legacyTitle = 'Legacy No-Alignment Note';
  await page.click('#noteTitleInput');
  await page.type('#noteTitleInput', legacyTitle);
  await page.click('#noteBodyInput');
  await clickTableBtn(page);
  await setTableDims(page, 2, 2, false);
  await typeInCell(page, 0, 0, 0, 'Legacy Cell');
  await sleep(600);
  await closeEditor(page);
  await sleep(300);
  await page.evaluate((key, t) => {
    const notesArr = JSON.parse(localStorage.getItem(key) || '[]');
    const n = notesArr.find((x) => x.title === t);
    if (n && Array.isArray(n.bodyBlocks)) {
      n.bodyBlocks.forEach((b) => {
        if (b && b.type === 'table' && Array.isArray(b.rows)) {
          b.rows.forEach((row) => (Array.isArray(row) ? row : []).forEach((cell) => { delete cell.alignH; delete cell.alignV; }));
        }
      });
    }
    localStorage.setItem(key, JSON.stringify(notesArr));
  }, STORAGE_KEY, legacyTitle);
  await openNotes(page);
  await openNoteByTitle(page, legacyTitle);
  await sleep(300);
  const legAttrs = await allCellAlignAttrs(page, 0);
  const legacyNoAttrs = legAttrs.every((row) => row.every((a) => a.h === null && a.v === null));
  check('LEGACY: no alignment attributes rendered by default', legacyNoAttrs, JSON.stringify(legAttrs));
  const legComp = await cellComputedAlign(page, 0, 0, 0);
  check('LEGACY: default text-align/v-align look (start/top)', (legComp.h === 'start' || legComp.h === 'left') && legComp.v === 'top', JSON.stringify(legComp));
  const legTexts = await tableCellTexts(page, 0);
  check('LEGACY: legacy content preserved', legTexts[0] && legTexts[0][0] === 'Legacy Cell', 'cells=' + JSON.stringify(legTexts));
  await closeEditor(page);
  await sleep(300);

  // ---------- 12) Invalid (non-allow-list) alignment values are normalized safely ----------
  await newNote(page);
  const invTitle = 'Invalid Align Value Note';
  await page.click('#noteTitleInput');
  await page.type('#noteTitleInput', invTitle);
  await page.click('#noteBodyInput');
  await clickTableBtn(page);
  await setTableDims(page, 2, 2, false);
  await typeInCell(page, 0, 0, 0, 'Safe');
  await sleep(700);
  // Tamper the stored alignment fields with non-allow-list values (XSS / arbitrary CSS).
  await page.evaluate((key, t) => {
    const notesArr = JSON.parse(localStorage.getItem(key) || '[]');
    const n = notesArr.find((x) => x.title === t);
    if (n && Array.isArray(n.bodyBlocks)) {
      n.bodyBlocks.forEach((b) => {
        if (b && b.type === 'table' && Array.isArray(b.rows)) {
          b.rows.forEach((row) => (Array.isArray(row) ? row : []).forEach((cell) => {
            cell.alignH = 'javascript:alert(1)';
            cell.alignV = '" onfocus="alert(2)';
          }));
        }
      });
    }
    localStorage.setItem(key, JSON.stringify(notesArr));
  }, STORAGE_KEY, invTitle);
  await closeEditor(page);
  await sleep(300);
  await openNotes(page);
  await openNoteByTitle(page, invTitle);
  await sleep(300);
  const invAttrs = await allCellAlignAttrs(page, 0);
  const invOk = invAttrs.every((row) => row.every((a) => a.h === null && a.v === null));
  check('INVALID: non-allow-list alignment values normalized to safe default', invOk, JSON.stringify(invAttrs));
  const invComputed = await cellComputedAlign(page, 0, 0, 0);
  check('INVALID: renders as default (start/top), no injected CSS', (invComputed.h === 'start' || invComputed.h === 'left') && invComputed.v === 'top', JSON.stringify(invComputed));
  const invTexts = await tableCellTexts(page, 0);
  check('INVALID: cell content preserved through normalization', invTexts[0] && invTexts[0][0] === 'Safe', 'cells=' + JSON.stringify(invTexts));
  await closeEditor(page);
  await sleep(300);

  // ---------- 13) No-op: alignment with no valid cell selected does nothing safely ----------
  await newNote(page);
  const noOpTitle = 'No-Op Alignment Note';
  await page.click('#noteTitleInput');
  await page.type('#noteTitleInput', noOpTitle);
  await page.click('#noteBodyInput');
  await clickTableBtn(page);
  await setTableDims(page, 2, 2, false);
  await sleep(250);
  await page.evaluate(() => { const b = document.getElementById('noteBodyInput'); if (b) b.focus(); });
  await setHAlign(page, 0, 'center');
  await setVAlign(page, 0, 'middle');
  await sleep(200);
  const noOpAttrs = await allCellAlignAttrs(page, 0);
  const noOpOk = noOpAttrs.every((row) => row.every((a) => a.h === null && a.v === null));
  check('NO-OP: alignment with no cell selected does nothing', noOpOk, JSON.stringify(noOpAttrs));
  check('NO-OP: no runtime errors', !pageError, 'errors=' + (pageError || 'none'));
  await closeEditor(page);
  await sleep(300);

  check('RUNTIME: no uncaught page/console errors', !pageError, 'errors=' + (pageError || 'none'));
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
fs.writeFileSync(path.join(HERE, 'alignment_results.txt'), report, 'utf8');
console.log('\n' + report);
process.exit(pass === results.length ? 0 : 1);