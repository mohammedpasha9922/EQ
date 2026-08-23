import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8255;
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
page.on('console', (m) => console.log('[console]', m.text()));
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

const info0 = await page.evaluate(() => {
  const wrap = document.querySelector('.smart-doc-image-wrap');
  const img = wrap.querySelector('img');
  const holder = document.getElementById('smartBlankCanvasHolder');
  return {
    wrapRect: wrap.getBoundingClientRect().toJSON(),
    imgRect: img.getBoundingClientRect().toJSON(),
    holderRect: holder.getBoundingClientRect().toJSON(),
    wrapStyleW: wrap.style.width || '(none)',
    imgNatural: [img.naturalWidth, img.naturalHeight]
  };
});
console.log('BEFORE', JSON.stringify(info0, null, 1));

// select
let b = await page.evaluate(() => { const r = document.querySelector('.smart-doc-image-wrap img').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
await page.mouse.click(b.x, b.y);
await new Promise((r) => setTimeout(r, 200));

// grab SE handle and drag +60 with per-step logging
const hb = await page.evaluate(() => { const r = document.querySelector('.smart-image-handle[data-handle="se"]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
await page.mouse.move(hb.x, hb.y);
await page.mouse.down();
for (let i = 1; i <= 6; i++) {
  await page.mouse.move(hb.x + i * 10, hb.y + i * 10);
  await new Promise((r) => setTimeout(r, 30));
  const st = await page.evaluate(() => {
    const wrap = document.querySelector('.smart-doc-image-wrap');
    const img = wrap.querySelector('img');
    return { w: Math.round(wrap.getBoundingClientRect().width), h: Math.round(wrap.getBoundingClientRect().height),
             styleW: wrap.style.width, styleH: wrap.style.height, imgW: Math.round(img.getBoundingClientRect().width) };
  });
  console.log('step', i, JSON.stringify(st));
}
await page.mouse.up();
await new Promise((r) => setTimeout(r, 200));
const info1 = await page.evaluate(() => {
  const wrap = document.querySelector('.smart-doc-image-wrap');
  const img = wrap.querySelector('img');
  return { wrapRect: wrap.getBoundingClientRect().toJSON(), imgRect: img.getBoundingClientRect().toJSON(), styleW: wrap.style.width, styleH: wrap.style.height, imgStyleW: img.style.width, imgStyleH: img.style.height };
});
console.log('AFTER', JSON.stringify(info1, null, 1));
await browser.close();
server.close();
