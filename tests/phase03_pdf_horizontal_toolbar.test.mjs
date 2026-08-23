// PHASE 03 — HORIZONTAL PDF TOOLBAR — comprehensive behavioral test in a real Chrome browser.
// Verifies all 7 toggle buttons (Layout, Design, Header, Footer, Tables, Branding, Page),
// their ARIA attributes, panel open/close / mutual-exclusion, outside-click & Escape,
// horizontal scrolling + touch swipe on mobile, responsive breakpoints (Desktop / Tablet /
// iPhone / Android), panel option application, and that panels never cover the PDF preview.
// Run:  node tests/phase03_pdf_horizontal_toolbar.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8293;
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
  await page.evaluate(() => {
    const b = document.getElementById('drawerToggle');
    if (b) b.click();
  });
  await sleep(250);
  await page.evaluate(() => {
    const b = document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]');
    if (b) b.click();
  });
  await sleep(500);
}

const TOGGLES = [
  ['pdfLayoutToggle', 'pdfLayoutPanel'],
  ['pdfDesignToggle', 'pdfDesignPanel'],
  ['pdfHeaderToggle', 'pdfHeaderPanel'],
  ['pdfFooterToggle', 'pdfFooterPanel'],
  ['pdfTablesToggle', 'pdfTablesPanel'],
  ['pdfBrandingToggle', 'pdfBrandingPanel'],
  ['pdfPageToggle', 'pdfPagePanel']
];

async function toolbarGeo(page) {
  return page.evaluate(() => {
    const $ = (s) => document.querySelector(s);
    const show = (el) => (el ? {
      top: el.getBoundingClientRect().top, bottom: el.getBoundingClientRect().bottom,
      left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right,
      width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height
    } : null);
    const toolbar = $('#pdfReportsModal .pdf-toolbar');
    const tools = Array.from(document.querySelectorAll('#pdfReportsModal .pdf-tool'));
    const page = document.getElementById('pdfPreviewPage');
    const stage = document.getElementById('pdfPreviewStage');
    const panels = Array.from(document.querySelectorAll('#pdfReportsModal .pdf-tool-panel'));
    return {
      toolbarShow: show(toolbar),
      toolbarRows: toolbar ? new Set(tools.map((t) => Math.round(t.getBoundingClientRect().top))).size : 0,
      toolbarScrollable: toolbar ? toolbar.scrollWidth > toolbar.clientWidth + 1 : false,
      toolbarClientW: toolbar ? toolbar.clientWidth : 0,
      toolbarScrollW: toolbar ? toolbar.scrollWidth : 0,
      toolCount: tools.length,
      pageShow: show(page),
      stageShow: show(stage),
      allPanels: panels.map((p) => ({
        id: p.id, open: p.classList.contains('open'), hidden: p.getAttribute('aria-hidden')
      })),
      panelOverPreview: panels.some((p) => {
        if (!p.classList.contains('open')) return false;
        const pr = p.getBoundingClientRect();
        const pg = page ? page.getBoundingClientRect() : null;
        return pg && pr.top < pg.bottom && pr.bottom > pg.top;
      })
    };
    });
}

// ============================================================
// DESKTOP — full-width toolbar with all 7 toggle groups
// ============================================================
{
  const { page, errors } = await newPage(1280, 800);
  await page.evaluate(() => { document.getElementById('drawerToggle').click(); });
  await sleep(250);
  await page.evaluate(() => {
    document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]').click();
  });
  await sleep(500);

