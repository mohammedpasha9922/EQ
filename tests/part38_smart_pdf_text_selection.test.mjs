// PART 38 — SMART DOCUMENTS: PDF TEXT SELECTION (drag) + replace-on-typing
// Real-Chrome behavioral test via Puppeteer (same harness style as PART 37).
// Run:  node tests/part38_smart_pdf_text_selection.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8342;
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
const URL = `http://127.0.0.1:${PORT}/`;
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
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
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

const pdfPath = path.join(ROOT, '__part38.pdf');
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

// Character-position probe: caretRangeFromPoint maps viewport coords to the
// exact char offset inside the .smart-pdf-text span under the point.
async function armProbe(page) {
  await page.evaluate(() => {
    window.__probe = (x, y) => {
      const r = document.caretRangeFromPoint(Math.round(x), Math.round(y));
      if (!r || !r.startContainer || r.startContainer.nodeType !== 3) return null;
      const sp = r.startContainer.parentElement;
      if (!sp || !sp.classList || !sp.classList.contains('smart-pdf-text')) return null;
      return { text: sp.textContent, off: r.startOffset, di: sp.dataset.item };
    };
    return true;
  });
}
async function probe(page, x, y) {
  for (let dy of [0, -2, 2, -4, 4]) {
    const v = await page.evaluate(([px, py]) => window.__probe(px, py), [x, y + dy]);
    if (v) return v;
  }
  return null;
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
const getSel = (page) => page.evaluate(() => String(window.getSelection()));

async function findSpans(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('#smartPdfEditor .smart-pdf-text'))
    .map((sp) => {
      const r = sp.getBoundingClientRect();
      return { text: sp.textContent, x: r.x, y: r.y, w: r.width, h: r.height,
               page: parseInt(sp.dataset.page, 10) };
    }).filter((s) => s.text && s.w > 2));
}

