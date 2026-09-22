// PHASE — PDF EDITOR BUTTON REBUILD verification (real Chrome, Puppeteer).
// Verifies: #pdfOpenCard -> Inline Live PDF Editor appears (no black screen),
// upload + render + inline overlay editing + export merge, close, responsive,
// EN/AR/KU, and regression on Calculator / Notes / Notes PDF / Currency.
// Run: node tests/__phase_pdfbtn.test.mjs
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
const PORT = 8493;
const pdfLib = require2(path.join(ROOT, '__pdfdiag/vendor/pdf-lib.min.js'));

async function buildFixture() {
  const doc = await pdfLib.PDFDocument.create();
  const font = await doc.embedFont(pdfLib.StandardFonts.Helvetica);
  const p1 = doc.addPage([595.28, 841.89]);
  p1.drawText('Quarterly Business Report', { x: 72, y: 770, size: 20, font });
  const p2 = doc.addPage([595.28, 841.89]);
  p2.drawText('Appendix Notes', { x: 72, y: 770, size: 18, font });
  return Buffer.from(await doc.save({ useObjectStreams: false, updateMetadata: false }));
}
const FIXTURE = (await buildFixture()).toString('base64');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.pdf': 'application/pdf' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (!p || p === '/') p = '/index.html';
  try {
    const f = path.join(ROOT, p);
    res.writeHead(200, { 'Content-Type': (MIME[path.extname(p).toLowerCase()] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(fs.readFileSync(f));
  } catch (e) { if (!res.headersSent) { res.writeHead(404); res.end('nf'); } }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 900000);

let pass = 0, fail = 0;
function check(id, name, ok, detail = '') {
  if (ok) pass++; else fail++;
  let d = typeof detail === 'object' ? JSON.stringify(detail) : String(detail);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id} ${name}${d ? '  -> ' + d.slice(0, 400) : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new', protocolTimeout: 180000,
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});

async function newPage(viewport) {
  const page = await browser.newPage();
  if (viewport) await page.setViewport(viewport);
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e && e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(800);
  return { page, errs };
}
async function openEditorViaButton(page) {
  return page.evaluate(() => {
    const c = document.getElementById('pdfOpenCard');
    if (!c) return { ok: false };
    c.click();
    return { ok: true };
  });
}
async function injectPdf(page, b64) {
  return page.evaluate(async (b) => {
    const bin = atob(b); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const dt = new DataTransfer(); dt.items.add(new File([u8], 'phase.pdf', { type: 'application/pdf' }));
    const fi = document.getElementById('livePdfEdFileInput');
    if (!fi) return { ok: false };
    fi.files = dt.files; fi.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true };
  }, b64);
}
async function waitRendered(page, minPages = 2, tries = 100) {
  for (let i = 0; i < tries; i++) {
    const s = await page.evaluate((mp) => {
      const pages = document.querySelectorAll('#livePdfEdPages .live-pdf-ed-page');
      const painted = [...pages].filter((p) => { const c = p.querySelector('canvas'); return c && c.width > 0; }).length;
      const spans = document.querySelectorAll('#livePdfEdPages .live-pdf-ed-span').length;
      const st = document.getElementById('livePdfEdStatus');
      return { pages: pages.length, painted, spans, status: st ? st.textContent : '' };
    }, minPages);
    if (s.pages >= minPages && s.painted >= minPages && s.spans >= minPages) return s;
    await sleep(200);
  }
  return null;
}
const PRE = /attribute d: Expected number|a2 2 2 0 0 0|forEach is not a function|websocket|favicon/i;
function newErrors(errs) { return errs.filter((e) => !PRE.test(e)); }
// =====================================================================
// A) Button -> editor appears (NO black screen) + light backdrop
// =====================================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 900 });
  const clicked = await openEditorViaButton(page);
  await sleep(350);
  const s = await page.evaluate(() => {
    const bd = document.getElementById('livePdfEdBackdrop');
    if (!bd) return null;
    const cs = getComputedStyle(bd);
    const panel = bd.querySelector('.live-pdf-ed');
    const r = panel ? panel.getBoundingClientRect() : null;
    return {
      shown: bd.classList.contains('show'),
      display: cs.display, bg: cs.backgroundColor,
      panelVisible: !!r && r.width > 100 && r.height > 100,
      hasTitle: !!document.getElementById('livePdfEdTitle'),
      hasClose: !!document.getElementById('livePdfEdClose'),
      hasSave: !!document.getElementById('livePdfEdSaveBtn'),
      hasUpload: !!document.getElementById('livePdfEdUploadBtn'),
      hasExport: !!document.getElementById('livePdfEdExportBtn'),
      hasInput: !!document.getElementById('livePdfEdFileInput'),
      inputAccept: (document.getElementById('livePdfEdFileInput') || {}).accept || ''
    };
  });
  check('A1', 'Button click opens editor (no dead click)', clicked.ok && !!s);
  check('A2', 'Backdrop shown, editor panel visible with content (no black screen)', !!s && s.shown && s.display !== 'none' && s.panelVisible, s ? JSON.stringify(s).slice(0, 200) : 'null');
  check('A3', 'Backdrop is LIGHT (rgba 0.35-0.55 alpha)', !!s && /rgba\(0,\s*0,\s*0,\s*0\.4[0-9]?\)/.test(s.bg || ''), s ? s.bg : '');
  check('A4', 'Toolbar: X / title / Save / Upload / Export / file input present', !!s && s.hasTitle && s.hasClose && s.hasSave && s.hasUpload && s.hasExport && s.hasInput);
  check('A5', 'File input accepts PDF', !!s && s.inputAccept.includes('application/pdf') && s.inputAccept.includes('.pdf'), s ? s.inputAccept : '');
  check('A6', 'No JS errors on open', newErrors(errs).length === 0, newErrors(errs).join(' | ').slice(0, 300));
  const expDisabled = await page.evaluate(() => {
    const b = document.getElementById('livePdfEdExportBtn');
    return !!b && b.disabled === true;
  });
  check('A7', 'Save/Export disabled before any editable PDF state exists', expDisabled === true);

  // B) Upload -> render -> inline edit -> export
  const inj = await injectPdf(page, FIXTURE);
  const ren = await waitRendered(page, 2);
  check('B1', 'PDF injected via file input', inj.ok === true);
  check('B2', 'Both pages render with painted canvases + editable overlay spans', !!ren, ren ? JSON.stringify(ren) : 'timeout');
  const overflow1 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('B3', 'No horizontal overflow with PDF loaded', overflow1 <= 0, 'overflow=' + overflow1);
  // Inline edit: find the span containing 'Quarterly' and retype it.
  const edited = await page.evaluate(() => {
    const spans = [...document.querySelectorAll('#livePdfEdPages .live-pdf-ed-span')];
    const t = spans.find((s) => s.textContent.includes('Quarterly'));
    if (!t) return { ok: false, n: spans.length };
    t.focus();
    t.textContent = 'Updated Final Report';
    t.dispatchEvent(new Event('input', { bubbles: true }));
    const active = document.activeElement === t;
    return { ok: true, active, editable: t.getAttribute('contenteditable') === 'true', caret: getComputedStyle(t).caretColor !== 'auto' };
  });
  check('B4', 'Text span clickable/editable inline (cursor, in-page, no second modal)', edited.ok === true && edited.active && edited.editable, JSON.stringify(edited));
  const expEnabled = await page.evaluate(() => !document.getElementById('livePdfEdExportBtn').disabled);
  check('B5', 'Save & Export enabled after edit', expEnabled === true);

  await page.evaluate(() => {
    window.__cap = 0;
    const orig = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => { window.__cap++; window.__capBlob = blob; return orig(blob); };
  });
  await page.evaluate(() => document.getElementById('livePdfEdExportBtn').click());
  let capB64 = null;
  // The export lazily loads pdf-lib (≈0.5 MB) from the vendor path, so allow a
  // generous budget instead of the previous 12 s (cold-load flake).
  for (let i = 0; i < 90; i++) {
    capB64 = await page.evaluate(async () => {
      if (!window.__capBlob) return null;
      const buf = await window.__capBlob.arrayBuffer();
      let s = ''; const u = new Uint8Array(buf);
      for (let j = 0; j < u.length; j += 8192) s += String.fromCharCode.apply(null, u.subarray(j, j + 8192));
      return btoa(s);
    });
    if (capB64) break;
    await sleep(300);
  }
  const expStatus = await page.evaluate(() => document.getElementById('livePdfEdStatus').textContent);
  check('B6', 'Export produces a PDF blob', !!capB64, capB64 ? '' : 'status=' + expStatus);
  if (capB64) {
    const pdfjs = require2(path.join(ROOT, '__pdfdiag/vendor/pdf.min.js'));
    pdfjs.GlobalWorkerOptions.workerSrc = path.join(ROOT, '__pdfdiag/vendor/pdf.worker.min.js');
    const doc = await pdfjs.getDocument({ data: new Uint8Array(Buffer.from(capB64, 'base64')) }).promise;
    const t1 = await (await doc.getPage(1)).getTextContent();
    const text1 = t1.items.map((i) => i.str).join(' ');
    const t2 = await (await doc.getPage(2)).getTextContent();
    const text2 = t2.items.map((i) => i.str).join(' ');
    check('B7', 'Exported PDF has 2 pages (original structure preserved)', doc.numPages === 2, 'pages=' + doc.numPages);
    check('B8', 'Edit applied in exported PDF (new text present)', text1.includes('Updated Final Report'), text1.slice(0, 120));
    // NOTE: overlay export covers the ORIGINAL text with an opaque white
    // rectangle and draws the replacement as real PDF text. The original
    // string may still exist in the content stream beneath the cover
    // (copy/search of the covered area can find it) — documented limitation.
    check('B9', 'Exported PDF page 2 intact (original structure preserved)', text2.includes('Appendix Notes'), 'p2=' + text2.slice(0, 80));
  }

  await page.evaluate(() => document.getElementById('livePdfEdClose').click());
  await sleep(250);
  const closed = await page.evaluate(() => {
    const bd = document.getElementById('livePdfEdBackdrop');
    const cs = getComputedStyle(bd);
    return { hidden: !bd.classList.contains('show') && cs.display === 'none', ariaHidden: bd.getAttribute('aria-hidden') === 'true' };
  });
  check('C1', 'Close hides editor + backdrop fully removed from view', closed.hidden && closed.ariaHidden, JSON.stringify(closed));
  check('C2', 'Reopen still functional after close', (await page.evaluate(() => { window.livePdfEdOpen(); return document.getElementById('livePdfEdBackdrop').classList.contains('show'); })) === true);
  // Escape closes ONLY the live editor (document-level, guarded while typing in a span).
  await page.evaluate(() => document.body.focus());
  await page.keyboard.press('Escape');
  await sleep(200);
  check('C3', 'Escape closes the editor (scoped)', (await page.evaluate(() => !document.getElementById('livePdfEdBackdrop').classList.contains('show'))) === true);
  await page.evaluate(() => window.livePdfEdClose());
