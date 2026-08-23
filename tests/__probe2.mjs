import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8256;
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

const b = await page.evaluate(() => {
  window.__dbg = { viewDown: 0, wrapMove: 0, docMove: 0, wrapUp: 0, cancel: 0 };
  const r = document.querySelector('.smart-doc-image-wrap img').getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
await page.mouse.click(b.x, b.y);
await new Promise((r) => setTimeout(r, 200));

// instrument
await page.evaluate(() => {
  const wrap = document.querySelector('.smart-doc-image-wrap');
  const view = document.getElementById('smartBlankView');
  view.addEventListener('pointerdown', () => { window.__dbg.viewDown++; });
  wrap.addEventListener('pointermove', () => { window.__dbg.wrapMove++; });
  document.addEventListener('pointermove', () => { window.__dbg.docMove++; });
  wrap.addEventListener('pointerup', () => { window.__dbg.wrapUp++; });
  wrap.addEventListener('pointercancel', () => { window.__dbg.cancel++; });
});

const hb = b;
await page.mouse.move(hb.x, hb.y);
await page.mouse.down();
for (let i = 1; i <= 6; i++) {
  await page.mouse.move(hb.x + i * 12, hb.y + i * 7);
  await new Promise((r) => setTimeout(r, 30));
  const st = await page.evaluate((cx, cy) => ({
    tx: parseFloat(document.querySelector('.smart-doc-image-wrap').dataset.tx || '0'),
    ty: parseFloat(document.querySelector('.smart-doc-image-wrap').dataset.ty || '0'),
    dbg: JSON.parse(JSON.stringify(window.__dbg)),
    underCursor: (() => { const el = document.elementFromPoint(cx, cy); return el ? (el.className || el.tagName) : 'none'; })()
  }), hb.x + i * 12, hb.y + i * 7);
  console.log('step', i, JSON.stringify(st));
}
await page.mouse.up();
await new Promise((r) => setTimeout(r, 150));
console.log('FINAL', await page.evaluate(() => ({
  tx: document.querySelector('.smart-doc-image-wrap').dataset.tx,
  ty: document.querySelector('.smart-doc-image-wrap').dataset.ty,
  dbg: window.__dbg
})));
await browser.close();
server.close();