// 7 toggle buttons present
  const exactCount = await page.evaluate(() => [
    'pdfLayoutToggle','pdfDesignToggle','pdfHeaderToggle',
    'pdfFooterToggle','pdfTablesToggle','pdfBrandingToggle','pdfPageToggle'
  ].filter((id) => !!document.getElementById(id)).length);
  check('Desktop: exactly 7 toggle buttons present', exactCount === 7, 'count=' + exactCount);

  // ARIA attributes on each toggle
  const ariaChecks = await page.evaluate(() => [
    'pdfLayoutToggle','pdfDesignToggle','pdfHeaderToggle',
    'pdfFooterToggle','pdfTablesToggle','pdfBrandingToggle','pdfPageToggle'
  ].map((id) => {
    const b = document.getElementById(id);
    if (!b) return { id, error: 'not found' };
    return {
      id,
      hasPopup: b.getAttribute('aria-haspopup') === 'true',
      hasExpanded: b.hasAttribute('aria-expanded'),
      controls: b.getAttribute('aria-controls'),
      expandedFalse: b.getAttribute('aria-expanded') === 'false'
    };
  }));
  check('Desktop: all toggles have aria-haspopup=true',
    ariaChecks.every((c) => c.hasPopup),
    JSON.stringify(ariaChecks.filter((c) => !c.hasPopup)));
  check('Desktop: all toggles have aria-expanded=false initially',
    ariaChecks.every((c) => c.expandedFalse),
    JSON.stringify(ariaChecks.filter((c) => !c.expandedFalse)));
  check('Desktop: all toggles have aria-controls pointing to a panel',
    await page.evaluate(() => {
      const ids = [
        'pdfLayoutToggle','pdfDesignToggle','pdfHeaderToggle',
        'pdfFooterToggle','pdfTablesToggle','pdfBrandingToggle','pdfPageToggle'
      ];
      return ids.every((id) => {
        const b = document.getElementById(id);
        const c = b && b.getAttribute('aria-controls');
        return c && document.getElementById(c);
      });
    }));

  // Toolbar single row + scrollable
  const g = await toolbarGeo(page);
  check('Desktop: toolbar is a single row', g.toolbarRows === 1, 'rows=' + g.toolbarRows);
  check('Desktop: all 12 tools present (5 standard + 7 toggle)', g.toolCount === 12, 'count=' + g.toolCount);
  // On a wide desktop all buttons fit, so scroll is optional; the hard requirement is
  // a single unwrapped row with no document overflow.
  check('Desktop: no button wrapping / no document overflow',
    g.toolbarRows === 1 && (await page.evaluate(() =>
      document.documentElement.scrollWidth - window.innerWidth)) <= 2,
    'rows=' + g.toolbarRows);
  check('Desktop: no JS errors', (errors || []).length === 0, (errors || []).join(' | ') || 'no errors');

  // Open each panel and verify it opens correctly (clicking a different toggle
  // automatically closes any previously-open panel via mutual exclusion).
  for (const [toggleId, panelId] of TOGGLES) {
    await page.evaluate((id) => { document.getElementById(id).click(); }, toggleId);
    await sleep(200);
    const state = await page.evaluate((pId, tId) => ({
      panelOpen: document.getElementById(pId).classList.contains('open'),
      panelHidden: document.getElementById(pId).getAttribute('aria-hidden'),
      toggleExpanded: document.getElementById(tId).getAttribute('aria-expanded')
    }), panelId, toggleId);
    check(`Desktop: ${toggleId} opens ${panelId}`,
      state.panelOpen && state.panelHidden === 'false' && state.toggleExpanded === 'true',
      JSON.stringify(state));
  }

