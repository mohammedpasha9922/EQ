import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8257;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  try { const d = fs.readFileSync(path.join(ROOT, p)); res.writeHead(200, { 'Content-Type': (MIME[path.extname(p)] || 'application/octet-stream') + '; charset=utf-8' }); res.end(d); }
  catch (e) { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const URL = `http://127.0.0.1:${PORT}/`;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await new Promise((r) => setTimeout(r, 800));
await page.evaluate(() => document.getElementById('drawerToggle').click());
await new Promise((r) => setTimeout(r, 300));
await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click());
await new Promise((r) => setTimeout(r, 400));
await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-new-doc"]').click());
await new Promise((r) => setTimeout(r, 500));
const input = await page.$('#smartAddImageInput');
await input.uploadFile(path.join(ROOT, 'icon-192.png.png'));
await new Promise((r) => setTimeout(r, 500));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const imgBox = () => page.evaluate(() => { const r = document.querySelector('.smart-doc-image-wrap img').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: Math.round(r.width), h: Math.round(r.height) }; });
const handleBox = (h) => page.evaluate((hh) => { const r = document.querySelector(`.smart-image-handle[data-handle="${hh}"]`).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, h);
async function drag(from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) { await page.mouse.move(from.x + (to.x - from.x) * i / 6, from.y + (to.y - from.y) * i / 6); await sleep(20); }
  await page.mouse.up();
  await sleep(120);
}
// instrument BEFORE any interaction
await page.evaluate(() => {
  window.__dbg = { down: 0, move: 0, up: 0, cancel: 0, release: 0, captureErr: '' };
  const wrap = document.querySelector('.smart-doc-image-wrap');
  ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture'].forEach((t) => {
    wrap.addEventListener(t, () => { window.__dbg[t === 'lostpointercapture' ? 'release' : t.replace('pointer', '')]++; });
  });
});

let box = await imgBox();
await page.mouse.click(box.x, box.y); await sleep(150);
console.log('selected');

// resize bigger (like test 8)
let se = await handleBox('se');
await drag(se, { x: se.x + 60, y: se.y + 60 });
console.log('after grow', await imgBox(), await page.evaluate(() => window.__dbg));

// resize smaller (like test 10)
se = await handleBox('se');
await drag(se, { x: se.x - 50, y: se.y - 50 });
console.log('after shrink', await imgBox(), await page.evaluate(() => window.__dbg));

// now MOVE (like test 11)
await page.evaluate(() => { window.__dbg = { down: 0, move: 0, up: 0, cancel: 0, release: 0 }; });
box = await imgBox();
await drag(box, { x: box.x + 70, y: box.y + 40 });
console.log('after move', await page.evaluate(() => ({
  dbg: window.__dbg,
  tx: document.querySelector('.smart-doc-image-wrap').dataset.tx,
  ty: document.querySelector('.smart-doc-image-wrap').dataset.ty,
  draggable: document.querySelector('.smart-doc-image-wrap img').draggable,
  attr: document.querySelector('.smart-doc-image-wrap img').getAttribute('draggable')
})));
await browser.close();
server.close();
