// PART 39 — SMART DOCUMENTS Imported-PDF: rendering clarity (no double-paint),
// top Toolbar (Back / Save / Send), persistence of edits via the existing
// PART 26 offline writer, and PART 18 signature invalidation on edit.
// Real-Chrome behavioral test (same harness style as PART 37/38).
// Run: node tests/part39_smart_pdf_toolbar_save_send.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8346;
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
  try {
    const data = fs.readFileSync(path.join(ROOT, urlPath));
    res.writeHead(200, { 'Content-Type': mimeOf(urlPath) + '; charset=utf-8' });
    res.end(data);
  } catch (e) { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 420000);

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
}
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(viewport) {
  const page = await browser.newPage();
  if (viewport) await page.setViewport(viewport);
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(700);
  return { page, errs };
}
async function openDrawer(page) { await page.evaluate(() => document.getElementById('drawerToggle').click()); await sleep(250); }
async function clickSmartDocs(page) { await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click()); await sleep(400); }
async function pickFile(page, filePath) {
  const [chooser] = await Promise.all([
    page.waitForFileChooser({ timeout: 9000 }),
    page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-import-file"]').click())
  ]);
  if (filePath) await chooser.accept([filePath]); else await chooser.cancel();
}
async function waitFor(page, fn, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await page.evaluate(fn)) return true;
    await sleep(120);
  }
  return false;
}
async function setLang(page, locale) {
  await page.evaluate((l) => {
    const s = document.getElementById('topBarLanguageSelect');
    if (s) { s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); }
  }, locale);
  await sleep(400);
}
async function dragSelect(page, sx, sy, ex, ey, steps = 16) {
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(sx + (ex - sx) * i / steps, sy + (ey - sy) * i / steps);
  }
  await page.mouse.up();
  await sleep(140);
}
async function findSpans(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('#smartPdfEditor .smart-pdf-text'))
    .map((sp) => {
      const r = sp.getBoundingClientRect();
      return { text: sp.textContent, x: r.x, y: r.y, w: r.width, h: r.height,
               page: parseInt(sp.dataset.page, 10), left: sp.style.left, top: sp.style.top };
    }).filter((s) => s.text && s.w > 2));
}
// Map a viewport point to a concrete text position (like part38's probe).
async function mapChar(page, x, y) {
  for (const dy of [0, -2, 2, -4, 4]) {
    const v = await page.evaluate(([px, py]) => {
      const r = document.caretRangeFromPoint(Math.round(px), Math.round(py));
      if (!r || !r.startContainer || r.startContainer.nodeType !== 3) return null;
      const sp = r.startContainer.parentElement;
      if (!sp || !sp.classList || !sp.classList.contains('smart-pdf-text')) return null;
      return { item: sp.dataset.item, off: r.startOffset };
    }, [x, y + dy]);
    if (v) return v;
  }
  return null;
}
// Drag-select between two glyph-VERIFIED points on the same span/line.
async function glyphDragSelect(page, rect) {
  const ys = [0, -2, 2, -4, 4, -6, 6];
  for (const dy of ys) {
    const cy = rect.y + rect.h / 2 + dy;
    const a = await mapChar(page, rect.x + rect.w * 0.15, cy);
    const b = await mapChar(page, rect.x + rect.w * 0.85, cy);
    if (a && b && a.item === b.item) {
      await dragSelect(page, rect.x + rect.w * 0.15, cy, rect.x + rect.w * 0.85, cy);
      return { ok: true, sel: await page.evaluate(() => String(window.getSelection())), dy };
    }
  }
  // fallback: raw geometric drag
  await dragSelect(page, rect.x + rect.w * 0.15, rect.y + rect.h / 2, rect.x + rect.w * 0.85, rect.y + rect.h / 2);
  return { ok: false, sel: await page.evaluate(() => String(window.getSelection())) };
}
async function importAndLoad(page, { lang = 'en' } = {}) {
  await setLang(page, lang);
  await openDrawer(page); await clickSmartDocs(page);
  await pickFile(page, pdfPath);
  const ok = await waitFor(page, () =>
    window.__smartImport.getState().editorVisible === true &&
    document.querySelectorAll('#smartPdfEditor .smart-pdf-text').length > 0);
  if (!ok) throw new Error('PDF editor did not load');
  await sleep(400);
}

// --- fixture: a one-page text PDF built in Chrome itself ---
const pdfPath = path.join(ROOT, '__part39.pdf');
{
  const p = await browser.newPage();
  await p.setContent(
    '<html><body style="font-family:Arial"><h1>Quarterly Business Report</h1>' +
    '<p>The quick brown fox jumps over the lazy dog</p>' +
    '<p>Second line of PDF text lives here now</p>' +
    '<p>Third line of PDF text ends the report</p></body></html>',
    { waitUntil: 'load' });
  await sleep(250);
  await p.pdf({ path: pdfPath, format: 'A4' });
  await p.close();
}

