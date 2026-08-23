// PHASE 05 — PDF HEADER & FOOTER — behavioral test in a real Chrome browser.
// Verifies that the Header & Footer panels (content, enable/disable, page
// numbering) produce REAL, live changes on the preview, that state persists
// across close/reopen and across page reloads (localStorage), and that Desktop
// / Mobile / RTL / LTR all work with zero JS errors and no overflow.
// Run:  node tests/phase05_pdf_header_footer.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8295;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg',
  '.txt': 'text/plain', '.wasm': 'application/wasm'
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
  } catch (e) { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const URL = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 180000);

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

async function newPage(width, height, isMobile = false) {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.setViewport({ width, height, isMobile, hasTouch: isMobile });
  await sleep(800);
  return { page, errors: errs };
}

async function openWorkspace(page) {
  await page.evaluate(() => { const b = document.getElementById('drawerToggle'); if (b) b.click(); });
  await sleep(250);
  await page.evaluate(() => {
    const b = document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]');
    if (b) b.click();
  });
  await sleep(500);
}
async function closeWorkspace(page) {
  await page.evaluate(() => { const b = document.getElementById('closePdfReports'); if (b) b.click(); });
  await sleep(300);
}
async function resetPdf(page) {
  await page.evaluate(() => document.querySelector('[data-pdf-action="new"]').click());
  await sleep(250);
}
async function openPanel(page, toggleId) {
  await page.evaluate((id) => document.getElementById(id).click(), toggleId);
  await sleep(150);
}
async function clickOpt(page, option, value) {
  await page.evaluate((o, v) => {
    const b = document.querySelector(`.pdf-opt[data-pdf-option="${o}"][data-value="${v}"]`);
    if (!b) throw new Error('pdf-opt not found ' + o + '=' + v);
    b.click();
  }, option, value);
  await sleep(150);
}
async function setContentInput(page, option, text) {
  await page.evaluate((o, t) => {
    const el = document.querySelector(`.pdf-opt-input[data-pdf-option="${o}"]`);
    if (!el) throw new Error('input not found ' + o);
    el.value = t;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, option, text);
  await sleep(60);
}
async function setLanguage(page, locale) {
  await page.evaluate((l) => {
    const s = document.getElementById('topBarLanguageSelect');
    if (s) { s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); }
  }, locale);
  await sleep(400);
}
const stateOf = (page) => page.evaluate(() => {
  const hdr = document.getElementById('pdfPreviewHeader');
  const htxt = document.getElementById('pdfPreviewHeaderText');
  const ftr = document.getElementById('pdfPreviewFooter');
  const ftxt = document.getElementById('pdfPreviewFooterText');
  const fpg = document.getElementById('pdfPreviewPageNum');
  const hIn = document.querySelector('.pdf-opt-input[data-pdf-option="headerContent"]');
  const fIn = document.querySelector('.pdf-opt-input[data-pdf-option="footerContent"]');
  return {
    headerHidden: !!(hdr && hdr.hidden),
    headerText: htxt ? htxt.textContent : null,
    footerHidden: !!(ftr && ftr.hidden),
    footerText: ftxt ? ftxt.textContent : null,
    pageNumHidden: !!(fpg && fpg.hidden),
    pageNumText: fpg ? fpg.textContent : null,
    headerInput: hIn ? hIn.value : null,
    footerInput: fIn ? fIn.value : null,
    headerPanelOpen: !!document.getElementById('pdfHeaderPanel')?.classList.contains('open'),
    footerPanelOpen: !!document.getElementById('pdfFooterPanel')?.classList.contains('open'),
    dir: document.documentElement.dir || '',
    overflowX: document.documentElement.scrollWidth - window.innerWidth
  };
});
const noErrors = (errors) => (errors || []).length === 0;
// ============================================================
// Desktop (1280x800) — LTR English: full Header/Footer behavior
// ============================================================
{
  const { page, errors } = await newPage(1280, 800);
  await setLanguage(page, 'en');
  await openWorkspace(page);
  await resetPdf(page);

  const opened = await page.evaluate(() =>
    document.getElementById('pdfReportsModal').classList.contains('show'));
  check('Desktop LTR: workspace open', opened === true);

  let s = await stateOf(page);
  check('Desktop LTR: header hidden by default', s.headerHidden === true, 'hidden=' + s.headerHidden);
  check('Desktop LTR: footer hidden by default', s.footerHidden === true, 'hidden=' + s.footerHidden);

  await openPanel(page, 'pdfHeaderToggle');
  const hdrPanelOpen = await page.evaluate(() =>
    document.getElementById('pdfHeaderPanel').classList.contains('open') &&
    document.getElementById('pdfHeaderToggle').getAttribute('aria-expanded') === 'true');
  check('Desktop LTR: Header panel opens', hdrPanelOpen === true);

  await clickOpt(page, 'headerEnable', 'on');
  s = await stateOf(page);
  check('Desktop LTR: Header enable shows region', s.headerHidden === false, 'hidden=' + s.headerHidden);
  await clickOpt(page, 'headerEnable', 'off');
  s = await stateOf(page);
  check('Desktop LTR: Header disable hides region', s.headerHidden === true, 'hidden=' + s.headerHidden);
  await clickOpt(page, 'headerEnable', 'on');
  s = await stateOf(page);
  check('Desktop LTR: Header re-enabled shows region', s.headerHidden === false);

  await setContentInput(page, 'headerContent', 'Live Header Title');
  s = await stateOf(page);
  check('Desktop LTR: Header text live in preview', s.headerText === 'Live Header Title', 'text=' + s.headerText);
  check('Desktop LTR: Header text synced to input', s.headerInput === 'Live Header Title', 'input=' + s.headerInput);

  await openPanel(page, 'pdfFooterToggle');
  const ftrPanelOpen = await page.evaluate(() =>
    document.getElementById('pdfFooterPanel').classList.contains('open') &&
    document.getElementById('pdfFooterToggle').getAttribute('aria-expanded') === 'true');
  check('Desktop LTR: Footer panel opens', ftrPanelOpen === true);

  await clickOpt(page, 'footerEnable', 'on');
  s = await stateOf(page);
  check('Desktop LTR: Footer enable shows region', s.footerHidden === false, 'hidden=' + s.footerHidden);
  await clickOpt(page, 'footerEnable', 'off');
  s = await stateOf(page);
  check('Desktop LTR: Footer disable hides region', s.footerHidden === true, 'hidden=' + s.footerHidden);
  await clickOpt(page, 'footerEnable', 'on');
  s = await stateOf(page);
  check('Desktop LTR: Footer re-enabled shows region', s.footerHidden === false);

  await setContentInput(page, 'footerContent', 'Live Footer Tagline');
  s = await stateOf(page);
  check('Desktop LTR: Footer text live in preview', s.footerText === 'Live Footer Tagline', 'text=' + s.footerText);
  check('Desktop LTR: Footer text synced to input', s.footerInput === 'Live Footer Tagline', 'input=' + s.footerInput);

  await clickOpt(page, 'pageNumbering', 'on');
  s = await stateOf(page);
  check('Desktop LTR: Page numbering shows (1 / 1)',
    s.pageNumHidden === false && (s.pageNumText || '').includes('1'), 'hidden=' + s.pageNumHidden + ' text=' + s.pageNumText);
  await clickOpt(page, 'pageNumbering', 'off');
  s = await stateOf(page);
  check('Desktop LTR: Page numbering hides', s.pageNumHidden === true, 'hidden=' + s.pageNumHidden);

  await clickOpt(page, 'footerEnable', 'on');
  await clickOpt(page, 'pageNumbering', 'on');
  await setContentInput(page, 'footerContent', 'Persistent Footer');

  check('Desktop LTR: no JS errors', noErrors(errors), (errors || []).join(' | ') || 'no errors');
  await page.close();
}
// ============================================================
// Persistence — survives close/reopen AND cross-page reload
// ============================================================
{
  const { page, errors } = await newPage(1280, 800);
  await setLanguage(page, 'en');
  await openWorkspace(page);
  await resetPdf(page);
  await clickOpt(page, 'headerEnable', 'on');
  await setContentInput(page, 'headerContent', 'Persisted Header');
  await clickOpt(page, 'footerEnable', 'on');
  await setContentInput(page, 'footerContent', 'Persistent Footer');
  let s = await stateOf(page);
  check('Persistence: header text set', s.headerText === 'Persisted Header', 'text=' + s.headerText);
  check('Persistence: footer text set', s.footerText === 'Persistent Footer', 'text=' + s.footerText);

  // Close then reopen in the SAME page (loads state from localStorage on open)
  await closeWorkspace(page);
  await openWorkspace(page);
  s = await stateOf(page);
  check('Persistence: header text survives close/reopen', s.headerText === 'Persisted Header', 'text=' + s.headerText);
  check('Persistence: header region restored visible', s.headerHidden === false, 'hidden=' + s.headerHidden);

  // Cross-page persistence: a NEW page shares the browser-context localStorage.
  const { page: p2, errors: e2 } = await newPage(1280, 800);
  await setLanguage(p2, 'en');
  await openWorkspace(p2);
  const s2 = await stateOf(p2);
  check('Persistence: header text survives page reload (localStorage)', s2.headerText === 'Persisted Header', 'text=' + s2.headerText);
  check('Persistence: footer text survives page reload (localStorage)', s2.footerText === 'Persistent Footer', 'text=' + s2.footerText);
  check('Persistence: no JS errors (same page)', noErrors(errors), (errors || []).join(' | ') || 'no errors');
  check('Persistence: no JS errors (new page)', noErrors(e2), (e2 || []).join(' | ') || 'no errors');
  await page.close();
  await p2.close();
}
// ============================================================
// RTL (Arabic) — labels localized + behavior + no overflow
// ============================================================
{
  const { page, errors } = await newPage(1280, 800);
  await setLanguage(page, 'ar');
  await openWorkspace(page);
  await resetPdf(page);

  const dir = await page.evaluate(() => document.documentElement.dir);
  check('RTL: document direction is rtl', dir === 'rtl', 'dir=' + dir);

  await openPanel(page, 'pdfHeaderToggle');
  const hdrLabel = await page.evaluate(() =>
    document.querySelector('[data-i18n="pdfHeaderEnable"]').textContent);
  check('RTL: Header panel localized label (Arabic)', hdrLabel === 'الرأس', 'label=' + hdrLabel);
  const hdrPanelOpen = await page.evaluate(() =>
    document.getElementById('pdfHeaderPanel').classList.contains('open'));
  check('RTL: Header panel opens', hdrPanelOpen === true);

  await clickOpt(page, 'headerEnable', 'on');
  await setContentInput(page, 'headerContent', 'عنوان عربي');
  const h = await stateOf(page);
  check('RTL: Header text live in preview', h.headerText === 'عنوان عربي', 'text=' + h.headerText);
  check('RTL: Header region visible when enabled', h.headerHidden === false, 'hidden=' + h.headerHidden);

  await openPanel(page, 'pdfFooterToggle');
  const ftrLabel = await page.evaluate(() =>
    document.querySelector('[data-i18n="pdfFooterEnable"]').textContent);
  check('RTL: Footer panel localized label (Arabic)', ftrLabel === 'التذييل', 'label=' + ftrLabel);
  await clickOpt(page, 'footerEnable', 'on');
  await setContentInput(page, 'footerContent', 'تذييل عربي');
  const f = await stateOf(page);
  check('RTL: Footer text live in preview', f.footerText === 'تذييل عربي', 'text=' + f.footerText);

  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - window.innerWidth);
  check('RTL: no horizontal document overflow', overflow <= 2, 'dx=' + overflow);
  check('RTL: no JS errors', noErrors(errors), (errors || []).join(' | ') || 'no errors');
  await page.close();
}
// ============================================================
// Mobile (375x812, touch) — panels usable, live updates, no overflow
// ============================================================
{
  const { page, errors } = await newPage(375, 812, true);
  await setLanguage(page, 'en');
  await openWorkspace(page);
  await resetPdf(page);

  await openPanel(page, 'pdfHeaderToggle');
  await clickOpt(page, 'headerEnable', 'on');
  await setContentInput(page, 'headerContent', 'Mobile Header');
  let s = await stateOf(page);
  check('Mobile: Header text live in preview', s.headerText === 'Mobile Header', 'text=' + s.headerText);
  check('Mobile: Header region visible', s.headerHidden === false);

  await openPanel(page, 'pdfFooterToggle');
  await clickOpt(page, 'footerEnable', 'on');
  await setContentInput(page, 'footerContent', 'Mobile Footer');
  s = await stateOf(page);
  check('Mobile: Footer text live in preview', s.footerText === 'Mobile Footer', 'text=' + s.footerText);
  check('Mobile: Footer region visible', s.footerHidden === false);

  const fit = await page.evaluate(() => {
    const m = document.getElementById('pdfReportsModal');
    const tools = Array.from(document.querySelectorAll('#pdfReportsModal .pdf-tool'));
    const rows = new Set(tools.map((t) => Math.round(t.getBoundingClientRect().top)));
    const mrect = m ? m.getBoundingClientRect() : null;
    return {
      modalBottomOk: mrect ? mrect.bottom <= window.innerHeight + 2 : false,
      toolbarRows: rows.size,
      overflowX: document.documentElement.scrollWidth - window.innerWidth
    };
  });
  check('Mobile: workspace fits viewport', fit.modalBottomOk === true, 'bottom=' + fit.modalBottomOk);
  check('Mobile: toolbar stays single row', fit.toolbarRows === 1, 'rows=' + fit.toolbarRows);
  check('Mobile: no horizontal overflow', fit.overflowX <= 2, 'dx=' + fit.overflowX);
  check('Mobile: no JS errors', noErrors(errors), (errors || []).join(' | ') || 'no errors');
  await page.close();
}