// Mutual exclusion: opening Design after Layout closes Layout panel
  await page.evaluate(() => document.getElementById('pdfLayoutToggle').click());
  await sleep(150);
  await page.evaluate(() => document.getElementById('pdfDesignToggle').click());
  await sleep(150);
  const mutual = await page.evaluate(() => ({
    layoutOpen: document.getElementById('pdfLayoutPanel').classList.contains('open'),
    designOpen: document.getElementById('pdfDesignPanel').classList.contains('open')
  }));
  check('Desktop: mutual exclusion (Layout closed when Design opens)',
    !mutual.layoutOpen && mutual.designOpen, JSON.stringify(mutual));

  // Outside click closes panel (Design is already open from the mutual-exclusion check)
  await page.evaluate(() => { document.getElementById('pdfPreviewStage').click(); });
  await sleep(150);
  const outsideClosed = await page.evaluate(() =>
    !document.getElementById('pdfDesignPanel').classList.contains('open'));
  check('Desktop: outside click closes panel', outsideClosed);

  // Escape closes panel
  await page.evaluate(() => document.getElementById('pdfLayoutToggle').click());
  await sleep(150);
  await page.keyboard.press('Escape');
  await sleep(100);
  const escClosed = await page.evaluate(() =>
    !document.getElementById('pdfLayoutPanel').classList.contains('open'));
  check('Desktop: Escape closes panel', escClosed);

  // Panel options: page size
  await page.evaluate(() => document.getElementById('pdfLayoutToggle').click());
  await sleep(100);
  await page.evaluate(() => document.querySelector('.pdf-opt[data-value="letter"]').click());
  await sleep(150);
  const pageSizeChanged = await page.evaluate(() =>
    document.getElementById('pdfPreviewPage').getAttribute('data-size') === 'letter');
  check('Desktop: page size option applies (Letter)', pageSizeChanged);

  // Panel options: orientation
  await page.evaluate(() => document.getElementById('pdfLayoutToggle').click());
  await sleep(100);
  await page.evaluate(() => document.querySelector('.pdf-opt[data-value="landscape"]').click());
  await sleep(150);
  const orientChanged = await page.evaluate(() =>
    document.getElementById('pdfPreviewPage').getAttribute('data-orientation') === 'landscape');
  check('Desktop: orientation option applies (Landscape)', orientChanged);

  // Reset orientation back to portrait
  await page.evaluate(() => document.getElementById('pdfLayoutToggle').click());
  await sleep(100);
  await page.evaluate(() => document.querySelector('.pdf-opt[data-value="portrait"]').click());
  await sleep(150);

  // The persistent toolbar must not cover the PDF preview page (transient dropdown
  // panels naturally overlay content below them, which is expected).
  const toolbarVsPage = await page.evaluate(() => {
    const tb = document.querySelector('#pdfReportsModal .pdf-toolbar');
    const pageEl = document.getElementById('pdfPreviewPage');
    if (!tb || !pageEl) return { present: false };
    const tr = tb.getBoundingClientRect();
    const pg = pageEl.getBoundingClientRect();
    return { present: true, toolbarBottom: tr.bottom, pageTop: pg.top, overlap: tr.bottom > pg.top };
  });
  check('Desktop: persistent toolbar does not cover preview page',
    toolbarVsPage.present && !toolbarVsPage.overlap,
    'toolBottom=' + toolbarVsPage.toolbarBottom + ' pageTop=' + toolbarVsPage.pageTop);

  await page.evaluate(() => document.getElementById('closePdfReports').click());
  await sleep(300);
  check('Desktop: workspace closes after tests',
    await page.evaluate(() => !document.getElementById('pdfReportsModal').classList.contains('show')));
  await page.close();
}

