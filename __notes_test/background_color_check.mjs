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
const PORT = 8265;
const results = [];

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
}

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (!urlPath || urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  const ext = path.extname(urlPath).toLowerCase();
  const mimeMap = {
    '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
    '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
    '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg'
  };
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': (mimeMap[ext] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(data);
  } catch (e) {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise((r) => server.listen(PORT, r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function readNotes(page) {
  return page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } }, STORAGE_KEY);
}
async function clearStorage(page) {
  await page.evaluate((a, b) => { localStorage.removeItem(a); localStorage.removeItem(b); }, STORAGE_KEY, FOLDERS_KEY);
}
async function openNotes(page) {
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 5000 });
}
async function newNote(page) {
  await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
}
async function closeEditor(page) {
  await page.click('#closeFullScreenNote').catch(() => {});
}
async function clickTableBtn(page) {
  await page.evaluate(() => {
    const b = document.getElementById('noteBodyInput');
    if (b) b.focus();
    const tb = document.getElementById('noteTableBtn');
    if (tb) tb.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
  });
  await page.click('#noteTableBtn');
}
async function setTableDims(page, rows, cols, header) {
  await page.evaluate((rr, cc, h) => {
    const ri = document.getElementById('noteTableRows'); if (ri) ri.value = rr;
    const ci = document.getElementById('noteTableCols'); if (ci) ci.value = cc;
    const hi = document.getElementById('noteTableHeader'); if (hi) hi.checked = h;
  }, rows, cols, !!header);
  await page.click('#noteTableInsertBtn');
  await page.waitForFunction(() => !document.getElementById('noteTablePanel') || document.getElementById('noteTablePanel').classList.contains('hidden'), { timeout: 2000 });
}
async function focusCell(page, tableIdx, r, c) {
  await page.evaluate((ti, ri, ci) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    if (!t) return false;
    const tr = t.querySelectorAll('tr')[ri];
    if (!tr) return false;
    const cell = tr.querySelectorAll('td, th')[ci];
    if (!cell) return false;
    cell.focus();
    return true;
  }, tableIdx, r, c);
}
async function typeInCell(page, tableIdx, r, c, text) {
  await focusCell(page, tableIdx, r, c);
  await page.keyboard.type(text);
}
async function selectCellWord(page, tableIdx, r, c, word) {
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
        sel.removeAllRanges();
        sel.addRange(rng);
        return true;
      }
    }
    return false;
  }, tableIdx, r, c, word);
}
async function pickTextColor(page, color) {
  await page.evaluate((hex) => {
    const input = document.getElementById('noteTextColorInput');
    if (!input) return false;
    input.value = hex;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }, color);
}
async function pickCellBgColor(page, color) {
  await page.evaluate((hex) => {
    const input = document.getElementById('noteCellBgColorInput');
    if (!input) return false;
    input.value = hex;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }, color);
}
async function cellHTML(page, tableIdx, r, c) {
  return page.evaluate((ti, ri, ci) => {
    const table = document.querySelectorAll('table.note-table')[ti];
    if (!table) return null;
    const row = table.querySelectorAll('tr')[ri];
    if (!row) return null;
    const cell = row.querySelectorAll('td, th')[ci];
    return cell ? cell.outerHTML : null;
  }, tableIdx, r, c);
}
function normalizeHex(value) {
  const v = String(value || '').trim().toLowerCase();
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(v)) return null;
  const hex = v.slice(1);
  const full = hex.length === 3 ? hex.split('').map((ch) => ch + ch).join('') : hex;
  return '#' + full;
}

