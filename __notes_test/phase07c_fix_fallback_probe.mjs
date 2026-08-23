// PHASE 07C-FIX — verify the REAL fallback Color-Picker path.
// Simulates a browser WITHOUT showPicker() (e.g. older Safari/iOS) by stubbing
// HTMLInputElement.prototype.showPicker = undefined BEFORE app.js loads, so the
// app's fallback branch runs. Presses the real Cell Color button and verifies:
//   - the fallback invokes a programmatic click on the color input (real picker open)
//   - NO default color is auto-applied just by opening the picker
//   - a chosen color is applied to the captured cell only (target retention)
//   - persistence after close + reopen
// The only step that cannot be automated is the human gesture inside the native
// color dialog itself; the chosen color is delivered via the input event that the
// native picker emits on selection.
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
const PORT = 8741;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let fail = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
  if (!ok) fail++;
}

const server = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!p || p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    const ext = path.extname(f).toLowerCase();
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
    res.writeHead(200, { 'Content-Type': (mime[ext] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(fs.readFileSync(f));
  } catch (e) {
    if (!res.headersSent) { res.writeHead(404); res.end('nf'); }
  }
});
await new Promise((r) => server.listen(PORT, r));

// Remove showPicker BEFORE app.js loads so the FALLBACK branch runs.
const STUB = `
  (() => {
    Object.defineProperty(HTMLInputElement.prototype, 'showPicker', { value: undefined, configurable: true, writable: true });
    window.__diag = { clicks: 0, showPickerType: typeof HTMLInputElement.prototype.showPicker, input: null };
    const origClick = HTMLInputElement.prototype.click;
    HTMLInputElement.prototype.click = function () {
      if (this && this.id === 'noteCellBgColorInput') window.__diag.clicks++;
      return origClick.call(this);
    };
    document.addEventListener('input', (e) => {
      if (e.target && e.target.id === 'noteCellBgColorInput') window.__diag.input = e.target.value;
    }, true);
  })();
`;

async function openNotes(page) {
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 5000 });
}
async function newNote(page) {
  await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
}
async function insert1x2(page) {
  await page.evaluate(() => {
    const b = document.getElementById('noteBodyInput'); if (b) b.focus();
    const tb = document.getElementById('noteTableBtn');
    if (tb) tb.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
  });
  await page.click('#noteTableBtn');
  await page.evaluate(() => {
    document.getElementById('noteTableRows').value = '1';
    document.getElementById('noteTableCols').value = '2';
    document.getElementById('noteTableHeader').checked = false;
  });
  await page.click('#noteTableInsertBtn');
  await page.waitForSelector('table.note-table', { visible: true, timeout: 3000 });
  await page.evaluate(() => {
    const cells = document.querySelectorAll('table.note-table tr td');
    if (cells[0]) cells[0].textContent = 'LEFT';
    if (cells[1]) cells[1].textContent = 'RIGHT';
  });
}

let browser = null;
try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });
  page.on('pageerror', (e) => console.log('   [PAGEERROR] ' + e.message));
  await page.evaluateOnNewDocument(STUB);
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
  await sleep(400);

  await page.evaluate((a, b) => { localStorage.removeItem(a); localStorage.removeItem(b); }, STORAGE_KEY, FOLDERS_KEY);
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(400);
  await openNotes(page);
  await newNote(page);
  await page.evaluate(() => { document.getElementById('noteTitleInput').value = 'CellBg Fallback Probe'; });
  await insert1x2(page);
  await sleep(300);

  await page.evaluate(() => { window.__diag.clicks = 0; window.__diag.input = null; });
  check('showPicker is unavailable (fallback forced)', await page.evaluate(() => window.__diag.showPickerType === 'undefined'), 'type=' + (await page.evaluate(() => window.__diag.showPickerType)));

  // Real click on cell[0] to select it.
  const cell0 = await page.$('table.note-table tr td:nth-child(1)');
  const box = await cell0.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await sleep(200);
  const btnEnabled = await page.evaluate(() => { const b = document.getElementById('noteCellBgColorBtn'); return b ? !b.disabled : null; });
  check('Cell Color button enabled after selecting cell', btnEnabled === true, 'enabled=' + btnEnabled);

  // Press the real Cell Color button -> fallback (.click()) path.
  await page.click('#noteCellBgColorBtn');
  await sleep(300);

  const diag = await page.evaluate(() => window.__diag);
  const bgAfterClick = await page.evaluate(() => document.querySelector('table.note-table tr td').style.backgroundColor || '(none)');

  check('Fallback: programmatic .click() invoked on color input (real picker open path)', diag.clicks >= 1, 'clicks=' + diag.clicks);
  check('Fallback: NO default color auto-applied just by opening picker', bgAfterClick === '(none)', 'bg=' + bgAfterClick);

  // Simulate the human picking a color (native picker emits input with the chosen value).
  await page.evaluate(() => {
    const i = document.getElementById('noteCellBgColorInput');
    i.value = '#00ccff';
    i.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(200);
  const bgApplied = await page.evaluate(() => document.querySelector('table.note-table tr td').style.backgroundColor || '(none)');
  const bgNeighbor = await page.evaluate(() => document.querySelector('table.note-table tr td:nth-child(2)').style.backgroundColor || '(none)');
  const text = await page.evaluate(() => document.querySelector('table.note-table tr td').textContent);
  check('Fallback: chosen color applied to SELECTED cell only', bgApplied === 'rgb(0, 204, 255)', 'bg=' + bgApplied);
  check('Fallback: neighbor cell unchanged', bgNeighbor === '(none)', 'neighbor=' + bgNeighbor);
  check('Fallback: cell text unchanged', text === 'LEFT', 'text=' + text);

  // Persistence: wait autosave, close, reopen the SAVED note.
  await sleep(1200);
  await page.click('#closeFullScreenNote');
  await sleep(400);
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.note-item, [data-note-id], .notes-list-item, .note-card'));
    for (const it of items) { if ((it.textContent || '').indexOf('CellBg Fallback Probe') !== -1) { it.click(); return; } }
    const any = document.querySelector('.note-item, [data-note-id], .notes-list-item, .note-card');
    if (any) any.click();
  });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
  await sleep(500);
  const reopened = await page.evaluate(() => {
    const t = document.querySelector('table.note-table');
    if (!t) return 'no-table';
    return t.querySelectorAll('tr td')[0].style.backgroundColor || '(none)';
  });
  check('Fallback: color persists after reopen', reopened === 'rgb(0, 204, 255)', 'reopened=' + reopened);

  console.log('\nPHASE 07C-FIX FALLBACK PROBE SUMMARY failures=' + fail);
} finally {
  if (browser) await browser.close();
  server.close();
}
process.exitCode = fail ? 1 : 0;

