import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8301;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  const ext = path.extname(urlPath).toLowerCase();
  const mimeMap = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon' };
  if (res.headersSent) return;
  try { res.writeHead(200, { 'Content-Type': (mimeMap[ext] || 'application/octet-stream') + '; charset=utf-8' }); res.end(fs.readFileSync(filePath)); }
  catch (e) { if (!res.headersSent) { res.writeHead(404); res.end('nf'); } }
});
await new Promise((r) => server.listen(PORT, r));

let pageError = null;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 1000 });
page.on('pageerror', (e) => { pageError = (pageError || '') + e.message + '\n'; });

await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 20000 });
await page.evaluate(() => { localStorage.removeItem('eq-note-manager-notes'); localStorage.removeItem('eq-note-folders'); });
await page.reload({ waitUntil: 'load', timeout: 20000 });
await sleep(300);
await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 5000 });
await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
await page.type('#noteTitleInput', 'Button Probe Note');
await page.click('#noteBodyInput');

await page.evaluate(() => {
  const b = document.getElementById('noteBodyInput'); if (b) b.focus();
  const tb = document.getElementById('noteTableBtn'); if (tb) tb.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
});
await page.click('#noteTableBtn');
await page.evaluate(() => { document.getElementById('noteTableRows').value = '1'; document.getElementById('noteTableCols').value = '2'; document.getElementById('noteTableHeader').checked = false; });
await page.click('#noteTableInsertBtn');
await page.waitForFunction(() => document.getElementById('noteTablePanel').classList.contains('hidden'), { timeout: 2000 });

await page.evaluate(() => {
  const t = document.querySelector('table.note-table');
  const cell = t.querySelectorAll('tr')[0].querySelectorAll('td')[0];
  cell.textContent = 'HelloWorld';
});
await sleep(100);
const boundCheck = await page.evaluate(() => {
  const csv = document.getElementById('noteTextColorBtn');
  const ccsv = document.getElementById('noteCellBgColorBtn');
  return { textExists: !!csv, cellExists: !!ccsv, textDisabled: csv ? csv.disabled : null,
    inputClickResult: (() => { try { document.getElementById('noteTextColorInput').click(); return 'click-ok'; } catch (e) { return 'click-err:' + e.message; } })() };
});

await page.evaluate(() => {
  const t = document.querySelector('table.note-table');
  const cell = t.querySelectorAll('tr')[0].querySelectorAll('td')[0];
  const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
  let node; while ((node = walker.nextNode())) {
    const idx = node.nodeValue.indexOf('World');
    if (idx >= 0) { const r = document.createRange(); r.setStart(node, idx); r.setEnd(node, idx + 5); const s = getSelection(); s.removeAllRanges(); s.addRange(r); return; }
  }
});
const selectedText = await page.evaluate(() => getSelection().toString());

await page.click('#noteTextColorBtn');
await sleep(300);
await page.evaluate(() => { const i = document.getElementById('noteTextColorInput'); i.value = '#ff0000'; i.dispatchEvent(new Event('input', { bubbles: true })); });
await sleep(300);
const textColorHtml = await page.evaluate(() => document.querySelector('table.note-table').querySelectorAll('tr')[0].querySelectorAll('td')[0].innerHTML);

const cellDisabledAfterFocus = await page.evaluate(() => {
  document.querySelector('table.note-table').querySelectorAll('tr')[0].querySelectorAll('td')[1].focus();
  const b = document.getElementById('noteCellBgColorBtn'); return b ? b.disabled : 'missing';
});
await page.click('#noteCellBgColorBtn');
await sleep(300);
const cellBgBefore = await page.evaluate(() => document.querySelector('table.note-table').querySelectorAll('tr')[0].querySelectorAll('td')[1].style.backgroundColor || '(none)');
await page.evaluate(() => { const i = document.getElementById('noteCellBgColorInput'); i.value = '#ffff00'; i.dispatchEvent(new Event('input', { bubbles: true })); });
await sleep(300);
const cellBgAfter = await page.evaluate(() => document.querySelector('table.note-table').querySelectorAll('tr')[0].querySelectorAll('td')[1].style.backgroundColor || '(none)');

const report = { boundCheck, selectedText, textColorHtml, cellDisabledAfterFocus, cellBgBefore, cellBgAfter, pageError };
console.log('REPORT ' + JSON.stringify(report));
console.log('TEXTCOLOR_APPLIED=' + /color:\s*rgb\(255,\s*0,\s*0\)/.test(textColorHtml));
console.log('CELLBG_APPLIED=' + /rgb\(255,\s*255,\s*0\)/.test(cellBgAfter));
await browser.close();
server.close();
process.exit(0);
