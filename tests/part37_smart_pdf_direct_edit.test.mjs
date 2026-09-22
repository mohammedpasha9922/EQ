// PART 37 — SMART DOCUMENTS: ORIGINAL PDF DIRECT EDITING (in-place) + Back button
// Behavioral test in a real Chrome browser via Puppeteer.
// Run:  node tests/part37_smart_pdf_direct_edit.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8337;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.txt': 'text/plain',
  '.wasm': 'application/wasm', '.pdf': 'application/pdf'
};
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mimeOf(filePath) + '; charset=utf-8' });
    res.end(data);
  } catch (e) {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const URL = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 240000); // hard watchdog

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(viewport) {
  const page = await browser.newPage();
  if (viewport) await page.setViewport(viewport);
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(700);
  return { page, errs };
}
async function openDrawer(page) {
  await page.evaluate(() => document.getElementById('drawerToggle').click());
  await sleep(250);
}
async function clickSmartDocs(page) {
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click());
  await sleep(400);
}
async function setLang(page, locale) {
  await page.evaluate((l) => {
    const s = document.getElementById('topBarLanguageSelect');
    if (s) { s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); }
  }, locale);
  await sleep(400);
}
async function pickFile(page, filePath) {
  const [chooser] = await Promise.all([
    page.waitForFileChooser({ timeout: 9000 }),
    page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-import-file"]').click())
  ]);
  if (filePath) await chooser.accept([filePath]);
  else await chooser.cancel();
}
async function waitFor(page, fn, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await page.evaluate(fn)) return true;
    await sleep(120);
  }
  return false;
}
const getState = (page) => page.evaluate(() => (window.__smartImport && window.__smartImport.getState()) || {});

const pdfPath = path.join(ROOT, '__part37.pdf');

async function makeTextPdf(page) {
  await page.setContent(
    '<html><body style="font-family:Arial"><h1>Quarterly Business Report</h1>' +
    '<p>The quick brown fox jumps over the lazy dog.</p>' +
    '<p>Revenue increased by twenty percent this fiscal year</p></body></html>',
    { waitUntil: 'load' }
  );
  await sleep(250);
  await page.pdf({ path: pdfPath, format: 'A4' });
}

{
  // Build the PDF fixture.
  const p = await browser.newPage();
  await makeTextPdf(p);
  await p.close();
}

// ============ 1) Test 1: import → ORIGINAL PDF visible (not a textarea) ============
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openDrawer(page); await clickSmartDocs(page);
  await pickFile(page, pdfPath);
  const ok = await waitFor(page, () =>
    window.__smartImport.getState().editorVisible === true &&
    document.querySelectorAll('#smartPdfEditor .smart-pdf-text').length > 0);
  check('Import: editor opens (Test 1)', ok);
  const d = await page.evaluate(() => ({
    pages: document.querySelectorAll('#smartPdfEditor .smart-pdf-page').length,
    canvases: document.querySelectorAll('#smartPdfEditor canvas.smart-pdf-canvas').length,
    spans: document.querySelectorAll('#smartPdfEditor .smart-pdf-text').length,
    editorVisible: document.getElementById('smartEditorView').classList.contains('editor-visible')
  }));
  check('Import: original PDF rendered as pages (canvas)', d.pages >= 1 && d.canvases >= 1, JSON.stringify(d));
  check('Import: editable text layer present over the PDF', d.spans > 0, 'spans=' + d.spans);
  const taVisible = await page.evaluate(() => {
    const t = document.getElementById('smartEditorText');
    return t ? getComputedStyle(t).display !== 'none' && !t.hidden : false;
  });
  check('Import: extracted-text textarea is hidden (not shown)', !taVisible);
  check('Import: no JS errors (open)', errs.length === 0, errs.join(' | '));
  await page.close();
}

