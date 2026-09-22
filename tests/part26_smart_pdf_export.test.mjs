// PART 26 — SMART DOCUMENTS: PDF EXPORT (تصدير PDF)
// Real-Chrome behavioral test. Run:  node tests/part26_smart_pdf_export.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8312;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg'
};
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  try {
    const data = fs.readFileSync(path.join(ROOT, urlPath));
    res.writeHead(200, { 'Content-Type': mimeOf(urlPath) + '; charset=utf-8' });
    res.end(data);
  } catch (e) { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 900000);

const results = [];
let passCount = 0;
const OUT = path.join(ROOT, '__p26_result.txt');
try { fs.unlinkSync(OUT); } catch (e) {}
fs.appendFileSync(OUT, 'STARTED\n');
function check(name, ok, detail = '') {
  results.push({ name, ok });
  if (ok) passCount++;
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`;
  console.log(line);
  fs.appendFileSync(OUT, line + '\n');
}

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new', protocolTimeout: 300000,
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(viewport) {
  const page = await browser.newPage();
  if (viewport) await page.setViewport(viewport);
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await page.evaluateOnNewDocument(() => {
    window.__dialogs = { alert: 0, confirm: 0, prompt: 0 };
    window.alert = () => { window.__dialogs.alert++; };
    window.confirm = () => { window.__dialogs.confirm++; return true; };
    window.prompt = () => { window.__dialogs.prompt++; return ''; };
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(600);
  return { page, errs };
}
async function setLang(page, locale) {
  await page.evaluate((l) => {
    const s = document.getElementById('topBarLanguageSelect');
    if (s) { s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); }
  }, locale);
  await sleep(400);
}
async function openBlank(page, locale) {
  await page.evaluate(() => document.getElementById('drawerToggle').click());
  await sleep(250);
  if (locale) await setLang(page, locale);
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click());
  await sleep(400);
  await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-new-doc"]').click());
  await sleep(450);
}
// __P26_CHUNK2__
async function seedText(page, txt) {
  await page.evaluate(() => window.__smartBlank.insertElement('text'));
  await sleep(200);
  await page.evaluate((t) => {
    const holder = document.getElementById('smartBlankCanvasHolder');
    const cv = Array.from(holder.querySelectorAll('.smart-blank-canvas'))
      .find((c) => !c.classList.contains('smart-page-hidden')) || holder.lastElementChild;
    const b = cv.querySelector('.smart-doc-text-block:last-of-type');
    if (b) b.textContent = t;
  }, txt);
  await sleep(150);
}
async function signDraw(page) {
  await page.evaluate(() => document.querySelector('[data-toolbar="blank-doc"] button[data-tool="signature"]').click());
  await sleep(200);
  await page.evaluate(() => document.querySelector('#smartSignatureMenu .smart-sig-item[data-sig-method="draw"]').click());
  await sleep(250);
  const box = await page.evaluate(() => {
    const r = document.getElementById('signatureCanvas').getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.mouse.move(box.x + box.w * 0.2, box.y + box.h * 0.5);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(box.x + box.w * (0.2 + 0.6 * i / 8), box.y + box.h * (0.5 + 0.25 * Math.sin(i)));
    await sleep(15);
  }
  await page.mouse.up();
  await sleep(120);
  await page.evaluate(() => document.querySelector('#sigStageDraw .smart-sig-insert').click());
  await sleep(300);
}
const stateSnap = (page) => page.evaluate(() => ({
  currentPage: window.__smartBlank.getState().currentPage,
  pageCount: window.__smartBlank.getState().pageCount,
  name: window.__smartDocName.get(),
  desc: JSON.stringify(window.__smartPages.describe()),
  dirty: !!window.__smartSave.getState().dirty
}));
// Build the PDF through the PART 26 seam and return base64 (no download).
async function exportPdf(page, opts) {
  try {
    const b64 = await page.evaluate(async (o) => {
      const blob = await window.__smartPdfExport.buildBlob(o || {});
      if (!blob || !blob.size) return '';
      const buf = new Uint8Array(await blob.arrayBuffer());
      let bin = '';
      for (let i = 0; i < buf.length; i += 0x8000) {
        bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
      }
      return btoa(bin);
    }, opts);
    return { ok: !!b64, b64, error: b64 ? '' : 'empty blob' };
  } catch (err) {
    return { ok: false, b64: '', error: String(err && err.message || err) };
  }
}
function inspectPdf(b64) {
  const buf = Buffer.from(b64, 'base64');
  const head = buf.subarray(0, 5).toString('latin1');
  const tail = buf.subarray(Math.max(0, buf.length - 32)).toString('latin1');
  const raw = buf.toString('latin1');
  const pageCount = (raw.match(/\/Type\s*\/Page[^s]/g) || []).length;
  return { headerOk: head === '%PDF-', tailOk: tail.includes('%%EOF'), pageCount, size: buf.length };
}
// __P26_CHUNK3__
// ============================================================
// Main scenario
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 900 });
  globalThis.__p26ctx = { page, errs };
  await openBlank(page, 'ar');
  await page.evaluate(() => window.__smartDocName.set('عقد إيجار محمد'));
  await sleep(200);

  // A) Export dialog UI
  check('A1) Export PDF button exists', !!(await page.$('#smartPdfExportBtn')));
  check('A2) Exactly ONE Export button',
    (await page.$$('[data-i18n="smartPdfExportButton"]')).length === 1);
  check('A3) Button label localized AR (تصدير PDF)',
    /تصدير PDF/.test(await page.$eval('#smartPdfExportBtn', (n) => n.textContent)));
  await page.evaluate(() => window.__smartPdfExport.open());
  await sleep(250);
  check('A4) Export dialog opens', !(await page.$eval('#smartPdfModal', (n) => n.hidden)));
  check('A5) Filename default from PART 24 name',
    (await page.$eval('#smartPdfFilenameInput', (n) => n.value)) === 'عقد إيجار محمد',
    await page.$eval('#smartPdfFilenameInput', (n) => n.value));
  check('A6) All Pages option exists (default checked)', await page.$eval(
    'input[name="smartPdfPages"][value="all"]', (n) => !!n && n.checked));
  check('A7) Current Page option exists', !!(await page.$('input[name="smartPdfPages"][value="current"]')));
  check('A8) Normal quality exists (default)', await page.$eval(
    'input[name="smartPdfQuality"][value="normal"]', (n) => !!n && n.checked));
  check('A9) High quality option exists', !!(await page.$('input[name="smartPdfQuality"][value="high"]')));
  check('A10) Export confirm button exists in dialog', !!(await page.$('#smartPdfConfirmBtn')));
  await page.click('#smartPdfCancelBtn');
  await sleep(200);
  check('A11) Cancel closes dialog without exporting',
    await page.$eval('#smartPdfModal', (n) => n.hidden));

  // Build a signed, 4-page document from the SAME live pages.
  await seedText(page, 'الصفحة الأولى');
  await signDraw(page);
  for (const txt of ['نص الصفحة الثانية', 'محتوى الصفحة الثالثة', 'الصفحة الرابعة']) {
    await page.evaluate(() => window.__smartPages.add());
    await sleep(300);
    await seedText(page, txt);
  }
  const desc = await page.evaluate(() => window.__smartPages.describe());
  check('A12) Document has 4 pages before export', desc.length === 4, 'count=' + desc.length);

  // B) PDF built from the SAME live pages
  const exp = await exportPdf(page, { pages: 'all', quality: 'high' });
  check('B1) buildBlob produces a PDF blob', exp.ok, exp.error || '');
  if (exp.ok) {
    const po = inspectPdf(exp.b64);
    check('B2) PDF valid (%PDF header + %%EOF tail)', po.headerOk && po.tailOk,
      'head=' + po.headerOk + ' tail=' + po.tailOk + ' size=' + po.size);
    check('B3) PDF contains all 4 live pages', po.pageCount === 4, 'count=' + po.pageCount);
  }
  // __P26_CHUNK4__

  // C) State safety after PDF build
  const before = await stateSnap(page);
  await exportPdf(page, { pages: 'all', quality: 'normal' });
  const afterBuild = await stateSnap(page);
  check('C1) currentPage unchanged after build', before.currentPage === afterBuild.currentPage);
  check('C2) Pages unchanged after build', before.desc === afterBuild.desc);
  check('C3) Document name unchanged after build', before.name === afterBuild.name);

  // D) Filename sanitizer (PART 24 name stays intact internally)
  await page.evaluate(() => { document.querySelector('#smartPdfFilenameInput').value = 'bad<>:"|?*name'; });
  const fn = await page.evaluate(() => window.__smartPdfExport.chosenFilename());
  check('D1) Chosen filename is sanitized + .pdf',
    !/[\\/:*?"<>|]/.test(fn.replace(/\.pdf$/, '')) && fn.endsWith('.pdf'), fn);
  check('D2) Internal document name NOT modified by sanitization',
    (await page.evaluate(() => window.__smartDocName.get())) === 'عقد إيجار محمد');

  // E) Full dialog export run (closes modal + success toast)
  await page.evaluate(() => window.__smartPdfExport.open());
  await sleep(200);
  await page.evaluate(() => { document.querySelector('input[name="smartPdfPages"][value="current"]').checked = true; });
  await page.click('#smartPdfConfirmBtn');
  await sleep(1500);
  const runState = await page.evaluate(() => ({
    modalHidden: document.getElementById('smartPdfModal').hidden,
    toast: (document.getElementById('toast') || {}).textContent || ''
  }));
  check('E1) Dialog export run closes modal', runState.modalHidden);
  check('E2) Success toast shown (تم تصدير PDF بنجاح)', runState.toast.includes('بنجاح'), runState.toast);

  // F) Offline export (real offline via CDP)
  const client = await page.createCDPSession();
  await client.send('Network.emulateNetworkConditions',
    { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  const offExp = await exportPdf(page, { pages: 'all', quality: 'normal' });
  check('F1) PDF export works fully OFFLINE', offExp.ok, offExp.error || '');
  if (offExp.ok) {
    const po = inspectPdf(offExp.b64);
    check('F2) Offline PDF valid with 4 pages', po.headerOk && po.tailOk && po.pageCount === 4,
      'count=' + po.pageCount);
  }
  await client.send('Network.emulateNetworkConditions',
    { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
// __P26_CHUNK5__

  // G) RTL / LTR
  const arDir = await page.$eval('#smartPdfModal .smart-pdf-dialog', (n) => getComputedStyle(n).direction);
  check('G1) Arabic locale -> RTL export dialog', arDir === 'rtl', arDir);
  await setLang(page, 'en');
  const enDir = await page.$eval('#smartPdfModal .smart-pdf-dialog', (n) => getComputedStyle(n).direction);
  const enTitle = await page.$eval('#smartPdfTitle', (n) => n.textContent.trim());
  check('G2) English locale -> LTR + localized labels',
    enDir === 'ltr' && /export pdf/i.test(enTitle), enDir + '/' + enTitle);

  // H) Responsive 1280/768/390/360
  for (const wv of [1280, 768, 390, 360]) {
    await page.setViewport({ width: wv, height: 800 });
    await sleep(250);
    await page.evaluate(() => window.__smartPdfExport.open());
    await sleep(200);
    const okNoOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth <= window.innerWidth + 1 &&
      (() => { const r = document.querySelector('#smartPdfModal .smart-pdf-dialog').getBoundingClientRect(); return r.width <= window.innerWidth + 1; })());
    check(`H) Responsive ${wv}px: no horizontal overflow`, okNoOverflow);
    await page.evaluate(() => window.__smartPdfExport.close());
  }

  // I) Stability
  const dl = await page.evaluate(() => window.__dialogs);
  check('I1) alert/confirm/prompt count = 0', dl.alert + dl.confirm + dl.prompt === 0, JSON.stringify(dl));
  check('I2) Total JS errors = 0', globalThis.__p26ctx.errs.length === 0, globalThis.__p26ctx.errs.join('|'));
}

// ============================================================
// Summary
// ============================================================
const fails = results.filter((r) => !r.ok);
console.log(`\n=== PART 26 SUMMARY: pass ${passCount}/${results.length} ===`);
fs.appendFileSync(OUT, `SUMMARY pass ${passCount}/${results.length}\n`);
await browser.close();
server.close();
process.exit(fails.length ? 1 : 0);