let browser;
let pageError = null;
try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });
  page.on('pageerror', (e) => { pageError = (pageError || '') + e.message + '\n'; });
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'networkidle0', timeout: 20000 });
  await clearStorage(page);
  await page.reload({ waitUntil: 'networkidle0', timeout: 20000 });
  await sleep(300);

  await openNotes(page);
  await newNote(page);
  await page.type('#noteTitleInput', 'Background Color Note');
  await page.click('#noteBodyInput');
  await clickTableBtn(page);
  await setTableDims(page, 2, 2, false);
  await typeInCell(page, 0, 0, 0, 'Arabic مرحبا');
  await typeInCell(page, 0, 0, 1, 'English Hello');
  await typeInCell(page, 0, 1, 0, '12345');
  await typeInCell(page, 0, 1, 1, 'Mixed سلام hello 99');
  await sleep(300);

  await focusCell(page, 0, 0, 0);
  await pickCellBgColor(page, '#ffff00');
  await sleep(300);
  const bg1 = await cellHTML(page, 0, 0, 0);
  check('CELL BG: selected cell gets background color', /background-color\s*:\s*rgb\(255,\s*255,\s*0\)|background-color\s*:\s*#ffff00/i.test(bg1 || ''), 'html=' + bg1);

  const bg2 = await cellHTML(page, 0, 0, 1);
  check('CELL BG: neighboring cell remains unchanged', !/background-color\s*:\s*rgb\(255,\s*255,\s*0\)|background-color\s*:\s*#ffff00/i.test(bg2 || ''), 'html=' + bg2);

  await selectCellWord(page, 0, 0, 0, 'مرحبا');
  await pickTextColor(page, '#ff0000');
  await sleep(250);
  const mixedCell = await cellHTML(page, 0, 0, 0);
  check('CELL BG: text color remains independent from background color', /background-color\s*:\s*rgb\(255,\s*255,\s*0\)|background-color\s*:\s*#ffff00/i.test(mixedCell || '') && /color:\s*rgb\(255,\s*0,\s*0\)|color:\s*#ff0000/i.test(mixedCell || ''), 'html=' + mixedCell);

  await selectCellWord(page, 0, 0, 0, 'مرحبا');
  await page.evaluate(() => document.execCommand('bold', false, null));
  await sleep(200);
  const boldCell = await cellHTML(page, 0, 0, 0);
  check('CELL BG: bold survives with background color', /background-color\s*:\s*rgb\(255,\s*255,\s*0\)|background-color\s*:\s*#ffff00/i.test(boldCell || '') && (/<b>/i.test(boldCell || '') || /font-weight\s*:\s*bold|font-weight\s*bold/i.test(boldCell || '')), 'html=' + boldCell);

  await sleep(500);
  const notes = await readNotes(page);
  const note = notes.find((n) => n.title === 'Background Color Note');
  check('CELL BG: auto-save stores backgroundColor in cell model', !!(note && note.bodyBlocks && note.bodyBlocks[0] && note.bodyBlocks[0].rows[0][0].backgroundColor), 'fmt=' + JSON.stringify(note && note.bodyBlocks && note.bodyBlocks[0].rows[0][0]));

  await closeEditor(page);
  await sleep(300);
  await page.reload({ waitUntil: 'networkidle0', timeout: 20000 });
  await sleep(300);
  await openNotes(page);
  await page.evaluate((t) => {
    const items = Array.from(document.querySelectorAll('#notesList .note-item'));
    const item = items.find((el) => el.querySelector('.note-item-title').textContent.trim() === t);
    if (item) item.click();
  }, 'Background Color Note');
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
  const reopened = await cellHTML(page, 0, 0, 0);
  check('CELL BG: reload preserves the cell background', /background-color\s*:\s*rgb\(255,\s*255,\s*0\)|background-color\s*:\s*#ffff00/i.test(reopened || ''), 'html=' + reopened);

  await page.evaluate(() => {
    const table = document.querySelector('table.note-table');
    const firstRow = table.querySelectorAll('tr')[0];
    const firstCell = firstRow.querySelectorAll('td')[0];
    const secondCell = firstRow.querySelectorAll('td')[1];
    const range = document.createRange();
    range.setStart(firstCell, 0);
    range.setEnd(firstCell, 1);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    firstCell.style.backgroundColor = '';
    secondCell.style.backgroundColor = 'rgb(0, 0, 255)';
    const row = table.querySelectorAll('tr')[0];
    row.querySelectorAll('td')[0].style.backgroundColor = '';
    row.querySelectorAll('td')[1].style.backgroundColor = 'rgb(0, 0, 255)';
  });
  const oldRender = await page.evaluate(() => {
    const table = document.querySelector('table.note-table');
    return table.querySelectorAll('tr')[0].querySelectorAll('td')[0].outerHTML + '::' + table.querySelectorAll('tr')[0].querySelectorAll('td')[1].outerHTML;
  });
  check('CELL BG: old table without backgroundColor still renders normally', !/background-color\s*:\s*#ffff00|background-color\s*:\s*rgb\(255,\s*255,\s*0\)/i.test(oldRender), 'html=' + oldRender);

  await page.evaluate(() => {
    const table = document.querySelector('table.note-table');
    const cells = table.querySelectorAll('tr')[0].querySelectorAll('td');
    const a = cells[0];
    const b = cells[1];
    const range = document.createRange();
    range.setStart(a, 0);
    range.setEnd(b, 1);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  const showMerge = await page.evaluate(() => {
    const btn = document.querySelector('[data-table-action="merge-cells"]');
    return !!btn;
  });
  check('CELL BG: merge control exists', showMerge, 'mergeControl=' + showMerge);

  await page.evaluate(() => {
    const input = document.getElementById('noteCellBgColorInput');
    const value = input && input.value ? input.value : '#ff00ff';
    const table = document.querySelector('table.note-table');
    const cell = table.querySelectorAll('tr')[0].querySelectorAll('td')[0];
    cell.style.backgroundColor = value;
  });
  const invalidBg = await page.evaluate(() => {
    const input = document.getElementById('noteCellBgColorInput');
    const cell = document.querySelector('table.note-table tr td');
    if (!input || !cell) return 'missing';
    input.value = 'javascript:alert(1)';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return cell.outerHTML;
  });
  check('CELL BG: invalid/untrusted color input is ignored', !/javascript:|url\(|expression\(|gradient/i.test(invalidBg || ''), 'html=' + invalidBg);
  check('CELL BG: no JS errors during color flow', !pageError, 'errors=' + (pageError || 'none'));

  console.log('\nBACKGROUND COLOR CHECK SUMMARY');
  const totals = { pass: results.filter((r) => r.ok).length, fail: results.filter((r) => !r.ok).length };
  console.log(JSON.stringify({ totals }, null, 2));
  process.exitCode = totals.fail ? 1 : 0;
} finally {
  if (browser) await browser.close();
  server.close();
}
