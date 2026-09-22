// PART 31 — SMART DOCUMENTS: PDF PREVIEW (المعاينة)
// Real-Chrome behavioral test. Run: node tests/part31_preview.test.mjs
//
// Verifies the new mandatory PREVIEW stage before final PDF export:
//   PDF Editor -> Preview ("this is the file that will be saved.") -> Save PDF / Share
//
// Design guarantees:
//   • The Preview reuses the SAME export pipeline (smartPdfBuildBlob →
//     smartPdfRasterizePage → smartPdfAssemble). The preview page gallery shows
//     the EXACT rasterized pages embedded in the PDF (no second renderer, no mock).
//   • Save PDF delivers the SAME Blob that was previewed (no rebuild → no lost
//     overlays/styles/page-order/tables/signatures/stamps/logos/dates).
//   • Web Share is used ONLY when the browser truly supports FILE sharing;
//     otherwise a reliable offline download fallback runs (honest, no crash).
//   • Preview never mutates editor/page/overlay/dirty/signature state.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8391;
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
const OUT = path.join(ROOT, '__p31_result.txt');
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
  page.on('pageerror', (e) => errs.push(String((e && e.message) || e)));
  await page.evaluateOnNewDocument(() => {
    window.__dialogs = { alert: 0, confirm: 0, prompt: 0 };
    window.alert = () => { window.__dialogs.alert++; };
    window.confirm = () => { window.__dialogs.confirm++; return true; };
    window.prompt = () => { window.__dialogs.prompt++; return ''; };
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(700);
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
  await sleep(500);
}
// Insert a text block on the current page and set its text.
async function seedText(page, txt) {
  await page.evaluate((t) => {
    window.__smartBlank.insertElement('text');
    const cv = Array.from(document.querySelectorAll('#smartBlankCanvasHolder .smart-blank-canvas'))
      .find((c) => !c.classList.contains('smart-page-hidden'));
    const block = cv.querySelector('.smart-doc-text-block:last-of-type');
    if (block) block.textContent = t;
  }, txt);
  await sleep(200);
}
// Build a multi-page, multi-element document (text/table/divider + page design).
async function buildDoc(page, locale) {
  await openBlank(page, locale);
  await page.evaluate(() => window.__smartDocName.set('Preview Doc'));
  await sleep(200);
  await seedText(page, 'First page text');
  await page.evaluate(() => { try { window.__smartBlank.insertElement('table'); } catch (e) {} });
  await sleep(250);
  await page.evaluate(() => { try { window.__smartBlank.insertElement('divider'); } catch (e) {} });
  await sleep(200);
  for (const t of ['Second page text', 'Third page text', 'Fourth page text']) {
    await page.evaluate(() => window.__smartPages.add());
    await sleep(300);
    await seedText(page, t);
  }
  await page.evaluate(() => { try { window.__smartPageDesign.apply('formal'); } catch (e) {} });
  await sleep(250);
  return page.evaluate(() => ({
    pageCount: window.__smartPages.describe().length,
    name: window.__smartDocName.get()
  }));
}
function inspectPdf(b64) {
  const buf = Buffer.from(b64, 'base64');
  const head = buf.subarray(0, 5).toString('latin1');
  const tail = buf.subarray(Math.max(0, buf.length - 32)).toString('latin1');
  const raw = buf.toString('latin1');
  const pageCount = (raw.match(/\/Type\s*\/Page[^s]/g) || []).length;
  return { headerOk: head === '%PDF-', tailOk: tail.includes('%%EOF'), pageCount, size: buf.length };
}
async function exportViaDialog(page) {
  await page.evaluate(() => window.__smartPdfExport.open());
  await sleep(250);
  await page.click('#smartPdfConfirmBtn');
  await sleep(1800);
  return page.evaluate(() => ({
    previewOpen: window.__smartPdfShare.isOpen(),
    present: window.__smartPdfShare.present(),
    previewPageCount: window.__smartPdfShare.previewPageCount(),
    previewReady: window.__smartPdfShare.previewReady(),
    figures: Array.from(document.querySelectorAll('#smartPdfPreviewPages figure.smart-pdf-preview-page')).length,
    imgs: Array.from(document.querySelectorAll('#smartPdfPreviewPages img.smart-pdf-preview-img')).map((i) => i.src.slice(0, 22)),
    captions: Array.from(document.querySelectorAll('#smartPdfPreviewPages figcaption')).map((c) => c.textContent),
    title: (document.getElementById('smartPdfPreviewTitle') || {}).textContent || '',
    note: (document.getElementById('smartPdfPreviewNote') || {}).textContent || ''
  }));
}
const stateSnap = (page) => page.evaluate(() => ({
  currentPage: window.__smartBlank.getState().currentPage,
  pageCount: window.__smartBlank.getState().pageCount,
  name: window.__smartDocName.get(),
  desc: JSON.stringify(window.__smartPages.describe()),
  dirty: !!window.__smartSave.getState().dirty,
  design: JSON.stringify(window.__smartPageDesign.getState())
}));

// ============================================================
// S) Static i18n coverage (all 7 locales define PART 31 keys)
// ============================================================
{
  const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  const keys = ['smartPdfPreviewTitle', 'smartPdfPreviewNote', 'smartPdfSave'];
  let all = true, missing = '';
  for (const k of keys) { if (!new RegExp(k + '\\s*:').test(src)) { all = false; missing += k + ' '; } }
  check('S0) All PART 31 i18n keys present in app.js', all, missing);
  check('S1) Arabic preview note is pure Arabic', /smartPdfPreviewNote: 'هذا هو الملف الذي سيُحفظ\.'/.test(src));
  check('S2) English preview note present', /smartPdfPreviewNote: 'This is the file that will be saved\.'/.test(src));
  for (const k of keys) {
    const n = (src.match(new RegExp(k + '\\s*:', 'g')) || []).length;
    check(`S3) ${k} defined in all 7 locales`, n >= 7, 'n=' + n);
  }
}
// ============================================================
// A) Full user flow: Editor -> Preview -> Save PDF (multi-page, match)
// ============================================================
{
  const { page, errs } = await newPage({ width: 1366, height: 900 });
  const doc = await buildDoc(page, 'en');
  check('A1) Document built with 4 pages', doc.pageCount === 4, 'count=' + doc.pageCount);
  const before = await stateSnap(page);

  const r = await exportViaDialog(page);
  check('A2) Preview modal opens after export (before save/share)', r.previewOpen && r.present, JSON.stringify({ o: r.previewOpen, p: r.present }));
  check('A3) Preview title is "Preview" (English)', r.title === 'Preview', r.title);
  check('A4) Preview note explains the saved file', /file that will be saved/i.test(r.note), r.note);
  check('A5) Preview shows one figure per page (4)', r.figures === 4 && r.previewPageCount === 4, JSON.stringify({ f: r.figures, ppc: r.previewPageCount }));
  check('A6) Preview pages are real exported images (data:image/jpeg)',
    r.imgs.length === 4 && r.imgs.every((s) => s.startsWith('data:image/jpeg')), r.imgs.join(','));
  check('A7) Preview page order 1..4 preserved', JSON.stringify(r.captions) === JSON.stringify(['Page 1 / 4', 'Page 2 / 4', 'Page 3 / 4', 'Page 4 / 4']), JSON.stringify(r.captions));
  check('A8) previewReady() true (pages captured from build)', r.previewReady === true);
  const b64 = await page.evaluate(async () => {
    const blob = await window.__smartPdfExport.buildBlob({ pages: 'all', quality: 'normal' });
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return btoa(bin);
  });
  const po = inspectPdf(b64);
  check('A9) Exported PDF is valid + has same page count as preview',
    po.headerOk && po.tailOk && po.pageCount === 4, JSON.stringify(po));

  const dlBefore = await page.evaluate(() => window.__smartPdfShare.downloadCount());
  const genBefore = await page.evaluate(() => window.__smartPdfShare.gen());
  await page.click('#smartPdfSaveBtn');
  await sleep(500);
  const saveState = await page.evaluate(() => ({
    dl: window.__smartPdfShare.downloadCount(),
    action: window.__smartPdfShare.lastAction(),
    filename: window.__smartPdfShare.lastFilename(),
    isOpen: window.__smartPdfShare.isOpen(),
    gen: window.__smartPdfShare.gen()
  }));
  check('A10) Save PDF triggers exactly one download', saveState.dl === dlBefore + 1, JSON.stringify(saveState));
  check('A11) Save PDF uses the SAME previewed PDF (no rebuild)', saveState.action === 'save' && saveState.gen === genBefore, JSON.stringify(saveState));
  check('A12) Save PDF filename keeps .pdf', /\.pdf$/i.test(saveState.filename), saveState.filename);
  check('A13) Save PDF closes the preview', saveState.isOpen === false);
  check('A14) Exactly ONE Save PDF button', (await page.$$('#smartPdfSaveBtn')).length === 1 && (await page.$$('[data-i18n="smartPdfSave"]')).length === 1);
  check('A15) Exactly ONE Share button', (await page.$$('#smartPdfShareBtn')).length === 1 && (await page.$$('[data-i18n="smartPdfShare"]')).length === 1);
  check('A16) Exactly ONE Preview title', (await page.$$('#smartPdfPreviewTitle')).length === 1);
  check('A17) No second preview modal', (await page.$$('#smartPdfPreviewModal')).length === 0);
  const after = await stateSnap(page);
  check('A18) Preview/Save did not mutate editor state', JSON.stringify(before) === JSON.stringify(after), 'before=' + JSON.stringify(before) + ' after=' + JSON.stringify(after));
  const dialogs = await page.evaluate(() => window.__dialogs);
  check('A19) No native alert/confirm/prompt during preview/save', dialogs.alert + dialogs.confirm + dialogs.prompt === 0, JSON.stringify(dialogs));
  check('A20) No JS errors (main flow)', errs.length === 0, errs.join('|'));
  await page.close();
}
// ============================================================
// B) Share: Web Share unsupported -> reliable download fallback (same blob)
// ============================================================
{
  const { page: pg, errs } = await newPage({ width: 1280, height: 900 });
  await pg.evaluate(() => {
    try { Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); } catch (e) {}
    try { Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined }); } catch (e) {}
  });
  check('B1) Capability honestly reports unsupported', (await pg.evaluate(() => window.__smartPdfShare.webShareSupported())) === false);
  await buildDoc(pg, 'en');
  const r = await exportViaDialog(pg);
  check('B2) Preview open before share', r.previewOpen && r.figures === 4, JSON.stringify({ o: r.previewOpen, f: r.figures }));
  const dl0 = await pg.evaluate(() => window.__smartPdfShare.downloadCount());
  await pg.click('#smartPdfShareBtn');
  await sleep(700);
  const out = await pg.evaluate(() => ({
    dl: window.__smartPdfShare.downloadCount(),
    action: window.__smartPdfShare.lastAction(),
    filename: window.__smartPdfShare.lastFilename(),
    isOpen: window.__smartPdfShare.isOpen()
  }));
  check('B3) Unsupported share -> download fallback (no crash)', out.action === 'download' && out.dl === dl0 + 1, JSON.stringify(out));
  check('B4) Fallback shares the previewed PDF filename', /\.pdf$/i.test(out.filename), out.filename);
  check('B5) No JS errors (share fallback)', errs.length === 0, errs.join('|'));
  await pg.close();
}

