// PHASE 04 — PDF LAYOUT & DESIGN SYSTEM — behavioral test in a real Chrome browser.
// Verifies that the Layout (Page Size / Orientation / Margins) and Design
// (Page Style / Border / Spacing) options produce REAL, measurable changes on the
// live PDF preview, not just attribute flips. Also covers persistence, and
// Desktop / Tablet / Mobile / RTL / LTR with zero JS errors and no overflow.
// Run:  node tests/phase04_pdf_layout_design.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8294;
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

// Reopen the given tool panel and click an option. Clicking an option closes the
// panel (existing Phase 03 behaviour), so this always re-opens it first.
async function pick(page, toggleId, option, value) {
  await page.evaluate((id) => document.getElementById(id).click(), toggleId);
  await sleep(130);
  await page.evaluate((o, v) => {
    const b = document.querySelector(`.pdf-opt[data-pdf-option="${o}"][data-value="${v}"]`);
    if (!b) throw new Error('option not found ' + o + '=' + v);
    b.click();
  }, option, value);
  await sleep(160);
}

const pageGeo = (page) => page.evaluate(() => {
  const el = document.getElementById('pdfPreviewPage');
  const inner = document.querySelector('#pdfPreviewPage .pdf-page-inner');
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const ics = inner ? getComputedStyle(inner) : null;
  const lines = Array.from(el.querySelectorAll('.pdf-ph-line'));
  const lastLine = lines.length ? lines[lines.length - 1].getBoundingClientRect() : null;
  const title = el.querySelector('.pdf-ph-title');
  const tcs = title ? getComputedStyle(title) : null;
  return {
    attrSize: el.getAttribute('data-size'),
    attrOrient: el.getAttribute('data-orientation'),
    attrMargins: el.getAttribute('data-margins'),
    attrStyle: el.getAttribute('data-page-style'),
    attrBorder: el.getAttribute('data-border'),
    attrSpacing: el.getAttribute('data-spacing'),
    w: r.width, h: r.height,
    borderLeft: parseFloat(cs.borderLeftWidth),
    pageBgImage: cs.backgroundImage,
    titleBg: tcs ? tcs.backgroundColor : '',
    innerPadTop: ics ? ics.paddingTop : '',
    lastLineTop: lastLine ? lastLine.top : 0
  };
});

// ============================================================
// DESKTOP — Layout & Design produce measurable preview changes
// ============================================================
{
  const { page, errors } = await newPage(1280, 800);
  await openWorkspace(page);

  // Central layout state object exists and drives the page
  const init = await pageGeo(page);
  check('Desktop: page defaults a4/portrait/normal/minimal/none/normal',
    init.attrSize === 'a4' && init.attrOrient === 'portrait' && init.attrMargins === 'normal' &&
    init.attrStyle === 'minimal' && init.attrBorder === 'none' && init.attrSpacing === 'normal',
    JSON.stringify({ s: init.attrSize, o: init.attrOrient, m: init.attrMargins, st: init.attrStyle, b: init.attrBorder, sp: init.attrSpacing }));

  const a4w = init.w, a4h = init.h;

  // A3 changes preview (wider page)
  await pick(page, 'pdfLayoutToggle', 'pageSize', 'a3');
  const a3 = await pageGeo(page);
  check('Layout: A3 changes preview dimensions', a3.attrSize === 'a3' && a3.w > a4w + 20,
    `a4w=${a4w} a3w=${a3.w}`);
  // Single central state (6 keys) drives the preview + is persisted
  const centralState = await page.evaluate(() => localStorage.getItem('eq-pdf-report-layout'));
  check('Desktop: single central layout state (6 keys) drives preview',
    !!centralState &&
    ['pageSize', 'orientation', 'margins', 'pageStyle', 'border', 'spacing']
      .every((k) => JSON.parse(centralState)[k] !== undefined) &&
    JSON.parse(centralState).pageSize === 'a3',
    String(centralState));

  // Letter changes preview (taller page than A4)
  await pick(page, 'pdfLayoutToggle', 'pageSize', 'letter');
  const letter = await pageGeo(page);
  check('Layout: Letter changes preview dimensions',
    letter.attrSize === 'letter' && letter.h > a4h + 10,
    `a4h=${a4h} letterh=${letter.h}`);

  // back to A4
  await pick(page, 'pdfLayoutToggle', 'pageSize', 'a4');
  const a4b = await pageGeo(page);

  // Orientation landscape swaps width/height
  await pick(page, 'pdfLayoutToggle', 'orientation', 'landscape');
  const land = await pageGeo(page);
  check('Layout: Landscape changes preview dimensions (swap)',
    land.attrOrient === 'landscape' && land.w > land.h && land.w > a4b.w,
    `portrait w=${a4b.w} h=${a4b.h} | landscape w=${land.w} h=${land.h}`);

  await pick(page, 'pdfLayoutToggle', 'orientation', 'portrait');
  const port = await pageGeo(page);
  check('Layout: Portrait restores preview dimensions',
    port.attrOrient === 'portrait' && port.w < port.h, `w=${port.w} h=${port.h}`);

  // Margins: inner content area padding changes (Normal / Compact / Wide).
  // Disable the 0.2s margin transition for a deterministic computed-style read.
  await page.addStyleTag({ content: '.pdf-page-inner { transition: none !important; }' });
  await pick(page, 'pdfLayoutToggle', 'margins', 'compact');
  const mCompact = await pageGeo(page);
  await pick(page, 'pdfLayoutToggle', 'margins', 'normal');
  const mNormal = await pageGeo(page);
  await pick(page, 'pdfLayoutToggle', 'margins', 'wide');
  const mWide = await pageGeo(page);
  check('Layout: Normal margins applied', mNormal.attrMargins === 'normal');
  check('Layout: Compact margins shrink content padding',
    parseFloat(mCompact.innerPadTop) < parseFloat(mNormal.innerPadTop),
    `compact=${mCompact.innerPadTop} normal=${mNormal.innerPadTop}`);
  check('Layout: Wide margins grow content padding',
    parseFloat(mWide.innerPadTop) > parseFloat(mNormal.innerPadTop),
    `wide=${mWide.innerPadTop} normal=${mNormal.innerPadTop}`);

  check('Desktop: no JS errors during Layout', (errors || []).length === 0, (errors || []).join(' | ') || 'no errors');
  await page.close();
}