// ============ MAIN FLOW — desktop LTR ============
let LONG = null, NEXT = null;
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await importAndLoad(page);

  const spans = await findSpans(page);
  const body = spans.filter((s) => s.text.split(/\s+/).length >= 4);
  LONG = body.reduce((a, b) => (b.w > a.w ? b : a));
  const rest = spans.filter((s) => s.page === LONG.page && s.y > LONG.y + 1 && s.text.length > 3)
    .sort((a, b) => a.y - b.y);
  NEXT = rest[0] || spans.find((s) => s !== LONG) || null;
  check('setup: two usable text lines', !!LONG && !!NEXT,
    JSON.stringify({ long: LONG && LONG.text.slice(0, 24), next: NEXT && NEXT.text.slice(0, 24) }));

  // ---- Toolbar: exists once, visible, does not cover the PDF ----
  const tb = await page.evaluate(() => {
    const ids = ['smartEditorBack', 'smartEditorSaveBtn', 'smartEditorSendBtn'];
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean);
    const hdr = document.querySelector('#smartEditorView > .smart-scan-header');
    const firstPage = document.querySelector('#smartPdfEditor .smart-pdf-page').getBoundingClientRect();
    const dups = ids.filter((id) => document.querySelectorAll('#' + id).length !== 1);
    const rects = els.map((el) => { const r = el.getBoundingClientRect(); return { id: el.id, w: Math.round(r.width), h: Math.round(r.height) }; });
    return { hdrBottom: hdr ? hdr.getBoundingClientRect().bottom : -1, pageTop: firstPage.top,
             dups, rects, allVisible: els.length === 3 && rects.every((b) => b.w > 0 && b.h > 0),
             inHead: els.every((el) => !!hdr && hdr.contains(el)) };
  });
  check('T1 toolbar present EXACTLY ONCE (Back/Save/Send inside header)', tb.allVisible && tb.inHead && tb.dups.length === 0, JSON.stringify(tb));
  check('T1 toolbar does NOT cover the PDF (header bottom above page top)', tb.hdrBottom <= tb.pageTop + 1, JSON.stringify({ hdrBottom: tb.hdrBottom, pageTop: tb.pageTop }));

  // ---- No duplicate / jumbled text: pristine spans invisible ----
  const dupCheck = await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('#smartPdfEditor .smart-pdf-text'));
    const pristine = spans.filter((s) => !s.classList.contains('is-edited') && !s.classList.contains('is-editing'));
    let transparent = 0;
    pristine.forEach((s) => { if (getComputedStyle(s).color === 'rgba(0, 0, 0, 0)') transparent++; });
    const ta = document.getElementById('smartEditorText');
    const imgs = document.getElementById('smartEditorImages');
    const canvas = document.querySelector('#smartPdfEditor canvas');
    return { pristine: pristine.length, transparent, taHidden: !ta || getComputedStyle(ta).display === 'none',
             imgsHidden: !imgs || getComputedStyle(imgs).display === 'none',
             hasCanvas: !!canvas && canvas.width > 0 };
  });
  check('T2 every PRISTINE span is visually transparent (no double-paint over canvas)',
    dupCheck.pristine > 0 && dupCheck.transparent === dupCheck.pristine, JSON.stringify(dupCheck));
  check('T2 legacy textarea/images removed from the render path (no extra layer)', dupCheck.taHidden && dupCheck.imgsHidden);
  check('T2 canvas render alive', dupCheck.hasCanvas);
  // ---- Alignment sanity: spans inside their page box; layer width == canvas width ----
  const align = await page.evaluate(() => {
    const wrap = document.querySelector('#smartPdfEditor .smart-pdf-page').getBoundingClientRect();
    const bad = Array.from(document.querySelectorAll('.smart-pdf-text'))
      .filter((s) => { if (!s.textContent.trim()) return false; const r = s.getBoundingClientRect();
        return !(r.top >= wrap.top - 2 && r.bottom <= wrap.bottom + 2); }).length;
    const canvas = document.querySelector('#smartPdfEditor canvas');
    return { bad, canvasW: canvas ? parseFloat(canvas.style.width || canvas.width) : 0, wrapW: wrap.width };
  });
  check('T2 all spans lie INSIDE the PDF page box (textlayer not displaced)', align.bad === 0, JSON.stringify(align));
  check('T2 no separate scaling between canvas and text layer', Math.abs(align.canvasW - align.wrapW) < 1.5,
    JSON.stringify({ canvasW: align.canvasW, wrapW: align.wrapW }));
  check('no JS errors so far (desktop setup)', errs.length === 0, errs.join(' | '));

  // ---- Signature security FIRST (virgin text): signed -> drag-edit -> modified ----
  await page.evaluate(() => window.__smartSignatureProtection.setSignedForTest());
  const st0 = await page.evaluate(() => window.__smartSignatureProtection.status());
  await page.evaluate(() => { const b = document.querySelector('.smart-editor-body'); if (b) b.scrollTop = 0; });
  const sigSpans = await findSpans(page);
  const sigLong = sigSpans.filter((s) => s.text.split(/\s+/).length >= 4)
    .reduce((a, b) => (b.w > a.w ? b : a));
  const sigRes = await glyphDragSelect(page, sigLong);
  await page.keyboard.press('KeyA');
  await sleep(200);
  const st1 = await page.evaluate(() => window.__smartSignatureProtection.status());
  check('T4 signed PDF + drag-select + typing -> previous signature INVALIDATED',
    st0 === 'signed' && st1 === 'modified', JSON.stringify({ before: st0, after: st1, sig: sigRes.sel.slice(0, 20), anchored: sigRes.ok }));
  check('no JS errors so far (drag selection on signed doc)', errs.length === 0, errs.join(' | '));

  // ---- Committed CLICK-edit keeps its own position & becomes visible ----
  // (Real single click enters direct editing; blur commits. No typing needed —
  // committing itself must keep the span painted at the SAME left/top.)
  const cxL = LONG.x + LONG.w / 2, cyL = LONG.y + LONG.h / 2;
  const preLeft = LONG.left, preTop = LONG.top;
  await page.mouse.click(cxL, cyL);
  await sleep(200);
  await page.evaluate(() => { const sp = document.querySelector('#smartPdfEditor .smart-pdf-text.is-editing'); if (sp) sp.blur(); });
  await sleep(200);
  const committed = await page.evaluate(() => {
    const sp = document.querySelector('#smartPdfEditor .smart-pdf-text.is-edited');
    if (!sp) return null;
    const cs = getComputedStyle(sp);
    return { left: sp.style.left, top: sp.style.top, colorVis: cs.color !== 'rgba(0, 0, 0, 0)',
             bgWhite: cs.backgroundColor === 'rgb(255, 255, 255)', lastW: sp.dataset.lastW };
  });
  check('T3 committed click-edit keeps its own position & becomes visible (same left/top)',
    !!committed && committed.left === preLeft && committed.top === preTop &&
      committed.colorVis && committed.bgWhite && parseFloat(committed.lastW) > 0,
    JSON.stringify(committed));
  check('no JS errors so far (desktop edits)', errs.length === 0, errs.join(' | '));

  // ---- Save button works from FIRST click (real user click path) ----
  await page.evaluate(() => {
    window.__dl = [];
    HTMLAnchorElement.prototype.click = function () { window.__dl.push({ href: String(this.href), download: this.download }); };
  });
  await page.click('#smartEditorSaveBtn');
  await waitFor(page, () => ((window.__dl || []).length > 0));
  const saveInfo = await page.evaluate(() => ({ n: window.__dl.length, rec: window.__dl[0] || null }));
  check('T5 Save button triggers an actual PDF download on FIRST click',
    saveInfo.n === 1 && /\.pdf$/i.test(saveInfo.rec.download || '') && String(saveInfo.rec.href).indexOf('blob:') === 0,
    JSON.stringify(saveInfo.rec));

  // Persistence bytes: the saved blob must be a real PDF with the SAME page count
  const blobB64 = await page.evaluate(async () => {
    const b = await window.__smartImport.editedBlob();
    const u = new Uint8Array(await b.arrayBuffer());
    let s = ''; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
    return btoa(s);
  });
  const savedBytes = Buffer.from(blobB64, 'base64');
  check('T5 saved output IS a valid PDF blob (%PDF magic, non-trivial size)',
    savedBytes.slice(0, 5).toString() === '%PDF-' && savedBytes.length > 1000, 'bytes=' + savedBytes.length);
  fs.writeFileSync(path.join(ROOT, '__part39_saved.pdf'), savedBytes);

  const reopen = await page.evaluate(async (b64) => {
    try {
      const bin = atob(b64); const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const pdfjs = window.pdfjsLib;
      const doc = await pdfjs.getDocument({ data: u8 }).promise;
      return { pages: doc.numPages };
    } catch (e) { return { err: String(e && e.message || e) }; }
  }, blobB64);
  check('T5 persistence: saved PDF reopens via pdf.js with the SAME page count',
    reopen.pages === 1, JSON.stringify(reopen));
  // ---- Send works from FIRST click (native Web Share, real File) ----
  await page.evaluate(() => {
    window.__share = null;
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: (d) => !!(d && d.files && d.files.length) });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (d) => {
        const f = d.files[0];
        window.__share = { isFile: f instanceof File, type: f.type, size: f.size, title: d.title };
      }
    });
  });
  await page.click('#smartEditorSendBtn');
  await waitFor(page, () => !!window.__share);
  const shareInfo = await page.evaluate(() => window.__share);
  check('T6 Send button shares the edited PDF via native Web Share on FIRST click',
    shareInfo.isFile && shareInfo.type === 'application/pdf' && shareInfo.size > 1000, JSON.stringify(shareInfo));

  // ---- Send fallback: unsupported devices reuse the existing download path ----
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    window.__dl.length = 0;
  });
  await page.click('#smartEditorSendBtn');
  await waitFor(page, () => ((window.__dl || []).length > 0));
  const sendFallback = await page.evaluate(() => ({ n: window.__dl.length, rec: window.__dl[0] || null,
    toast: (document.getElementById('toast') || {}).textContent || '' }));
  check('T6 Send on UNSUPPORTED device falls back to the existing download path',
    sendFallback.n === 1 && /\.pdf$/i.test(sendFallback.rec.download || ''), JSON.stringify(sendFallback.rec));

  // ---- Back returns to the previous screen on FIRST click ----
  await page.click('#smartEditorBack');
  await sleep(350);
  const backState = await page.evaluate(() => ({
    st: window.__smartImport.getState(),
    editorHidden: !document.getElementById('smartEditorView').classList.contains('editor-visible')
  }));
  check('T7 Back returns to the import pick screen on FIRST click (PDF data kept)',
    backState.st.editorVisible === false && backState.editorHidden &&
      backState.st.viewVisible === true && backState.st.stage === 'pick', JSON.stringify(backState.st));
  check('no JS errors so far (desktop full flow)', errs.length === 0, errs.join(' | '));
}