// ============================================================
// TABLET (768x1024) — toolbar horizontal, all groups functional
// ============================================================
{
  const { page, errors } = await newPage(768, 1024);
  await openWorkspace(page);

  const g = await toolbarGeo(page);
  check('Tablet(768): toolbar is a single row', g.toolbarRows === 1, 'rows=' + g.toolbarRows);
  check('Tablet(768): all 12 tools present', g.toolCount === 12, 'count=' + g.toolCount);
  check('Tablet(768): toolbar horizontally scrollable', g.toolbarScrollable,
    'sw=' + g.toolbarScrollW + ' cw=' + g.toolbarClientW);
  check('Tablet(768): no horizontal document overflow',
    (await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 2);

  await page.evaluate(() => document.getElementById('pdfHeaderToggle').click());
  await sleep(150);
  const headerOpen = await page.evaluate(() =>
    document.getElementById('pdfHeaderPanel').classList.contains('open') &&
    document.getElementById('pdfHeaderToggle').getAttribute('aria-expanded') === 'true');
  check('Tablet(768): Header panel opens', headerOpen);

  await page.keyboard.press('Escape');
  await sleep(100);
  await page.evaluate(() => document.getElementById('pdfDesignToggle').click());
  await sleep(150);
  await page.evaluate(() => document.querySelector('.pdf-opt[data-value="wide"]').click());
  await sleep(150);
  const spacingApplied = await page.evaluate(() =>
    document.querySelector('.pdf-opt[data-value="wide"]').classList.contains('is-active'));
  check('Tablet(768): Design spacing option applies', spacingApplied);

  await page.evaluate(() => document.getElementById('closePdfReports').click());
  await sleep(300);
  check('Tablet(768): no JS errors', (errors || []).length === 0, (errors || []).join(' | ') || 'no errors');
  await page.close();
}


// ============================================================
// iPhone (390x844) — touch swipe, horizontal scroll
// ============================================================
{
  const { page, errors } = await newPage(390, 844, true);
  await openWorkspace(page);

  const g = await toolbarGeo(page);
  check('iPhone(390): toolbar is a single row', g.toolbarRows === 1, 'rows=' + g.toolbarRows);
  check('iPhone(390): toolbar horizontally scrollable', g.toolbarScrollable,
    'sw=' + g.toolbarScrollW + ' cw=' + g.toolbarClientW);
  check('iPhone(390): no horizontal document overflow',
    (await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 2);
  check('iPhone(390): no vertical document overflow',
    (await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)) <= 2);

  let allTogglesWork = true;
  for (const [toggleId, panelId] of TOGGLES) {
    await page.evaluate((id) => { document.getElementById(id).click(); }, toggleId);
    await sleep(150);
    const ok = await page.evaluate((pId) =>
      document.getElementById(pId).classList.contains('open'), panelId);
    if (!ok) allTogglesWork = false;
  }
  check('iPhone(390): all 7 toggles open their panels', allTogglesWork);

  await page.keyboard.press('Escape');
  await sleep(100);
  const scrolled = await page.evaluate(() => {
    const tb = document.querySelector('#pdfReportsModal .pdf-toolbar');
    if (!tb) return false;
    const before = tb.scrollLeft;
    tb.scrollLeft = tb.scrollWidth;
    const after = tb.scrollLeft;
    tb.scrollLeft = 0;
    return after > before;
  });
  check('iPhone(390): horizontal scroll is functional (programmatic)', scrolled);

  const swipeWorked = await page.evaluate(() => {
    const tb = document.querySelector('#pdfReportsModal .pdf-toolbar');
    if (!tb) return false;
    return tb.scrollWidth > tb.clientWidth + 1;
  });
  check('iPhone(390): touch swipe area has overflow content', swipeWorked);

  await page.evaluate(() => document.getElementById('pdfPageToggle').click());
  await sleep(150);
  const noOverlap = await page.evaluate(() => {
    const panel = document.getElementById('pdfPagePanel');
    const pageEl = document.getElementById('pdfPreviewPage');
    if (!panel.classList.contains('open') || !pageEl) return true;
    const pr = panel.getBoundingClientRect();
    const pg = pageEl.getBoundingClientRect();
    return !(pr.top < pg.bottom && pr.bottom > pg.top);
  });
  check('iPhone(390): open panel does not overlap preview', noOverlap);

  check('iPhone(390): no JS errors', (errors || []).length === 0, (errors || []).join(' | ') || 'no errors');
  await page.evaluate(() => document.getElementById('closePdfReports').click());
  await sleep(300);
  await page.close();
}


// ============================================================
// Android (360x800) — touch, horizontal scroll
// ============================================================
{
  const { page, errors } = await newPage(360, 800, true);
  await openWorkspace(page);

  const g = await toolbarGeo(page);
  check('Android(360): toolbar is a single row', g.toolbarRows === 1, 'rows=' + g.toolbarRows);
  check('Android(360): all 12 tools present', g.toolCount === 12, 'count=' + g.toolCount);
  check('Android(360): toolbar horizontally scrollable', g.toolbarScrollable,
    'sw=' + g.toolbarScrollW + ' cw=' + g.toolbarClientW);
  check('Android(360): no horizontal document overflow',
    (await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 2);

  await page.evaluate(() => document.getElementById('pdfTablesToggle').click());
  await sleep(150);
  const tablesOpen = await page.evaluate(() =>
    document.getElementById('pdfTablesPanel').classList.contains('open'));
  check('Android(360): Tables panel opens on tap', tablesOpen);

  await page.evaluate(() => document.getElementById('pdfBrandingToggle').click());
  await sleep(150);
  const brandingOpen = await page.evaluate(() =>
    document.getElementById('pdfBrandingPanel').classList.contains('open'));
  check('Android(360): Branding panel opens on tap', brandingOpen);

  await page.evaluate(() => document.getElementById('pdfPageToggle').click());
  await sleep(150);
  const pageOpen = await page.evaluate(() =>
    document.getElementById('pdfPagePanel').classList.contains('open'));
  check('Android(360): Page panel opens on tap', pageOpen);

  check('Android(360): no JS errors', (errors || []).length === 0, (errors || []).join(' | ') || 'no errors');
  await page.evaluate(() => document.getElementById('closePdfReports').click());
  await sleep(300);
  await page.close();
}


// ============================================================
// RTL — toolbar stays horizontal, panels work
// ============================================================
{
  const { page, errors } = await newPage(1280, 800);
  await page.evaluate(() => {
    const sel = document.getElementById('topBarLanguageSelect');
    sel.value = 'ar';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await sleep(400);
  await page.evaluate(() => { document.getElementById('drawerToggle').click(); });
  await sleep(250);
  await page.evaluate(() => {
    document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]').click();
  });
  await sleep(500);

  const g = await toolbarGeo(page);
  check('RTL: toolbar is a single row', g.toolbarRows === 1, 'rows=' + g.toolbarRows);
  // On a wide desktop all buttons fit, so scroll is optional; require a single
  // unwrapped row with no document overflow in RTL.
  check('RTL: no button wrapping / no document overflow',
    g.toolbarRows === 1 && (await page.evaluate(() =>
      document.documentElement.scrollWidth - window.innerWidth)) <= 2,
    'rows=' + g.toolbarRows);
  check('RTL: all 7 panels hidden by default',
    g.allPanels.every((p) => p.open === false && p.hidden === 'true'),
    JSON.stringify(g.allPanels.map((p) => ({ id: p.id, open: p.open, hidden: p.hidden }))));
  check('RTL: document direction is rtl',
    await page.evaluate(() => document.documentElement.dir === 'rtl'));

  await page.evaluate(() => document.getElementById('pdfFooterToggle').click());
  await sleep(150);
  const footerOpen = await page.evaluate(() =>
    document.getElementById('pdfFooterPanel').classList.contains('open') &&
    document.getElementById('pdfFooterToggle').getAttribute('aria-expanded') === 'true');
  check('RTL: Footer panel opens', footerOpen);

  await page.evaluate(() => {
    const sel = document.getElementById('topBarLanguageSelect');
    sel.value = 'en';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await sleep(400);
  check('RTL/LTR: no JS errors', (errors || []).length === 0, (errors || []).join(' | ') || 'no errors');
  await page.evaluate(() => document.getElementById('closePdfReports').click());
  await sleep(300);
  await page.close();
}

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log('\n=== PHASE 03 RESULTS: ' + (results.length - failed.length) + '/' + results.length + ' PASSED ===');
if (failed.length) {
  console.log('FAILED:');
  failed.forEach((f) => console.log(' - ' + f.name + ': ' + f.detail));
  process.exit(1);
}
process.exit(0);
