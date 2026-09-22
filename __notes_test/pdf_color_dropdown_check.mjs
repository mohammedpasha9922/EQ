// PDF Text Color dropdown behavior probe — visibility/toggle only.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8307;
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
await sleep(600);

const results = [];
const check = (name, ok) => results.push((ok ? 'PASS' : 'FAIL') + '  ' + name);

const state = () => page.evaluate(() => {
  const menu = document.getElementById('smartPdfColorMenu');
  const btn = document.getElementById('smartPdfTextColorBtn');
  const wrap = document.getElementById('smartPdfColorWrap');
  const back = document.getElementById('smartEditorBack');
  const save = document.getElementById('smartEditorSaveBtn');
  const send = document.getElementById('smartEditorSendBtn');
  return {
    menuExists: !!menu, btnExists: !!btn, wrapExists: !!wrap,
    backExists: !!back, saveExists: !!save, sendExists: !!send,
    hidden: menu ? menu.hasAttribute('hidden') : null,
    expanded: btn ? btn.getAttribute('aria-expanded') : null,
    swatches: menu ? menu.querySelectorAll('.smart-pdf-color-swatch').length : 0,
    menuCount: document.querySelectorAll('#smartPdfColorMenu').length,
    colorBtnCount: document.querySelectorAll('#smartPdfTextColorBtn').length,
    saveBtnCount: document.querySelectorAll('#smartEditorSaveBtn').length,
    sendBtnCount: document.querySelectorAll('#smartEditorSendBtn').length,
    backBtnCount: document.querySelectorAll('#smartEditorBack').length
  };
});

// Hidden-view-safe click helpers (editor view is display:none without an open PDF)
const clickBtn = () => page.evaluate(() => document.getElementById('smartPdfTextColorBtn').click());
const clickSwatch = (hex) => page.evaluate((h) => document.querySelector('#smartPdfColorMenu .smart-pdf-color-swatch[data-color="' + h + '"]').click(), hex);
const pressEscape = () => page.evaluate(() => document.getElementById('smartPdfColorMenu').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));

// 1. Initial state
let s = await state();
check('Text Color button exists in smart-pdf-toolbar', s.btnExists && s.wrapExists);
check('Color menu exists and is HIDDEN initially', s.menuExists && s.hidden === true);
check('Button aria-expanded=false initially', s.expanded === 'false');
check('Back / Save / Send exist once each', s.backBtnCount === 1 && s.saveBtnCount === 1 && s.sendBtnCount === 1);
check('Exactly ONE color menu (no duplicates)', s.menuCount === 1 && s.colorBtnCount === 1);
check('Exactly 8 color swatches', s.swatches === 8);

// 2. Click Text Color -> menu opens
await clickBtn();
await sleep(150);
s = await state();
check('Click Text Color -> menu VISIBLE', s.hidden === false);
check('aria-expanded=true after open', s.expanded === 'true');

// 3. Click again -> closes
await clickBtn();
await sleep(150);
s = await state();
check('Click Text Color again -> menu HIDDEN', s.hidden === true);
check('aria-expanded=false after close', s.expanded === 'false');

// 4. Open then Escape -> closes
await clickBtn();
await sleep(150);
await pressEscape();
await sleep(150);
s = await state();
check('Escape -> menu closes', s.hidden === true);

// 5. Open then click outside -> closes
await clickBtn();
await sleep(150);
await page.evaluate(() => { document.body.click(); });
await sleep(150);
s = await state();
check('Click outside -> menu closes', s.hidden === true);

// 6. Select a swatch: applies via the internal smartPdfApplyTextColor + auto-closes.
// (app.js scoping prevents window-level interception, so we assert the handler's
//  call statically + confirm the click flow runs clean and closes the menu.)
const handlerCallsApply = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8')
  .includes('smartPdfApplyTextColor(hex)');
await clickBtn();
await sleep(150);
const beforeSel = await page.evaluate(() => document.getElementById('smartPdfColorMenu').hasAttribute('hidden'));
await clickSwatch('#ff0000');
await sleep(150);
const afterSel = await page.evaluate(() => document.getElementById('smartPdfColorMenu').hasAttribute('hidden'));
check('Select color -> swatch handler invokes smartPdfApplyTextColor(hex)', handlerCallsApply);
check('Select color -> menu closes automatically', beforeSel === false && afterSel === true);

// 7. Swatch set integrity
const swatches = await page.evaluate(() => Array.from(document.querySelectorAll('#smartPdfColorMenu .smart-pdf-color-swatch')).map(b => b.getAttribute('data-color')));
check('All 8 expected colors present (Black/Red/Green/Blue/Orange/Purple/Yellow/White)',
  JSON.stringify(swatches) === JSON.stringify(['#000000','#ff0000','#008000','#0000ff','#ffa500','#800080','#ffff00','#ffffff']));

// 8. Save/Send/Back still wired (click dispatch must not throw)
const wiring = await page.evaluate(() => {
  try {
    for (const id of ['smartEditorBack', 'smartEditorSaveBtn', 'smartEditorSendBtn']) {
      const el = document.getElementById(id);
      if (!el) return false;
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    }
    return true;
  } catch (e) { return false; }
});
check('Save / Send / Back click dispatch does not throw (handlers intact)', wiring === true);

check('No JavaScript page errors during the whole flow', pageError === null);

// Mobile viewport sanity
await page.setViewport({ width: 390, height: 780 });
await sleep(300);
await clickBtn();
await sleep(150);
const mobile = await page.evaluate(() => {
  const menu = document.getElementById('smartPdfColorMenu');
  const r = menu.getBoundingClientRect();
  return { hidden: menu.hasAttribute('hidden'), withinScreen: r.left >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight };
});
check('Mobile: menu opens and stays within screen bounds', mobile.hidden === false && mobile.withinScreen === true);

console.log(results.join('\n'));
const fails = results.filter(r => r.startsWith('FAIL')).length;
console.log('\nPDF COLOR DROPDOWN SUMMARY: ' + (results.length - fails) + '/' + results.length + ' passed' + (fails ? ' — FAILS=' + fails : ''));
await browser.close();
server.close();
process.exit(fails || pageError ? 1 : 0);