// ============================================================
// DESKTOP — Design options produce measurable visual changes
// ============================================================
{
  const { page, errors } = await newPage(1280, 800);
  await openWorkspace(page);

  const minimal = await pageGeo(page);

  // Page Style: Professional -> title accent + tinted background
  await pick(page, 'pdfDesignToggle', 'pageStyle', 'professional');
  const pro = await pageGeo(page);
  check('Design: Professional changes page style visuals',
    pro.attrStyle === 'professional' && pro.titleBg !== minimal.titleBg,
    `minimal titleBg=${minimal.titleBg} professional titleBg=${pro.titleBg}`);

  // Page Style: Technical -> distinct blueprint background
  await pick(page, 'pdfDesignToggle', 'pageStyle', 'technical');
  const tech = await pageGeo(page);
  check('Design: Technical changes page background vs minimal',
    tech.attrStyle === 'technical' &&
    tech.pageBgImage !== 'none' && tech.pageBgImage !== minimal.pageBgImage,
    `minimal bg=${minimal.pageBgImage} technical bg=${tech.pageBgImage}`);

  // Border: None / Thin / Medium -> border-left-width 0 / 1 / 3
  await pick(page, 'pdfDesignToggle', 'border', 'thin');
  const bThin = await pageGeo(page);
  check('Design: Border Thin applies (1px)', bThin.attrBorder === 'thin' && bThin.borderLeft === 1,
    `borderLeft=${bThin.borderLeft}`);
  await pick(page, 'pdfDesignToggle', 'border', 'medium');
  const bMed = await pageGeo(page);
  check('Design: Border Medium applies (3px)', bMed.attrBorder === 'medium' && bMed.borderLeft === 3,
    `borderLeft=${bMed.borderLeft}`);
  await pick(page, 'pdfDesignToggle', 'border', 'none');
  const bNone = await pageGeo(page);
  check('Design: Border None applies (0px)', bNone.attrBorder === 'none' && bNone.borderLeft === 0,
    `borderLeft=${bNone.borderLeft}`);

  // Spacing: Compact vs Normal vs Relaxed -> last placeholder line moves
  await pick(page, 'pdfDesignToggle', 'spacing', 'compact');
  const spCompact = await pageGeo(page);
  await pick(page, 'pdfDesignToggle', 'spacing', 'normal');
  const spNormal = await pageGeo(page);
  await pick(page, 'pdfDesignToggle', 'spacing', 'relaxed');
  const spRelaxed = await pageGeo(page);
  check('Design: Compact spacing packs lines closer',
    spCompact.attrSpacing === 'compact' && spCompact.lastLineTop < spNormal.lastLineTop - 1,
    `compact=${spCompact.lastLineTop.toFixed(1)} normal=${spNormal.lastLineTop.toFixed(1)}`);
  check('Design: Relaxed spacing spreads lines apart',
    spRelaxed.attrSpacing === 'relaxed' && spRelaxed.lastLineTop > spNormal.lastLineTop + 1,
    `relaxed=${spRelaxed.lastLineTop.toFixed(1)} normal=${spNormal.lastLineTop.toFixed(1)}`);

  check('Desktop Design: no JS errors', (errors || []).length === 0, (errors || []).join(' | ') || 'no errors');
  await page.close();
}