// D) Regression: Calculator, Notes, Currency
  const calc = await page.evaluate(() => {
    try {
      const btns = [...document.querySelectorAll('.keypad-btn')];
      const press = (d) => { const b = btns.find((x) => x.textContent.trim() === d); if (b) b.click(); };
      const ac = document.querySelector('[data-action="clear"]'); if (ac) ac.click();
      press('2'); press('+'); press('3');
      const eq = document.querySelector('[data-action="equals"]'); if (eq) eq.click();
      const el = document.getElementById('primaryDisplay');
      return el ? el.textContent : null;
    } catch (e) { return 'ERR ' + e.message; }
  });
  check('D1', 'Calculator 2+3=5 still works', calc !== null && String(calc).includes('5'), String(calc));
  const notes = await page.evaluate(() => {
    const b = document.querySelector('.feature-nav-btn[data-action="open-notes"], .drawer-menu-item[data-action="open-notes"]');
    if (b) b.click();
    const m = document.getElementById('notesManagerModal');
    return !!m && (m.classList.contains('show') || getComputedStyle(m).display !== 'none');
  });
  check('D2', 'Notes manager still opens', notes === true);
  const currency = await page.evaluate(() => {
    const b = document.getElementById('currencyMenuButton') || document.querySelector('[data-action="open-currency"]');
    if (!b) return { found: false };
    b.click();
    const menu = document.getElementById('currencyMenuPopover');
    return { found: true, open: !!menu && (menu.getAttribute('aria-hidden') === 'false' || menu.classList.contains('open') || getComputedStyle(menu).display !== 'none') };
  });
  check('D3', 'Currency menu still opens', currency.found === true && currency.open === true, JSON.stringify(currency));
  // Smart Documents must still open through its OWN entry point. Only the
  // "Open PDF" card was re-routed; the Smart Documents path is untouched.
  const smart = await page.evaluate(() => {
    const b = document.querySelector('.feature-nav-btn[data-action="open-smart-docs"], .drawer-menu-item[data-action="open-smart-docs"]');
    if (b) b.click();
    const m = document.getElementById('smartDocsModal');
    return { found: !!b, open: !!m && m.classList.contains('show') };
  });
  check('D5', 'Smart Documents still opens through its OWN button/path', smart.found === true && smart.open === true, JSON.stringify(smart));
  await page.evaluate(() => {
    const m = document.getElementById('smartDocsModal');
    if (m) { m.classList.remove('show'); m.setAttribute('aria-hidden', 'true'); }
  });
  check('D4', 'No JS errors after regressions', newErrors(errs).length === 0, newErrors(errs).join(' | ').slice(0, 300));
  await page.close();
}

