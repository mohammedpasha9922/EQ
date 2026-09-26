// TEMP DIAGNOSTIC — "reserved top ad space in EVERY view" contract.
// For each user-facing view (History, Notes, Smart Documents, PDF workspace,
// Smart PDF, Settings, Help, Currency, Install, Drawer) it reports:
//   * the ad bar rect and whether the ad is visible/not covered
//   * the view surface rect (overlay + panel) and whether it COVERS the ad
//   * the top-most control of the view (rect + real hit test)
//   * horizontal overflow / document scroll state
// Usage: node __probe_adviews.mjs [view,view,...]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8588;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.wasm': 'application/wasm' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  try { const d = fs.readFileSync(path.join(ROOT, p)); res.writeHead(200, { 'Content-Type': (MIME[path.extname(p).toLowerCase()] || 'application/octet-stream') + '; charset=utf-8' }); res.end(d); }
  catch (e) { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 900000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = path.join(ROOT, '__probe_adviews_result.txt');
try { fs.unlinkSync(OUT); } catch (e) {}
const log = (s) => { console.log(s); fs.appendFileSync(OUT, s + '\n'); };

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--lang=en'], protocolTimeout: 120000
});

const VIEWS = [
  { name: 'history', open: () => document.querySelector('.drawer-menu-item[data-action="open-history"]').click(), close: () => document.getElementById('historyBackButton').click(), root: '#historyPanel', panel: '#historyPanel > .history-screen' },
  { name: 'notes', open: () => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click(), close: () => document.getElementById('closeNotesManager').click(), root: '#notesManagerModal', panel: '#notesManagerModal > .notes-manager' },
  { name: 'smartdocs', open: () => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click(), close: () => document.getElementById('closeSmartDocs').click(), root: '#smartDocsModal', panel: '#smartDocsModal > .smart-docs-home' },
  { name: 'pdfv1', open: () => document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]').click(), close: () => document.getElementById('pdfReportsBackBtn').click(), root: '#pdfReportsWorkspace', panel: '#pdfReportsWorkspace > .pdf-reports-workspace' },
  { name: 'smartpdf', open: () => document.querySelector('#featureNavBar .feature-nav-btn[data-action="open-smart-pdf"]').click(), close: () => document.getElementById('smartPdfBackBtn').click(), root: '#smartPdfWorkspace', panel: '#smartPdfWorkspace > .smart-pdf-workspace' },
  { name: 'settings', open: () => document.querySelector('#featureNavBar .feature-nav-btn[data-action="open-settings"]').click(), close: () => document.getElementById('settingsCloseButton').click(), root: '#settingsModal', panel: '#settingsModal > .settings-modal' },
  {
    name: 'help',
    open: () => {
      document.querySelector('#featureNavBar .feature-nav-btn[data-action="open-settings"]').click();
      setTimeout(() => { const b = document.querySelector('#settingsModal .help-about-item'); if (b) b.click(); }, 150);
    },
    close: () => { const b = document.getElementById('helpCloseButton'); if (b) b.click(); }, root: '#helpModal', panel: '#helpModal > .help-modal'
  },
  {
    name: 'currency',
    open: () => {
      document.getElementById('currencyMenuButton').click();
      setTimeout(() => { const b = document.querySelector('#currencyMenuPopover .currency-popover-item[data-action="search"]'); if (b) b.click(); }, 150);
    },
    close: () => { const b = document.getElementById('currencyConverterCloseButton'); if (b) b.click(); }, root: '#currencyConverterModal', panel: '#currencyConverterModal > .currency-modal'
  },
  { name: 'install', open: () => document.querySelector('.drawer-menu-item[data-action="open-install"]').click(), close: () => { const b = document.querySelector('#iosInstallModal .modal-close-btn'); if (b) b.click(); }, root: '#iosInstallModal', panel: '#iosInstallModal > .install-modal' },
  { name: 'drawer', open: () => { const t = document.getElementById('drawerToggle'); if (t) t.click(); }, close: () => { const t = document.getElementById('drawerToggle'); if (t) t.click(); }, root: '#drawer', panel: '#drawer' }
];

