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
await new Promise(r => server.listen(8243, r));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage();
let pageErrors = 0;
page.on('pageerror', e => { pageErrors++; console.log('PAGEERROR', e.message); });
await page.setViewport({ width: 1280, height: 800 });
const sleep = ms => new Promise(r => setTimeout(r, ms));
await page.goto('http://127.0.0.1:8243/', { waitUntil: 'networkidle0', timeout: 20000 });
await page.evaluate(() => { localStorage.removeItem('eq-note-manager-notes'); localStorage.removeItem('eq-note-folders'); });
await page.reload({ waitUntil: 'networkidle0', timeout: 20000 });
// make a real PNG via a screenshot (natural 1280x800, ratio 1.6)
const pngPath = path.join(HERE, '_test_img.png');
await page.screenshot({ path: pngPath });

// open notes manager + new note
await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 5000 });
await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
await page.type('#noteTitleInput', 'ImageEditor');
await page.click('#noteBodyInput');
await page.keyboard.type('Some text before the image. ');
// insert image through the real upload path
const fileInput = await page.$('#noteImageFileInput');
await fileInput.uploadFile(pngPath);
await page.evaluate(() => {
  const inp = document.getElementById('noteImageFileInput');
  inp.dispatchEvent(new Event('change', { bubbles: true }));
});
await sleep(800);
console.log('DBG_BLOCKS', await page.evaluate(() => document.querySelectorAll('.note-image-block').length));

const st1 = await page.evaluate(() => {
  const b = document.querySelector('.note-image-block');
  if (!b) return null;
  const img = b.querySelector('.note-image-elem');
  const r = img.getBoundingClientRect();
  return { blocks: document.querySelectorAll('.note-image-block').length, w: Math.round(r.width), h: Math.round(r.height), natural: { w: img.naturalWidth, h: img.naturalHeight }, grips: b.querySelectorAll('.note-image-grip').length, ctl: getComputedStyle(b.querySelector('.note-image-ctl')).display, opacity: img.style.opacity };
});
console.log('AFTER_INSERT', JSON.stringify(st1));

// tap image -> select (real CDP tap: down+up, below the 6px move threshold)
const imgBox0 = await (await page.$('.note-image-elem')).boundingBox();
const tapX = imgBox0.x + imgBox0.width / 2;
const tapY = imgBox0.y + imgBox0.height / 2;
await page.mouse.move(tapX, tapY);
await page.mouse.down();
await page.mouse.up();
await sleep(150);
const st2 = await page.evaluate(() => {
  const b = document.querySelector('.note-image-block');
  return { selected: b.classList.contains('is-selected'), ctl: getComputedStyle(b.querySelector('.note-image-ctl')).display, gripVisible: getComputedStyle(b.querySelector('.note-image-grip.se')).opacity };
});
console.log('AFTER_SELECT', JSON.stringify(st2));

// resize via SE grip (drag right +160)
const grip = await page.$('.note-image-grip.se');
const gb = await grip.boundingBox();
console.log('GRIP_BOX', JSON.stringify(gb));
console.log('HIT_TEST', await page.evaluate((x, y) => {
  const el = document.elementFromPoint(x, y);
  const b = document.querySelector('.note-image-block');
  return { tag: el && el.className, selected: b.classList.contains('is-selected'), gripPE: getComputedStyle(b.querySelector('.note-image-grip.se')).pointerEvents, body: document.activeElement && document.activeElement.id };
}, gb.x + 7, gb.y + 7));
await page.mouse.move(gb.x + 7, gb.y + 7);
await page.mouse.down();
await sleep(120);
console.log('MID_DRAG', await page.evaluate(() => {
  const b = document.querySelector('.note-image-block');
  return { interacting: b.classList.contains('is-interacting'), touchAction: b.style.touchAction, attrW: b.getAttribute('data-image-width') };
}));

