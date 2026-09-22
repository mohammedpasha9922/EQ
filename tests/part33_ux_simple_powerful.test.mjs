// PART 33 — USER EXPERIENCE RULE: "Simple by Default — Powerful When Needed"
// Behavioral verification in REAL Chrome via Puppeteer. This test ONLY verifies
// the UX visibility / discoverability rule against the EXISTING architecture.
// It makes NO production changes and does NOT rebuild the PDF system.
// Run:  node tests/part33_ux_simple_powerful.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer-core';

const require2 = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8481;
// Build a controlled REAL 2-page PDF with pdf-lib (genuine selectable text).
const pdfLib = require2(path.join(ROOT, '__pdfdiag/vendor/pdf-lib.min.js'));
async function buildFixture() {
  const doc = await pdfLib.PDFDocument.create();
  const font = await doc.embedFont(pdfLib.StandardFonts.Helvetica);
  const p1 = doc.addPage([595.28, 841.89]);
  p1.drawText('Quarterly Business Report', { x: 72, y: 770, size: 20, font });
  p1.drawText('The quick brown fox jumps over the lazy dog', { x: 72, y: 700, size: 12, font });
  const p2 = doc.addPage([595.28, 841.89]);
  p2.drawText('Appendix Notes', { x: 72, y: 770, size: 18, font });
  p2.drawText('The fox is brown and quick', { x: 72, y: 700, size: 12, font });
  return Buffer.from(await doc.save({ useObjectStreams: false, updateMetadata: false }));
}
const FIXTURE_BYTES = await buildFixture();
// Pre-existing SVG warnings unrelated to PART 33 (present across many phases).
const PREEXISTING_SVG = /attribute d: Expected number|a2 2 2 0 0 0|forEach is not a function/i;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.pdf': 'application/pdf', '.ico': 'image/x-icon', '.svg': 'image/svg+xml'
};
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';

const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (!p || p === '/') p = '/index.html';
  try {
    const f = path.join(ROOT, p);
    res.writeHead(200, { 'Content-Type': mimeOf(f) + '; charset=utf-8' });
    res.end(fs.readFileSync(f));
  } catch (e) { if (!res.headersSent) { res.writeHead(404); res.end('nf'); } }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 600000);

const results = [];
function check(id, name, ok, detail = '') {
  results.push({ id, name, ok });
  let d = '';
  if (detail && typeof detail === 'object') { try { d = JSON.stringify(detail); } catch (e) { d = String(detail); } }
  else if (detail) d = String(detail);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id} ${name}${d ? '  -> ' + d : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  protocolTimeout: 120000,
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});