// ============ RESPONSIVE / RTL / MOBILE ============
for (const [w, h, tag] of [[1280, 800, '1280x800-desktop'], [768, 800, '768-tablet'], [390, 844, '390-mobile-iPhone'], [360, 720, '360-small']]) {
  const locale = tag.indexOf('iPhone') !== -1 || tag.indexOf('small') !== -1 ? 'ar' : 'en';
  const { page, errs } = await newPage({ width: w, height: h, hasTouch: true, isMobile: h <= 500 });
  await importAndLoad(page, { lang: locale });
  const out = await page.evaluate(() => {
    const hdr = document.querySelector('#smartEditorView > .smart-scan-header');
    const firstPage = document.querySelector('#smartPdfEditor .smart-pdf-page').getBoundingClientRect();
    const ids = ['smartEditorBack', 'smartEditorSaveBtn', 'smartEditorSendBtn'];
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean);
    const title = hdr ? hdr.querySelector('h3') : null;
    return {
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      dir: document.body.getAttribute('data-language') || document.documentElement.dir,
      toolbarOk: els.length === 3 && els.every((el) => el.getBoundingClientRect().height > 0) &&
        hdr.getBoundingClientRect().bottom <= firstPage.top + 1,
      titleFits: !title || title.scrollWidth <= title.clientWidth + 1,
      spanInside: Array.from(document.querySelectorAll('.smart-pdf-text')).every((s) => {
        if (!s.textContent.trim()) return true; const r = s.getBoundingClientRect();
        return r.top >= firstPage.top - 2 && r.bottom <= firstPage.bottom + 2;
      })
    };
  });
  check(`[${tag}] toolbar intact above the PDF`, out.toolbarOk, JSON.stringify(out));
  check(`[${tag}] no horizontal overflow (overflowX=0)`, out.overflowX <= 0, 'overflowX=' + out.overflowX);
  check(`[${tag}] language/direction applied (${locale})`,
    locale === 'ar' ? out.dir === 'ar' : out.dir === 'en' || out.dir === 'ltr', 'dir=' + out.dir);
  check(`[${tag}] header title never overflows (ellipsis safe)`, out.titleFits);
  check(`[${tag}] text layer still aligned inside page box`, out.spanInside);
  check(`[${tag}] no JS errors`, errs.length === 0, errs.join(' | '));
}

// ---- Summary ----
const failed = results.filter((r) => !r.ok).length;
console.log(`SUMMARY: ${results.length - failed}/${results.length} checks passed`);
browser.close().catch(() => {});
server.close(() => {});
try { fs.unlinkSync(pdfPath); } catch (e) {}
try { fs.unlinkSync(path.join(ROOT, '__part39_saved.pdf')); } catch (e) {}
process.exit(failed ? 1 : 0);