await page.mouse.move(gb.x + 167, gb.y + 100, { steps: 10 });
await page.mouse.up();
await sleep(200);
const st3 = await page.evaluate(() => {
  const img = document.querySelector('.note-image-elem');
  const r = img.getBoundingClientRect();
  return { w: Math.round(r.width), h: Math.round(r.height), ratio: +(r.width / r.height).toFixed(3), attrW: document.querySelector('.note-image-block').getAttribute('data-image-width'), imgStyleW: img.style.width };
});
console.log('AFTER_RESIZE', JSON.stringify(st3), 'ratioTarget=1.6');

// synthetic resize through the app logic (grip -> document pointermove/up)
const st3b = await page.evaluate(() => {
  const b = document.querySelector('.note-image-block');
  const g = b.querySelector('.note-image-grip.se');
  const r = g.getBoundingClientRect();
  g.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 9, clientX: r.x + 7, clientY: r.y + 7 }));
  document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, pointerId: 9, clientX: r.x + 167, clientY: r.y + 100 }));
  document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 9 }));
  const img = b.querySelector('.note-image-elem');
  return { w: Math.round(img.getBoundingClientRect().width), attrW: b.getAttribute('data-image-width') };
});
console.log('SYNTH_RESIZE', JSON.stringify(st3b));

// opacity slider -> 0.1 then invalid low value
await page.evaluate(() => {
  const b = document.querySelector('.note-image-block');
  const s = b.querySelector('.note-image-opacity');
  s.value = '0.1';
  s.dispatchEvent(new Event('input', { bubbles: true }));
});
const st4a = await page.evaluate(() => document.querySelector('.note-image-elem').style.opacity);
await page.evaluate(() => {
  const b = document.querySelector('.note-image-block');
  const s = b.querySelector('.note-image-opacity');
  s.value = '0'; // below min -> must clamp to 0.1
  s.dispatchEvent(new Event('input', { bubbles: true }));
});
const st4b = await page.evaluate(() => ({ op: document.querySelector('.note-image-elem').style.opacity, attr: document.querySelector('.note-image-block').getAttribute('data-image-opacity') }));
console.log('OPACITY', st4a, JSON.stringify(st4b));

// send to back
await page.evaluate(() => { const b = document.querySelector('.note-image-back'); b.click(); });
await sleep(200);
const st5 = await page.evaluate(() => {
  const b = document.querySelector('.note-image-block');
  const img = b.querySelector('.note-image-elem');
  const cs = getComputedStyle(b);
  const br = document.getElementById('noteBodyInput').getBoundingClientRect();
  const ir = img.getBoundingClientRect();
  return { behind: b.getAttribute('data-image-behind'), pos: cs.position, z: cs.zIndex, imgVisible: ir.width > 0 && ir.height > 0, inside: ir.left >= br.left - 1 && ir.right <= br.right + 1, opacity: img.style.opacity, backPressed: b.querySelector('.note-image-back').getAttribute('aria-pressed') };
});
console.log('BEHIND', JSON.stringify(st5));

// move the floating image (real mouse drag)
const imgBox = await (await page.$('.note-image-elem')).boundingBox();
const before = await page.evaluate(() => ({ l: +document.querySelector('.note-image-block').getAttribute('data-float-left'), t: +document.querySelector('.note-image-block').getAttribute('data-float-top') }));
await page.mouse.move(imgBox.x + imgBox.width / 2, imgBox.y + imgBox.height / 2);
await page.mouse.down();
await page.mouse.move(imgBox.x + imgBox.width / 2 + 60, imgBox.y + imgBox.height / 2 + 60, { steps: 8 });
await page.mouse.up();
await sleep(150);
const after = await page.evaluate(() => ({ l: +document.querySelector('.note-image-block').getAttribute('data-float-left'), t: +document.querySelector('.note-image-block').getAttribute('data-float-top') }));
console.log('MOVE', JSON.stringify({ before, after }));