async function newPage(viewport) {
  const page = await browser.newPage();
  if (viewport) await page.setViewport(viewport);
  const errs = [];
  const cErr = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e && e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error') cErr.push('console: ' + m.text()); });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(700);
  return { page, errs, cErr };
}
function newErrs(errs, cErr) {
  const pre = [];
  const nv = [];
  [...errs, ...cErr].forEach((e) => { (PREEXISTING_SVG.test(e) ? pre : nv).push(e); });
  return { preexisting: pre, newErrors: nv };
}
async function setLang(page, locale) {
  await page.evaluate((l) => { try { if (window.setLanguage) window.setLanguage(l); } catch (e) {} }, locale);
  await sleep(250);
}
async function openSmartDocs(page) {
  await page.evaluate(() => document.getElementById('drawerToggle').click());
  await sleep(250);
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click());
  await sleep(450);
}
// DataTransfer into the EXISTING hidden file input (same as phase tests).
async function injectPdf(page, bytesB64) {
  return await page.evaluate(async (b64) => {
    const bin = atob(b64); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const dt = new DataTransfer(); dt.items.add(new File([u8], 'part33.pdf', { type: 'application/pdf' }));
    const fi = document.getElementById('smartImportFileInput');
    if (!fi) return { ok: false };
    fi.files = dt.files; fi.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true };
  }, bytesB64);
}
async function waitEditor(page, tries = 120) {
  for (let i = 0; i < tries; i++) {
    const s = await page.evaluate(() => {
      const ed = document.getElementById('smartEditorView');
      const pages = document.querySelectorAll('#smartPdfEditor .smart-pdf-page');
      const painted = [...pages].filter((p) => { const c = p.querySelector('canvas'); return c && c.width > 0; }).length;
      return { visible: !!(ed && ed.classList.contains('editor-visible')), pages: pages.length, painted };
    });
    if (s.visible && s.pages >= 2 && s.painted >= 2) return s;
    await sleep(200);
  }
  return null;
}
async function openPdfEditor(page, bytesB64) {
  await page.evaluate(() => { const it = document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]'); if (it) it.click(); });
  await sleep(380);
  await page.evaluate(() => { const c = document.getElementById('pdfOpenCard'); if (c) c.click(); });
  await sleep(500);
  const inj = await injectPdf(page, bytesB64 || FIXTURE_BYTES.toString('base64'));
  const ed = await waitEditor(page);
  if (!ed) throw new Error('PDF editor did not load');
  await sleep(300);
  return { inj, ed };
}
const pageHorizOverflow = (page) =>
  page.evaluate(() => Math.max(document.documentElement.scrollWidth - window.innerWidth, 0));
// =====================================================================
// A) Fresh PDF Workspace: Scan + Open PDF, no advanced clutter
// =====================================================================
{
  const { page, errs, cErr } = await newPage({ width: 1280, height: 800 });
  await openSmartDocs(page);
  const home = await page.evaluate(() => {
    const modal = document.getElementById('smartDocsModal');
    const shown = modal && modal.classList.contains('show');
    const cards = Array.from(document.querySelectorAll('#smartDocsModal .smart-doc-card'));
    const actions = cards.map((c) => c.getAttribute('data-action'));
    const toolIds = ['smartPdfAddBtn', 'smartPdfMarkBtn', 'smartPdfPagesBtn', 'smartPdfStyleBtn',
      'smartPdfTextColorBtn', 'smartEditorSaveBtn', 'smartEditorSendBtn', 'smartPdfDateControls'];
    // Only count a tool as "dumped on the Workspace" if it lives INSIDE the
    // visible home container (.smart-docs-home). The same ids exist elsewhere
    // in the DOM inside hidden views (scan/import/editor) — that is expected.
    const home = modal.querySelector('.smart-docs-home');
    const leaked = toolIds.filter((id) => !!home && !!home.querySelector('#' + id));
    const hasScan = !!modal.querySelector('[data-action="smart-scan-doc"]');
    const hasOpenPdf = !!modal.querySelector('[data-action="smart-import-file"]');
    return { shown, actions, cardCount: cards.length, leaked, hasScan, hasOpenPdf };
  });
  check('P33-01', 'Fresh PDF Workspace exposes Scan', home.shown && home.hasScan, JSON.stringify(home));
  check('P33-01', 'Fresh PDF Workspace exposes Open PDF (Import a File)', home.hasOpenPdf, JSON.stringify(home));
  check('P33-02', 'Advanced functionality NOT dumped on the primary Workspace screen', home.leaked.length === 0, JSON.stringify(home.leaked));
  check('P33-02', 'Workspace primary cards limited (Scan/Open/New/Templates only)', home.cardCount >= 2 && home.cardCount <= 5, String(home.cardCount));
  check('P33-02', 'Workspace shows only primary entry cards', home.actions.join(',') === 'smart-scan-doc,smart-import-file,smart-new-doc,smart-templates',
    JSON.stringify(home.actions));
  const ov = await pageHorizOverflow(page);
  check('P33-11', 'Workspace: no horizontal overflow', ov <= 1, String(ov));
  const ne = newErrs(errs, cErr);
  check('P33-21', 'No NEW JS errors (workspace)', ne.newErrors.length === 0, ne.newErrors.slice(0, 2).join(' | '));
  check('P33-22', 'No NEW page errors (workspace)', ne.newErrors.length === 0, String(ne.newErrors.length));
  await page.close();
}
// =====================================================================
// B) PDF Editor primary tools present, no duplicates
// =====================================================================
{
  const { page, errs, cErr } = await newPage({ width: 1366, height: 900 });
  await setLang(page, 'en');
  await openPdfEditor(page);
  const prim = await page.evaluate(() => {
    const ids = ['smartPdfAddBtn', 'smartPdfMarkBtn', 'smartPdfPagesBtn', 'smartEditorSaveBtn', 'smartEditorSendBtn'];
    const counts = {};
    ids.forEach((id) => { counts[id] = document.querySelectorAll('#' + id).length; });
    const textSpans = document.querySelectorAll('#smartPdfEditor .smart-pdf-text').length;
    const editSurface = !!document.querySelector('#smartPdfEditor');
    const visibleEditors = document.querySelectorAll('body .smart-editor-view.editor-visible').length;
    return { counts, textSpans, editSurface, visibleEditors };
  });
  check('P33-03', 'After opening PDF, primary tool Add is present', prim.counts.smartPdfAddBtn === 1, JSON.stringify(prim.counts));
  check('P33-03', 'After opening PDF, primary tool Mark is present', prim.counts.smartPdfMarkBtn === 1, JSON.stringify(prim.counts));
  check('P33-03', 'After opening PDF, primary tool Pages is present', prim.counts.smartPdfPagesBtn === 1, JSON.stringify(prim.counts));
  check('P33-03', 'Only ONE visible PDF editor instance', prim.visibleEditors === 1, String(prim.visibleEditors));
  check('P33-05', 'Edit surface (inline PDF editor) is accessible', prim.editSurface && prim.textSpans > 0, String(prim.textSpans));
  check('P33-06', 'Add is accessible (primary button exists)', prim.counts.smartPdfAddBtn === 1);
  check('P33-07', 'Mark is accessible (primary button exists)', prim.counts.smartPdfMarkBtn === 1);
  check('P33-08', 'Pages is accessible (primary button exists)', prim.counts.smartPdfPagesBtn === 1);
  const dupPrimary = Object.entries(prim.counts).filter(([, n]) => n !== 1).map(([k]) => k);
  check('P33-09', 'No duplicate primary buttons (Add/Mark/Pages/Save/Send)', dupPrimary.length === 0, JSON.stringify(dupPrimary));

  const ov = await pageHorizOverflow(page);
  check('P33-11', 'PDF Editor: no horizontal overflow', ov <= 1, String(ov));
  const ne = newErrs(errs, cErr);
  check('P33-21', 'No NEW JS errors (editor load)', ne.newErrors.length === 0, ne.newErrors.slice(0, 2).join(' | '));
  check('P33-22', 'No NEW page errors (editor load)', ne.newErrors.length === 0, String(ne.newErrors.length));
  if (ne.newErrors.length) console.log('   [new errors]', ne.newErrors.slice(0, 4).join('\n'));

  // ---- advanced discoverability via EXISTING popovers (P33-04, P33-10) ----
  const menu = await page.evaluate(() => {
    const idUniq = (id) => document.querySelectorAll('#' + id).length;
    const click = (id) => { const b = document.getElementById(id); if (b) b.click(); };
    const openCount = (id) => { const m = document.getElementById(id); return !!m && m.hasAttribute('hidden') === false; };

    click('smartPdfAddBtn');
    const addOpen = openCount('smartPdfAddMenu');
    const addItems = Array.from(document.querySelectorAll('#smartPdfAddMenu .smart-pdf-add-item')).map((b) => b.getAttribute('data-add'));
    const addUniq = idUniq('smartPdfAddMenu');

    click('smartPdfMarkBtn');
    const markOpen = openCount('smartPdfMarkMenu');
    const markItems = Array.from(document.querySelectorAll('#smartPdfMarkMenu .smart-pdf-mark-item')).map((b) => b.getAttribute('data-mark'));
    const markUniq = idUniq('smartPdfMarkMenu');

    click('smartPdfPagesBtn');
    const pagesOpen = openCount('smartPdfPagesMenu');
    const pagesActions = Array.from(document.querySelectorAll('#smartPdfPagesMenu .smart-pdf-mark-item')).map((b) => b.getAttribute('data-pact'));
    const pagesUniq = idUniq('smartPdfPagesMenu');

    click('smartPdfStyleBtn');
    const styleOpen = openCount('smartPdfStyleMenu');
    const styleItems = Array.from(document.querySelectorAll('#smartPdfStyleMenu .smart-pdf-style-item')).map((b) => b.getAttribute('data-style'));
    const styleUniq = idUniq('smartPdfStyleMenu');

    click('smartPdfTextColorBtn');
    const colorOpen = openCount('smartPdfColorMenu');
    const colorSwatches = document.querySelectorAll('#smartPdfColorMenu .smart-pdf-color-swatch').length;
    const colorUniq = idUniq('smartPdfColorMenu');

    return { addOpen, addItems, addUniq, markOpen, markItems, markUniq,
      pagesOpen, pagesActions, pagesUniq, styleOpen, styleItems, styleUniq,
      colorOpen, colorSwatches, colorUniq };
  });
  check('P33-04', 'Advanced Add options open via existing popover (7 types incl. Table)', menu.addOpen && menu.addItems.length === 7, JSON.stringify(menu.addItems));
  check('P33-04', 'Advanced Mark options open via existing popover (4 modes)', menu.markOpen && menu.markItems.length === 4, JSON.stringify(menu.markItems));
  check('P33-04', 'Advanced Pages actions open via existing popover (Add/Del/Rot/Dup)', menu.pagesOpen && menu.pagesActions.length === 4, JSON.stringify(menu.pagesActions));
  check('P33-04', 'Advanced Smart Styles open via existing popover (5 styles)', menu.styleOpen && menu.styleItems.length === 5, JSON.stringify(menu.styleItems));
  check('P33-04', 'Advanced Text Color open via existing popover (8 swatches)', menu.colorOpen && menu.colorSwatches === 8, String(menu.colorSwatches));
  check('P33-10', 'No duplicate menus (one Add/Mark/Pages/Style/Color each)',
    [menu.addUniq, menu.markUniq, menu.pagesUniq, menu.styleUniq, menu.colorUniq].every((n) => n === 1),
    JSON.stringify({ addUniq: menu.addUniq, markUniq: menu.markUniq, pagesUniq: menu.pagesUniq, styleUniq: menu.styleUniq, colorUniq: menu.colorUniq }));

  const ne2 = newErrs(errs, cErr);
  check('P33-21', 'No NEW JS errors (menu interactions)', ne2.newErrors.length === 0, ne2.newErrors.slice(0, 2).join(' | '));
  await page.close();
}
// =====================================================================
// B2) Existing feature reachability / regression mapping (P33-20)
// =====================================================================
{
  const { page, errs, cErr } = await newPage({ width: 1366, height: 900 });
  await setLang(page, 'en');
  await openPdfEditor(page);
  const reach = await page.evaluate(() => {
    const picked = (() => { const b = document.getElementById('smartPdfAddBtn'); b.click();
      return Array.from(document.querySelectorAll('#smartPdfAddMenu .smart-pdf-add-item')).map((x) => x.getAttribute('data-add')); })();
    const has = (v) => picked.indexOf(v) !== -1;
    return { hasText: has('text'), hasImage: has('image'), hasLogo: has('logo'),
      hasSig: has('signature'), hasStamp: has('stamp'), hasDate: has('date'), hasTable: has('table') };
  });
  check('P33-20', 'Add→Text reachable (PART 22)', reach.hasText);
  check('P33-20', 'Add→Table reachable (PART 23)', reach.hasTable);
  check('P33-20', 'Add→Image reachable (PART 26)', reach.hasImage);
  check('P33-20', 'Add→Logo reachable (PART 26)', reach.hasLogo);
  check('P33-20', 'Add→Signature reachable (PART 27)', reach.hasSig);
  check('P33-20', 'Add→Stamp reachable (PART 28)', reach.hasStamp);
  check('P33-20', 'Add→Date reachable (PART 29)', reach.hasDate);
  const ne = newErrs(errs, cErr);
  check('P33-21', 'No NEW JS errors (reachability)', ne.newErrors.length === 0, ne.newErrors.slice(0, 2).join(' | '));
  await page.close();
}

// =====================================================================
// D) Edit accessible: modify REAL PDF text inline (P33-05)
// =====================================================================
{
  const { page, errs, cErr } = await newPage({ width: 1366, height: 900 });
  await setLang(page, 'en');
  await openPdfEditor(page);
  const found = await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('#smartPdfEditor .smart-pdf-text'));
    // Prefer the line containing 'Quarterly' on page 1; fall back to any span.
    const pick = spans.find((s) => parseInt(s.dataset.page, 10) === 1 && (s.textContent || '').indexOf('Quarterly') !== -1) || spans[0];
    if (!pick) return { ok: false };
    // Find a text child node (spans may contain child elements, not a lone text node).
    const txts = [...pick.childNodes].filter((nd) => nd.nodeType === 3 && (nd.textContent || '').trim().length > 0);
    const node = txts[0] || pick.firstChild;
    if (!node || node.nodeType !== 3) return { ok: false };
    const len = Math.min(node.textContent.length, 9);
    window.__selSpan = pick;
    window.__old = pick.textContent;
    const r = document.createRange();
    r.setStart(node, 0); r.setEnd(node, len);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    return { ok: true, target: pick.textContent.slice(0, 30) };
  });
  if (found.ok) { await page.keyboard.press('x'); await sleep(300); }
  const edited = await page.evaluate(() => {
    const sp = window.__selSpan;
    return { changed: !!(sp && sp.textContent && sp.textContent !== window.__old),
      content: sp ? sp.textContent.slice(0, 40) : '' };
  });
  check('P33-05', 'Edit is accessible — inline PDF text can be edited', found.ok && edited.changed, JSON.stringify(edited));
  if (!found.ok) check('P33-05', 'Edit target found in rendered PDF', false);
  const ne = newErrs(errs, cErr);
  check('P33-21', 'No NEW JS errors (edit flow)', ne.newErrors.length === 0, ne.newErrors.slice(0, 2).join(' | '));
  await page.close();
}
// =====================================================================
// E) Responsive Desktop / Laptop / Tablet / Mobile + Touch (P33-12..16)
// =====================================================================
async function responsivePhase(vp, touch) {
  const { page, errs, cErr } = await newPage(vp);
  await setLang(page, 'en');
  await openPdfEditor(page);
  const r = await page.evaluate(() => {
    const ids = ['smartPdfAddBtn', 'smartPdfMarkBtn', 'smartPdfPagesBtn', 'smartEditorSaveBtn'];
    return { present: ids.every((id) => document.querySelectorAll('#' + id).length === 1) };
  });
  const ov = await pageHorizOverflow(page);
  const tag = vp.width === 1440 ? '13' : vp.width === 1280 ? '12' : vp.width === 768 ? '14' : '15';
  check(`P33-${tag}`, `${vp.name}: primary tools present`, r.present);
  check(`P33-${tag}`, `${vp.name}: no horizontal overflow`, ov <= 1, String(ov));
  if (touch) {
    const opened = await page.evaluate(() => new Promise((res) => {
      const b = document.getElementById('smartPdfAddBtn'); if (!b) return res(false);
      b.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
      b.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, pointerType: 'touch' }));
      b.click();
      setTimeout(() => res(document.getElementById('smartPdfAddMenu') && document.getElementById('smartPdfAddMenu').hasAttribute('hidden') === false), 250);
    }));
    check('P33-16', 'Touch/coarse-pointer: Add popover opens on 390px touch', opened);
  }
  const ne = newErrs(errs, cErr);
  check(`P33-${tag}`, `${vp.name}: no NEW JS errors`, ne.newErrors.length === 0, ne.newErrors.slice(0, 2).join(' | '));
  await page.close();
}
await responsivePhase({ width: 1440, height: 900, name: 'Laptop 1440' }, false);
await responsivePhase({ width: 1280, height: 800, name: 'Desktop 1280' }, false);
await responsivePhase({ width: 768, height: 1024, name: 'Tablet 768' }, false);
await responsivePhase({ width: 390, height: 844, name: 'Mobile 390' }, true);

