// NOTES TABLE BORDERS verification harness (test-only artifact, modifies nothing).
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
const PORT = 8266;
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
async function clickTableCellAction(page, ti, action) {
  await page.evaluate((ti, act) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    const wrap = t.closest('.note-table-wrap');
    const btn = wrap && wrap.querySelector('[data-table-action="' + act + '"]');
    if (btn) btn.click();
    }, ti, action);
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

// Pick a border style via the per-table <select> and fire a real change event.
async function setBorderStyle(page, ti, value) {
  await page.evaluate((ti, value) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    const wrap = t.closest('.note-table-wrap');
    const sel = wrap.querySelector('[data-table-border-select]');
    if (!sel) return false;
    sel.value = value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, ti, value);
}
async function tableBorderAttr(page, ti) {
  return page.evaluate((ti) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    return t ? t.getAttribute('data-border-style') : null;
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
async function tableCellFormats(page, ti) {
  return page.evaluate((ti) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    return Array.from(t.querySelectorAll('tr')).map((tr) =>
      Array.from(tr.querySelectorAll('td, th')).map((td) => {
        const runs = [];
        for (const el of td.querySelectorAll('b, i, u')) {
          const tag = el.tagName;
          for (const txt of el.childNodes) if (txt.nodeType === 3) runs.push(tag + ':' + txt.nodeValue);
        }
        return runs;
      })
    );
  }, ti);
}
async function cellBg(page, ti, r, c) {
  return page.evaluate((ti, r, c) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    const tr = t.querySelectorAll('tr')[r];
    const cell = tr.querySelectorAll('td, th')[c];
    return cell.style.backgroundColor || '';
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
async function computedBorders(page, ti) {
  return page.evaluate((ti) => {
    const t = document.querySelectorAll('table.note-table')[ti];
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
async function tableOutlineBorder(page, ti) {
  return page.evaluate((ti) => {
    const t = document.querySelectorAll('table.note-table')[ti];
        const cs = getComputedStyle(t);
    return parseFloat(cs.borderTopWidth) || 0;
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

  // ---------- 1) CREATE table ----------
  await openNotes(page);
  await newNote(page);
  const title = 'Borders Note';
  await page.click('#noteTitleInput');
  await page.type('#noteTitleInput', title);
  await page.click('#noteBodyInput');
  await clickTableBtn(page);
  await setTableDims(page, 3, 3, false);
  const created = await page.evaluate(() => document.querySelectorAll('table.note-table').length);
  check('CREATE: table inserted', created === 1, 'tables=' + created);

  const hasSelect = await page.evaluate(() => !!document.querySelector('[data-table-border-select]'));
  check('UI: border select control present in table toolbar', hasSelect, '');
  const defaultVal = await page.evaluate(() => document.querySelector('[data-table-border-select]').value);
  check('UI: default border style is "all"', defaultVal === 'all', 'value=' + defaultVal);

  await typeInCell(page, 0, 0, 0, 'Arabic: مرحبا');
  await typeInCell(page, 0, 0, 1, 'English: Hello');
  await typeInCell(page, 0, 0, 2, '12345');
  await typeInCell(page, 0, 1, 0, 'Mixed: سلام hello 99');
  await sleep(400);
  await selectCellWord(page, 0, 0, 0, 'مرحبا');
  await clickFormat(page, 'noteBoldBtn');
  await selectCellWord(page, 0, 0, 1, 'Hello');
  await clickFormat(page, 'noteItalicBtn');
  await selectCellWord(page, 0, 0, 2, '12345');
  await clickFormat(page, 'noteUnderlineBtn');
  await sleep(300);
  // Cell background color on cell (1,1)
  await focusCell(page, 0, 1, 1);
  await page.evaluate(() => {
    const input = document.getElementById('noteCellBgColorInput');
    input.value = '#ffff00';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(300);

  // ---------- 2) Apply All Borders ----------
  await setBorderStyle(page, 0, 'all');
  await sleep(300);
  const attrAll = await tableBorderAttr(page, 0);
  check('ALL BORDERS: renders with default all-borders look (attr null or "all")', attrAll === null || attrAll === 'all', 'attr=' + attrAll);
  const cbAll = await computedBorders(page, 0);
  check('ALL BORDERS: every cell edge has a visible border', cbAll.every((c) => c.top > 0 && c.right > 0 && c.bottom > 0 && c.left > 0), 'borders=' + JSON.stringify(cbAll));

  // ---------- 3) Auto-save ----------
  await sleep(700);
  let notes = await readNotes(page);
  let stored = noteByTitle(notes, title);
  let tblBlock = stored && stored.bodyBlocks && stored.bodyBlocks.find((b) => b.type === 'table');
  check('AUTO-SAVE: table block stored', !!tblBlock, tblBlock ? 'rows=' + tblBlock.rows.length : 'none');
  check('AUTO-SAVE: "all" is the default (borderStyle undefined or "all")', !!tblBlock && (tblBlock.borderStyle === undefined || tblBlock.borderStyle === 'all'), tblBlock ? 'borderStyle=' + tblBlock.borderStyle : 'n/a');

  // Switch to 'outside' and re-save -> persists explicitly.
  await setBorderStyle(page, 0, 'outside');
  await sleep(700);
  notes = await readNotes(page);
  stored = noteByTitle(notes, title);
  tblBlock = stored && stored.bodyBlocks && stored.bodyBlocks.find((b) => b.type === 'table');
    check('AUTO-SAVE: "outside" border style persisted in bodyBlocks', !!tblBlock && tblBlock.borderStyle === 'outside', tblBlock ? 'borderStyle=' + tblBlock.borderStyle : 'n/a');

  // ---------- 4) Close -> Reopen ----------
  await closeEditor(page);
  await sleep(300);
  await openNotes(page);
  await openNoteByTitle(page, title);
  await sleep(300);
  let attrReopen = await tableBorderAttr(page, 0);
  check('REOPEN: outside border style persisted in DOM', attrReopen === 'outside', 'attr=' + attrReopen);
  let cbOutsideReopen = await computedBorders(page, 0);
  let outlineReopen = await tableOutlineBorder(page, 0);
  check('REOPEN: outside borders render (table outline present, inner cell borders removed)',
    outlineReopen > 0 && cbOutsideReopen.every((c) => c.top === 0 && c.right === 0 && c.bottom === 0 && c.left === 0),
    'outline=' + outlineReopen + ' cells=' + JSON.stringify(cbOutsideReopen));
  const textsReopen = await tableCellTexts(page, 0);
  check('REOPEN: cell text preserved', textsReopen[0][0] === 'Arabic: مرحبا' && textsReopen[1][0] === 'Mixed: سلام hello 99', 'cells=' + JSON.stringify(textsReopen));
  const fmtReopen = await tableCellFormats(page, 0);
  check('REOPEN: B/I/U formatting preserved', JSON.stringify(fmtReopen).includes('B:مرحبا') && JSON.stringify(fmtReopen).includes('I:Hello') && JSON.stringify(fmtReopen).includes('U:12345'), 'fmt=' + JSON.stringify(fmtReopen));
  const bgReopen = await cellBg(page, 0, 1, 1);
  check('REOPEN: cell background color preserved', /255,\s*255,\s*0|#ffff00/i.test(bgReopen), 'bg=' + bgReopen);
  await closeEditor(page);
  await sleep(300);

  // ---------- 5) Refresh ----------
  await page.reload({ waitUntil: 'networkidle0', timeout: 20000 });
  await sleep(400);
  await openNotes(page);
  await openNoteByTitle(page, title);
  await sleep(300);
  const attrRefresh = await tableBorderAttr(page, 0);
  check('REFRESH: outside border style persisted', attrRefresh === 'outside', 'attr=' + attrRefresh);
  const textsRefresh = await tableCellTexts(page, 0);
  check('REFRESH: cell text preserved', textsRefresh[0][1] === 'English: Hello' && textsRefresh[0][2] === '12345', 'cells=' + JSON.stringify(textsRefresh));
  const bgRefresh = await cellBg(page, 0, 1, 1);
    check('REFRESH: cell background color preserved', /255,\s*255,\s*0|#ffff00/i.test(bgRefresh), 'bg=' + bgRefresh);

  // ---------- 9) Apply Outside Borders ----------
  await setBorderStyle(page, 0, 'all');
  await sleep(200);
  await setBorderStyle(page, 0, 'outside');
  await sleep(300);
  const attrOutside2 = await tableBorderAttr(page, 0);
  check('OUTSIDE BORDERS: attribute set to outside', attrOutside2 === 'outside', 'attr=' + attrOutside2);

  // ---------- 10) Apply No Borders ----------
  await setBorderStyle(page, 0, 'none');
  await sleep(300);
  const attrNone = await tableBorderAttr(page, 0);
  check('NO BORDERS: attribute set to none', attrNone === 'none', 'attr=' + attrNone);
  const cbNone = await computedBorders(page, 0);
  const outlineNone = await tableOutlineBorder(page, 0);
  check('NO BORDERS: no visible borders anywhere', outlineNone === 0 && cbNone.every((c) => c.top === 0 && c.right === 0 && c.bottom === 0 && c.left === 0), 'outline=' + outlineNone + ' cells=' + JSON.stringify(cbNone));

  // ---------- 11) Apply Inside Borders ----------
  await setBorderStyle(page, 0, 'inside');
  await sleep(300);
  const attrInside = await tableBorderAttr(page, 0);
  check('INSIDE BORDERS: attribute set to inside', attrInside === 'inside', 'attr=' + attrInside);
  const outlineInside = await tableOutlineBorder(page, 0);
  const cbInside = await computedBorders(page, 0);
  const middleCellHasAllEdges = cbInside[4] && cbInside[4].top > 0 && cbInside[4].left > 0; // center cell of 3x3
  const cornerCellMissingOuterEdges = cbInside[0] && cbInside[0].top === 0 && cbInside[0].left === 0;
  check('INSIDE BORDERS: table has no outer border', outlineInside === 0, 'outline=' + outlineInside);
    check('INSIDE BORDERS: interior grid lines present, outer edges absent', !!middleCellHasAllEdges && !!cornerCellMissingOuterEdges, 'cells=' + JSON.stringify(cbInside));

  // ---------- 12-15) Verify text/format/color remain unchanged after border churn ----------
  const textsAfterBorders = await tableCellTexts(page, 0);
  check('POST-BORDERS: text unchanged (Arabic/English/numbers/mixed)',
    textsAfterBorders[0][0] === 'Arabic: مرحبا' && textsAfterBorders[0][1] === 'English: Hello' && textsAfterBorders[0][2] === '12345' && textsAfterBorders[1][0] === 'Mixed: سلام hello 99',
    'cells=' + JSON.stringify(textsAfterBorders));
  const fmtAfterBorders = await tableCellFormats(page, 0);
  check('POST-BORDERS: B/I/U unchanged', JSON.stringify(fmtAfterBorders).includes('B:مرحبا') && JSON.stringify(fmtAfterBorders).includes('I:Hello') && JSON.stringify(fmtAfterBorders).includes('U:12345'), 'fmt=' + JSON.stringify(fmtAfterBorders));
  const bgAfterBorders = await cellBg(page, 0, 1, 1);
    check('POST-BORDERS: cell background color unchanged', /255,\s*255,\s*0|#ffff00/i.test(bgAfterBorders), 'bg=' + bgAfterBorders);

  // ---------- 16) Merge cells still works with borders ----------
  await setBorderStyle(page, 0, 'all');
  await sleep(200);
  anchorCell(page, 0, 0, 0);
  await sleep(100);
  await shiftClickCell(page, 0, 0, 1);
  await sleep(100);
  await clickTableCellAction(page, 0, 'merge-cells');
  await sleep(500);
  let info = await tableInfo(page, 0);
  const mergedOk = info && info[0] && info[0][0] && info[0][0].colspan === 2;
  check('MERGE: merge still works while a border style is applied', !!mergedOk, 'info=' + JSON.stringify(info));
  const cbAfterMerge = await computedBorders(page, 0);
    check('MERGE: borders still render around merged cell', cbAfterMerge[0] && cbAfterMerge[0].top > 0, 'cells=' + JSON.stringify(cbAfterMerge));

  // ---------- 17) Split cell still works with borders ----------
  await focusCell(page, 0, 0, 0);
  await sleep(200);
  await clickTableCellAction(page, 0, 'split-cell');
  await sleep(500);
  info = await tableInfo(page, 0);
  const splitOk = info && info[0] && info[0].length === 3 && info[0].every((c) => c.colspan === 1);
  check('SPLIT: split still works while a border style is applied', !!splitOk, 'info=' + JSON.stringify(info));
  const cbAfterSplit = await computedBorders(page, 0);
  check('SPLIT: borders still render after split', cbAfterSplit.every((c) => c.top > 0), 'cells=' + JSON.stringify(cbAfterSplit));

  // ---------- 18) Arabic/English/numbers/mixed content intact after all border churn ----------
  const finalTexts = await tableCellTexts(page, 0);
  check('FINAL: Arabic/English/Numbers/Mixed content intact', JSON.stringify(finalTexts).includes('مرحبا') && JSON.stringify(finalTexts).includes('Hello') && JSON.stringify(finalTexts).includes('12345') && JSON.stringify(finalTexts).includes('سلام'), 'texts=' + JSON.stringify(finalTexts));

  await closeEditor(page);
  await sleep(300);

  // ---------- 19) Legacy tables without border metadata still work ----------
  await openNotes(page);
  await newNote(page);
  const legacyTitle = 'Legacy No-Border-Metadata Note';
  await page.click('#noteTitleInput');
  await page.type('#noteTitleInput', legacyTitle);
  await page.click('#noteBodyInput');
  await clickTableBtn(page);
  await setTableDims(page, 2, 2, false);
  await typeInCell(page, 0, 0, 0, 'Legacy Cell');
  await sleep(600);
  await closeEditor(page);
  await sleep(300);
  // Simulate a truly legacy stored note: strip any borderStyle field entirely.
  await page.evaluate((key, t) => {
    const notes = JSON.parse(localStorage.getItem(key) || '[]');
    const n = notes.find((x) => x.title === t);
    if (n && Array.isArray(n.bodyBlocks)) {
      n.bodyBlocks.forEach((b) => { if (b && b.type === 'table') delete b.borderStyle; });
    }
    localStorage.setItem(key, JSON.stringify(notes));
  }, STORAGE_KEY, legacyTitle);
  await openNotes(page);
  await openNoteByTitle(page, legacyTitle);
  await sleep(300);
  const legacyAttr = await tableBorderAttr(page, 0);
  check('LEGACY: table without borderStyle renders with no data-border-style attribute', legacyAttr === null, 'attr=' + legacyAttr);
  const legacyBorders = await computedBorders(page, 0);
  check('LEGACY: table without border metadata still shows default all-borders look', legacyBorders.every((c) => c.top > 0 && c.right > 0 && c.bottom > 0 && c.left > 0), 'cells=' + JSON.stringify(legacyBorders));
  const legacyTexts = await tableCellTexts(page, 0);
  check('LEGACY: legacy table content preserved', legacyTexts[0][0] === 'Legacy Cell', 'cells=' + JSON.stringify(legacyTexts));
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
fs.writeFileSync(path.join(HERE, 'borders_results.txt'), report, 'utf8');
console.log('\n' + report);
process.exit(pass === results.length ? 0 : 1);