// ============ MAIN FLOW — desktop LTR ============
let LONG = null, NEXT = null, THIRD = null, HDR = null;
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await importAndLoad(page);
  await armProbe(page);

  const spans = await findSpans(page);
  const body = spans.filter((s) => s.text.split(/\s+/).length >= 4);
  LONG = body.reduce((a, b) => (b.w > a.w ? b : a));
  const rest = spans.filter((s) => s.page === LONG.page && s.y > LONG.y + 1 && s.text.length > 3)
    .sort((a, b) => a.y - b.y);
  NEXT = rest[0] || null;
  THIRD = rest[1] || spans.find((s) => s !== LONG && s !== NEXT) || null;
  check('setup: at least 2 usable lines on page 1', !!LONG && !!NEXT, JSON.stringify({ long: LONG && LONG.text.slice(0, 30), next: NEXT && NEXT.text.slice(0, 30) }));

  const cxL = LONG.x + LONG.w / 2, cyL = LONG.y + LONG.h / 2;

  // ---- TEST 1: single word (partial drag inside one line) ----
  {
    const p1 = await probe(page, LONG.x + LONG.w * 0.22, cyL);
    const p2 = await probe(page, LONG.x + LONG.w * 0.33, cyL);
    await dragSelect(page, LONG.x + LONG.w * 0.22, cyL, LONG.x + LONG.w * 0.33, cyL);
    const r = await page.evaluate(() => {
      const s = window.getSelection();
      const a = s.rangeCount ? s.anchorNode : null;
      return {
        sel: String(s),
        editMode: !!document.querySelector('#smartPdfEditor .smart-pdf-text.is-editing'),
        anchorInLayer: !!(a && (a.nodeType === 3 ? a.parentElement : a).closest &&
          (a.nodeType === 3 ? a.parentElement : a).closest('.smart-pdf-textlayer'))
      };
    });
    const ok = r.sel.trim().length > 0 && r.editMode === false && r.anchorInLayer === true;
    check('Test 1: drag over one word -> natural browser selection', ok,
      JSON.stringify({ sel: r.sel, p1, p2, editMode: r.editMode, anchorInLayer: r.anchorInLayer }));
  }

  // ---- TEST 2: multiple words (drag wider across the line) ----
  {
    await dragSelect(page, LONG.x + LONG.w * 0.08, cyL, LONG.x + LONG.w * 0.92, cyL);
    const r = await page.evaluate(() => ({
      sel: String(window.getSelection()),
      editMode: document.querySelector('#smartPdfEditor .smart-pdf-text.is-editing') ? 1 : 0
    }));
    const words = r.sel.trim().split(/\s+/).filter(Boolean);
    const ok = r.editMode === 0 && r.sel.trim().length > 0 && words.length >= 2;
    check('Test 2: drag across multiple words -> all selected', ok,
      JSON.stringify({ sel: r.sel.slice(0, 60), words: words.length }));
  }

  // ---- TEST 3: full line ----
  {
    const p1 = await probe(page, LONG.x + 2, cyL);
    const p2 = await probe(page, LONG.x + LONG.w - 2, cyL);
    const expected = (p1 && p2) ? p1.text.slice(p1.off, p2.off) : '';
    await dragSelect(page, LONG.x + 2, cyL, LONG.x + LONG.w - 2, cyL);
    const sel = await getSel(page);
    const ratio = expected ? sel.replace(/\n/g, '').length / expected.length : 0;
    check('Test 3: drag across complete line -> complete line selected', ratio > 0.85, JSON.stringify({ ratio }));
  }

  // ---- TEST 4: drag selection can span two SEPARATE text spans (heading→body) ----
  // Mirrors the responsive sweep that already shows heading+body selected across.
  {
    const order = spans.filter((s) => s.page === 0 && s.text.length > 3).sort((a, b) => a.y - b.y);
    const A = order[0] || spans[0]; // heading
    const B = order[1] || A;        // first body line
    HDR = A;
    const ax = A.x + A.w * 0.18, ay = A.y + A.h / 2;
    const bx = B.x + B.w * (B === A ? 0.8 : 0.65), by = B.y + B.h / 2;
    await dragSelect(page, ax, ay, bx, by, 26);
    const sel = (await getSel(page)).replace(/[\n\r]+/g, ' ').trim();
    const tailH = A.text.slice(-10).trim();
    const headB = B.text.slice(0, 10).trim();
    const crosses = sel.length > 8 && sel.includes(tailH) && sel.includes(headB);
    check('Test 4: drag selection spans TWO text spans (heading->body)', crosses,
      JSON.stringify({ sel: sel.slice(0, 70), tailH, headB }));
  }

  // ---- TEST 5: typing replaces the (multi-span) selection IN THE SAME place ----
  {
    const touched = await page.evaluate(() => {
      const sel = window.getSelection();
      if (!sel.rangeCount || sel.isCollapsed) return [];
      const rng = sel.getRangeAt(0);
      const out = [];
      document.querySelectorAll('#smartPdfEditor .smart-pdf-text').forEach((sp) => {
        try {
          if (rng.intersectsNode(sp)) {
            const tr = document.createRange(); tr.selectNodeContents(sp);
            if (rng.compareBoundaryPoints(Range.END_TO_START, tr) < 0 &&
                rng.compareBoundaryPoints(Range.START_TO_END, tr) > 0) {
              out.push({ item: sp.dataset.item, before: sp.textContent, left: sp.style.left, top: sp.style.top });
            }
          }
        } catch (e) {}
      });
      return out;
    });
    check('Test 5 pre: selection active for replacement', touched.length >= 1,
      JSON.stringify(touched.map((t) => t.before.slice(0, 14))));
    await page.keyboard.press('KeyZ'); // printable keydown -> in-place replacement ('z')
    await sleep(160);
    const d = await page.evaluate((items) => {
      const cur = {};
      document.querySelectorAll('#smartPdfEditor .smart-pdf-text').forEach((sp) => {
        cur[sp.dataset.item] = { t: sp.textContent, editing: sp.classList.contains('is-editing'), left: sp.style.left, top: sp.style.top };
      });
      return cur;
    }, null);
    const f = touched.length ? d[touched[0].item] : null;
    const othersEmpty = touched.slice(1).every((s) => (d[s.item] ? d[s.item].t === '' : false));
    const samePlace = !!(f && f.editing && touched[0].left !== '' &&
      f.left === touched[0].left && f.top === touched[0].top);
    // selected text was replaced by the typed char, first span keeps left+top
    const replaced = !!(f && (f.t === 'z' || f.t.indexOf('z') !== -1) && f.t !== touched[0].before);
    check('Test 5: typing replaces selection IN THE SAME PDF position',
      replaced && othersEmpty && samePlace,
      JSON.stringify({ first: f && f.t.slice(0, 40), replaced, othersEmpty, samePlace }));
  }
  check('no JS errors so far (desktop)', errs.length === 0, errs.join(' | '));

  // ---- TEST 6: existing direct click-editing untouched ----
  if (THIRD) {
    const cxT = THIRD.x + THIRD.w / 2, cyT = THIRD.y + THIRD.h / 2;
    await page.mouse.click(cxT, cyT); // REAL single click (pointerdown+up, no move)
    await sleep(200);
    const d = await page.evaluate(() => {
      const sp = document.querySelector('#smartPdfEditor .smart-pdf-text.is-editing');
      return {
        anyEditing: !!sp,
        editable: sp ? sp.contentEditable : '',
        textSelected: sp ? String(window.getSelection()) === sp.textContent : false,
        text: sp ? sp.textContent : ''
      };
    });
    await page.evaluate(() => {
      const sp = document.querySelector('#smartPdfEditor .smart-pdf-text.is-editing');
      if (sp) sp.blur();
    });
    await sleep(140);
    const committed = await page.evaluate(() =>
      document.querySelector('#smartPdfEditor .smart-pdf-text.is-editing') === null &&
      document.querySelector('#smartPdfEditor .smart-pdf-text').textContent.length >= 0);
    check('Test 6: single click -> existing direct editing still works',
      d.anyEditing && d.editable === 'true' && d.textSelected && committed, JSON.stringify(d));
  }

  // ---- TEST 7: other PDF content untouched ----
  const struct = await page.evaluate(() => ({
    pages: document.querySelectorAll('#smartPdfEditor .smart-pdf-page').length,
    canvases: document.querySelectorAll('#smartPdfEditor canvas.smart-pdf-canvas').length,
    layerSpans: document.querySelectorAll('#smartPdfEditor .smart-pdf-textlayer .smart-pdf-text').length
  }));
  check('Test 7: PDF structure intact (pages/canvas/text-layer)',
    struct.pages >= 1 && struct.canvases === struct.pages && struct.layerSpans > 0, JSON.stringify(struct));
  await page.close();
}