const MEASURE = ({ rootSel, panelSel }) => {
  const q = (s) => document.querySelector(s);
  const rect = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right), w: Math.round(b.width), h: Math.round(b.height) };
  };
  const ad = q('#adPlaceholder');
  const ar = ad ? ad.getBoundingClientRect() : null;
  const root = q(rootSel);
  const rr = rect(root);
  const panel = q(panelSel);
  const pr = rect(panel);
  const adHit = ar ? document.elementFromPoint(Math.round((ar.left + ar.right) / 2), Math.round((ar.top + ar.bottom) / 2)) : null;
  let topCtl = null, topCtlHit = null, topCtlSel = '';
  const nodes = root ? Array.from(root.querySelectorAll('button, input, select, textarea, a[href]'))
    .filter((el) => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden') : [];
  for (const el of nodes) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (!topCtl || r.top < topCtl.top) {
      topCtl = { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) };
      topCtlSel = (el.id ? '#' + el.id : '') + '.' + String(el.className || '').split(' ').filter(Boolean).slice(0, 2).join('.');
      const hit = document.elementFromPoint(Math.round(Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1)), Math.round(Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1)));
      topCtlHit = hit ? (el === hit || el.contains(hit) ? 'ok' : 'COVERED by ' + (hit.id || String(hit.className).slice(0, 40) || hit.tagName)) : 'no-hit';
    }
  }
  const scroller = document.scrollingElement || document.documentElement;
  return {
    vw: innerWidth, vh: innerHeight,
    docScroll: Math.round(scroller.scrollTop), docRoom: scroller.scrollHeight - scroller.clientHeight,
    overflowX: scroller.scrollWidth - scroller.clientWidth,
    ad: ad ? { top: Math.round(ar.top), bottom: Math.round(ar.bottom), h: Math.round(ar.height) } : null,
    adIdle: ad ? { display: getComputedStyle(ad).display, position: getComputedStyle(ad).position, zIndex: getComputedStyle(ad).zIndex } : null,
    adHit: adHit ? (adHit === ad || ad.contains(adHit) ? 'ad' : 'OBSCURED by ' + (adHit.id || String(adHit.className).slice(0, 40) || adHit.tagName)) : 'no-hit',
    rootShown: !!root && root.getClientRects().length > 0,
    root: rr, panel: pr,
    coversAd: !!(rr && ar && rr.top < Math.round(ar.bottom) - 1),
    panelCoversAd: !!(pr && ar && pr.top < Math.round(ar.bottom) - 1),
    topCtl, topCtlSel, topCtlHit
  };
};

const SIZES = [[390, 844], [360, 720], [800, 360], [1024, 768], [1280, 800]];
const ONLY = process.argv[2] ? process.argv[2].split(',') : null;

for (const [w, h] of SIZES) {
  for (const view of VIEWS) {
    if (ONLY && !ONLY.includes(view.name)) continue;
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, hasTouch: true });
    const errs = [];
    page.on('pageerror', (e) => errs.push(String((e && e.message) || e)));
    await page.evaluateOnNewDocument(() => {
      if (navigator.serviceWorker) { try { navigator.serviceWorker.register = () => Promise.resolve({}); } catch (e) {} }
      window.alert = () => {}; window.confirm = () => true; window.prompt = () => '';
    });
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(700);
    await page.evaluate(String(view.open));
    await sleep(600);
    const g = await page.evaluate(MEASURE, { rootSel: view.root, panelSel: view.panel });
    log(`${w}x${h} ${view.name.padEnd(10)} shown=${g.rootShown ? 'Y' : 'n'} ad=[${g.ad ? g.ad.top + '..' + g.ad.bottom + ' h' + g.ad.h : '-'}] adHit=${g.adHit} rootTop=${g.root ? g.root.top : '-'} panelTop=${g.panel ? g.panel.top : '-'} coversAd=${g.coversAd} panelCoversAd=${g.panelCoversAd} topCtl=${g.topCtl ? g.topCtl.top : '-'}(${g.topCtlSel})=${g.topCtlHit} docScroll=${g.docScroll}/${g.docRoom} ovx=${g.overflowX} errs=${errs.length}${errs.length ? ':' + errs[0].slice(0, 60) : ''}`);
    try { if (view.close) await page.evaluate(String(view.close)); } catch (e) {}
    await page.close();
  }
}

// Scrolled-device case: does the reserved band still show the ad when the app is
// scrolled before a full-screen view is opened (mobile)?
for (const name of ['history', 'notes', 'settings']) {
  const view = VIEWS.find((v) => v.name === name);
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 720, hasTouch: true });
  await page.evaluateOnNewDocument(() => { if (navigator.serviceWorker) { try { navigator.serviceWorker.register = () => Promise.resolve({}); } catch (e) {} } });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(700);
  await page.evaluate(() => { const s = document.scrollingElement || document.documentElement; s.scrollTop = Math.min(240, Math.max(0, s.scrollHeight - s.clientHeight)); });
  await sleep(150);
  await page.evaluate(String(view.open));
  await sleep(500);
  const g = await page.evaluate(MEASURE, { rootSel: view.root, panelSel: view.panel });
  log(`SCROLLED-390x720 ${name.padEnd(10)} docScroll=${g.docScroll} adTop=${g.ad ? g.ad.top : '-'} adHit=${g.adHit} rootTop=${g.root ? g.root.top : '-'} coversAd=${g.coversAd} topCtl=${g.topCtl ? g.topCtl.top : '-'}=${g.topCtlHit}`);
  await page.close();
}

await browser.close();
server.close();
log('DONE');
process.exit(0);
