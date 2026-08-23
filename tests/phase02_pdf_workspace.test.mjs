// PHASE 02 — PDF REPORTS WORKSPACE — behavioral test in a real Chrome browser.
// Verifies Header, single horizontal scrollable Toolbar, Layout dropdown group,
// real PDF Preview surface (page + stage, centered), zoom controls, and that the
// whole screen does not overflow. Covers desktop, coarse-pointer (mobile), and
// RTL/LTR. Also re-verifies the Notes PDF export entry is untouched.
// Run:  node tests/phase02_pdf_workspace.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8292;
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
setTimeout(() => process.exit(124), 150000); // hard watchdog

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

async function newPage(isMobile) {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  if (isMobile) {
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  } else {
    await page.setViewport({ width: 1280, height: 800 });
  }
  await sleep(800);
  return { page, errors: errs };
}

async function workspaceGeo(page) {
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
    const modal = document.querySelector('#pdfReportsModal .pdf-reports-workspace');
    const mrect = modal ? modal.getBoundingClientRect() : null;
    return {
      toolbarRows: toolbar ? new Set(tools.map((t) => Math.round(t.getBoundingClientRect().top))).size : 0,
      toolbarScrollable: toolbar ? toolbar.scrollWidth > toolbar.clientWidth + 1 : false,
      toolbarShow: show(toolbar),
      pageShow: show(page),
      stageShow: show(stage),
      pageWidth: page ? page.getBoundingClientRect().width : 0,
      modalFitsViewport: mrect ? (mrect.top >= 0 && mrect.bottom <= window.innerHeight + 1 && mrect.left >= 0 && mrect.right <= window.innerWidth + 1) : false,
      modalRect: mrect ? { top: mrect.top, bottom: mrect.bottom, left: mrect.left, right: mrect.right, w: mrect.width, h: mrect.height, vh: window.innerHeight, vw: window.innerWidth } : null,
      docOverflowX: document.documentElement.scrollWidth - window.innerWidth,
      pageOverToolbar: (toolbar && page) ? page.getBoundingClientRect().top + 2 < toolbar.getBoundingClientRect().bottom : false
    };
  });
}

function centerOffset(g) {
  const pc = (g.pageShow.left + g.pageShow.right) / 2;
  const sc = (g.stageShow.left + g.stageShow.right) / 2;
  return Math.abs(pc - sc);
}
// ---------- DESKTOP ----------
{
  const { page, errors } = await newPage(false);
  await page.evaluate(() => { const b = document.getElementById('drawerToggle'); if (b) b.click(); });
  await sleep(250);
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]'); if (b) b.click(); });
  await sleep(500);
  check('Desktop: PDF Reports modal shown', await page.evaluate(() => {
    const m = document.getElementById('pdfReportsModal');
    return !!(m && m.classList.contains('show'));
  }));

  const g = await workspaceGeo(page);
  check('Desktop: header/toolbar rendered', g.toolbarShow !== null, 'toolbar=' + !!g.toolbarShow);
  check('Desktop: toolbar is a single row', g.toolbarRows === 1, 'rows=' + g.toolbarRows);
  check('Desktop: total tool count >= 3', (await page.evaluate(() => document.querySelectorAll('#pdfReportsModal .pdf-tool').length)) >= 3);
  check('Desktop: preview page present', g.pageShow !== null, JSON.stringify(g.pageShow));
  check('Desktop: preview stage present', g.stageShow !== null, JSON.stringify(g.stageShow));
  check('Desktop: page horizontally centered in stage', g.pageShow !== null && centerOffset(g) <= 6, 'offset=' + (g.pageShow ? centerOffset(g).toFixed(1) : 'n/a'));
  check('Desktop: page does not cover toolbar', !g.pageOverToolbar, 'pageTop=' + ((g.pageShow || {}).top) + ' toolBottom=' + ((g.toolbarShow || {}).bottom));
  check('Desktop: no horizontal document overflow', g.docOverflowX <= 2, 'dx=' + g.docOverflowX);
  check('Desktop: workspace modal fits viewport', g.modalFitsViewport, JSON.stringify(g.modalRect));

  const w0 = g.pageWidth;
  await page.evaluate(() => document.querySelector('[data-pdf-zoom="in"]').click());
  await sleep(150);
  const w1 = await page.evaluate(() => document.getElementById('pdfPreviewPage').getBoundingClientRect().width);
  check('Desktop: zoom in increases page width', w1 > w0 + 1, `w0=${w0} w1=${w1}`);
  await page.evaluate(() => document.querySelector('[data-pdf-zoom="fit"]').click());
  await sleep(150);

  await page.evaluate(() => document.getElementById('pdfLayoutToggle').click());
  await sleep(150);
  const openState = await page.evaluate(() => ({
    open: document.getElementById('pdfLayoutPanel').classList.contains('open'),
    hidden: document.getElementById('pdfLayoutPanel').getAttribute('aria-hidden')
  }));
  check('Desktop: Layout panel opens from toolbar', openState.open && openState.hidden === 'false', JSON.stringify(openState));
  await page.evaluate(() => document.querySelector('.pdf-opt[data-value="landscape"]').click());
  await sleep(150);
  const land = await page.evaluate(() => ({
    orient: document.getElementById('pdfPreviewPage').getAttribute('data-orientation'),
    panelOpen: document.getElementById('pdfLayoutPanel').classList.contains('open')
  }));
  check('Desktop: Layout option applies orientation', land.orient === 'landscape', JSON.stringify(land));
  check('Desktop: Layout panel closes after choosing an option', !land.panelOpen);

  await page.evaluate(() => document.getElementById('pdfLayoutToggle').click());
  await sleep(100);
  await page.keyboard.press('Escape');
  await sleep(100);
  const escClosed = await page.evaluate(() => !document.getElementById('pdfLayoutPanel').classList.contains('open'));
  check('Desktop: Escape closes the Layout panel', escClosed);

  await page.evaluate(() => document.getElementById('closePdfReports').click());
  await sleep(300);
  check('Desktop: Back closes the workspace', await page.evaluate(() => !document.getElementById('pdfReportsModal.show')));

  const exportBtn = await page.evaluate(() => !!document.getElementById('exportNotePdfBtn'));
  check('Desktop: Notes PDF export button still present', exportBtn);
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await sleep(400);
  check('Desktop: Notes manager still opens', await page.evaluate(() => document.getElementById('notesManagerModal').classList.contains('show')));

  check('Desktop: no JavaScript errors', (errors || []).length === 0, (errors || []).join(' | ') || 'no errors');
  await page.close();
}