// ============ RESPONSIVE SWEEP — viewports × languages ============
{
  const vpList = [
    { name: '1280x800-desktop-LTR', vp: { width: 1280, height: 800 }, lang: 'en' },
    { name: '768x800-tablet-LTR', vp: { width: 768, height: 800, hasTouch: true }, lang: 'en' },
    { name: '430x900-mobile-LTR', vp: { width: 430, height: 900, isMobile: true, hasTouch: true }, lang: 'en' },
    { name: '390x844-mobile-iPhone-LTR', vp: { width: 390, height: 844, isMobile: true, hasTouch: true }, lang: 'en' },
    { name: '360x720-small-LTR', vp: { width: 360, height: 720, isMobile: true, hasTouch: true }, lang: 'en' },
    { name: '1280x800-desktop-RTL', vp: { width: 1280, height: 800 }, lang: 'ar' },
    { name: '768x800-tablet-RTL', vp: { width: 768, height: 800, hasTouch: true }, lang: 'ar' },
    { name: '430x900-mobile-RTL', vp: { width: 430, height: 900, isMobile: true, hasTouch: true }, lang: 'ar' },
    { name: '390x844-mobile-iPhone-RTL', vp: { width: 390, height: 844, isMobile: true, hasTouch: true }, lang: 'ar' },
    { name: '360x720-small-RTL', vp: { width: 360, height: 720, isMobile: true, hasTouch: true }, lang: 'ar' }
  ];
  for (const cfg of vpList) {
    const { page, errs } = await newPage(cfg.vp);
    try {
      await importAndLoad(page, { lang: cfg.lang });
      await armProbe(page);
      const spans = (await findSpans(page)).filter((s) => s.page === 0 && s.text.length > 3).sort((a, b) => a.y - b.y);
      let okSel = false, detail = '';
      if (spans.length >= 1) {
        const A = spans[0];
        const B = spans.length > 1 ? spans[1] : spans[0];
        const ax = A.x + A.w * 0.15, ay = A.y + A.h / 2;
        const bx = B.x + B.w * (B === A ? 0.8 : 0.6), by = B.y + B.h / 2;
        await dragSelect(page, ax, ay, bx, by, 18);
        const sel = await getSel(page);
        okSel = sel.trim().length > 0;
        detail = JSON.stringify(sel.slice(0, 40));
      }
      const ovf = await page.evaluate(() => ({
        sw: Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0),
        iw: window.innerWidth,
        dir: document.documentElement.dir
      }));
      const noOvf = ovf.sw <= ovf.iw + 1;
      const dirOk = cfg.lang === 'ar' ? ovf.dir === 'rtl' : true;
      check(`[${cfg.name}] drag-selection works`, okSel, detail);
      check(`[${cfg.name}] overflowX = 0`, noOvf, JSON.stringify(ovf));
      if (cfg.lang === 'ar') check(`[${cfg.name}] dir=rtl preserved`, dirOk, '');
      check(`[${cfg.name}] no JS errors`, errs.length === 0, errs.join(' | '));
    } catch (e) {
      check(`[${cfg.name}] flow completed`, false, String(e && e.message || e));
    }
    await page.close();
  }
}

await browser.close();
server.close();
const failed = results.filter((r) => !r.ok);
console.log(`\nSUMMARY: ${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);