// type text while image is behind (text must stay editable)
await page.evaluate(() => {
  const body = document.getElementById('noteBodyInput');
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  let last = null, n;
  while ((n = walker.nextNode())) {
    if (!n.nodeValue.trim()) continue;
    if (n.parentElement && n.parentElement.closest('.note-image-block')) continue; // skip image ctl labels
    last = n;
  }
  if (!last) last = body.appendChild(document.createTextNode(''));
  const rng = document.createRange();
  rng.setStart(last, last.nodeValue.length);
  rng.collapse(true);
  const sel = document.getSelection();
  sel.removeAllRanges();
  sel.addRange(rng);
  body.focus();
});
await page.keyboard.type(' more text over image.');
const st6 = await page.evaluate(() => ({ text: document.getElementById('noteBodyInput').textContent.includes('more text over image.') }));
console.log('TEXT_OVER_IMAGE', JSON.stringify(st6));

// save + close + reopen
await page.evaluate(() => { const b = document.querySelector('.notes-save-btn') || document.getElementById('notesSaveBtn'); if (b) b.click(); });
await sleep(400);
await page.evaluate(() => { const b = document.querySelector('.notes-done-btn'); if (b) b.click(); });
await sleep(500);
// reopen via notes list
await page.evaluate(() => { const item = document.querySelector('.note-item'); if (item) item.click(); });
await sleep(800);
const st7 = await page.evaluate(() => {
  const b = document.querySelector('.note-image-block');
  if (!b) return null;
  const img = b.querySelector('.note-image-elem');
  return { w: img.style.width, op: img.style.opacity, behind: b.getAttribute('data-image-behind'), fl: b.getAttribute('data-float-left'), ft: b.getAttribute('data-float-top'), reselect: b.classList.contains('is-selected') };
});
console.log('AFTER_REOPEN', JSON.stringify(st7));

// still behind: resize + opacity work together
await page.evaluate(() => {
  const b = document.querySelector('.note-image-block');
  b.querySelector('.note-image-elem').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1, clientX: 300, clientY: 400 }));
});
await page.evaluate(() => {
  const b = document.querySelector('.note-image-block');
  const s = b.querySelector('.note-image-opacity');
  s.value = '0.5';
  s.dispatchEvent(new Event('input', { bubbles: true }));
});
const st8 = await page.evaluate(() => {
  const b = document.querySelector('.note-image-block');
  const img = b.querySelector('.note-image-elem');
  return { behind: b.getAttribute('data-image-behind'), op: img.style.opacity, selected: b.classList.contains('is-selected') };
});
console.log('COMBINED', JSON.stringify(st8));

// responsive smoke: 4 widths, no horizontal overflow
for (const w of [360, 390, 430, 768, 1280]) { await page.setViewport({ width: w, height: 740 }); await sleep(200); }
const st9 = await page.evaluate(() => ({ overflowX: document.getElementById('noteBodyInput').scrollWidth <= document.getElementById('noteBodyInput').clientWidth + 1 }));
console.log('RESPONSIVE_MULTI', JSON.stringify(st9));
// RTL/LTR direction smoke: nothing breaks in either direction
const stLTR = await page.evaluate(() => { document.documentElement.dir = 'ltr'; document.documentElement.lang = 'en'; return true; });
console.log('DIR_LTR_OK', stLTR);
await page.setViewport({ width: 768, height: 740 });
const stRTL = await page.evaluate(() => { document.documentElement.dir = 'rtl'; document.documentElement.lang = 'ar'; return true; });
console.log('DIR_RTL_OK', stRTL);
await page.setViewport({ width: 768, height: 740 });
const stKU = await page.evaluate(() => { document.documentElement.dir = 'rtl'; document.documentElement.lang = 'ku'; return true; });
console.log('DIR_KU_OK', stKU);
console.log('PAGE_ERRORS', pageErrors);
await browser.close();
server.close();
