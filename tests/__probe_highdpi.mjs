// High-DPI verification probe for Smart Documents PDF Direct Editor rendering.
// Proves that at window.devicePixelRatio > 1 the canvas BACKING STORE is
// rendered at viewport x dpr while:
//   1) the CSS display size stays the fitted visual size (canvas.style.width)
//   2) the page wrapper matches the CSS width (no visual overflow/distortion)
//   3) the editable text layer stays aligned inside the page box (not shifted)
//   4) direct inline editing still works (click -> editable in place)
//   5) no horizontal overflow at any tested dpr/resolution
// Reuses the part39 harness style (real Chrome via puppeteer-core).
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
const BASE = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 240000);

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
}
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(vp) {
  const page = await browser.newPage();
  if (vp) await page.setViewport(vp);
  const err = [];
  page.on('pageerror', (e) => err.push(String(e && e.message || e)));
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(700);
  return { page, err };
}
async function openDrawer(page) { await page.evaluate(() => document.getElementById('drawerToggle').click()); await sleep(250); }
async function clickSmartDocs(page) { await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action=\"open-smart-docs\"]').click()); await sleep(400); }
async function pickFile(page, filePath) {
  const [chooser] = await Promise.all([
    page.waitForFileChooser({ timeout: 9000 }),
    page.evaluate(() => document.querySelector('.smart-doc-card[data-action=\"smart-import-file\"]').click())
  ]);
  if (filePath) await chooser.accept([filePath]); else await chooser.cancel();
}
async function waitFor(page, fn, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await page.evaluate(fn)) return true;
    await sleep(120);
  }
  return false;
}

const pdfPath = path.join(ROOT, '__part39.pdf');

// Sweep: deviceScaleFactor 1, 2, 3 x resolutions (desktop/tablet/mobile).
const sweep = [
  { tag: 'dpr=1 desktop 1280x800', vp: { width: 1280, height: 800, deviceScaleFactor: 1 }, expect: 1 },
  { tag: 'dpr=2 desktop 1440x900', vp: { width: 1440, height: 900, deviceScaleFactor: 2 }, expect: 2 },
  { tag: 'dpr=3 desktop 1920x1080', vp: { width: 1920, height: 1080, deviceScaleFactor: 3 }, expect: 3 },
  { tag: 'dpr=2 tablet 768x1024', vp: { width: 768, height: 1024, deviceScaleFactor: 2, hasTouch: true }, expect: 2 },
  { tag: 'dpr=3 mobile 390x844', vp: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, expect: 3 },
  { tag: 'dpr=2 mobile 360x720', vp: { width: 360, height: 720, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, expect: 2 }
];
for (const cfg of sweep) {
  const { page, err } = await newPage(cfg.vp);
  try {
    await openDrawer(page); await clickSmartDocs(page);
    await pickFile(page, pdfPath);
    const loaded = await waitFor(page, () =>
      window.__smartImport.getState().editorVisible === true &&
      document.querySelectorAll('#smartPdfEditor .smart-pdf-text').length > 0);
    if (!loaded) { check(cfg.tag + ' editor loads', false, 'editor did not load'); continue; }
    await sleep(300);
    const m = await page.evaluate(() => {
      const c = document.querySelector('#smartPdfEditor canvas.smart-pdf-canvas');
      const wrap = document.querySelector('#smartPdfEditor .smart-pdf-page');
      const wb = wrap ? wrap.getBoundingClientRect() : null;
      const cs = c ? getComputedStyle(c) : null;
      const bad = Array.from(document.querySelectorAll('#smartPdfEditor .smart-pdf-text'))
        .filter((s) => { if (!s.textContent.trim()) return false; const r = s.getBoundingClientRect();
          return !(r.top >= wb.top - 2 && r.bottom <= wb.bottom + 2); }).length;
      return {
        dpr: window.devicePixelRatio,
        internalW: c ? c.width : 0, internalH: c ? c.height : 0,
        cssW: c && cs ? parseFloat(cs.width) : 0, cssH: c && cs ? parseFloat(cs.height) : 0,
        wrapW: wb ? wb.width : 0, wrapH: wb ? wb.height : 0,
        spanCount: document.querySelectorAll('#smartPdfEditor .smart-pdf-text').length,
        bad,
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth
      };
    });
    const ratio = m.cssW > 0 ? m.internalW / m.cssW : 0;
    check(`${cfg.tag}: devicePixelRatio reported`, Math.abs(m.dpr - cfg.expect) < 0.01, 'dpr=' + m.dpr);
    check(`${cfg.tag}: canvas internal W > CSS W (hi-res backing store)`, m.internalW > m.cssW + 1,
      `internalW=${m.internalW} cssW=${m.cssW}`);
    check(`${cfg.tag}: canvas internal px ~= CSS px x devicePixelRatio`,
      Math.abs(ratio - cfg.expect) < 0.1, `ratio=${ratio.toFixed(2)} (expect ~${cfg.expect})`);
    check(`${cfg.tag}: CSS display size matches page wrapper (no distortion)`,
      Math.abs(m.wrapW - m.cssW) < 1.5, `wrapW=${m.wrapW} cssW=${m.cssW}`);
    check(`${cfg.tag}: no horizontal overflow`, m.overflowX <= 2, 'overflowX=' + m.overflowX);
    check(`${cfg.tag}: text layer stays INSIDE page (not displaced)`, m.bad === 0, 'bad=' + m.bad);
    check(`${cfg.tag}: no JS errors`, err.length === 0, err.join(' | '));
  } catch (e) {
    check(cfg.tag + ' runtime', false, String(e && e.message || e));
  }
  await page.close();
}

// ---- Direct editing still works at dpr=2 ----
{
  const { page, err } = await newPage({ width: 1280, height: 800, deviceScaleFactor: 2 });
  await openDrawer(page); await clickSmartDocs(page);
  await pickFile(page, pdfPath);
  const ok = await waitFor(page, () =>
    window.__smartImport.getState().editorVisible === true &&
    document.querySelectorAll('#smartPdfEditor .smart-pdf-text').length > 0);
  if (ok) {
    const edited = await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll('#smartPdfEditor .smart-pdf-text'));
      if (spans.length < 2) return { ok: false, why: 'not enough spans' };
      const t = spans[1];
      t.click();
      const became = t.classList.contains('is-editing') && t.contentEditable === 'true';
      const left = t.style.left, top = t.style.top;
      t.textContent = 'QUARK'; t.blur();
      const committed = t.classList.contains('is-edited') && t.textContent === 'QUARK';
      return { ok: true, became, committed, left, top };
    });
    check('dpr=2: click word -> editable in place (Direct Editing works)',
      edited.ok && edited.became, JSON.stringify(edited));
    check('dpr=2: committed edit keeps position + text at same left/top',
      edited.ok && edited.committed && !!edited.left && !!edited.top, JSON.stringify(edited));
    check('dpr=2: no JS errors (edit)', err.length === 0, err.join(' | '));
  } else {
    check('dpr=2: direct editing', false, 'editor did not load for editing probe');
  }
  await page.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n==== ${results.length - failed.length}/${results.length} PASS ====`);
await browser.close();
process.exit(failed.length ? 1 : 0);