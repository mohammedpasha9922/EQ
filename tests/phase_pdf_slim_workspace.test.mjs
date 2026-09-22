// PHASE: SMART DOCUMENTS PDF FULL WORKSPACE + SLIM TOOLBAR — runtime smoke test.
// Run:  node tests/phase_pdf_slim_workspace.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8449;
const FIXTURE = path.join(ROOT, '__notes_test', '_p19_fixture_2p.pdf');
let pass = 0, fail = 0, pageErrs = [];
const check = (n, ok, d = '') => { console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  -> ' + d : '')); if (ok) pass++; else fail++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.pdf': 'application/pdf' };
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
const server = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!p || p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    res.writeHead(200, { 'Content-Type': mimeOf(f) + '; charset=utf-8' });
    res.end(fs.readFileSync(f));
  } catch (e) { if (!res.headersSent) { res.writeHead(404); res.end('nf'); } }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
page.on('pageerror', (e) => pageErrs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') pageErrs.push('console: ' + m.text()); });

async function openSmartDocsAndUpload() {
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
  await sleep(800);
  await page.evaluate(() => { document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]')?.click(); });
  await sleep(500);
  const empty = await page.evaluate(() => ({
    modalOpen: !!document.querySelector('#smartDocsModal.show'),
    emptyVisible: !document.getElementById('smartPdfEmpty').hidden,
    uploadBtn: !!document.getElementById('smartPdfUploadBtn')
  }));
  check('1) Smart Documents opens with Upload PDF', empty.modalOpen && empty.emptyVisible && empty.uploadBtn);
  await page.evaluate((b64) => {
    const bin = atob(b64); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const dt = new DataTransfer(); dt.items.add(new File([u8], 'smoke.pdf', { type: 'application/pdf' }));
    const fi = document.getElementById('smartPdfFileInput');
    fi.files = dt.files; fi.dispatchEvent(new Event('change', { bubbles: true }));
  }, fs.readFileSync(FIXTURE).toString('base64'));
  for (let i = 0; i < 60; i++) {
    const s = await page.evaluate(() => {
      const pages = document.querySelectorAll('#smartPdfPages .smart-pdf-page');
      const painted = [...pages].filter((p) => { const c = p.querySelector('canvas'); return c && c.width > 0; }).length;
      return { ws: !document.getElementById('smartPdfWorkspace').hidden, n: pages.length, painted };
    });
    if (s.ws && s.n >= 2 && s.painted >= 2) return s;
    await sleep(250);
  }
  return null;
}

// Desktop run
let r = await openSmartDocsAndUpload();
check('2) PDF loads, all pages rendered', !!r && r.n >= 2 && r.painted >= 2, JSON.stringify(r));
if (r) {
  const layout = await page.evaluate(() => {
    const home = document.querySelector('#smartDocsModal .smart-docs-home');
    const tb = document.getElementById('smartPdfToolbar');
    const sc = document.getElementById('smartPdfScroll');
    const hdr = home.querySelector('.smart-docs-header');
    const tbR = tb.getBoundingClientRect(), scR = sc.getBoundingClientRect();
    return {
      hasPdf: home.classList.contains('has-pdf'),
      headerHidden: getComputedStyle(hdr).display === 'none',
      tbH: tbR.height,
      scH: scR.height, scScrollable: sc.scrollHeight > sc.clientHeight,
      tbBelowScroll: tbR.bottom <= scR.top + 1,
      scOverflowY: getComputedStyle(sc).overflowY,
      docScrollable: document.documentElement.scrollWidth <= window.innerWidth + 1
    };
  });
  check('3) has-pdf fullscreen mode active', layout.hasPdf);
  check('4) big header hidden after PDF load', layout.headerHidden);
  check('5) toolbar slim (<= 46px)', layout.tbH <= 46.5, 'h=' + layout.tbH.toFixed(1));
  check('6) toolbar above PDF, not covering', layout.tbBelowScroll);
  check('7) PDF scroll takes remaining space', layout.scH > 300 && layout.scOverflowY === 'auto', 'scH=' + layout.scH);
  check('8) multi-page scroll works', layout.scScrollable);
  check('9) no horizontal page overflow', layout.docScrollable);
  const before = await page.evaluate(() => document.getElementById('smartPdfToolbar').getBoundingClientRect().top);
  await page.evaluate(() => { const sc = document.getElementById('smartPdfScroll'); sc.scrollTop = sc.scrollHeight; });
  await sleep(400);
  const after = await page.evaluate(() => ({
    tbTop: document.getElementById('smartPdfToolbar').getBoundingClientRect().top,
    scrollTop: document.getElementById('smartPdfScroll').scrollTop
  }));
  check('10) toolbar stays fixed while PDF scrolls', Math.abs(after.tbTop - before) < 2 && after.scrollTop > 100, JSON.stringify(after));
  await page.evaluate(() => document.getElementById('smartPdfBackBtn').click());
  await sleep(500);
  const closed = await page.evaluate(() => !document.querySelector('#smartDocsModal.show'));
  check('11) toolbar back button closes Smart Documents', closed);
}

// Mobile (narrow + touch) run
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
r = await openSmartDocsAndUpload();
check('12) MOBILE: PDF loads', !!r, JSON.stringify(r));
if (r) {
  const m = await page.evaluate(() => {
    const home = document.querySelector('#smartDocsModal .smart-docs-home');
    const tb = document.getElementById('smartPdfToolbar');
    const sc = document.getElementById('smartPdfScroll');
    const tbR = tb.getBoundingClientRect();
    const csTb = getComputedStyle(tb);
    const csHint = getComputedStyle(document.getElementById('smartPdfEditHint'));
    return {
      hasPdf: home.classList.contains('has-pdf'),
      tbH: tbR.height,
      tbOverflowX: csTb.overflowX,
      hintHidden: csHint.display === 'none',
      scH: sc.getBoundingClientRect().height,
      noPageOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1
    };
  });
  check('13) MOBILE: has-pdf mode + slim toolbar', m.hasPdf && m.tbH <= 44.5, 'tbH=' + m.tbH.toFixed(1));
  check('14) MOBILE: toolbar horizontal scroll fallback', m.tbOverflowX === 'auto');
  check('15) MOBILE: edit hint hidden to keep toolbar one row', m.hintHidden);
  check('16) MOBILE: PDF fills remaining space', m.scH > 500, 'scH=' + m.scH);
  check('17) MOBILE: no horizontal page overflow', m.noPageOverflow);
}
check('18) no page JavaScript errors', pageErrs.length === 0, pageErrs.slice(0, 3).join(' | '));
await browser.close();
server.close();
console.log((fail === 0 ? 'PHASE PDF SLIM RUNTIME ALL PASS' : 'PHASE PDF SLIM RUNTIME FAILURES: ' + fail));
process.exit(fail === 0 ? 0 : 1);
