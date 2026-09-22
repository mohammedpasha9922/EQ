// PART 30 triage probe (diagnosis only): reproduces the 4 failing checks'
// preconditions and dumps raw diagnostics. Does NOT modify app code.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8471;
const FIXTURE = path.join(ROOT, '__notes_test', '_p19_fixture_2p.pdf');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.pdf': 'application/pdf' };
const server = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!p || p === '/') p = '/index.html';
    res.writeHead(200, { 'Content-Type': (MIME[path.extname(p)] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(fs.readFileSync(path.join(ROOT, p)));
  } catch (e) { if (!res.headersSent) { res.writeHead(404); res.end('nf'); } }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 900 });
const FIXTURE_B64 = fs.readFileSync(FIXTURE).toString('base64');
const DOC_NAME = 'p30_style_doc.pdf';
async function gotoApp() { await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 }); await sleep(800); }
async function injectFile(name, b64) {
  return await page.evaluate(async (n, b64) => {
    const bin = atob(b64); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const dt = new DataTransfer(); dt.items.add(new File([u8], n, { type: 'application/pdf' }));
    const fi = document.getElementById('smartImportFileInput');
    if (!fi) return false;
    fi.files = dt.files; fi.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, name, b64);
}
async function waitEditor() {
  for (let i = 0; i < 120; i++) {
    const ok = await page.evaluate(() => {
      const ed = document.getElementById('smartEditorView');
      return !!(ed && ed.classList.contains('editor-visible') && document.querySelectorAll('#smartPdfEditor .smart-pdf-page').length >= 1 && document.querySelectorAll('#smartPdfEditor .smart-pdf-text').length > 0);
    });
    if (ok) return true;
    await sleep(300);
  }
  return false;
}
const out = [];
const log = (k, v) => { out.push(k + ' => ' + JSON.stringify(v)); console.log(k, JSON.stringify(v)); fs.writeFileSync(path.join(ROOT, '__p30probe_out.txt'), out.join('\n')); };

await gotoApp();
await injectFile(DOC_NAME, FIXTURE_B64);
await waitEditor(); await sleep(400);
await page.evaluate(() => document.getElementById('smartPdfStyleBtn').click()); await sleep(200);
await page.evaluate(() => { const m = document.getElementById('smartPdfStyleMenu'); const it = m.querySelector('[data-style="business"]'); if (it) it.click(); }); await sleep(300);
async function addVia(kind) {
  await page.evaluate((k) => { document.getElementById('smartPdfAddBtn').click(); const item = document.querySelector('.smart-pdf-add-item[data-add="' + k + '"]'); if (item) item.click(); }, kind);
  await sleep(450);
}
async function overlayDump() {
  return await page.evaluate(() => [...document.querySelectorAll('#smartPdfEditor .smart-pdf-overlay:not(.smart-pdf-style-chrome)')].map((b) => ({ cls: b.className, page: b.dataset.page })));
}
log('A-after-text', await (async () => { await addVia('text'); return await overlayDump(); })());
log('B-after-date', await (async () => { await addVia('date'); return await overlayDump(); })());
log('B-dialogs', await page.evaluate(() => [...document.querySelectorAll('.eq-modal, [role="dialog"], .smart-pdf-date-picker, #smartPdfDateControls')].map((d) => ({ id: d.id || d.className, hidden: d.hasAttribute('hidden') }))));
log('C-after-table', await (async () => { await addVia('table'); return await overlayDump(); })());
log('D-count-before-reload', await page.evaluate(() => document.querySelectorAll('#smartPdfEditor .smart-pdf-overlay:not(.smart-pdf-style-chrome)').length));
await page.evaluate(() => { const d = document.querySelector('#smartPdfEditor .smart-pdf-style-footer .smart-pdf-overlay-del'); if (d) d.click(); }); await sleep(250);
await page.evaluate(() => document.getElementById('smartPdfStyleBtn').click()); await sleep(150);
await page.evaluate(() => { const m = document.getElementById('smartPdfStyleMenu'); const it = m.querySelector('[data-style="business"]'); if (it) it.click(); }); await sleep(300);
log('E-footer-after-resuppress', await page.evaluate(() => ({ footerEl: !!document.querySelector('#smartPdfEditor .smart-pdf-style-footer'), supp: (window.__smartPdfStyle ? window.__smartPdfStyle.get().suppressed : null) })));
await gotoApp();
await injectFile(DOC_NAME, FIXTURE_B64);
await waitEditor(); await sleep(500);
log('F-count-after-reinject', await page.evaluate(() => document.querySelectorAll('#smartPdfEditor .smart-pdf-overlay:not(.smart-pdf-style-chrome)').length));
log('G-style-after-reinject', await page.evaluate(() => window.__smartPdfStyle ? window.__smartPdfStyle.active() : null));
// mobile-first: open editor AT 390px
await page.setViewport({ width: 390, height: 844 });
await gotoApp();
await injectFile(DOC_NAME, FIXTURE_B64);
const weM = await waitEditor();
log('I-mobile-first-editor', weM);
log('J-mobile-first-stylebtn', await page.evaluate(() => {
  const btn = document.getElementById('smartPdfStyleBtn');
  if (!btn) return { found: false };
  const r = btn.getBoundingClientRect();
  const chain = [];
  let el = btn;
  while (el && el !== document.documentElement) {
    const cs = getComputedStyle(el);
    const cr = el.getBoundingClientRect();
    chain.push({ tag: el.tagName, id: el.id || null, cls: String(el.className).slice(0, 50), disp: cs.display, ov: cs.overflow, x: Math.round(cr.x), w: Math.round(cr.width), h: Math.round(cr.height) });
    el = el.parentElement;
  }
  return { found: true, x: Math.round(r.x), w: Math.round(r.width), right: Math.round(r.right), inner: window.innerWidth, editorVisible: document.getElementById('smartEditorView').classList.contains('editor-visible'), chain };
}));
log('K-mobile-first-menu', await page.evaluate(() => {
  const m = document.getElementById('smartPdfStyleMenu');
  const it = m && m.querySelector('[data-style="business"]');
  if (!it) return { menuOpen: !!(m && !m.hasAttribute('hidden')), item: false };
  const ir = it.getBoundingClientRect();
  return { menuOpen: !!(m && !m.hasAttribute('hidden')), item: true, left: Math.round(ir.left), right: Math.round(ir.right), inner: window.innerWidth };
}));
await browser.close(); server.close(); process.exit(0);