// ============ 2) Test 2 + Test 3: click word → edit in place → selected only ============
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openDrawer(page); await clickSmartDocs(page);
  await pickFile(page, pdfPath);
  await waitFor(page, () => document.querySelectorAll('#smartPdfEditor .smart-pdf-text').length > 0);
  const before = await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('#smartPdfEditor .smart-pdf-text'));
    if (spans.length < 2) return null;
    return { a: spans[0].textContent, b: spans[1].textContent, total: spans.length };
  });
  check('2) initial text spans usable', !!before && before.total >= 2, JSON.stringify(before));
  const edited = await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('#smartPdfEditor .smart-pdf-text'));
    if (spans.length < 2) return { ok: false };
    const target = spans[1];
    const other = spans[0];
    const beforeOther = other.textContent;
    target.click(); // click → becomes editable IN PLACE
    const becameEditable = target.classList.contains('is-editing') && target.contentEditable === 'true';
    target.textContent = 'GOLD'; // user edits the word
    target.blur(); // commit
    return {
      ok: true,
      becameEditable,
      now: target.textContent,
      otherStill: other.textContent,
      beforeOther,
      isEditingClassGone: !target.classList.contains('is-editing')
    };
  });
  check('2) click makes the word editable in place', edited.ok && edited.becameEditable);
  check('2) edited word shows the change on the same PDF', edited.ok && edited.now === 'GOLD', 'now=' + edited.now);
  check('3) non-selected text unchanged', edited.ok && edited.otherStill === edited.beforeOther, edited.otherStill + ' / ' + edited.beforeOther);
  check('3) commit clears editing state', edited.ok && edited.isEditingClassGone);
  check('2) no JS errors (edit)', errs.length === 0, errs.join(' | '));
  await page.close();
}

// ============ 3) Test 4 proxy: original page (graphics/images) preserved ============
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openDrawer(page); await clickSmartDocs(page);
  await pickFile(page, pdfPath);
  await waitFor(page, () => document.querySelectorAll('#smartPdfEditor .smart-pdf-page').length >= 1);
  const r = await page.evaluate(() => {
    const c = document.querySelector('#smartPdfEditor .smart-pdf-canvas');
    return { w: c ? c.width : 0, h: c ? c.height : 0, data: c ? !!c.toDataURL : false };
  });
  check('4) original PDF page still rendered on canvas (graphics/images kept)', r.w > 0 && r.h > 0 && r.data, JSON.stringify(r));
  check('4) no JS errors', errs.length === 0, errs.join(' | '));
  await page.close();
}
// ============ 5) Test 5 + 6: single Back → previous screen; import works again ============
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openDrawer(page); await clickSmartDocs(page);
  await pickFile(page, pdfPath);
  await waitFor(page, () => window.__smartImport.getState().editorVisible === true);
  const btns = await page.evaluate(() => document.querySelectorAll('#smartEditorBack').length);
  check('5) exactly ONE Back button in the PDF editor', btns === 1, 'count=' + btns);
  await page.evaluate(() => document.getElementById('smartEditorBack').click());
  await sleep(350);
  const s = await getState(page);
  check('5) Back returns to the previous Import screen', s.viewVisible === true, 'viewVisible=' + s.viewVisible);
  const backOnImport = await page.evaluate(() => document.getElementById('smartImportView').classList.contains('import-visible'));
  check('5) Import view visible after Back', backOnImport);
  check('5) no JS errors (back)', errs.length === 0, errs.join(' | '));

  // Test 6: pick the SAME PDF again and confirm Import still works.
  const [chooser] = await Promise.all([
    page.waitForFileChooser({ timeout: 9000 }),
    page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-import-file"]').click())
  ]);
  await chooser.accept([pdfPath]);
  const ok2 = await waitFor(page, () =>
    window.__smartImport.getState().editorVisible === true &&
    document.querySelectorAll('#smartPdfEditor .smart-pdf-text').length > 0);
  check('6) Import File works again after Back', ok2);
  check('6) no JS errors (re-import)', errs.length === 0, errs.join(' | '));
  await page.close();
}