// ============================================================
// C) Responsive: Desktop / Laptop / Tablet / Mobile / Touch
// ============================================================
{
  const vps = [
    { name: 'Desktop', width: 1366, height: 900 },
    { name: 'Laptop', width: 1280, height: 900 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Mobile', width: 390, height: 844 },
    { name: 'Touch', width: 390, height: 844 }
  ];
  for (const vp of vps) {
    const { page: pg } = await newPage({ width: vp.width, height: vp.height });
    await buildDoc(pg, 'en');
    await exportViaDialog(pg);
    await pg.evaluate(() => { document.getElementById('smartPdfResultModal').hidden = false; });
    await sleep(200);
    const ok = await pg.evaluate(() => {
      const d = document.querySelector('#smartPdfResultModal .smart-pdf-result-dialog').getBoundingClientRect();
      const noHOverflow = document.documentElement.scrollWidth <= window.innerWidth + 1;
      const inView = d.left >= -1 && d.right <= window.innerWidth + 1;
      const imgNoH = Array.from(document.querySelectorAll('#smartPdfPreviewPages img.smart-pdf-preview-img'))
        .every((im) => { const r = im.getBoundingClientRect(); return r.left >= -1 && r.right <= window.innerWidth + 1; });
      const saveBtn = document.getElementById('smartPdfSaveBtn').getBoundingClientRect();
      const shareBtn = document.getElementById('smartPdfShareBtn').getBoundingClientRect();
      const reachable = saveBtn.left >= -1 && saveBtn.right <= window.innerWidth + 1 &&
                        shareBtn.left >= -1 && shareBtn.right <= window.innerWidth + 1;
      const gallery = document.getElementById('smartPdfPreviewPages');
      const scrollable = gallery.scrollHeight >= gallery.clientHeight;
      return { noHOverflow, inView, imgNoH, reachable, scrollable };
    });
    check(`C-${vp.name} ${vp.width}x${vp.height}: no overflow, no clipped images, reachable Save/Share`, ok.noHOverflow && ok.inView && ok.imgNoH && ok.reachable, JSON.stringify(ok));
    await pg.close();
  }
}
// ============================================================
// D) RTL / LTR + localization
// ============================================================
{
  {
    const { page: pg, errs } = await newPage({ width: 1280, height: 900 });
    await buildDoc(pg, 'ar');
    const r = await exportViaDialog(pg);
    const dir = await pg.$eval('#smartPdfResultModal .smart-pdf-result-dialog', (n) => getComputedStyle(n).direction);
    const saveLabel = await pg.$eval('#smartPdfSaveBtn span', (n) => n.textContent.trim());
    check('D1) Arabic Preview dialog is RTL', dir === 'rtl', dir);
    check('D2) Arabic Preview title (معاينة)', r.title === 'معاينة', r.title);
    check('D3) Arabic preview note (هذا هو الملف الذي سيُحفظ.)', r.note === 'هذا هو الملف الذي سيُحفظ.', r.note);
    check('D4) Arabic Save PDF button (حفظ PDF)', saveLabel === 'حفظ PDF', saveLabel);
    check('D5) Preview still renders 4 pages in RTL', r.figures === 4, 'f=' + r.figures);
    check('D6) No JS errors (AR)', errs.length === 0, errs.join('|'));
    await pg.close();
  }
  {
    const { page: pg } = await newPage({ width: 1280, height: 900 });
    await buildDoc(pg, 'en');
    const r = await exportViaDialog(pg);
    const dir = await pg.$eval('#smartPdfResultModal .smart-pdf-result-dialog', (n) => getComputedStyle(n).direction);
    check('D7) English Preview dialog is LTR', dir === 'ltr', dir);
    check('D8) English Preview title (Preview)', r.title === 'Preview', r.title);
    await pg.close();
  }
}

// ============================================================
// Summary
// ============================================================
const fails = results.filter((x) => !x.ok);
console.log(`\n=== PART 31 SUMMARY: pass ${passCount}/${results.length} ===`);
fs.appendFileSync(OUT, `SUMMARY pass ${passCount}/${results.length}\n`);
await browser.close();
server.close();
process.exit(fails.length ? 1 : 0);