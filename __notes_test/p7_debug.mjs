// Focused debug: Text Color via Aa palette — dump applied colors + body HTML.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8781;
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/' || p === '') p = '/index.html';
  try { const d = fs.readFileSync(path.join(ROOT, p)); const m = { '.html':'text/html','.js':'text/javascript','.css':'text/css' }; res.writeHead(200, { 'Content-Type': (m[path.extname(p)] || 'application/octet-stream') + '; charset=utf-8' }); res.end(d); } catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 800 });
await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
await page.evaluate(() => { localStorage.removeItem('eq-note-manager-notes'); localStorage.removeItem('eq-note-folders'); localStorage.removeItem('eq-language'); });
await page.reload({ waitUntil: 'load', timeout: 60000 });
await sleep(300);
await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 6000 });
await page.evaluate(() => document.getElementById('openNewNoteButton').click());
await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 6000 });
await page.evaluate(() => { document.getElementById('noteTitleInput').value = 'Dbg'; document.getElementById('noteBodyInput').focus(); });
await sleep(100);
await page.keyboard.type('Hello World Alpha', { delay: 8 });
await sleep(120);
// select "Hello" (0-5) via keyboard
await page.keyboard.press('Home'); await sleep(40);
for (let i = 0; i < 0; i++) await page.keyboard.press('ArrowRight');
await page.keyboard.down('Shift');
for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
await page.keyboard.up('Shift');
await sleep(80);
console.log('SEL1', await page.evaluate(() => window.getSelection().toString()));
await page.evaluate(() => { const b = document.getElementById('noteAaBtn'); if (b) b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
await page.click('#noteAaBtn');
await sleep(120);
await page.evaluate(() => document.getElementById('noteTextColorBtn').click());
await sleep(120);
// list swatch data-colors
console.log('SWATCHES', await page.evaluate(() => Array.from(document.querySelectorAll('#noteTextColorPalette .note-text-color-swatch')).map(s => s.getAttribute('data-color'))));
await page.evaluate(() => { const s = document.querySelector('#noteTextColorPalette .note-text-color-swatch:not([data-color="#000000"])'); if (s) s.click(); return !!s; });
await sleep(200);
console.log('BODY_HTML', await page.evaluate(() => document.getElementById('noteBodyInput').innerHTML));
const cols = await page.evaluate(() => Array.from(document.querySelectorAll('#noteBodyInput span, #noteBodyInput font, #noteBodyInput [style*="color"]')).map(s => getComputedStyle(s).color));
console.log('COMPCOLORS', JSON.stringify(cols));
await browser.close(); server.close();