// ---------- MOBILE / COARSE POINTER ----------
{
  const { page, errors } = await newPage(true);
  await page.evaluate(() => document.getElementById('drawerToggle').click());
  await sleep(250);
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]').click());
  await sleep(500);
  const g = await workspaceGeo(page);
  check('Mobile(coarse): workspace opens', await page.evaluate(() => {
    const m = document.getElementById('pdfReportsModal');
    return !!(m && m.classList.contains('show'));
  }));
  check('Mobile: toolbar is a single row', g.toolbarRows === 1, 'rows=' + g.toolbarRows);
  check('Mobile: toolbar is horizontally scrollable', g.toolbarScrollable, 'sw=' + (g.toolbarShow ? g.toolbarShow.width : 0));
  check('Mobile: preview page present', g.pageShow !== null);
  check('Mobile: page does not cover toolbar', !g.pageOverToolbar);
  check('Mobile: no horizontal document overflow', g.docOverflowX <= 2, 'dx=' + g.docOverflowX);
  check('Mobile: workspace modal fits viewport', g.modalFitsViewport, 'fits=' + g.modalFitsViewport);
  check('Mobile: zoom controls present', (await page.evaluate(() => document.querySelectorAll('#pdfReportsModal .pdf-zoom-btn').length)) >= 3);
  await page.evaluate(() => document.getElementById('closePdfReports').click());
  await sleep(300);
  check('Mobile: Back closes the workspace', await page.evaluate(() => !document.getElementById('pdfReportsModal.show')));
  check('Mobile: no JavaScript errors', (errors || []).length === 0, (errors || []).join(' | ') || 'no errors');
  await page.close();
}
// ---------- RTL / LTR ----------
{
  const { page, errors } = await newPage(false);
  await page.evaluate(() => { const s = document.getElementById('topBarLanguageSelect'); s.value = 'ar'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  await sleep(400);
  await page.evaluate(() => document.getElementById('drawerToggle').click());
  await sleep(200);
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]').click());
  await sleep(400);
  const g = await workspaceGeo(page);
  check('RTL: document direction is rtl', await page.evaluate(() => document.documentElement.dir === 'rtl'));
  check('RTL: workspace header title localized', (await page.evaluate(() => document.getElementById('pdfReportsTitle').textContent)) === 'تقارير PDF');
  check('RTL: toolbar is a single row', g.toolbarRows === 1, 'rows=' + g.toolbarRows);
  check('RTL: preview present and centered', g.pageShow !== null && centerOffset(g) <= 6, 'offset=' + (g.pageShow ? centerOffset(g).toFixed(1) : 'n/a'));
  check('RTL: no horizontal document overflow', g.docOverflowX <= 2, 'dx=' + g.docOverflowX);

  await page.evaluate(() => { const sel = document.getElementById('topBarLanguageSelect'); sel.value = 'en'; sel.dispatchEvent(new Event('change', { bubbles: true })); });
  await sleep(400);
  check('LTR: document direction is ltr', await page.evaluate(() => document.documentElement.dir === 'ltr'));
  check('LTR: workspace title localized to English', (await page.evaluate(() => document.getElementById('pdfReportsTitle').textContent)) === 'PDF Reports');
  const g2 = await workspaceGeo(page);
  check('LTR: toolbar is a single row', g2.toolbarRows === 1, 'rows=' + g2.toolbarRows);
  check('LTR: preview present', g2.pageShow !== null);
  await page.evaluate(() => document.getElementById('closePdfReports').click());
  await sleep(300);
  check('RTL/LTR: no JavaScript errors', (errors || []).length === 0, (errors || []).join(' | ') || 'no errors');
  await page.close();
}

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log('\n=== PHASE 02 RESULTS: ' + (results.length - failed.length) + '/' + results.length + ' PASSED ===');
if (failed.length) {
  console.log('FAILED:');
  failed.forEach((f) => console.log(' - ' + f.name + ': ' + f.detail));
  process.exit(1);
}
process.exit(0);