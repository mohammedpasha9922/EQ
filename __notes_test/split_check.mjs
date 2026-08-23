// NOTES SPLIT CELL verification harness (test-only artifact, modifies nothing).
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
const PORT = 8257;
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
async function tableInfo(page, ti) {
  return page.evaluate((ti) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    if (!t) return null;
    return Array.from(t.querySelectorAll('tr')).map((tr) =>
      Array.from(tr.querySelectorAll('td, th')).map((td) => ({
        text: td.innerText.replace(/\u00a0/g, ' '),
        colspan: td.colSpan || 1,
        rowspan: td.rowSpan || 1
      }))
    );
  }, ti);
}
async function allCellFormats(page, ti) {
  return page.evaluate((ti) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    const out = [];
    Array.from(t.querySelectorAll('tr')).forEach((tr) => {
      Array.from(tr.querySelectorAll('td, th')).forEach((td) => {
        const runs = [];
        for (const el of td.querySelectorAll('b, i, u')) {
          const tag = el.tagName;
          for (const txt of el.childNodes) if (txt.nodeType === 3) runs.push(tag + ':' + txt.nodeValue);
        }
        out.push(runs.join(','));
      });
    });
    return out;
  }, ti);
}
async function splitBtnHidden(page, ti) {
  return page.evaluate((ti) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    const wrap = t && t.closest('.note-table-wrap');
    const btn = wrap && wrap.querySelector('[data-table-action="split-cell"]');
    if (!btn) return null;
    return { hidden: !!btn.hidden, label: btn.textContent.trim() };
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

  // ============ TEST A: 2x2 full merge -> split, content+formatting preserved ============
  await openNotes(page);
  await newNote(page);
  const titleA = 'Split 2x2';
  await page.click('#noteTitleInput');
  await page.type('#noteTitleInput', titleA);
  await page.click('#noteBodyInput');
  await clickTableBtn(page);
  await setTableDims(page, 2, 2, false);
  await sleep(300);
  await typeInCell(page, 0, 0, 0, 'A1 مرحبا');
  await typeInCell(page, 0, 0, 1, 'Hello 2');
  await typeInCell(page, 0, 1, 0, 'عربي 3');
  await typeInCell(page, 0, 1, 1, 'Mixed سلام 4');
  await sleep(300);
  await selectCellWord(page, 0, 0, 0, 'مرحبا');
  await clickFormat(page, 'noteBoldBtn');
  await selectCellWord(page, 0, 1, 1, 'سلام');
  await clickFormat(page, 'noteItalicBtn');
  await sleep(300);

  // 2x2 merge (anchor 0,0 -> shift 1,1)
  anchorCell(page, 0, 0, 0);
  shiftClickCell(page, 0, 1, 1);
  await sleep(150);
  await clickTableCellAction(page, 0, 'merge-cells');
  await sleep(800);
  let info = await tableInfo(page, 0);
  check('2x2 MERGE: produced one merged cell (colspan=2,rowspan=2)',
    info && info[0] && info[0].length === 1 && info[0][0].colspan === 2 && info[0][0].rowspan === 2,
    'info=' + JSON.stringify(info));

  // Select the merged cell -> Split Cell control should appear
  anchorCell(page, 0, 0, 0);
  await sleep(150);
  let sb = await splitBtnHidden(page, 0);
  check('2x2: Split Cell visible when merged cell is selected',
    !!sb && sb.hidden === false && sb.label === 'Split Cell', JSON.stringify(sb));

  // Split
  await clickTableCellAction(page, 0, 'split-cell');
  await sleep(800);
  info = await tableInfo(page, 0);
  const noSpans = info && info.every((row) => row.every((c) => c.colspan === 1 && c.rowspan === 1));
  check('2x2 SPLIT: table back to 2 rows x 2 cols, no spans',
    info && info.length === 2 && info[0].length === 2 && info[1].length === 2 && noSpans,
    'info=' + JSON.stringify(info));
  const mergedText = info ? info[0][0].text : '';
  check('2x2 SPLIT: merged content preserved in anchor cell (all 4 texts)',
    mergedText.includes('A1 مرحبا') && mergedText.includes('Hello 2') && mergedText.includes('عربي 3') && mergedText.includes('Mixed سلام 4'),
    'anchorText=' + JSON.stringify(mergedText));
  const fmtsA = await allCellFormats(page, 0);
  check('2x2 SPLIT: Bold preserved', JSON.stringify(fmtsA).includes('B:مرحبا'), 'fmt=' + JSON.stringify(fmtsA));
  check('2x2 SPLIT: Italic preserved', JSON.stringify(fmtsA).includes('I:سلام'), 'fmt=' + JSON.stringify(fmtsA));
// Auto-save persistence -> stored bodyBlocks have no spans
  const storedA = noteByTitle(await readNotes(page), titleA);
  const tblA = storedA && storedA.bodyBlocks && storedA.bodyBlocks.find((b) => b.type === 'table');
  const storedSpans = tblA ? tblA.rows.some((row) => row.some((c) => (c.colspan && c.colspan > 1) || (c.rowSpan && c.rowSpan > 1))) : true;
  check('2x2 SPLIT: AUTO-SAVE stored structure has no spans', !!tblA && !storedSpans, 'rows=' + JSON.stringify(tblA && tblA.rows));

  // Close -> Reopen -> still split
  await closeEditor(page);
  await sleep(300);
  await openNoteByTitle(page, titleA);
  await sleep(300);
  info = await tableInfo(page, 0);
  const reopenNoSpans = info && info.length === 2 && info[0].length === 2 && info.every((row) => row.every((c) => c.colspan === 1 && c.rowspan === 1));
  check('2x2 SPLIT: REOPEN still split (2x2, no spans)', !!reopenNoSpans, 'info=' + JSON.stringify(info));
  sb = await splitBtnHidden(page, 0);
  check('2x2 SPLIT: control hidden on reopen (no merged cell selected)', !!sb && sb.hidden === true, JSON.stringify(sb));
  await closeEditor(page);
  await sleep(300);
  await closeNotesManager(page);
  await sleep(200);

  // Refresh -> persistence
  await page.reload({ waitUntil: 'networkidle0', timeout: 20000 });
  await sleep(400);
  await openNotes(page);
  await openNoteByTitle(page, titleA);
  await sleep(300);
  info = await tableInfo(page, 0);
  const refreshNoSpans = info && info.length === 2 && info[0].length === 2 && info.every((row) => row.every((c) => c.colspan === 1 && c.rowspan === 1));
  check('2x2 SPLIT: REFRESH still split (2x2, no spans)', !!refreshNoSpans, 'info=' + JSON.stringify(info));
  await closeEditor(page);
  await sleep(200);

  // ============ TEST B: Horizontal merged cell -> split ============
  await newNote(page);
  const titleB = 'Split Horizontal';
  await page.click('#noteTitleInput');
  await page.type('#noteTitleInput', titleB);
  await page.click('#noteBodyInput');
  await clickTableBtn(page);
  await setTableDims(page, 2, 2, false);
  await sleep(300);
  await typeInCell(page, 0, 0, 0, 'Arabic مرحبا');
  await typeInCell(page, 0, 0, 1, 'English Hello');
  await sleep(300);
  anchorCell(page, 0, 0, 0);
  shiftClickCell(page, 0, 0, 1);
  await sleep(150);
  await clickTableCellAction(page, 0, 'merge-cells');
  await sleep(800);
  info = await tableInfo(page, 0);
  check('HORIZONTAL MERGE: row0 colspan=2, row1 unaffected (2 cells)',
    info && info[0] && info[0].length === 1 && info[0][0].colspan === 2 && info[1] && info[1].length === 2,
    'info=' + JSON.stringify(info));
  anchorCell(page, 0, 0, 0);
  await sleep(150);
  await clickTableCellAction(page, 0, 'split-cell');
  await sleep(800);
  info = await tableInfo(page, 0);
  const hNoSpans = info && info.length === 2 && info[0].length === 2 && info[1].length === 2 &&
    info.every((row) => row.every((c) => c.colspan === 1 && c.rowspan === 1));
  check('HORIZONTAL SPLIT: back to 2 cols in row0, row1 unchanged',
    !!hNoSpans && info[0].map((c) => c.text).join('|').includes('Arabic مرحبا'),
    'info=' + JSON.stringify(info));
  check('HORIZONTAL SPLIT: both texts preserved', info[0][0].text.includes('Arabic مرحبا') && info[0][0].text.includes('English Hello'),
    'text=' + JSON.stringify(info[0][0].text));
  check('HORIZONTAL SPLIT: row1 text unaffected', info[1][0].text === '' && info[1][1].text === '', 'row1=' + JSON.stringify(info[1]));
  await closeEditor(page);
  await sleep(200);

  // ============ TEST C: Vertical merged cell -> split ============
  await newNote(page);
  const titleC = 'Split Vertical';
  await page.click('#noteTitleInput');
  await page.type('#noteTitleInput', titleC);
  await page.click('#noteBodyInput');
  await clickTableBtn(page);
  await setTableDims(page, 2, 2, false);
  await sleep(300);
  await typeInCell(page, 0, 0, 0, '12345');
  await typeInCell(page, 0, 1, 0, 'Mixed سلام 99');
  await sleep(300);
  anchorCell(page, 0, 0, 0);
  shiftClickCell(page, 0, 1, 0);
  await sleep(150);
  await clickTableCellAction(page, 0, 'merge-cells');
  await sleep(800);
  info = await tableInfo(page, 0);
  check('VERTICAL MERGE: col0 rowspan=2, row1=1 cell',
    info && info[0] && info[0][0].rowspan === 2 && info[1] && info[1].length === 1, 'info=' + JSON.stringify(info));
  anchorCell(page, 0, 0, 0);
  await sleep(150);
  await clickTableCellAction(page, 0, 'split-cell');
  await sleep(800);
  info = await tableInfo(page, 0);
  const vNoSpans = info && info.length === 2 && info[0].length === 2 && info[1].length === 2 &&
    info.every((row) => row.every((c) => c.colspan === 1 && c.rowspan === 1));
  check('VERTICAL SPLIT: back to 2 rows in col0, col1 restored',
    !!vNoSpans, 'info=' + JSON.stringify(info));
  check('VERTICAL SPLIT: numbers + mixed preserved', info[0][0].text.includes('12345') && info[0][0].text.includes('Mixed سلام 99'),
    'text=' + JSON.stringify(info[0][0].text));
  await closeEditor(page);
  await sleep(200);
// ============ TEST D: Invalid - split on a non-merged cell ============
  await newNote(page);
  const titleD = 'Split Invalid';
  await page.click('#noteTitleInput');
  await page.type('#noteTitleInput', titleD);
  await page.click('#noteBodyInput');
  await clickTableBtn(page);
  await setTableDims(page, 2, 2, false);
  await sleep(300);
  await typeInCell(page, 0, 0, 0, 'not merged');
  await sleep(300);
  anchorCell(page, 0, 0, 0);
  await sleep(150);
  sb = await splitBtnHidden(page, 0);
  check('INVALID: Split control hidden for a non-merged cell', !!sb && sb.hidden === true, JSON.stringify(sb));
  anchorCell(page, 0, 0, 0);
  await sleep(100);
  await clickTableCellAction(page, 0, 'split-cell');
  await sleep(500);
  info = await tableInfo(page, 0);
  check('INVALID: table unchanged (still 2x2, no spans)',
    info && info.length === 2 && info[0].length === 2 && info[1].length === 2 &&
    info.every((row) => row.every((c) => c.colspan === 1 && c.rowspan === 1)),
    'info=' + JSON.stringify(info));
  check('INVALID: content unchanged', info[0][0].text === 'not merged', 'text=' + JSON.stringify(info[0][0].text));
  const toastD = await page.evaluate(() => { const t = document.getElementById('toast'); return t ? t.textContent : ''; });
  check('INVALID: a clear message is shown', String(toastD).length > 0, 'toast=' + JSON.stringify(toastD));
  const storedD = noteByTitle(await readNotes(page), titleD);
  const tblD = storedD && storedD.bodyBlocks && storedD.bodyBlocks.find((b) => b.type === 'table');
  check('INVALID: storage unchanged (no spans)', !!tblD && tblD.rows.every((row) => row.every((c) => !c.colspan && !c.rowSpan)),
    'rows=' + JSON.stringify(tblD && tblD.rows));
  await closeEditor(page);
  await sleep(200);

  // ============ TEST E: content built from a previous merge -> split ============
  await newNote(page);
  const titleE = 'Split ReMerge';
  await page.click('#noteTitleInput');
  await page.type('#noteTitleInput', titleE);
  await page.click('#noteBodyInput');
  await clickTableBtn(page);
  await setTableDims(page, 2, 2, false);
  await sleep(300);
  await typeInCell(page, 0, 0, 0, 'AA');
  await typeInCell(page, 0, 0, 1, 'BB');
  await sleep(300);
  anchorCell(page, 0, 0, 0);
  shiftClickCell(page, 0, 0, 1);
  await sleep(150);
  await clickTableCellAction(page, 0, 'merge-cells');
  await sleep(700);
  info = await tableInfo(page, 0);
  check('REMERGE: first horizontal merge produced colspan=2', info && info[0][0].colspan === 2, 'info=' + JSON.stringify(info));
  anchorCell(page, 0, 0, 0);
  await sleep(150);
  await clickTableCellAction(page, 0, 'split-cell');
  await sleep(700);
  info = await tableInfo(page, 0);
  check('REMERGE SPLIT: back to 2x2, no spans', info && info[0].length === 2 && info[1].length === 2 &&
    info.every((row) => row.every((c) => c.colspan === 1 && c.rowspan === 1)), 'info=' + JSON.stringify(info));
  check('REMERGE SPLIT: merged content preserved', info[0][0].text.includes('AA') && info[0][0].text.includes('BB'),
    'text=' + JSON.stringify(info[0][0].text));
  await closeEditor(page);
  await sleep(200);

  // ============ TEST F: Backward compatibility ============
  const storedF = noteByTitle(await readNotes(page), titleD);
  check('BACKWARD: plain table (no spans) still works',
    !!storedF && !!storedF.bodyBlocks && storedF.bodyBlocks.some((b) => b.type === 'table'),
    'hasBlocks=' + !!(storedF && storedF.bodyBlocks));

  const fatal = pageError ? pageError.split('\n').filter((l) => l).join(' ') : '';
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
console.log('\n==== RESULT: ' + pass + ' passed, ' + fail + ' failed, ' + results.length + ' total ====');
if (pageError) {
  results.push({ name: 'RUNTIME: no uncaught page/console errors', ok: false, detail: pageError.split('\n').filter(Boolean).slice(0, 5).join(' | ') });
} else {
  results.push({ name: 'RUNTIME: no uncaught page/console errors', ok: true, detail: 'clean' });
}
const pass2 = results.filter((r) => r.ok).length;
const fail2 = results.length - pass2;
const lines = results.map((r) => `${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  -> ' + r.detail : ''}`).join('\n');
const report = [lines, '', '==== RESULT: ' + pass2 + ' passed, ' + fail2 + ' failed, ' + results.length + ' total ====', '', 'FINAL: ' + pass2 + '/' + results.length + ' passed'].join('\n') + '\n';
fs.writeFileSync(path.join(HERE, 'split_results.txt'), report, 'utf8');
console.log('\n' + report);
process.exit(pass2 === results.length ? 0 : 1);
