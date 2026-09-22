import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8417;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.pdf': 'application/pdf' };
const server = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!p || p === '/') p = '/index.html';
    res.writeHead(200, { 'Content-Type': (MIME[path.extname(p).toLowerCase()] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(fs.readFileSync(path.join(ROOT, p)));
  } catch (e) { if (!res.headersSent) { res.writeHead(404); } res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message.slice(0, 120)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.setViewport({ width: 1366, height: 900 });
await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
await sleep(600);
// open editor with the 2-page fixture
await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]'); if (b) b.click(); });
await sleep(400);
await page.evaluate(() => document.getElementById('pdfOpenCard')?.click());
await sleep(500);
const FIX = path.join(HERE, '_p19_fixture_2p.pdf');
await page.evaluate(async (b64) => {
  const bin = atob(b64); const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const dt = new DataTransfer(); dt.items.add(new File([u8], 'f.pdf', { type: 'application/pdf' }));
  const fi = document.getElementById('smartImportFileInput');
  fi.files = dt.files; fi.dispatchEvent(new Event('change', { bubbles: true }));
}, fs.readFileSync(FIX).toString('base64'));
for (let i = 0; i < 90; i++) {
  const s = await page.evaluate(() => {
    const ed = document.getElementById('smartEditorView');
    const pages = document.querySelectorAll('#smartPdfEditor .smart-pdf-page');
    return { v: !!(ed && ed.classList.contains('editor-visible')), n: pages.length };
  });
  if (s.v && s.n >= 2) break;
  await sleep(250);
}
await page.evaluate(() => {
  const btn = document.getElementById('smartPdfAddBtn');
  if (btn) btn.click();
});
await sleep(200);
await page.evaluate(() => {
  const item = document.querySelector('.smart-pdf-add-item[data-add="table"]');
  if (item) item.click();
});
await sleep(600);
// P23-07 probe: DOM identity around pointerdown
const probe0 = await page.evaluate(() => {
  const td = document.querySelector('#smartPdfEditor .smart-pdf-ov-table td[data-r="0"][data-c="0"]');
  if (!td) return { err: 'no td' };
  const btn = document.getElementById('smartPdfAddBtn');
  try { btn.focus(); } catch (e) {}
  const btnFocused = document.activeElement === btn;
  const inertAncestor = !!td.closest('[inert]');
  let n = td, chain = [];
  while (n && n !== document.body) { if (n.getAttribute && (n.getAttribute('inert') != null || (n.getAttribute('tabindex') && n.getAttribute('tabindex') === '-1'))) chain.push((n.className || n.tagName).toString().slice(0, 40)); n = n.parentElement; }
  try { td.focus(); } catch (e) { return { err: 'focus threw ' + e.message }; }
  return { btnFocused, inertAncestor, chain, plainFocus: document.activeElement === td, tag: document.activeElement && document.activeElement.tagName, ce: td.isContentEditable, disp: getComputedStyle(td).display };
});
console.log('P23-07 probe0:', JSON.stringify(probe0));
// real trusted mouse click on the first cell
const cellBox = await page.evaluate(() => {
  const td = document.querySelector('#smartPdfEditor .smart-pdf-ov-table td[data-r="0"][data-c="0"]');
  const r = td.getBoundingClientRect();
  const el = document.elementFromPoint(r.left + Math.min(8, r.width / 2), r.top + r.height / 2);
  const body = document.querySelector('.note-export-pdf-body');
  const z = (n) => { let c = n; const out = []; while (c && c !== document.body && out.length < 15) { const cs = getComputedStyle(c); out.push((c.className || c.tagName).toString().slice(0, 30) + '|pe:' + cs.pointerEvents + '|z:' + cs.zIndex + '|p:' + cs.position); c = c.parentElement; } return out; };
  const tdFullChain = (() => { let c = td; const out = []; while (c && out.length < 20) { out.push((c.className || c.tagName).toString().slice(0, 30)); c = c.parentElement; } return out; })();
  return { x: r.left + Math.min(8, r.width / 2), y: r.top + r.height / 2, hit: el ? (el.tagName + '.' + (el.className || '')).slice(0, 60) : 'null', isTd: el === td, tdInBody: body ? body.contains(td) : false, tdChain: z(td), hitChain: el ? z(el) : [], tdFullChain };
});
await page.mouse.click(cellBox.x, cellBox.y);
console.log('P23-07 hit info:', JSON.stringify(cellBox));
await sleep(150);
const probeReal = await page.evaluate(() => {
  const td = document.querySelector('#smartPdfEditor .smart-pdf-ov-table td[data-r="0"][data-c="0"]');
  return { aeIsTd: document.activeElement === td, aeTag: document.activeElement && document.activeElement.tagName, sel: !!document.querySelector('#smartPdfEditor .smart-pdf-ov-table td.is-sel') };
});
console.log('P23-07 real click:', JSON.stringify(probeReal));
const probe1 = await page.evaluate(() => {
  const td = document.querySelector('#smartPdfEditor .smart-pdf-ov-table td[data-r="0"][data-c="0"]');
  if (!td) return { err: 'no td', boxes: document.querySelectorAll('#smartPdfEditor .smart-pdf-ov-table').length };
  const r = td.getBoundingClientRect();
  td.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + 4, clientY: r.top + 4 }));
  const td2 = document.querySelector('#smartPdfEditor .smart-pdf-ov-table td[data-r="0"][data-c="0"]');
  const same = td === td2;
  try { td2.focus(); } catch (e) {}
  return { same, aeIsTd: document.activeElement === td2, sel: !!document.querySelector('#smartPdfEditor .smart-pdf-ov-table td.is-sel'), editable: td2.isContentEditable };
});
console.log('P23-07 probe:', JSON.stringify(probe1));
await sleep(50);
const probe1b = await page.evaluate(() => {
  window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 12, clientY: 12 }));
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 12, clientY: 12 }));
  const td = document.querySelector('#smartPdfEditor .smart-pdf-ov-table td[data-r="0"][data-c="0"]');
  try { td.focus(); } catch (e) {}
  const r = { afterUp: document.activeElement === td, sel: !!document.querySelector('#smartPdfEditor .smart-pdf-ov-table td.is-sel') };
  return r;
});
console.log('P23-07 probe after move+pointerup:', JSON.stringify(probe1b));
const probe1c = await page.evaluate(() => {
  document.body.click();
  const td = document.querySelector('#smartPdfEditor .smart-pdf-ov-table td[data-r="0"][data-c="0"]');
  try { td.focus(); } catch (e) {}
  return { afterBodyClick: document.activeElement === td, sel: !!document.querySelector('#smartPdfEditor .smart-pdf-ov-table td.is-sel') };
});
console.log('P23-07 probe after body click:', JSON.stringify(probe1c));
await sleep(200);
const probe2 = await page.evaluate(() => ({ aeIsTd: document.activeElement === document.querySelector('#smartPdfEditor .smart-pdf-ov-table td[data-r="0"][data-c="0"]'), sel: !!document.querySelector('#smartPdfEditor .smart-pdf-ov-table td.is-sel') }));
console.log('P23-07 probe after 200ms:', JSON.stringify(probe2));
// P23-41 probe
const resp = [];
for (const w of [1366, 768, 430, 390]) {
  await page.setViewport({ width: w, height: 850 });
  await sleep(300);
  const r = await page.evaluate(() => {
    const bar = document.querySelector('#smartPdfEditor .smart-pdf-ov-table .smart-pdf-tbar');
    const btn = bar ? bar.querySelector('[data-tact="row+"]') : null;
    const br = bar ? bar.getBoundingClientRect() : null;
    return { w: innerWidth, bar: !!bar, btn: !!btn, bl: br ? Math.round(br.left) : null, brR: br ? Math.round(br.right) : null, bw: br ? Math.round(br.width) : null, vis: bar ? getComputedStyle(bar).display : null };
  });
  resp.push(r);
}
console.log('P23-41 probe:', JSON.stringify(resp));
await browser.close(); server.close();