// ============================================================
// LTR (English) — labels localized
// ============================================================
{
  const { page, errors } = await newPage(1280, 800);
  await setLanguage(page, 'en');
  await openWorkspace(page);
  await resetPdf(page);
  const dir = await page.evaluate(() => document.documentElement.dir);
  check('LTR: document direction is ltr', dir === 'ltr', 'dir=' + dir);
  await openPanel(page, 'pdfHeaderToggle');
  const hdrLabel = await page.evaluate(() =>
    document.querySelector('[data-i18n="pdfHeaderEnable"]').textContent);
  check('LTR: Header panel localized label (English)', hdrLabel === 'Header', 'label=' + hdrLabel);
  await openPanel(page, 'pdfFooterToggle');
  const ftrLabel = await page.evaluate(() =>
    document.querySelector('[data-i18n="pdfFooterEnable"]').textContent);
  check('LTR: Footer panel localized label (English)', ftrLabel === 'Footer', 'label=' + ftrLabel);
  check('LTR: no JS errors', noErrors(errors), (errors || []).join(' | ') || 'no errors');
  await page.close();
}

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log('\n=== PHASE 05 RESULTS: ' + (results.length - failed.length) + '/' + results.length + ' PASSED ===');
if (failed.length) {
  console.log('FAILED:');
  failed.forEach((f) => console.log(' - ' + f.name + ': ' + f.detail));
  process.exit(1);
}
process.exit(0);