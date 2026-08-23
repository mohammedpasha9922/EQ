import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve('c:/Users/SHCH-HR/Desktop/EQ');
const PORT = 8272;
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';

const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (!p || p === '/') p = '/index.html';
  const file = path.join(ROOT, p);
  try {
    const data = fs.readFileSync(file);
    const ext = path.extname(file).toLowerCase();
    const mime = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.mjs': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.jpg': 'image/jpeg',
      '.ico': 'image/x-icon'
    };
    res.writeHead(200, { 'Content-Type': (mime[ext] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(data);
  } catch (e) {
    res.writeHead(404);
    res.end('not found');
  }
});

await new Promise(r => server.listen(PORT, r));
console.log('SERVER_UP', PORT);
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 1000 });
page.on('pageerror', e => console.log('PAGEERROR', e.message));
console.log('GOTO');
await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'networkidle0', timeout: 20000 });
console.log('LOADED');
await page.evaluate(() => localStorage.clear());
console.log('CLEAR');
await page.evaluate(() => {
  const btn = document.querySelector('.drawer-menu-item[data-action="open-notes"]');
  console.log('HAS_OPEN_NOTES', !!btn);
  if (btn) btn.click();
});
await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 5000 });
console.log('NOTES_MODAL_OPEN');
await page.evaluate(() => {
  const btn = document.getElementById('openNewNoteButton');
  console.log('HAS_NEW_NOTE', !!btn);
  if (btn) btn.click();
});
await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
console.log('FULLSCREEN_OPEN');
await page.click('#noteTitleInput');
await page.type('#noteTitleInput', 'Color Probe');
await page.click('#noteBodyInput');
await page.evaluate(() => {
  const btn = document.getElementById('noteTableBtn');
  console.log('HAS_TABLE_BTN', !!btn);
  if (btn) btn.click();
});
await page.evaluate(() => {
  const rows = document.getElementById('noteTableRows');
  const cols = document.getElementById('noteTableCols');
  if (rows) rows.value = '2';
  if (cols) cols.value = '2';
});
await page.click('#noteTableInsertBtn');
await page.waitForSelector('table.note-table', { visible: true, timeout: 5000 });
console.log('TABLE_CREATED');
await page.evaluate(() => {
  const table = document.querySelector('table.note-table');
  const tr = table.querySelectorAll('tr')[0];
  const cell = tr.querySelectorAll('td')[0];
  cell.textContent = 'Hello World';
  const textNode = cell.firstChild;
  const range = document.createRange();
  range.setStart(textNode, 0);
  range.setEnd(textNode, 5);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  console.log('SELECTION_SET', !!sel.rangeCount, cell.textContent);
});
await page.evaluate(() => {
  const input = document.getElementById('noteTextColorInput');
  console.log('HAS_COLOR_INPUT', !!input);
  if (input) {
    input.value = '#ff0000';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
});
await page.waitForTimeout(600);
const out = await page.evaluate(() => document.querySelector('table.note-table td').innerHTML);
console.log('CELL_HTML', out);
const st = await page.evaluate(() => JSON.parse(localStorage.getItem('eq-note-manager-notes') || '[]'));
console.log('STORAGE_LEN', st.length);
console.log('STORAGE_SAMPLE', JSON.stringify(st[0] || null));
await browser.close();
server.close();