// ============================================================
// PERSISTENCE — choices survive closing / reopening the workspace
// ============================================================
{
  const { page, errors } = await newPage(1280, 800);
  await openWorkspace(page);
  await pick(page, 'pdfLayoutToggle', 'pageSize', 'a3');
  await pick(page, 'pdfLayoutToggle', 'orientation', 'landscape');
  await pick(page, 'pdfDesignToggle', 'border', 'medium');
  await page.evaluate(() => document.getElementById('closePdfReports').click());
  await sleep(400);
  await openWorkspace(page);
  const g = await pageGeo(page);
  check('Persistence: A3 + Landscape + Medium border survive reopen',
    g.attrSize === 'a3' && g.attrOrient === 'landscape' && g.attrBorder === 'medium',
    JSON.stringify({ s: g.attrSize, o: g.attrOrient, b: g.attrBorder }));
  // reset to defaults so subsequent runs start clean
  await page.evaluate(() => { const b = document.querySelector('[data-pdf-action="new"]'); if (b) b.click(); });
  await sleep(200);
  check('Persistence: New resets layout to defaults',
    (await pageGeo(page)).attrSize === 'a4',
    'after reset');
  check('Persistence: no JS errors', (errors || []).length === 0, (errors || []).join(' | ') || 'no errors');
  await page.close();
}

