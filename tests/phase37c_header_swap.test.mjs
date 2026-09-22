// PHASE 37C — header language/menu position swap verification.
// PHASE 1 UPDATE: the header is now compact (Language + Install only); the
// currency menu lives in the Feature Navigation Bar and the drawer toggle is
// no longer visible in the UI (still functional for the drawer system).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8299;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  try {
    const data = fs.readFileSync(path.join(ROOT, p));
    res.writeHead(200, { 'Content-Type': (MIME[path.extname(p)] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(data);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const URL_ = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 300000);

let fails = 0;
const check = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`); };

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
const newErrors = [];
page.on('pageerror', (e) => newErrors.push(String(e && e.message || e)));
page.on('console', (m) => { if (m.type() === 'error') newErrors.push(m.text()); });

await page.goto(URL_, { waitUntil: 'networkidle2' });

async function setLang(loc) {
  await page.evaluate((l) => { const s = document.getElementById('topBarLanguageSelect'); s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); }, loc);
  await new Promise((r) => setTimeout(r, 400));
}

async function getOrder() {
  return page.evaluate(() => {
    const r = (el) => { const b = el.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, width: b.width, visible: b.width > 0 && b.height > 0 }; };
    return {
      lang: r(document.getElementById('topBarLanguageSelect')),
      install: r(document.getElementById('topBarInstallButton')),
      cur: r(document.getElementById('currencyMenuWrap')),
      menuVisible: r(document.getElementById('drawerToggle')).visible,
      featureNavVisible: r(document.getElementById('featureNavBar')).visible
    };
  });
}

const VIEWPORTS = [360, 390, 768, 1024, 1280];
const LTR = ['en', 'fr', 'de', 'es', 'ru', 'tr'];
const RTL = ['ar', 'ku'];

for (const vw of VIEWPORTS) {
  await page.setViewport({ width: vw, height: 800 });
  for (const loc of LTR) {
    await setLang(loc);
    const o = await getOrder();
    const ok = o.lang.visible && o.install.visible && o.lang.left < o.install.left;
    const inVp = o.install.right <= vw + 1 && o.lang.right <= vw + 1 && o.lang.left >= 0;
    check(`LTR ${loc} @${vw}: Language|Install in header + in-viewport`, ok && inVp, JSON.stringify({ l: Math.round(o.lang.left), i: Math.round(o.install.left) }));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`LTR ${loc} @${vw}: no horizontal overflow`, overflow <= 0, `overflow=${overflow}px`);
  }
  for (const loc of RTL) {
    await setLang(loc);
    const o = await getOrder();
    const dirOk = await page.evaluate(() => document.documentElement.dir === 'rtl' || ['ar', 'ku'].includes(document.body.dataset.language));
    const ok = o.install.visible && o.install.left < o.lang.left;
    const inVp = o.lang.right <= vw + 1 && o.lang.left >= -1;
    check(`RTL ${loc} @${vw}: Install|Language + in-viewport`, ok && inVp && dirOk, JSON.stringify({ l: Math.round(o.lang.left), i: Math.round(o.install.left) }));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`RTL ${loc} @${vw}: no horizontal overflow`, overflow <= 0, `overflow=${overflow}px`);
  }
}
// Interactivity — PHASE 1: drawer toggle is hidden in the UI; the drawer system
// must still be reachable programmatically (same handler, unchanged).
await setLang('en');
await page.evaluate(() => document.getElementById('drawerToggle').click());
await new Promise((r) => setTimeout(r, 500));
const drawerOpen = await page.evaluate(() => {
  const d = document.getElementById('drawer');
  return d && (d.classList.contains('open') || d.classList.contains('active') || d.dataset.open === 'true' || d.getAttribute('aria-hidden') === 'false');
});
check('Menu (drawerToggle) opens', drawerOpen);
await page.evaluate(() => document.getElementById('drawerToggle').click());
await new Promise((r) => setTimeout(r, 400));
await page.click('#currencyMenuButton');
await new Promise((r) => setTimeout(r, 300));
const popVisible = await page.evaluate(() => {
  const p = document.getElementById('currencyMenuPopover');
  return p && getComputedStyle(p).display !== 'none' && getComputedStyle(p).visibility !== 'hidden';
});
check('Financial Transfers (currency menu) opens', popVisible);
await page.evaluate(() => document.body.click());
await new Promise((r) => setTimeout(r, 200));

// Language transitions
await setLang('ar');
let o = await getOrder();
check('EN->AR switches to RTL arrangement', o.install.left < o.lang.left);
await setLang('ku');
o = await getOrder();
check('AR->KU preserves RTL arrangement', o.install.left < o.lang.left);
await setLang('en');
o = await getOrder();
check('KU->EN restores LTR arrangement', o.lang.left < o.install.left);

// Regression spot-checks
await setLang('en');
const calcOk = await page.evaluate(() => {
  const disp = document.getElementById('primaryDisplay');
  const btns = document.querySelectorAll('.keypad-btn');
  return disp && btns.length > 0;
});
check('Calculator DOM intact (regression)', calcOk);
check('Language select still present/functional', await page.evaluate(() => !!document.getElementById('topBarLanguageSelect')));

console.log('\nNEW console/page errors:', JSON.stringify(newErrors));
console.log(fails === 0 ? 'RESULT: ALL PASS' : `RESULT: ${fails} FAILURES`);
await browser.close();
server.close();
process.exit(fails === 0 ? 0 : 1);