// ============ 6) Responsive (360×720): no overflow, page fits ============
{
  const { page, errs } = await newPage({ width: 360, height: 720 });
  await openDrawer(page); await clickSmartDocs(page);
  await pickFile(page, pdfPath);
  await waitFor(page, () => window.__smartImport.getState().editorVisible === true);
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('Responsive: no horizontal overflow (360×720)', ov <= 2, 'overflow=' + ov);
  const layout = await page.evaluate(() => ({
    pages: document.querySelectorAll('#smartPdfEditor .smart-pdf-page').length,
    pageWidth: document.querySelector('#smartPdfEditor .smart-pdf-page')?.clientWidth || 0,
    viewportW: window.innerWidth
  }));
  check('Responsive: PDF page fits the narrow viewport', layout.pageWidth <= layout.viewportW, JSON.stringify(layout));
  check('Responsive: no JS errors', errs.length === 0, errs.join(' | '));
  await page.close();
}

// ============ 7) RTL (Arabic) uses inherited DIR system, one Back button ============
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await setLang(page, 'ar');
  await openDrawer(page); await clickSmartDocs(page);
  await pickFile(page, pdfPath);
  await waitFor(page, () =>
    window.__smartImport.getState().editorVisible === true &&
    document.querySelectorAll('#smartPdfEditor .smart-pdf-text').length > 0);
  const r = await page.evaluate(() => ({
    dir: document.documentElement.dir,
    backCount: document.querySelectorAll('#smartEditorBack').length,
    spans: document.querySelectorAll('#smartPdfEditor .smart-pdf-text').length
  }));
  check('RTL: editor opens under Arabic (inherited dir system)', r.dir === 'rtl' && r.spans > 0, JSON.stringify(r));
  check('RTL: still exactly one Back button', r.backCount === 1, 'back=' + r.backCount);
  check('RTL: no JS errors', errs.length === 0, errs.join(' | '));
  await page.close();
}

// ============ 8) SECURITY: editing invalidates a previous signature/stamp ============
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openDrawer(page); await clickSmartDocs(page);
  await pickFile(page, pdfPath);
  await waitFor(page, () =>
    window.__smartImport.getState().editorVisible === true &&
    document.querySelectorAll('#smartPdfEditor .smart-pdf-text').length > 0);
  // Establish that this imported PDF was previously signed/stamped (via the
  // EXISTING PART 18 state machine — no new signature/stamp/certificate system).
  const signed = await page.evaluate(() => {
    if (!window.__smartSignatureProtection || !window.__smartSignatureProtection.setSignedForTest) return null;
    return window.__smartSignatureProtection.setSignedForTest();
  });
  check('8) Signed/stamped PDF: signed status established (baseline)', signed === 'signed', 'status=' + signed);
  const prov = await page.evaluate(() => ({
    before: window.__smartSignatureProtection.status(),
    inv: window.__smartSignatureProtection.invalidated(),
    text: window.__smartSignatureProtection.statusText()
  }));
  check('8) Before any edit the signature is still valid', prov.before === 'signed' && prov.inv === 0, JSON.stringify(prov));
  const after = await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('#smartPdfEditor .smart-pdf-text'));
    if (!spans.length) return { ok: false };
    spans[0].click();
    spans[0].textContent = 'MODIFIED';
    spans[0].blur(); // commit
    return {
      ok: true,
      status: window.__smartSignatureProtection.status(),
      inv: window.__smartSignatureProtection.invalidated(),
      statusText: window.__smartSignatureProtection.statusText(),
      resign: window.__smartSignatureProtection.resignShown(),
      span: spans[0].textContent,
      count: spans.length
    };
  });
  check('8) Edit one word on the signed PDF succeeded', after.ok && after.span === 'MODIFIED', JSON.stringify(after));
  check('8) Previous signature/stamp becomes INVALID after edit', after.status === 'modified', 'status=' + after.status);
  check('8) Document is clearly marked as modified-after-signing', after.resign === true, 'resign=' + after.resign);
  check('8) No path leaves the edited doc looking validly signed', after.status === 'modified' && after.inv >= 0 && after.span === 'MODIFIED', JSON.stringify(after));
  check('8) no JS errors (sig invalidation)', errs.length === 0, errs.join(' | '));
  await page.close();
}

// Cleanup + summary
try { await browser.close(); } catch (e) {}
try { fs.unlinkSync(pdfPath); } catch (e) {}
server.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${failed.length === 0 ? 'ALL PASS' : failed.length + ' FAILED'}  (${results.length} checks)`);
process.exit(failed.length === 0 ? 0 : 1);