// TEMP VERIFICATION — "reserved top ad space in EVERY view".
// Opens every user-facing view on a real Chrome and asserts the contract:
//   * the ONE global ad bar is still in flow, visible and not covered;
//   * the view starts BELOW the ad bar (reserved band), panel included;
//   * no control of the view sits on the band; the top control is hit-testable;
//   * no horizontal overflow, no JS errors;
//   * screenshots are written to __adview_shots/ for the visual check.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8590;
const SHOTS = path.join(ROOT, '__adview_shots');
fs.mkdirSync(SHOTS, { recursive: true });
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
const OUT = path.join(ROOT, '__probe_adviews2_result.txt');
try { fs.unlinkSync(OUT); } catch (e) {}
let pass = 0, fail = 0;
function check(name, ok, detail = '') {
  if (ok) pass++; else fail++;
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + String(detail).slice(0, 260) : ''}`;
  console.log(line); fs.appendFileSync(OUT, line + '\n');
}
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--lang=en'], protocolTimeout: 120000
});

const OPEN = (fn) => '(' + String(fn) + ')()';
// openVia: 'ui' = real in-app entry point (nav/drawer/popover) ; 'dom' = surface
// exists in the DOM but this build has no visible entry point for it (the view
// must still reserve the band when it is shown).
const VIEWS = [
  { name: 'history', root: '#historyPanel', panel: '#historyPanel > .history-screen', openSel: '#historyPanel.open', openVia: 'ui', open: () => document.querySelector('#featureNavBar .feature-nav-btn[data-action="open-history"]').click(), close: () => document.getElementById('historyBackButton').click() },
  { name: 'notes', root: '#notesManagerModal', panel: '#notesManagerModal > .notes-manager', openSel: '#notesManagerModal.show', openVia: 'ui', open: () => document.querySelector('#featureNavBar .feature-nav-btn[data-action="open-notes"]').click(), close: () => document.getElementById('closeNotesManager').click() },
  { name: 'smartpdf', root: '#smartPdfWorkspace', panel: '#smartPdfWorkspace > .smart-pdf-workspace', openSel: '#smartPdfWorkspace.show', openVia: 'ui', open: () => document.querySelector('#featureNavBar .feature-nav-btn[data-action="open-smart-pdf"]').click(), close: () => document.getElementById('smartPdfBackBtn').click() },
  { name: 'settings', root: '#settingsModal', panel: '#settingsModal > .settings-modal', openSel: '#settingsModal.show', openVia: 'ui', open: () => document.querySelector('#featureNavBar .feature-nav-btn[data-action="open-settings"]').click(), close: () => document.getElementById('settingsCloseButton').click() },
  { name: 'help', root: '#helpModal', panel: '#helpModal > .help-modal', openSel: '#helpModal.show', openVia: 'ui', open: () => { document.querySelector('#featureNavBar .feature-nav-btn[data-action="open-settings"]').click(); const b = document.querySelector('#settingsModal .help-about-item'); if (b) b.click(); }, close: () => { const b = document.getElementById('helpCloseButton'); if (b) b.click(); } },
  { name: 'currency-converter', root: '#currencyConverterModal', panel: '#currencyConverterModal > .currency-modal', openSel: '#currencyConverterModal.show', openVia: 'ui', open: () => { document.getElementById('currencyMenuButton').click(); const b = document.querySelector('#currencyMenuPopover .currency-popover-item[data-action="prices"]'); if (b) b.click(); }, close: () => { const b = document.getElementById('currencyConverterCloseButton'); if (b) b.click(); } },
  { name: 'currency-rates', root: '#currencyRatesModal', panel: '#currencyRatesModal > .currency-modal', openSel: '#currencyRatesModal.show', openVia: 'ui', open: () => { document.getElementById('currencyMenuButton').click(); const b = document.querySelector('#currencyMenuPopover .currency-popover-item[data-action="search"]'); if (b) b.click(); }, close: () => { const m = document.getElementById('currencyRatesModal'); if (m) { m.classList.remove('show'); m.setAttribute('aria-hidden', 'true'); } } },
  { name: 'currency-favorites', root: '#currencyFavoritesModal', panel: '#currencyFavoritesModal > .currency-modal', openSel: '#currencyFavoritesModal.show', openVia: 'ui', open: () => { document.getElementById('currencyMenuButton').click(); const b = document.querySelector('#currencyMenuPopover .currency-popover-item[data-action="favorites"]'); if (b) b.click(); }, close: () => { const m = document.getElementById('currencyFavoritesModal'); if (m) { m.classList.remove('show'); m.setAttribute('aria-hidden', 'true'); } } },
  { name: 'currency-custom', root: '#customRateModal', panel: '#customRateModal > .currency-modal', openSel: '#customRateModal.show', openVia: 'ui', open: () => { document.getElementById('currencyMenuButton').click(); const b = document.querySelector('#currencyMenuPopover .currency-popover-item[data-action="customRate"]'); if (b) b.click(); }, close: () => { const m = document.getElementById('customRateModal'); if (m) { m.classList.remove('show'); m.setAttribute('aria-hidden', 'true'); } } },
  { name: 'install', root: '#iosInstallModal', panel: '#iosInstallModal > .install-modal', openSel: '#iosInstallModal.show', openVia: 'ui', open: () => document.querySelector('.drawer-menu-item[data-action="open-install"]').click(), close: () => { const b = document.querySelector('#iosInstallModal .modal-close-btn'); if (b) b.click(); } },
  { name: 'drawer', root: '#drawer', panel: '#drawer', openSel: '#drawer.open', openVia: 'dom', open: () => { const d = document.getElementById('drawer'); const o = document.getElementById('drawerOverlay'); if (d) d.classList.add('open'); if (o) { o.classList.add('open'); o.classList.add('show'); } document.body.classList.add('modal-open'); }, close: () => { const d = document.getElementById('drawer'); const o = document.getElementById('drawerOverlay'); if (d) d.classList.remove('open'); if (o) { o.classList.remove('open'); o.classList.remove('show'); } document.body.classList.remove('modal-open'); } },
  { name: 'smartdocs', root: '#smartDocsModal', panel: '#smartDocsModal > .smart-docs-home', openSel: '#smartDocsModal.show', openVia: 'dom', open: () => { const m = document.getElementById('smartDocsModal'); m.classList.add('show'); m.setAttribute('aria-hidden', 'false'); }, close: () => { const m = document.getElementById('smartDocsModal'); m.classList.remove('show'); m.setAttribute('aria-hidden', 'true'); } },
  { name: 'pdfv1', root: '#pdfReportsWorkspace', panel: '#pdfReportsWorkspace > .pdf-reports-workspace', openSel: '#pdfReportsWorkspace.show', openVia: 'dom', open: () => { const m = document.getElementById('pdfReportsWorkspace'); m.classList.add('show'); m.setAttribute('aria-hidden', 'false'); }, close: () => { const m = document.getElementById('pdfReportsWorkspace'); m.classList.remove('show'); m.setAttribute('aria-hidden', 'true'); } }
];

const G = ({ rootSel, panelSel, openSel }) => {
  const q = (s) => document.querySelector(s);
  const r = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right), w: Math.round(b.width), h: Math.round(b.height) };
  };
  const ad = q('#adPlaceholder');
  const ar = ad ? ad.getBoundingClientRect() : null;
  const root = q(rootSel);
  const panel = q(panelSel);
  const cs = ad ? getComputedStyle(ad) : null;
  const centerOf = (el) => {
    const b = el.getBoundingClientRect();
    return [Math.round(Math.min(Math.max(b.left + b.width / 2, 1), innerWidth - 1)), Math.round(Math.min(Math.max(b.top + b.height / 2, 1), innerHeight - 1))];
  };
  let adHit = 'n/a';
  if (ar) { const p = centerOf(ad); const h = document.elementFromPoint(p[0], p[1]); adHit = h ? (h === ad || ad.contains(h) ? 'ad' : 'OBSCURED by ' + (h.id || String(h.className).slice(0, 40) || h.tagName)) : 'no-hit'; }
  let topCtl = null, topCtlHit = 'n/a', topCtlSel = '';
  const nodes = root ? Array.from(root.querySelectorAll('button, input, select, textarea, a[href]')).filter((el) => el.getClientRects().length) : [];
  for (const el of nodes) {
    const b = el.getBoundingClientRect();
    if (b.width < 2 || b.height < 2) continue;
    if (!topCtl || b.top < topCtl.top) {
      topCtl = r(el);
      topCtlSel = (el.id ? '#' + el.id : '') + '.' + String(el.className || '').split(' ').filter(Boolean).slice(0, 2).join('.');
      const p = centerOf(el);
      const h = document.elementFromPoint(p[0], p[1]);
      topCtlHit = h ? (el === h || el.contains(h) ? 'ok' : 'COVERED by ' + (h.id || String(h.className).slice(0, 40) || h.tagName)) : 'no-hit';
    }
  }
  const aboveBand = ar ? nodes.filter((el) => { const b = el.getBoundingClientRect(); return b.height > 2 && b.width > 2 && b.top < Math.round(ar.bottom) - 1; }).map((el) => (el.id || String(el.className).slice(0, 24))) : [];
  const scroller = document.scrollingElement || document.documentElement;
  return {
    vw: innerWidth, vh: innerHeight, overflowX: scroller.scrollWidth - scroller.clientWidth, docScroll: Math.round(scroller.scrollTop),
    ad: ad ? { top: Math.round(ar.top), bottom: Math.round(ar.bottom), h: Math.round(ar.height) } : null,
    adPosition: cs ? cs.position : null, adZ: cs ? cs.zIndex : null,
    adFirstShellChild: !!(ad && ad.parentElement && ad.parentElement.classList.contains('app-shell') && ad.parentElement.children[0] === ad),
    adHit, open: !!q(openSel), root: r(root), panel: r(panel), topCtl, topCtlSel, topCtlHit, aboveBand
  };
};

const SIZES = [[390, 844], [360, 720], [800, 360], [1024, 768], [1280, 800]];
const ONLY = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2].split(',') : null;

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
    await sleep(800);
    await page.evaluate(OPEN(view.open));
    await sleep(700);
    const g = await page.evaluate(G, { rootSel: view.root, panelSel: view.panel, openSel: view.openSel });
    const tag = `${w}x${h} ${view.name}`;
    const adB = g.ad ? g.ad.bottom : 0;
    check(`${tag}: view is open`, g.open, 'open=' + g.open);
    check(`${tag}: exactly one ad bar, in flow, first shell child`,
      !!g.ad && g.adFirstShellChild && (g.adPosition === 'relative' || g.adPosition === 'static') && g.adZ === 'auto',
      `first=${g.adFirstShellChild} pos=${g.adPosition} z=${g.adZ}`);
    check(`${tag}: ad bar height stays in the 40-80px contract`, !!g.ad && g.ad.h >= 40 && g.ad.h <= 80, 'h=' + (g.ad && g.ad.h));
    if (g.open) {
      check(`${tag}: ad is VISIBLE in the reserved band (not covered by the view)`, g.adHit === 'ad', g.adHit);
      check(`${tag}: the view starts BELOW the ad bar (reserved band)`, !!g.root && g.root.top >= adB - 1, `viewTop=${g.root && g.root.top} adBottom=${adB}`);
      check(`${tag}: the view panel is fully below the ad bar`, !!g.panel && g.panel.top >= adB - 1, `panelTop=${g.panel && g.panel.top}`);
      check(`${tag}: the view panel stays inside the viewport`, !!g.panel && g.panel.bottom <= g.vh + 1 && g.panel.top >= -1, JSON.stringify(g.panel));
      check(`${tag}: NO control of the view sits on the reserved band`, g.aboveBand.length === 0, JSON.stringify(g.aboveBand.slice(0, 4)));
      check(`${tag}: top control of the view is reachable (hit test)`, g.topCtlHit === 'ok', `${g.topCtlSel} -> ${g.topCtlHit} rect=${JSON.stringify(g.topCtl)}`);
    }
    check(`${tag}: no horizontal overflow`, g.overflowX <= 0, 'ovx=' + g.overflowX);
    check(`${tag}: no uncaught page errors`, errs.length === 0, errs.slice(0, 2).join(' | '));
    try { await page.screenshot({ path: path.join(SHOTS, `${view.name}_${w}x${h}.png`) }); } catch (e) {}
    try { await page.evaluate(OPEN(view.close)); } catch (e) {}
    await page.close();
  }
}

await browser.close();
server.close();
fs.appendFileSync(OUT, `TOTAL ${pass + fail}  PASS ${pass}  FAIL ${fail}\n`);
console.log(`TOTAL ${pass + fail}  PASS ${pass}  FAIL ${fail}`);
process.exit(fail === 0 ? 0 : 1);
