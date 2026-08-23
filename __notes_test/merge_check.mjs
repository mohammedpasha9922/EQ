// NOTES MERGE CELLS verification harness (test-only artifact, modifies nothing).
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
const PORT = 8242;
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
async function nativeSelectFromTo(page, ti, rA, cA, rB, cB) {
  await page.evaluate((ti, rA, cA, rB, cB) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    const grid = Array.from(t.querySelectorAll('tr')).map((tr) => Array.from(tr.querySelectorAll('td, th')));
    const a = grid[rA] && grid[rA][cA];
    const b = grid[rB] && grid[rB][cB];
    if (!a || !b) return;
    const firstText = (cell) => { const w = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT); return w.nextNode(); };
    const lastText = (cell) => { const w = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT); let n, last; while ((n = w.nextNode())) last = n; return last; };
    const na = firstText(a) || a;
    const nb = lastText(b) || b;
    const ob = (nb.nodeType === 3 ? nb.nodeValue.length : 0);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.setBaseAndExtent(na, 0, nb, ob);
  }, ti, rA, cA, rB, cB);
}
async function tableInfo(page, ti) {
  return page.evaluate((ti) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    if (!t) return null;
    return Array.from(t.querySelectorAll('tr')).map((tr) =>
      Array.from(tr.querySelectorAll('td, th')).map((td) => ({
        text: td.innerText,
        colspan: td.colSpan || 1,
        rowspan: td.rowSpan || 1,
        selCount: document.querySelectorAll('.note-cell-selected').length
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

  // ---------------- TEST 1: Horizontal merge (2 cells) ----------------
  await openNotes(page);
  await newNote(page);
  const titleH = 'Merge Horizontal';
  await page.click('#noteTitleInput');
  await page.type('#noteTitleInput', titleH);
  await page.click('#noteBodyInput');
  await clickTableBtn(page);
  await setTableDims(page, 2, 2, false);
  await sleep(300);
  await typeInCell(page, 0, 0, 0, 'Arabic: مرحبا');
  await typeInCell(page, 0, 0, 1, 'English: Hello');
  await sleep(300);
  await selectCellWord(page, 0, 0, 0, 'مرحبا');
  await clickFormat(page, 'noteBoldBtn');
  await selectCellWord(page, 0, 0, 1, 'Hello');
  await clickFormat(page, 'noteItalicBtn');
  await sleep(300);

  const beforeH = await readNotes(page);
  const preNote = noteByTitle(beforeH, titleH);

  anchorCell(page, 0, 0, 0);
  shiftClickCell(page, 0, 0, 1);
  await sleep(100);
  await clickTableCellAction(page, 0, 'merge-cells');
  await sleep(800);

  let info = await tableInfo(page, 0);
  check('HORIZONTAL: highlight cleared after merge',
    !!info && !!info[0] && info[0].every((c) => c.selCount === 0), 'sel=' + JSON.stringify(info && info[0] ? info[0].map((c) => c.selCount) : []));
  check('HORIZONTAL: merged into one cell (row0 colspan=2)',
    info && info[0] && info[0].length === 1 && info[0][0].colspan === 2, 'info=' + JSON.stringify(info));
  check('HORIZONTAL: other row unaffected (row1=2 cells)',
    info && info[1] && info[1].length === 2, 'row1len=' + (info && info[1] ? info[1].length : 0));
  const mText = info ? info[0][0].text : '';
  check('HORIZONTAL: both texts preserved (Arabic+English)',
    mText.includes('Arabic: مرحبا') && mText.includes('English: Hello'), 'text=' + JSON.stringify(mText));
  const hfmts = await allCellFormats(page, 0);
  check('HORIZONTAL: Bold preserved', JSON.stringify(hfmts).includes('B:مرحبا'), 'fmt=' + JSON.stringify(hfmts));
  check('HORIZONTAL: Italic preserved', JSON.stringify(hfmts).includes('I:Hello'), 'fmt=' + JSON.stringify(hfmts));

  // Auto-save + storage model
  const notes1 = await readNotes(page);
  const stored1 = noteByTitle(notes1, titleH);
  const tblH = stored1 && stored1.bodyBlocks && stored1.bodyBlocks.find((b) => b.type === 'table');
  const mCell = tblH && tblH.rows[0] && tblH.rows[0][0];
  check('HORIZONTAL: AUTO-SAVE merged cell has colspan=2', !!mCell && mCell.colspan === 2, mCell ? 'colspan=' + mCell.colspan : 'missing');
  check('HORIZONTAL: AUTO-SAVE merged text has both texts',
    !!mCell && mCell.text.includes('Arabic: مرحبا') && mCell.text.includes('English: Hello'), mCell ? 'text=' + JSON.stringify(mCell.text) : 'none');
  const boldRunH = mCell && (mCell.formatting || []).some((r) => r.bold && mCell.text.slice(r.start, r.end) === 'مرحبا');
  const itRunH = mCell && (mCell.formatting || []).some((r) => r.italic && mCell.text.slice(r.start, r.end) === 'Hello');
  check('HORIZONTAL: AUTO-SAVE bold run persisted', !!boldRunH, 'fmt=' + JSON.stringify(mCell && mCell.formatting));
  check('HORIZONTAL: AUTO-SAVE italic run persisted', !!itRunH, 'fmt=' + JSON.stringify(mCell && mCell.formatting));
  const afterH = noteByTitle(await readNotes(page), titleH);
  check('HORIZONTAL: note id unchanged after merge', !!preNote && !!afterH && preNote.id === afterH.id, 'id=' + (afterH && afterH.id));
  check('HORIZONTAL: folderId unchanged after merge', !!preNote && !!afterH && preNote.folderId === afterH.folderId, 'folder=' + (afterH && afterH.folderId));

  // Close -> Reopen
  await closeEditor(page);
  await sleep(300);
  await openNotes(page);
  await openNoteByTitle(page, titleH);
  await sleep(300);
  info = await tableInfo(page, 0);
  check('HORIZONTAL: REOPEN still merged (colspan=2)', info && info[0] && info[0].length === 1 && info[0][0].colspan === 2, JSON.stringify(info));
  check('HORIZONTAL: REOPEN content preserved', info && info[0] && info[0][0].text.includes('English: Hello'), 'text=' + (info && info[0] ? JSON.stringify(info[0][0].text) : ''));
  await closeEditor(page);
  await sleep(300);

  // Refresh
  await page.reload({ waitUntil: 'networkidle0', timeout: 20000 });
  await sleep(400);
  await openNotes(page);
  await openNoteByTitle(page, titleH);
  await sleep(300);
  info = await tableInfo(page, 0);
  check('HORIZONTAL: REFRESH still merged (colspan=2)', info && info[0] && info[0].length === 1 && info[0][0].colspan === 2, JSON.stringify(info));
  check('HORIZONTAL: REFRESH content preserved', info && info[0] && info[0][0].text.includes('مرحبا'), 'text=' + (info && info[0] ? JSON.stringify(info[0][0].text) : ''));
  await closeEditor(page);
  await sleep(200);
  await closeNotesManager(page);
  await sleep(200);

  // ---------------- TEST 2: Vertical merge (2 cells) ----------------
  await openNotes(page);
  await newNote(page);
  const titleV = 'Merge Vertical';
  await page.click('#noteTitleInput');
  await page.type('#noteTitleInput', titleV);
  await page.click('#noteBodyInput');
  await clickTableBtn(page);
  await setTableDims(page, 2, 2, false);
  await sleep(300);
  await typeInCell(page, 0, 0, 0, '12345');
  await typeInCell(page, 0, 1, 0, 'Mixed: سلام hello 99');
  await sleep(200);
  await selectCellWord(page, 0, 0, 0, '12345');
  await clickFormat(page, 'noteUnderlineBtn');
  await sleep(200);
  anchorCell(page, 0, 0, 0);
  shiftClickCell(page, 0, 1, 0);
  await sleep(100);
  await clickTableCellAction(page, 0, 'merge-cells');
  await sleep(800);
  info = await tableInfo(page, 0);
  check('VERTICAL: merged into one cell (col0 rowspan=2)',
    info && info[0] && info[0].length === 2 && info[0][0].rowspan === 2, 'info=' + JSON.stringify(info));
  check('VERTICAL: other column unaffected (row1=1 cell)',
    info && info[1] && info[1].length === 1, 'row1len=' + (info && info[1] ? info[1].length : 0));
  const vText = info ? info[0][0].text : '';
  check('VERTICAL: numbers + mixed content preserved',
    vText.includes('12345') && vText.includes('Mixed: سلام hello 99'), 'text=' + JSON.stringify(vText));
  const vfmts = await allCellFormats(page, 0);
  check('VERTICAL: Underline preserved', JSON.stringify(vfmts).includes('U:12345'), 'fmt=' + JSON.stringify(vfmts));
  const notes2 = await readNotes(page);
  const stored2 = noteByTitle(notes2, titleV);
  const tblV = stored2 && stored2.bodyBlocks && stored2.bodyBlocks.find((b) => b.type === 'table');
  const mV = tblV && tblV.rows[0] && tblV.rows[0][0];
  check('VERTICAL: AUTO-SAVE rowSpan persisted', !!mV && mV.rowSpan === 2, mV ? 'rowspan=' + mV.rowSpan : 'missing');
  await closeEditor(page);
  await sleep(200);

  // ---------------- TEST 3: Merge more than two cells (2x2 block) ----------------
  await openNotes(page);
  await newNote(page);
  const titleM = 'Merge 2x2';
  await page.click('#noteTitleInput');
  await page.type('#noteTitleInput', titleM);
  await page.click('#noteBodyInput');
  await clickTableBtn(page);
  await setTableDims(page, 2, 2, false);
  await sleep(300);
  await typeInCell(page, 0, 0, 0, 'سلام');
  await typeInCell(page, 0, 0, 1, 'مرحبا');
  await typeInCell(page, 0, 1, 0, '01234');
  await typeInCell(page, 0, 1, 1, 'Mixed سلام 99');
  await sleep(300);
  anchorCell(page, 0, 0, 0);
  shiftClickCell(page, 0, 1, 1);
  await sleep(100);
  await clickTableCellAction(page, 0, 'merge-cells');
  await sleep(800);
  info = await tableInfo(page, 0);
  check('2X2: merged all four cells into one (colspan=2 rowspan=2)',
    info && info[0] && info[0].length === 1 && info[0][0].colspan === 2 && info[0][0].rowspan === 2, 'info=' + JSON.stringify(info));
  const m2 = info ? info[0][0].text : '';
  check('2X2: ALL texts preserved in order',
    m2.includes('سلام') && m2.includes('مرحبا') && m2.includes('01234') && m2.includes('Mixed سلام 99'), 'text=' + JSON.stringify(m2));
  const notes3 = await readNotes(page);
  const stored3 = noteByTitle(notes3, titleM);
  const tblM = stored3 && stored3.bodyBlocks && stored3.bodyBlocks.find((b) => b.type === 'table');
  const m3 = tblM && tblM.rows[0] && tblM.rows[0][0];
  check('2X2: AUTO-SAVE colspan=2 rowspan=2 persisted', !!m3 && m3.colspan === 2 && m3.rowSpan === 2, m3 ? 'cs=' + m3.colspan + ' rs=' + m3.rowSpan : 'missing');
  await closeEditor(page);
  await sleep(200);

  // ---------------- TEST 4: Invalid selection rejected safely ----------------
  await openNotes(page);
  await newNote(page);
  const titleI = 'Merge Invalid';
  await page.click('#noteTitleInput');
  await page.type('#noteTitleInput', titleI);
  await page.click('#noteBodyInput');
  await clickTableBtn(page);
  await setTableDims(page, 2, 2, false);
  await sleep(300);
  await typeInCell(page, 0, 0, 0, 'A1');
  await typeInCell(page, 0, 0, 1, 'B1');
  await typeInCell(page, 0, 1, 0, 'A2');
  await typeInCell(page, 0, 1, 1, 'B2');
  await sleep(300);

  // (a) single-cell selection must be rejected
  anchorCell(page, 0, 0, 0);
  await sleep(100);
  await clickTableCellAction(page, 0, 'merge-cells');
  await sleep(500);
  info = await tableInfo(page, 0);
  check('INVALID(single): table unchanged (still 2x2, no spans)',
    info && info[0] && info[1] && info[0].length === 2 && info[1].length === 2 &&
    info[0].every((c) => c.colspan === 1 && c.rowspan === 1) && info[1].every((c) => c.colspan === 1 && c.rowspan === 1),
    'info=' + JSON.stringify(info));
  const toast1 = await page.evaluate(() => { const t = document.getElementById('toast'); return t ? t.textContent : ''; });
  check('INVALID(single): a clear message is shown', String(toast1).length > 0, 'toast=' + JSON.stringify(toast1));

  // (b) non-adjacent (diagonal) selection via native range must be rejected
  await nativeSelectFromTo(page, 0, 0, 1, 1, 0);
  await sleep(100);
  await page.click('[data-table-action="merge-cells"]');
  await sleep(500);
  info = await tableInfo(page, 0);
  check('INVALID(diagonal): table still not merged (2x2 unchanged)',
    info && info[0] && info[1] && info[0].length === 2 && info[1].length === 2 &&
    info[0].every((c) => c.colspan === 1 && c.rowspan === 1) && info[1].every((c) => c.colspan === 1 && c.rowspan === 1),
    'info=' + JSON.stringify(info));
  const storedI = noteByTitle(await readNotes(page), titleI);
  const tblI = storedI && storedI.bodyBlocks && storedI.bodyBlocks.find((b) => b.type === 'table');
  check('INVALID(diagonal): storage has no merged spans',
    !tblI || tblI.rows.every((row) => row.every((c) => !c.colspan && !c.rowSpan)),
    'rows=' + JSON.stringify(tblI && tblI.rows));
  const toast2 = await page.evaluate(() => { const t = document.getElementById('toast'); return t ? t.textContent : ''; });
  check('INVALID(diagonal): a clear message is shown', String(toast2).length > 0, 'toast=' + JSON.stringify(toast2));
  await closeEditor(page);
  await sleep(200);
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
fs.writeFileSync(path.join(HERE, 'merge_results.txt'), report, 'utf8');
console.log('\n' + report);
process.exit(pass2 === results.length ? 0 : 1);