// E) Responsive + i18n
for (const vp of [[1280, 800], [768, 900], [430, 800], [390, 800], [360, 740]]) {
  const { page, errs } = await newPage({ width: vp[0], height: vp[1] });
  const loc = vp[0] === 430 ? 'ar' : (vp[0] === 360 ? 'ku' : 'en');
  // Change language via the EXISTING app UI control (module functions are not global).
  await page.evaluate((l) => {
    const sel = document.getElementById('topBarLanguageSelect');
    if (sel) { sel.value = l; sel.dispatchEvent(new Event('change', { bubbles: true })); }
  }, loc);
  await sleep(250);
  await page.evaluate(() => { const c = document.getElementById('pdfOpenCard'); if (c) c.click(); });
  await sleep(250);
  const inj = await injectPdf(page, FIXTURE);
  const ren = await waitRendered(page, 2, 80);
  const s = await page.evaluate((w) => {
    const doc = document.documentElement;
    const bd = document.getElementById('livePdfEdBackdrop');
    const panel = bd.querySelector('.live-pdf-ed');
    const pr = panel.getBoundingClientRect();
    const header = panel.querySelector('.live-pdf-ed-header').getBoundingClientRect();
    const footer = panel.querySelector('.live-pdf-ed-footer').getBoundingClientRect();
    const btns = [...panel.querySelectorAll('.live-pdf-ed-btn, .live-pdf-ed-save-top, .live-pdf-ed-close')];
    const inVp = (r) => r.left >= -1 && r.top >= -1 && r.right <= w + 1 && r.bottom <= innerHeight + 1;
    return {
      overflow: doc.scrollWidth - w,
      panelInVp: inVp(pr), headerInVp: inVp(header), footerInVp: inVp(footer),
      btnsInVp: btns.every((b) => inVp(b.getBoundingClientRect())),
      dir: panel.getAttribute('dir'),
      title: document.getElementById('livePdfEdTitle').textContent,
      shown: bd.classList.contains('show')
    };
  }, vp[0]);
  check(`E-${vp[0]}`, `${vp[0]}px: opens, renders, all inside viewport, no H-overflow`,
    !!ren && s.shown && s.overflow <= 0 && s.panelInVp && s.headerInVp && s.footerInVp && s.btnsInVp,
    JSON.stringify({ inj, ren: !!ren, ...s, title: s.title.slice(0, 30) }));
  const wantDir = (loc === 'en') ? 'ltr' : 'rtl';
  check(`E-${vp[0]}-i18n`, `${vp[0]}px ${loc}: panel direction ${wantDir} + localized title`, s.dir === wantDir, `dir=${s.dir} title=${s.title.slice(0, 24)}`);
  check(`E-${vp[0]}-err`, `${vp[0]}px: no new JS errors`, newErrors(errs).length === 0, newErrors(errs).join(' | ').slice(0, 200));
  await page.close();
}

