// Focused mobile probe: does the Aa panel / presets cause horizontal overflow?
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8782;
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/' || p === '') p = '/index.html';
  try { const d = fs.readFileSync(path.join(ROOT, p)); const m = { '.html':'text/html','.js':'text/javascript','.css':'text/css' }; res.writeHead(200, { 'Content-Type': (m[path.extname(p)] || 'application/octet-stream') + '; charset=utf-8' }); res.end(d); } catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, hasTouch: true, isMobile: true });
await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
await page.evaluate(() => { localStorage.removeItem('eq-note-manager-notes'); localStorage.removeItem('eq-note-folders'); localStorage.removeItem('eq-language'); });
await page.reload({ waitUntil: 'load', timeout: 60000 });
await sleep(300);
await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 6000 });
await page.evaluate(() => document.getElementById('openNewNoteButton').click());
await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 6000 });
await page.evaluate(() => { document.getElementById('noteBodyInput').focus(); });
await page.keyboard.type('Responsive note body text for overflow checks here', { delay: 6 });
await sleep(150);
const before = await page.evaluate(() => { const d = document.documentElement; return { sw: d.scrollWidth, cw: d.clientWidth }; });
console.log('BEFORE_OPEN', JSON.stringify(before));
const wide = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('body *').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1)) out.push({ tag: el.tagName, id: el.id || '', cls: (el.className && String(el.className)) || '', w: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right) });
  });
  return out.slice(0, 20);
});
console.log('WIDE_ELEMENTS_BEFORE', JSON.stringify(wide));
await page.evaluate(() => { const b = document.getElementById('noteAaBtn'); if (b) b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
await page.click('#noteAaBtn');
await sleep(150);
const after = await page.evaluate(() => { const d = document.documentElement; return { sw: d.scrollWidth, cw: d.clientWidth }; });
console.log('AFTER_OPEN', JSON.stringify(after));
const panel = await page.evaluate(() => { const p = document.getElementById('noteAaPanel'); if (!p) return null; const r = p.getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), vis: !p.classList.contains('hidden') }; });
console.log('PANEL', JSON.stringify(panel));
const presets = await page.evaluate(() => { const row = document.getElementById('noteAaPresetsRow'); if (!row) return 0; return row.querySelectorAll('.note-aa-preset-swatches').length; });
console.log('PRESETS', presets);
await browser.close(); server.close();