// =====================================================================
// F) RTL (Arabic) / LTR (English) preserve direction (P33-17, P33-18)
// =====================================================================
async function langPhase(locale, expectDir) {
  const { page, errs, cErr } = await newPage({ width: 1280, height: 800 });
  // Reliable language switch: persist the locale in localStorage, then reload so
  // the app initializes in that language (dir + data-language applied on boot).
  await page.evaluate((l) => { try { localStorage.setItem('eq-language', l); } catch (e) {} }, locale);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(800);
  await openPdfEditor(page);
  const proto = await page.evaluate(() => ({
    dir: document.documentElement.getAttribute('dir'),
    lang: (document.body.getAttribute('data-language') || ''),
    hasAdd: !!document.getElementById('smartPdfAddBtn'),
    hasMark: !!document.getElementById('smartPdfMarkBtn'),
    hasPages: !!document.getElementById('smartPdfPagesBtn')
  }));
  await page.evaluate(() => document.getElementById('smartPdfStyleBtn').click());
  const styleOpen = await page.evaluate(() => !document.getElementById('smartPdfStyleMenu').hasAttribute('hidden'));
  const ov = await pageHorizOverflow(page);
  const tag = locale === 'ar' ? '17' : '18';
  const label = locale === 'ar' ? 'Arabic RTL' : 'English LTR';
  check(`P33-${tag}`, `${label}: direction=${expectDir}`, proto.dir === expectDir, JSON.stringify(proto));
  check(`P33-${tag}`, `${label}: primary tools present`, proto.hasAdd && proto.hasMark && proto.hasPages);
  check(`P33-${tag}`, `${label}: secondary popover still opens`, styleOpen);
  check(`P33-${tag}`, `${label}: no horizontal overflow`, ov <= 1, String(ov));
  const ne = newErrs(errs, cErr);
  check(`P33-${tag}`, `${label}: no NEW JS errors`, ne.newErrors.length === 0, ne.newErrors.slice(0, 2).join(' | '));
  await page.close();
}
await langPhase('ar', 'rtl');
await langPhase('en', 'ltr');

await browser.close();
server.close();
const fails = results.filter((r) => !r.ok).length;
console.log(`DONE ${results.length - fails}/${results.length} PASS`);
process.exit(fails ? 1 : 0);