// ============================================================
// TABLET (768x1024) — big page fits, no overflow
// ============================================================
{
  const { page, errors } = await newPage(768, 1024);
  await openWorkspace(page);
  await pick(page, 'pdfLayoutToggle', 'pageSize', 'a3');
  await pick(page, 'pdfLayoutToggle', 'orientation', 'landscape');
  const g = await pageGeo(page);
  const geom = await page.evaluate(() => {
    const pageEl = document.getElementById('pdfPreviewPage');
    const stage = document.getElementById('pdfPreviewStage');
    return {
      pageW: pageEl.getBoundingClientRect().width,
      stageW: stage.clientWidth,
      docOverflowX: document.documentElement.scrollWidth - window.innerWidth,
      toolbarRows: new Set(Array.from(document.querySelectorAll('#pdfReportsModal .pdf-tool'))
        .map((t) => Math.round(t.getBoundingClientRect().top))).size
    };
  });
  check('Tablet: A3 landscape preview rendered', g.attrSize === 'a3' && g.attrOrient === 'landscape');
  check('Tablet: preview fits stage width', geom.pageW <= geom.stageW + 1,
    `pageW=${geom.pageW.toFixed(1)} stageW=${geom.stageW}`);
  check('Tablet: no horizontal document overflow', geom.docOverflowX <= 2, 'dx=' + geom.docOverflowX);
  check('Tablet: toolbar stays a single row', geom.toolbarRows === 1, 'rows=' + geom.toolbarRows);
  check('Tablet: no JS errors', (errors || []).length === 0, (errors || []).join(' | ') || 'no errors');
  await page.close();
}
// ============================================================
// MOBILE (390x844) — layout/design panels don't break the screen
// ============================================================
{
  const { page, errors } = await newPage(390, 844, true);
  await openWorkspace(page);
  await pick(page, 'pdfLayoutToggle', 'pageSize', 'a3');
  await pick(page, 'pdfLayoutToggle', 'orientation', 'landscape');
  await pick(page, 'pdfDesignToggle', 'pageStyle', 'technical');
  await pick(page, 'pdfDesignToggle', 'border', 'medium');
  const geom = await page.evaluate(() => {
    const pageEl = document.getElementById('pdfPreviewPage');
    const stage = document.getElementById('pdfPreviewStage');
    return {
      pageW: pageEl.getBoundingClientRect().width,
      stageW: stage.clientWidth,
      docOverflowX: document.documentElement.scrollWidth - window.innerWidth,
      toolbarRows: new Set(Array.from(document.querySelectorAll('#pdfReportsModal .pdf-tool'))
        .map((t) => Math.round(t.getBoundingClientRect().top))).size,
      panelH: document.getElementById('pdfLayoutPanel').getBoundingClientRect().height,
      viewH: window.innerHeight
    };
  });
  check('Mobile: A3 applied', (await pageGeo(page)).attrSize === 'a3', 'a3 applied');
  check('Mobile: preview fits stage width', geom.pageW <= geom.stageW + 1,
    `pageW=${geom.pageW.toFixed(1)} stageW=${geom.stageW}`);
  check('Mobile: no horizontal overflow', geom.docOverflowX <= 2, 'dx=' + geom.docOverflowX);
  check('Mobile: toolbar stays a single row', geom.toolbarRows === 1, 'rows=' + geom.toolbarRows);
  check('Mobile: panel does not cover the viewport', geom.panelH < geom.viewH,
    `panelH=${geom.panelH.toFixed(1)} viewH=${geom.viewH}`);
  check('Mobile: no JS errors', (errors || []).length === 0, (errors || []).join(' | ') || 'no errors');
  await page.close();
}
// ============================================================
// RTL (Arabic) — layout/design controls work, preview reacts
// ============================================================
{
  const { page, errors } = await newPage(1280, 800);
  await page.evaluate(() => {
    const sel = document.getElementById('topBarLanguageSelect');
    sel.value = 'ar';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await sleep(400);
  await openWorkspace(page);
  const dir = await page.evaluate(() => document.documentElement.dir);
  check('RTL: document direction is rtl', dir === 'rtl', 'dir=' + dir);
  // Arabic labels for the new design values
  const arLabels = await page.evaluate(() => {
    const q = (v) => {
      const el = document.querySelector(`.pdf-opt[data-pdf-option="pageStyle"][data-value="${v}"] span`);
      return el ? el.textContent : null;
    };
    const margin = () => {
      const el = document.querySelector('.pdf-opt[data-pdf-option="margins"][data-value="compact"] span');
      return el ? el.textContent : null;
    };
    return { minimal: q('minimal'), professional: q('professional'), technical: q('technical'), compact: margin() };
  });
  check('RTL: design labels localized (Arabic)',
    arLabels.minimal === 'بسيط' && arLabels.professional === 'احترافي' && arLabels.technical === 'تقني' && arLabels.compact === 'مضغوط',
    JSON.stringify(arLabels));

  await pick(page, 'pdfLayoutToggle', 'pageSize', 'a3');
  await pick(page, 'pdfLayoutToggle', 'orientation', 'landscape');
  await pick(page, 'pdfDesignToggle', 'pageStyle', 'technical');
  const g = await pageGeo(page);
  check('RTL: Layout/Design changes still apply in RTL',
    g.attrSize === 'a3' && g.attrOrient === 'landscape' && g.attrStyle === 'technical',
    JSON.stringify({ s: g.attrSize, o: g.attrOrient, st: g.attrStyle }));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('RTL: no horizontal document overflow', overflow <= 2, 'dx=' + overflow);
  check('RTL: no JS errors', (errors || []).length === 0, (errors || []).join(' | ') || 'no errors');
  await page.close();
}

// ============================================================
// LTR (English) — controls work
// ============================================================
{
  const { page, errors } = await newPage(1280, 800);
  // Force English (the earlier RTL block persisted 'ar' into shared localStorage).
  await page.evaluate(() => {
    const sel = document.getElementById('topBarLanguageSelect');
    sel.value = 'en';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await sleep(400);
  await openWorkspace(page);
  const dir = await page.evaluate(() => document.documentElement.dir);
  check('LTR: document direction is ltr', dir === 'ltr', 'dir=' + dir);
  const enLabels = await page.evaluate(() => {
    const q = (v) => {
      const el = document.querySelector(`.pdf-opt[data-pdf-option="pageStyle"][data-value="${v}"] span`);
      return el ? el.textContent : null;
    };
    return { minimal: q('minimal'), professional: q('professional'), technical: q('technical') };
  });
  check('LTR: design labels correct (English)',
    enLabels.minimal === 'Minimal' && enLabels.professional === 'Professional' && enLabels.technical === 'Technical',
    JSON.stringify(enLabels));
  await pick(page, 'pdfDesignToggle', 'border', 'thin');
  const g = await pageGeo(page);
  check('LTR: Border Thin applies', g.attrBorder === 'thin' && g.borderLeft === 1,
    'borderLeft=' + g.borderLeft);
  check('LTR: no JS errors', (errors || []).length === 0, (errors || []).join(' | ') || 'no errors');
  await page.close();
}

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log('\n=== PHASE 04 RESULTS: ' + (results.length - failed.length) + '/' + results.length + ' PASSED ===');
if (failed.length) {
  console.log('FAILED:');
  failed.forEach((f) => console.log(' - ' + f.name + ': ' + f.detail));
  process.exit(1);
}
process.exit(0);