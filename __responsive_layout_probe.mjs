// RESPONSIVE LAYOUT PROBE — main app view across the testing matrix.
// Verifies: horizontal overflow = 0, ad slot reserved & pinned at top,
// no JS errors, drawer opens inside viewport (LTR/RTL).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = HERE; // probe lives in project root
const CHROME = fs.existsSync('C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8512;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon' };
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
setTimeout(() => process.exit(124), 600000);

const OUT = path.join(ROOT, '__responsive_probe_result.txt');
try { fs.unlinkSync(OUT); } catch (e) {}
function out(line) { console.log(line); fs.appendFileSync(OUT, line + '\n'); }

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});

const SIZES = [
  [1280, 800], [1440, 900], [1920, 1080],
  [1024, 768], [768, 1024],
  [430, 932], [390, 844], [360, 800], [360, 720]
];
const LANDSCAPES = [[720, 360], [800, 360], [932, 430]];

async function measure(width, height, lang, isLandscape) {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await page.evaluateOnNewDocument(() => {
    if (navigator.serviceWorker) {
      try { navigator.serviceWorker.register = () => Promise.resolve({}); } catch (e) {}
    }
  });
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await page.evaluate((lng) => {
    try { localStorage.clear(); } catch (e) {}
    const sel = document.getElementById('languageSelect');
    if (sel) { sel.value = lng; sel.dispatchEvent(new Event('change')); }
  }, lang);
  await new Promise((r) => setTimeout(r, 600));

  const res = await page.evaluate(() => {
    const doc = document.documentElement;
    const hOverflow = Math.max(doc.scrollWidth - doc.clientWidth, document.body.scrollWidth - doc.clientWidth);
    const ad = document.getElementById('adPlaceholder');
    const ar = ad ? ad.getBoundingClientRect() : null;
    const shell = document.querySelector('.app-shell');
    // First real content element AFTER the ad slot in flow
    const firstReal = shell ? Array.from(shell.children).find((c) => c !== ad && c.tagName !== 'SCRIPT') : null;
    const fr = firstReal ? firstReal.getBoundingClientRect() : null;
    const adOK = ad && ar && ar.height > 10 && ar.top >= -1;
    let offscreenBtns = 0;
    document.querySelectorAll('.app-shell button').forEach((b) => {
      // Ignore buttons inside a closed drawer (hidden off-canvas by design)
      const drw = b.closest('.drawer');
      if (drw && !drw.classList.contains('open')) return;
      const r = b.getBoundingClientRect();
      if (r.width > 0 && getComputedStyle(b).visibility !== 'hidden' &&
          b.offsetParent !== null && (r.right < 0 || r.left > window.innerWidth)) offscreenBtns++;
    });
    return {
      hOverflow, offscreenBtns,
      adH: ar ? Math.round(ar.height) : -1,
      adTop: ar ? Math.round(ar.top) : -1,
      adPos: ad ? getComputedStyle(ad).position : 'none',
      adVisibleSpace: !!adOK,
      // Flow-space check (sticky-safe): content must start after the ad's
      // reserved flow height + its bottom margin.
      adFlowBottom: ad ? ad.offsetTop + ad.offsetHeight : -1,
      contentFlowTop: firstReal ? firstReal.offsetTop : -1,
      innerW: window.innerWidth
    };
  });

  // Drawer test
  let drawerInViewport = 'n/a';
  const btn = await page.evaluate(() => {
    for (const s of ['#drawerToggle', '#drawerToggleButton', '#menuButton', '[data-action="open-drawer"]']) {
      const el = document.querySelector(s); if (el) return s;
    }
    return null;
  });
  if (btn) {
    await page.evaluate((s) => document.querySelector(s).click(), btn);
    await new Promise((r) => setTimeout(r, 1200));
    drawerInViewport = await page.evaluate(() => {
      const d = document.querySelector('.drawer');
      if (!d) return 'no-drawer';
      const r = d.getBoundingClientRect();
      const isOpen = d.classList.contains('open');
      const inVp = r.left >= -3 && r.right <= window.innerWidth + 3;
      return (isOpen ? 'open' : 'closed') + ':' + (inVp ? 'in-viewport' : `OUT(l=${Math.round(r.left)},r=${Math.round(r.right)})`);
    });
  }

  const label = `${width}x${height}${isLandscape ? ' (landscape)' : ''} ${lang.toUpperCase()}`;
  const okOv = res.hOverflow <= 0 && res.offscreenBtns === 0;
  const contentAfterAd = res.contentFlowTop >= res.adFlowBottom - 1;
  const tag = (okOv && res.adVisibleSpace && contentAfterAd && errs.length === 0 && !String(drawerInViewport).includes('OUT'))
    ? 'PASS' : 'FAIL';
  out(`${tag} ${label} | overflow=${res.hOverflow}px offscreenBtns=${res.offscreenBtns} | ad[h=${res.adH} top=${res.adTop} pos=${res.adPos}] | contentStarts@${res.contentFlowTop} vs adReservedEnd=${res.adFlowBottom} afterAd=${contentAfterAd} | drawer=${drawerInViewport} | jsErrors=${errs.length}${errs.length ? ': ' + errs[0].slice(0, 120) : ''}`);
  await page.close();
}

for (const lang of ['en', 'ar']) {
  for (const [w, h] of SIZES) await measure(w, h, lang, false);
  for (const [w, h] of LANDSCAPES) await measure(w, h, lang, true);
}

await browser.close();
server.close();
out('DONE');
process.exit(0);
