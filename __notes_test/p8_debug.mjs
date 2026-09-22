// PART 08 debug — style click diagnostics
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8743;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.ico':'image/x-icon','.svg':'image/svg+xml' };
const server = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!p || p === '/') p = '/index.html';
    const d = fs.readFileSync(path.join(ROOT, p));
    res.writeHead(200, { 'Content-Type': (MIME[path.extname(p).toLowerCase()] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(d);
  } catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 800 });
page.on('pageerror', (e) => console.log('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE: ' + m.text().slice(0, 160)); });
await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
await sleep(500);
await page.evaluate(() => { ['eq-note-manager-notes','eq-note-folders','eq-language'].forEach((k) => localStorage.removeItem(k)); });
await page.reload({ waitUntil: 'load', timeout: 60000 });
await sleep(400);
await page.waitForSelector('.drawer-menu-item[data-action="open-notes"]', { timeout: 10000 });
await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 6000 });
await page.evaluate(() => document.getElementById('openNewNoteButton').click());
await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 6000 });
await sleep(200);
await page.evaluate(() => document.getElementById('noteBodyInput').focus());
await page.keyboard.type('Hello style test');
await sleep(120);

// Open Aa panel
await page.evaluate(() => { const b = document.getElementById('noteAaBtn'); b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
await page.click('#noteAaBtn');
await page.waitForFunction(() => { const p = document.getElementById('noteAaPanel'); return p && !p.classList.contains('hidden'); }, { timeout: 3000 }).catch(() => {});
await sleep(120);

console.log('rows:', JSON.stringify(await page.evaluate(() => ({
  stylesRow: !!document.getElementById('noteAaStylesRow'),
  styleBtns: document.querySelectorAll('#noteAaStylesRow .note-aa-style-btn').length,
  inPanel: !!document.getElementById('noteAaPanel')?.contains(document.getElementById('noteAaStylesRow'))
}))));
console.log('bodyClassBefore:', await page.evaluate(() => document.getElementById('noteBodyInput').className));

// Click style button + instrument
const r = await page.evaluate(() => {
  const b = document.querySelector('#noteAaStylesRow [data-style-id="academic"]');
  if (!b) return 'no-btn';
  window.__p8log = [];
  b.click();
  return { clicked: true, bodyClass: document.getElementById('noteBodyInput').className, log: window.__p8log };
});
console.log('click result:', JSON.stringify(r));
await sleep(300);
console.log('bodyClassAfter:', await page.evaluate(() => document.getElementById('noteBodyInput').className));
console.log('noteObj:', await page.evaluate(() => { try { const n = JSON.parse(localStorage.getItem('eq-note-manager-notes') || 'null'); const arr = n && n.notes ? n.notes : n; return arr && arr[0] ? { style: arr[0].style, frame: arr[0].frame } : null; } catch (e) { return 'ERR:' + e.message; } }));

await browser.close();
server.close();
process.exit(0);
