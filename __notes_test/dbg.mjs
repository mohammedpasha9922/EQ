import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.ico':'image/x-icon','.svg':'image/svg+xml','.jpg':'image/jpeg' };
const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  const mime = MIME[path.extname(urlPath).toLowerCase()] || 'application/octet-stream';
  try { const data = fs.readFileSync(filePath); res.writeHead(200, { 'Content-Type': mime + '; charset=utf-8' }); res.end(data); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(8242, r));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on('pageerror', e => console.log('PAGEERROR', e.message));
page.on('console', m => console.log('CONSOLE', m.type(), m.text()));
await page.goto('http://127.0.0.1:8242/', { waitUntil: 'networkidle0', timeout: 20000 });
await page.evaluate(() => { localStorage.removeItem('eq-note-manager-notes'); localStorage.removeItem('eq-note-folders'); });
await page.reload({ waitUntil: 'networkidle0', timeout: 20000 });
const sleep = ms => new Promise(r => setTimeout(r, ms));
await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 5000 });
await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
await page.type('#noteTitleInput', 'DebugBold');
await page.click('#noteBodyInput');
await page.evaluate(() => {
  const tb = document.getElementById('noteTableBtn');
  if (tb) tb.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
});
await page.click('#noteTableBtn');
await page.evaluate(() => { document.getElementById('noteTableRows').value = '1'; document.getElementById('noteTableCols').value = '1'; document.getElementById('noteTableHeader').checked = false; });
await page.click('#noteTableInsertBtn');
await page.waitForFunction(() => !document.getElementById('noteTablePanel') || document.getElementById('noteTablePanel').classList.contains('hidden'), { timeout: 2000 });
await sleep(200);
// type into the single cell
await page.evaluate(() => {
  const cells = document.querySelectorAll('table.note-table td.note-cell');
  if (cells.length) cells[0].focus();
});
await page.keyboard.type('Hello World Foo Bar');
await sleep(300);
// select 'Foo'
await page.evaluate(() => {
  const cell = document.querySelector('table.note-table td.note-cell');
  const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
  let node;
  while (node = walker.nextNode()) {
    const idx = node.nodeValue.indexOf('Foo');
    if (idx >= 0) {
      const rng = document.createRange(); rng.setStart(node, idx); rng.setEnd(node, idx + 3);
      const sel = document.getSelection(); sel.removeAllRanges(); sel.addRange(rng);
      break;
    }
  }
});
const before = await page.evaluate(() => {
  const cell = document.querySelector('table.note-table td.note-cell');
  return { html: cell.innerHTML, active: document.activeElement ? document.activeElement.tagName + (document.activeElement.classList ? '.'+document.activeElement.className : '') : 'null' };
});
console.log('BEFORE BOLD: html=', before.html, 'active=', before.active);
// click bold
await page.evaluate(() => { const btn = document.getElementById('noteBoldBtn'); if (btn) btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window })); });
await page.click('#noteBoldBtn');
await sleep(400);
const after = await page.evaluate(() => {
  const cell = document.querySelector('table.note-table td.note-cell');
  const sel = document.getSelection();
  return { html: cell.innerHTML, active: document.activeElement ? document.activeElement.tagName + (document.activeElement.classList ? '.'+document.activeElement.className : '') : 'null', selRange: sel.rangeCount ? (sel.getRangeAt(0).toString()) : 'none' };
});
console.log('AFTER BOLD: html=', after.html, 'active=', after.active, 'sel=', after.selRange);
await browser.close();
server.close();