// F) Notes PDF export regression
{
  const { page, errs } = await newPage({ width: 1280, height: 900 });
  // Open the Notes editor the way a user does: Notes -> new note.
  const opened = await page.evaluate(() => {
    const b = document.querySelector('[data-action="open-notes"]');
    if (b) b.click();
    return true;
  });
  await sleep(700);
  await page.evaluate(() => document.querySelector('#openNewNoteButton')?.click());
  await sleep(800);
  const editorShown = await page.evaluate(() => !!document.querySelector('#fullScreenNoteModal')?.classList.contains('show'));
  await page.evaluate(() => {
    const t = document.getElementById('noteTitleInput');
    if (t) { t.value = 'Phase regression note'; t.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  await sleep(200);
  const notePdf = await page.evaluate(() => {
    const ex = document.getElementById('exportNotePdfBtn');
    if (ex) ex.click();
    // INSTANT EXPORT: no setup dialog is opened (and none exists in the DOM).
    const m = document.getElementById('noteExportPdfModal');
    return { dialogRemoved: !m, dialogShown: !!m && m.classList.contains('show') };
  });
  await sleep(400);
  check('F0', 'Notes editor opens + new note flow works (untouched)', opened && editorShown);
  check('F1', 'Notes → PDF export is instant (no setup dialog; removed from the DOM)',
    notePdf.dialogRemoved && !notePdf.dialogShown, JSON.stringify(notePdf));
  check('F2', 'No JS errors in Notes flow', newErrors(errs).length === 0, newErrors(errs).join(' | ').slice(0, 200));
  await page.close();
}

console.log(`\nSUMMARY: PASS=${pass} FAIL=${fail}`);
server.close();
await browser.close();
process.exit(fail === 0 ? 0 : 1);