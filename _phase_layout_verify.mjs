// PHASE: SMART DOCUMENTS PDF FULL WORKSPACE LAYOUT — extended runtime checks
// (large desktop, RTL ar, LTR en, many pages, PDF Reports untouched).
// Run:  node _phase_layout_verify.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const ROOT = 'd:/Programs EQ7/EQ';
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8461;
let pass = 0, fail = 0, pageErrs = [];
const check = (n, ok, d = '') => { console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  -> ' + d : '')); if (ok) pass++; else fail++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Minimal N-page PDF (A4, blank pages)
function makePdf(np) {
  const head = '%PDF-1.4\n';
  let objs = [], kids = [];
  for (let i = 1; i <= np; i++) kids.push(`${3 + i} 0 R`);
  objs.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objs.push(`2 0 obj\n<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${np} >>\nendobj\n`);
  for (let i = 1; i <= np; i++) {
    objs.push(`${3 + i} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${3 + np + i} 0 R /Resources << >> >>\nendobj\n`);
  }
  let stream = [];
  for (let i = 1; i <= np; i++) {
    const c = `1 0 0 RG 40 780 200 1 re f`;
    stream.push(`${3 + np + i} 0 obj\n<< /Length ${c.length} >>\nstream\n${c}\nendstream\nendobj\n`);
  }
  let body = head; let offs = []; let pos = head.length;
  [...objs, ...stream].forEach((o) => { offs.push(pos); body += o; pos += o.length; });
  const xref = pos;
  body += `xref\n0 ${4 + 2 * np}\n0000000000 65535 f \n` + offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  body += `trailer\n<< /Size ${4 + 2 * np} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(body, 'latin1');
}
fs.writeFileSync(path.join(ROOT, '__notes_test', '_pws_fixture_6p.pdf'), makePdf(6));

const FIX2 = path.join(ROOT, '__notes_test', '_p19_fixture_2p.pdf');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.pdf': 'application/pdf' };
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

async function upload(b64, expectN) {
  await page.evaluate((b) => {
    const bin = atob(b); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const dt = new DataTransfer(); dt.items.add(new File([u8], 'm.pdf', { type: 'application/pdf' }));
    const fi = document.getElementById('smartPdfFileInput');
    fi.files = dt.files; fi.dispatchEvent(new Event('change', { bubbles: true }));
  }, b64);
  for (let i = 0; i < 80; i++) {
    const s = await page.evaluate((exp) => {
      const ps = [...document.querySelectorAll('#smartPdfPages .smart-pdf-page')];
      return { n: ps.length, painted: ps.filter((p) => { const c = p.querySelector('canvas'); return c && c.width > 0; }).length };
    }, expectN || 0);
    // Must match the EXPECTED count (avoid the stale previous-doc snapshot),
    // all canvases painted, and stay stable across two consecutive polls.
    if (s.n > 0 && s.painted === s.n && (!expectN || s.n === expectN)) {
      await sleep(250);
      const s2 = await page.evaluate(() => {
        const ps = [...document.querySelectorAll('#smartPdfPages .smart-pdf-page')];
        return { n: ps.length, painted: ps.filter((p) => { const c = p.querySelector('canvas'); return c && c.width > 0; }).length };
      });
      if (s2.n === s.n && s2.painted === s2.n) return s2;
    }
    await sleep(250);
  }
  return null;
}

async function open(locale) {
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 60000 });
  await sleep(800);
  if (locale) { await page.evaluate((l) => { if (typeof setLanguage === 'function') setLanguage(l); }, locale); await sleep(600); }
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]')?.click());
  await sleep(600);
}

async function layout() {
  return page.evaluate(() => {
    const home = document.querySelector('#smartDocsModal .smart-docs-home');
    const hdr = home.querySelector('.smart-docs-header');
    const tb = document.getElementById('smartPdfToolbar');
    const sc = document.getElementById('smartPdfScroll');
    const empty = document.getElementById('smartPdfEmpty');
    const tbR = tb.getBoundingClientRect(), scR = sc.getBoundingClientRect(), homeR = home.getBoundingClientRect();
    const cs = getComputedStyle(sc);
    return {
      emptyGone: getComputedStyle(empty).display === 'none',
      hdrHidden: getComputedStyle(hdr).display === 'none',
      tbH: tbR.height, tbTop: tbR.top, scTop: scR.top,
      scH: scR.height, scB: scR.bottom,
      homeH: homeR.height, vh: window.innerHeight,
      overflowY: cs.overflowY, maxH: cs.maxHeight,
      gap: scR.top - tbR.bottom,
      spaceAbove: tbR.top
    };
  });
}

// ---- A) Large desktop LTR + upload state ----
await page.setViewport({ width: 1366, height: 768 });
await open('en');
let r = await upload(fs.readFileSync(FIX2).toString('base64'), 2);
let L = await layout();
check('A0) PDF loaded', !!r, JSON.stringify(r));
check('A1) LTR: upload/empty state fully gone after PDF', L.emptyGone);
check('A2) LTR desktop: no big space above toolbar', L.spaceAbove <= 30, 'spaceAbove=' + L.spaceAbove);
check('A3) LTR desktop: toolbar slim 40-46px', L.tbH >= 39 && L.tbH <= 46.5, 'tbH=' + L.tbH);
check('A4) LTR desktop: PDF starts directly below toolbar', L.gap >= -1 && L.gap <= 12, 'gap=' + L.gap);
check('A5) LTR desktop: PDF fills remaining height (no small max-height)', L.scH > 0.55 * (L.homeH - L.tbH) && L.maxH === 'none', 'scH=' + L.scH + ' maxH=' + L.maxH);
check('A6) LTR desktop: modal uses ~full viewport height', L.homeH >= L.vh - 40, 'homeH=' + L.homeH + ' vh=' + L.vh);

// ---- B) Many pages (6-page PDF) scroll ----
r = await upload(fs.readFileSync(path.join(ROOT, '__notes_test', '_pws_fixture_6p.pdf')).toString('base64'), 6);
const diag = await page.evaluate(async (b64) => {
  try {
    const bin = atob(b64); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const doc = await window.pdfjsLib.getDocument({ data: u8 }).promise;
    return { numPages: doc.numPages };
  } catch (e) { return { err: String(e && e.message || e) }; }
}, fs.readFileSync(path.join(ROOT, '__notes_test', '_pws_fixture_6p.pdf')).toString('base64'));
console.log('DIAG 6p:', JSON.stringify(diag));
check('B1) 6-page PDF loads, all painted', !!r && r.n === 6, JSON.stringify(r));
L = await layout();
const scrollable = await page.evaluate(() => { const sc = document.getElementById('smartPdfScroll'); return { sh: sc.scrollHeight, ch: sc.clientHeight }; });
check('B2) many pages vertically scrollable', scrollable.sh > scrollable.ch, 'sh=' + scrollable.sh + ' ch=' + scrollable.ch);
const tbTopBefore = L.tbTop;
await page.evaluate(() => { const sc = document.getElementById('smartPdfScroll'); sc.scrollTop = sc.scrollHeight; });
await sleep(500);
L = await layout();
check('B3) toolbar fixed at top while scrolled to last page', Math.abs(L.tbTop - tbTopBefore) < 2 && L.tbTop >= -1, 'tbTop=' + L.tbTop);

// ---- C) RTL Arabic desktop (apply RTL the way the app does) ----
await page.setViewport({ width: 1280, height: 800 });
await open(null);
await page.evaluate(() => {
  document.body.setAttribute('data-language', 'ar');
  document.documentElement.lang = 'ar';
  document.documentElement.dir = 'rtl';
  document.getElementById('smartDocsModal').classList.add('show');
});
await sleep(400);
r = await upload(fs.readFileSync(FIX2).toString('base64'), 2);
L = await layout();
const rtlDir = await page.evaluate(() => getComputedStyle(document.getElementById('smartPdfToolbar')).direction);
check('C1) RTL: toolbar direction rtl', rtlDir === 'rtl', rtlDir);
check('C2) RTL: workspace layout correct', L.emptyGone && L.tbH <= 46.5 && L.gap <= 12 && L.scH > 0.55 * (L.homeH - L.tbH), JSON.stringify(L));

// ---- D) LTR English desktop ----
await open(null);
r = await upload(fs.readFileSync(FIX2).toString('base64'), 2);
L = await layout();
const ltrDir = await page.evaluate(() => getComputedStyle(document.getElementById('smartPdfToolbar')).direction);
check('D1) LTR: toolbar direction ltr + layout correct', ltrDir === 'ltr' && L.tbH <= 46.5 && L.gap <= 12, JSON.stringify(L));

// ---- E) PDF Reports V1 untouched (runtime DOM) ----
const pr = await page.evaluate(() => {
  const w = document.getElementById('pdfReportsWorkspace');
  return { exists: !!w, dropzone: !!document.getElementById('pdfV1Dropzone'), viewer: !!document.getElementById('pdfV1Viewer') };
});
check('E1) PDF Reports V1 workspace DOM unchanged', pr.exists && pr.dropzone && pr.viewer, JSON.stringify(pr));

check('F1) zero JavaScript console errors (all runs)', pageErrs.length === 0, pageErrs.slice(0, 3).join(' | '));
await browser.close(); server.close();
console.log(fail === 0 ? 'EXTENDED LAYOUT VERIFY ALL PASS' : 'EXTENDED LAYOUT VERIFY FAILURES: ' + fail);
process.exit(fail === 0 ? 0 : 1);


