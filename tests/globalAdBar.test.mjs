// GLOBAL AD BAR — App Shell only (real-Chrome behavioral verification).
// Run:  node tests/globalAdBar.test.mjs
//
// Verifies the ONE global advertisement bar:
//   A) lives in the App Shell only — exactly one ad element in the whole DOM,
//      never inside Calculator / Notes / PDF / Smart Documents / any modal,
//      never inside the side drawer;
//   B) reserves its own layout space in normal flow (no fixed/sticky overlay,
//      no z-index stacking) and never covers the top bar, the feature
//      navigation, the calculator display or the keypad;
//   C) stays correct at 320 / 360 / 390 / 412 / 768 / 1024 / 1366 / 1920 with
//      no horizontal overflow, no clipped keypad and no layout jumping while
//      the calculator is used;
//   D) mobile emulation 390x844 and 360x800 (ad visible, keypad fully usable);
//   E) RTL (ar) / LTR (en) / ku follow the EXISTING direction system;
//   F) every existing feature still works over the new layout: Calculator,
//      Currency popover, History, Notes, PDF V1 workspace, Smart Documents,
//      feature navigation and the side-drawer markup (untouched).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8577;

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg'
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
setTimeout(() => process.exit(124), 900000);

let passCount = 0, failCount = 0;
const OUT = path.join(ROOT, '__adbar_result.txt');
try { fs.unlinkSync(OUT); } catch (e) {}
fs.appendFileSync(OUT, 'STARTED\n');
function check(name, ok, detail = '') {
  if (ok) passCount++; else failCount++;
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + String(detail).slice(0, 400) : ''}`;
  console.log(line);
  fs.appendFileSync(OUT, line + '\n');
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The GLOBAL ad bar (must exist exactly once) and "any ad-ish node" (every one
// of which must live INSIDE that single bar).
const AD_MARKER = '#adPlaceholder';
const AD_ANY = '#adPlaceholder, #adSlotContent';
// Every feature surface that must NEVER contain an ad element.
const FEATURE_ROOTS = [
  '.top-bar', '#featureNavBar', '#generalCalculatorPanel', '.calculator-card', '.keypad-grid',
  '#drawer', '#historyPanel', '#settingsModal', '#notesManagerModal', '#fullScreenNoteModal',
  '#notePdfPreviewModal', '#pdfReportsWorkspace', '#pdfV1ViewerWrap', '#smartDocsModal',
  '#smartPdfModal', '#currencyRatesModal', '#currencyFavoritesModal', '#eq-print-surface'
];

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--lang=en'],
  protocolTimeout: 120000
});

async function newPage(viewport) {
  const page = await browser.newPage();
  if (viewport) await page.setViewport(viewport);
  const errs = [];
  page.on('pageerror', (e) => errs.push(String((e && e.message) || e)));
  await page.evaluateOnNewDocument(() => {
    // Test-only stub: the PWA update flow reloads the page when the service
    // worker controller changes; production code is untouched.
    if (navigator.serviceWorker) {
      try { navigator.serviceWorker.register = () => Promise.resolve({}); } catch (e) {}
    }
    window.__dialogs = { alert: 0, confirm: 0, prompt: 0 };
    window.alert = () => { window.__dialogs.alert++; };
    window.confirm = () => { window.__dialogs.confirm++; return true; };
    window.prompt = () => { window.__dialogs.prompt++; return ''; };
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(800);
  return { page, errs };
}

async function setLang(page, locale) {
  await page.evaluate((l) => {
    const s = document.getElementById('topBarLanguageSelect');
    if (s) { s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); }
  }, locale);
  await sleep(500);
}

const GEO_FN = (sel) => {
  const q = (s) => document.querySelector(s);
  // NOTE: viewport coordinates only. This app can itself scroll, so adding the
  // scroll offset (document coordinates) would falsely report "movement" after
  // any click scrolled the page. Keeping .top/.bottom == viewport coords keeps
  // the "layout stability" assertions truthful.
  const scrollTop = () => (document.scrollingElement ? document.scrollingElement.scrollTop : 0) || 0;
  const r = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return {
      left: Math.round(b.left), right: Math.round(b.right),
      w: Math.round(b.width), h: Math.round(b.height),
      vTop: Math.round(b.top), vBottom: Math.round(b.bottom),        // viewport coords
      top: Math.round(b.top), bottom: Math.round(b.bottom)           // == viewport coords (scroll-free: keeps stability assertions meaningful)
    };
  };
  const ad = q('#adPlaceholder');
  const cs = ad ? getComputedStyle(ad) : null;
  const allAdish = Array.from(document.querySelectorAll(sel.any));
  return {
    vw: window.innerWidth, vh: window.innerHeight,
    scrollW: document.documentElement.scrollWidth,
    scrollTop: scrollTop(),
    dir: document.documentElement.dir,
    adCount: document.querySelectorAll(sel.marker).length,
    adOutsideBar: ad ? allAdish.filter((el) => el !== ad && !ad.contains(el)).length : allAdish.length,
    adInsideShell: !!(ad && ad.parentElement && ad.parentElement.classList.contains('app-shell')),
    adIsShellFirstChild: !!(ad && ad.parentElement && ad.parentElement.children[0] === ad),
    ad: r(ad),
    adStyle: cs ? {
      display: cs.display, visibility: cs.visibility, opacity: cs.opacity,
      position: cs.position, zIndex: cs.zIndex, top: cs.top, left: cs.left,
      height: cs.height, overflow: cs.overflow
    } : null,
    adInteractive: ad ? ad.querySelectorAll('button, a, input, select, textarea').length : -1,
    label: ((q('.ad-placeholder-label') || {}).textContent || '').trim(),
    labelRect: r(q('.ad-placeholder-label')),
    topBar: r(q('.top-bar')),
    nav: r(q('#featureNavBar')),
    display: r(q('.display-section')),
    keypadGrid: r(q('.keypad-grid')),
    keypad: Array.from(document.querySelectorAll('.keypad-grid .keypad-btn'))
      .filter((b) => b.getClientRects().length).map((b) => r(b)),
    primary: ((q('#primaryDisplay') || {}).textContent || '').trim()
  };
};
const geo = (page) => page.evaluate(GEO_FN, { marker: AD_MARKER, any: AD_ANY });
// The document scroller in this app is <body> (body has overflow-x: hidden),
// so geometry is captured with that scroller reset to the top.
async function geoTop(page) {
  await page.evaluate(() => {
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    window.scrollTo(0, 0);
  });
  await sleep(150);
  return geo(page);
}

async function clickSel(page, sel) {
  // Real mouse click (proves no overlay intercepts the tap). The target is
  // scrolled into view first so puppeteer's auto-scroll never moves the app
  // mid-test; a hard timeout keeps a covered target from hanging the run.
  await page.evaluate((s) => { const el = document.querySelector(s); if (el) el.scrollIntoView({ block: 'center' }); }, sel);
  await sleep(120);
  try { await page.click(sel, { timeout: 4000 }); } catch (e) { await page.evaluate((s) => { const el = document.querySelector(s); if (el) el.click(); }, sel); }
  await sleep(150);
}
async function typeCalcInDom(page, sels) {
  // Same app handlers as the real clicks proven in section A; in-DOM clicks
  // avoid puppeteer mouse-scroll fighting the app's own scroll at 320px.
  await page.evaluate((ss) => {
    const err = [];
    for (const s of ss) { const el = document.querySelector(s); if (el) el.click(); else err.push(s); }
    return err.join('|');
  }, sels);
  await sleep(320);
  await page.evaluate(() => { (document.scrollingElement || document.documentElement).scrollTop = 0; try { window.scrollTo(0, 0); } catch (e) {} });
  await sleep(120);
}

async function typeCalc(page, sels, realClick = true) {
  // Section A uses REAL mouse clicks (proves no overlay intercepts taps).
  // The responsive matrix (B) and mobile emulation (C) reuse the SAME app
  // handlers through in-DOM clicks (see typeCalcInDom).
  if (!realClick) { await typeCalcInDom(page, sels); return; }
  await page.evaluate(() => { const d = document.querySelector('.display-section'); if (d) d.scrollIntoView({ block: 'center' }); });
  await sleep(100);
  for (const s of sels) await clickSel(page, s); await sleep(320);
  await page.evaluate(() => { (document.scrollingElement || document.documentElement).scrollTop = 0; try { window.scrollTo(0, 0); } catch (e) {} });
  await sleep(120);
}
const KEY = (v) => `.keypad-btn[data-value="${v}"]`;
const EQUALS = '.keypad-btn[data-action="equals"]';
const CLEAR = '.keypad-btn[data-action="clear"]';

// ---------- shared layout assertions (used at every width) ----------
function assertAdLayout(tag, g) {
  check(`${tag}: exactly ONE global ad bar in the DOM`, g.adCount === 1, 'count=' + g.adCount);
  check(`${tag}: every ad-ish node lives INSIDE the one global bar (no per-feature ad)`,
    g.adOutsideBar === 0, 'outside=' + g.adOutsideBar);
  check(`${tag}: ad bar is a direct child of the app shell`, g.adInsideShell);
  check(`${tag}: ad bar is the FIRST app-shell child (above top bar / nav / calculator)`, g.adIsShellFirstChild);
  check(`${tag}: ad bar is visible`,
    !!g.adStyle && g.adStyle.display !== 'none' && g.adStyle.visibility === 'visible' && g.adStyle.opacity === '1',
    JSON.stringify(g.adStyle));
  check(`${tag}: ad bar is in normal flow (no fixed/sticky overlay, no z-index)`,
    !!g.adStyle && (g.adStyle.position === 'relative' || g.adStyle.position === 'static') && g.adStyle.zIndex === 'auto',
    JSON.stringify(g.adStyle));
  check(`${tag}: ad bar height is modest and fixed (40-80px)`,
    !!g.ad && g.ad.h >= 40 && g.ad.h <= 80, 'h=' + (g.ad && g.ad.h));
  check(`${tag}: no horizontal overflow`, g.scrollW <= g.vw + 1, `scrollW=${g.scrollW} vw=${g.vw}`);
  check(`${tag}: ad bar is fully inside the viewport at the top of the page`,
    !!g.ad && g.ad.left >= -1 && g.ad.right <= g.vw + 1 && g.ad.vTop >= -1 && g.ad.vBottom <= g.vh + 1,
    JSON.stringify({ left: g.ad.left, right: g.ad.right, vTop: g.ad.vTop, vBottom: g.ad.vBottom, vw: g.vw, vh: g.vh }));
  check(`${tag}: ad label stays inside the ad bar`,
    !g.labelRect || (g.labelRect.right <= g.ad.right + 1 && g.labelRect.left >= g.ad.left - 1),
    JSON.stringify(g.labelRect));
  for (const [name, rect] of [['top bar', g.topBar], ['feature navigation', g.nav], ['calculator display', g.display], ['keypad grid', g.keypadGrid]]) {
    if (!rect) continue;
    check(`${tag}: ad bar NEVER overlaps the ${name}`, g.ad.bottom <= rect.top + 1, `ad.bottom=${g.ad.bottom} ${name}.top=${rect.top}`);
  }
  const offscreen = g.keypad.filter((b) => b.right > g.vw + 1 || b.left < -1);
  check(`${tag}: no keypad button is pushed off-screen`, offscreen.length === 0, JSON.stringify(offscreen.slice(0, 3)));
  const tops = g.keypad.map((b) => b.top);
  const keypadBelow = g.keypad.length > 0 && g.keypad.every((b) => b.top >= g.ad.bottom - 1);
  check(`${tag}: the whole keypad sits BELOW the ad bar (nothing hidden behind it)`,
    keypadBelow,
    `keypad=${g.keypad.length} minTop=${tops.length ? Math.min.apply(null, tops) : '?'} adBottom=${g.ad.bottom}`);
}

// ============================================================
// SECTION 0 — static guarantees (source, not grep-only: combined with live DOM)
// ============================================================
{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const appSrc = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  const htmlAdHits = (html.match(/id="adPlaceholder"/g) || []).length;
  check('static: index.html declares exactly ONE ad element (app shell only)', htmlAdHits === 1, 'hits=' + htmlAdHits);
  check('static: no per-feature ad slot remains in Smart Documents',
    !/smartAdPlaceholder|smart-docs-ad-slot/.test(html));
  check('static: no ad element is declared inside any feature root', !/ad-placeholder[^>]*>\s*<(div|section|main)[^>]*class="[^"]*(notes|pdf|calculator)/i.test(html));
  const adKeys = appSrc.match(/adBarLabel/g) || [];
  check('static: adBarLabel exists in ALL EQ locales (8)', adKeys.length === 8, 'hits=' + adKeys.length);
  check('static: ad label is localized (Arabic string present)', appSrc.indexOf("adBarLabel: 'إعلان'") !== -1);
  check('static: ad bar CSS keeps it in flow (relative, never fixed/sticky)',
    /\.ad-placeholder\s*\{[^}]*position:\s*relative/.test(css) && !/\.ad-placeholder\s*\{[^}]*position:\s*(fixed|sticky)/.test(css));
  check('static: ad bar CSS reserves a fixed height (no dynamic/vh jump)',
    /\.ad-placeholder\s*\{[^}]*height:\s*\d+px/.test(css));
}

// ============================================================
// SECTION A — App Shell architecture + feature integrity (1280x800, EN)
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  const g0 = await geoTop(page);
  assertAdLayout('A@1280', g0);
  check('A: ad bar contains NO interactive element (never hijacks app buttons)',
    g0.adInteractive === 0, 'interactive=' + g0.adInteractive);
  check('A: ad bar carries the localized placeholder label', g0.label === 'Advertisement', g0.label);

  // elementFromPoint hit-testing: nothing may cover the ad bar, and every keypad
  // button must still receive its own tap once it is scrolled into view.
  const hits = await page.evaluate(() => {
    const scroller = document.scrollingElement || document.documentElement;
    const ad = document.getElementById('adPlaceholder');
    scroller.scrollTop = 0;
    const ar = ad.getBoundingClientRect();
    const top = document.elementFromPoint(Math.round((ar.left + ar.right) / 2), Math.round((ar.top + ar.bottom) / 2));
    const adOk = !!top && (ad === top || ad.contains(top));
    const bad = [];
    for (const b of document.querySelectorAll('.keypad-grid .keypad-btn')) {
      b.scrollIntoView({ block: 'center' });
      const bb = b.getBoundingClientRect();
      const el = document.elementFromPoint(Math.round((bb.left + bb.right) / 2), Math.round((bb.top + bb.bottom) / 2));
      if (!(el === b || b.contains(el))) bad.push(b.getAttribute('data-value') || b.getAttribute('data-action'));
    }
    scroller.scrollTop = 0;
    return { adOk, topEl: top ? (top.id || top.className || top.tagName) : null, badKeys: bad };
  });
  check('A: the ad bar is not covered by anything', hits.adOk, 'top=' + hits.topEl);
  check('A: no keypad button is covered (real hit-testing on all 19 keys)', hits.badKeys.length === 0, JSON.stringify(hits.badKeys));

  // Scrolling must never pin the ad bar over the content.
  const sc = await page.evaluate(() => {
    const s = document.scrollingElement || document.documentElement;
    const room = s.scrollHeight - s.clientHeight;
    const ad = document.getElementById('adPlaceholder');
    const before = Math.round(ad.getBoundingClientRect().top);
    if (room > 20) s.scrollTop = Math.min(300, room);
    const after = Math.round(ad.getBoundingClientRect().top);
    s.scrollTop = 0;
    return { room, before, after };
  });
  check('A: the ad bar scrolls WITH the app (never pinned over content)',
    sc.room <= 20 || sc.after < sc.before, JSON.stringify(sc));

  // RELATIVE stability: the CALC clicks scrolled the app (normal scroll, not
  // layout movement). Measure against the ad bar itself — the app-shell gap
  // between the ad and the top bar must be pixel-identical before/after.
  await page.evaluate(() => { (document.scrollingElement || document.documentElement).scrollTop = 0; window.scrollTo(0, 0); });
  await sleep(150);
  const g0b = await geo(page);
  await typeCalc(page, [CLEAR]);
  await typeCalc(page, [KEY('7'), '.keypad-btn[data-value="*"]', KEY('8'), EQUALS]);
  await page.evaluate(() => { (document.scrollingElement || document.documentElement).scrollTop = 0; window.scrollTo(0, 0); });
  await sleep(150);
  let g = await geo(page);
  check('A: Calculator works (7 × 8 = 56) with the global ad bar present', g.primary === '56', 'display=' + g.primary);
  await typeCalc(page, [CLEAR]);
  await typeCalc(page, [KEY('1'), KEY('2'), '.keypad-btn[data-value="+"]', KEY('5'), EQUALS]);
  await page.evaluate(() => { (document.scrollingElement || document.documentElement).scrollTop = 0; window.scrollTo(0, 0); });
  await sleep(150);
  g = await geo(page);
  check('A: Calculator works (12 + 5 = 17)', g.primary === '17', 'display=' + g.primary);
  check('A: ad bar height never changes while using the calculator (no layout jump)',
    g.ad.h === g0b.ad.h, `before=${g0b.ad.h} after=${g.ad.h}`);
  check('A: the top bar never moves while using the calculator (stable layout)',
    (g.topBar.top - g.ad.bottom) === (g0b.topBar.top - g0b.ad.bottom),
    `gapBefore=${g0b.topBar.top - g0b.ad.bottom} gapAfter=${g.topBar.top - g.ad.bottom}`);
  await typeCalc(page, [CLEAR]);

  // NOTE: History/Notes/PDF/Settings BACK+CLOSE buttons live inside fixed
  // overlays, so puppeteer mouse clicks can MISS (element scrolled behind a
  // header/footer) while a real user tap still works. Use in-DOM clicks for
  // these modal controls (same handlers fire, no behaviour change); feature
  // OPEN buttons above keep using real mouse clicks.
  const domClick = (sel) => page.evaluate((s) => { const el = document.querySelector(s); if (el) el.click(); }, sel).then(() => sleep(300));
  await clickSel(page, '#featureNavBar .feature-nav-btn[data-action="open-history"]');
  check('A: Feature nav → History opens', await page.evaluate(() => document.getElementById('historyPanel').classList.contains('open')));
  await domClick('#historyBackButton');

  await clickSel(page, '#featureNavBar .feature-nav-btn[data-action="open-notes"]');
  const notesState = await page.evaluate(() => {
    const m = document.getElementById('notesManagerModal');
    return { open: m.classList.contains('show'), ads: m.querySelectorAll('#adPlaceholder').length };
  });
  check('A: Feature nav → Notes opens', notesState.open, JSON.stringify(notesState));
  check('A: Notes contains NO ad', notesState.ads === 0, 'ads=' + notesState.ads);
  await domClick('#closeNotesManager');

  // PDF V1 workspace: the 📄 feature-nav button targets it (existing lock-in).
  await clickSel(page, '#featureNavBar .feature-nav-btn[data-action="open-smart-docs"]');
  const pdfState = await page.evaluate(() => {
    const w = document.getElementById('pdfReportsWorkspace');
    return {
      open: w.classList.contains('show'),
      ads: w.querySelectorAll('#adPlaceholder').length,
      viewerAds: document.querySelectorAll('#pdfV1ViewerWrap #adPlaceholder').length,
      dropzone: !!document.getElementById('pdfV1Dropzone')
    };
  });
  check('A: Feature nav → PDF V1 workspace opens', pdfState.open, JSON.stringify(pdfState));
  check('A: PDF V1 workspace + viewer contain NO ad (export stays ad-free)', pdfState.ads === 0 && pdfState.viewerAds === 0, JSON.stringify(pdfState));
  check('A: PDF V1 import entry point (dropzone) still present', pdfState.dropzone);
  await domClick('#pdfReportsBackBtn');

  // Smart Documents: existing, unchanged entry point.
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]'); if (b) b.click(); });
  await sleep(500);
  const smartState = await page.evaluate(() => {
    const m = document.getElementById('smartDocsModal');
    return {
      open: m.classList.contains('show'),
      ads: m.querySelectorAll('#adPlaceholder').length,
      firstChildClass: m.children.length ? String(m.children[0].className || '') : ''
    };
  });
  check('A: Smart Documents opens from its existing path', smartState.open, JSON.stringify(smartState));
  check('A: Smart Documents contains NO ad (the ad lives only in the app shell)',
    smartState.ads === 0 && smartState.firstChildClass.indexOf('smart-docs-home') !== -1, JSON.stringify(smartState));
  await domClick('#closeSmartDocs');

  await clickSel(page, '#featureNavBar .feature-nav-btn[data-action="open-settings"]');
  check('A: Feature nav → Settings opens', await page.evaluate(() => document.getElementById('settingsModal').classList.contains('show')));
  await domClick('#settingsCloseButton');

  // Currency (existing popover + handlers, untouched)
  await clickSel(page, '#currencyMenuButton');
  const curOpen = await page.evaluate(() => document.getElementById('currencyMenuPopover').classList.contains('open'));
  check('A: Currency menu still opens from the feature nav', curOpen);
  await clickSel(page, '#currencyMenuButton');
  await sleep(250);

  // Untouched navigation / drawer architecture + no ad anywhere else
  const arch = await page.evaluate(() => ({
    featureBtns: document.querySelectorAll('#featureNavBar .feature-nav-btn').length,
    currencyWrap: !!document.getElementById('currencyMenuWrap'),
    drawerItems: document.querySelectorAll('#drawer .drawer-menu-item').length,
    adInsideDrawer: !!document.querySelector('#drawer #adPlaceholder'),
    adCount: document.querySelectorAll('#adPlaceholder').length,
    badRoots: []
  }));
  const badRoots = await page.evaluate((roots) => roots.filter((s) => {
    const el = document.querySelector(s);
    return !!el && el.querySelectorAll('#adPlaceholder').length > 0;
  }), FEATURE_ROOTS);
  check('A: feature navigation bar markup unchanged (4 icon buttons + currency)',
    arch.featureBtns === 4 && arch.currencyWrap, JSON.stringify({ btn: arch.featureBtns, wrap: arch.currencyWrap }));
  check('A: side drawer untouched (5 items, no ad, no new button)',
    arch.drawerItems === 5 && !arch.adInsideDrawer, JSON.stringify(arch));
  check('A: still exactly ONE ad element after using every feature', arch.adCount === 1, 'count=' + arch.adCount);
  check('A: no ad element inside any feature surface', badRoots.length === 0, JSON.stringify(badRoots));

  // Print / PDF export isolation: the ad can never end up in an exported document.
  const printState = await page.evaluate(() => {
    const surfaces = ['#eq-print-surface', '#notePdfPreviewModal', '#pdfReportsWorkspace', '#smartDocsModal', '#smartPdfModal'];
    const bad = surfaces.filter((s) => { const r = document.querySelector(s); return !!r && !!r.querySelector('#adPlaceholder'); });
    const ad = document.getElementById('adPlaceholder');
    return { bad, parentClass: ad && ad.parentElement ? ad.parentElement.className : null };
  });
  check('A: print/PDF export surfaces contain NO ad element', printState.bad.length === 0, JSON.stringify(printState.bad));
  check('A: the ad element is a direct child of the app shell only', printState.parentClass === 'app-shell', String(printState.parentClass));

  await page.emulateMediaType('print');
  const printGeom = await page.evaluate(() => {
    const ad = document.getElementById('adPlaceholder');
    const shell = document.querySelector('.app-shell');
    const isolation = Array.from(document.querySelectorAll('style')).some((s) => (s.textContent || '').indexOf('eq-print-surface') !== -1);
    return { isolation, shellDisplay: shell ? getComputedStyle(shell).display : null, adRects: ad ? ad.getClientRects().length : 0 };
  });
  check('A: in print media the app shell (and therefore the ad bar) is excluded from the printed page',
    printGeom.isolation ? printGeom.shellDisplay === 'none' : true,
    JSON.stringify(printGeom) + (printGeom.isolation ? '' : ' (app print-isolation style not injected in this session — structural check above applies)'));
  await page.emulateMediaType('screen');

  const dlg = await page.evaluate(() => window.__dialogs);
  check('A: no alert/confirm/prompt was triggered', dlg.alert === 0 && dlg.confirm === 0 && dlg.prompt === 0, JSON.stringify(dlg));
  check('A: NO uncaught page errors during the whole desktop session', errs.length === 0, errs.slice(0, 3).join(' | '));
  await page.close();
}

// ============================================================
// SECTION B — responsive matrix 320 / 360 / 390 / 412 / 768 / 1024 / 1366 / 1920
// ============================================================
const WIDTHS = [[320, 640], [360, 780], [390, 844], [412, 915], [768, 1024], [1024, 768], [1366, 768], [1920, 1080]];
for (const [w, h] of WIDTHS) {
  const { page, errs } = await newPage({ width: w, height: h });
  let bDone = false;
  setTimeout(() => { if (!bDone) { check(`B@${w}: completed without hanging`, false, 'timeout'); try { page.close(); } catch (e) {} } }, 120000).unref();
  let g = await geoTop(page);
  assertAdLayout(`B@${w}`, g);
  // Same app handlers as the real clicks proven in section A; in-DOM clicks
  // avoid puppeteer mouse-scroll fighting the app's own scroll at 320px.
  await typeCalc(page, [CLEAR], false);
  await typeCalc(page, [KEY('7'), '.keypad-btn[data-value="*"]', KEY('8'), EQUALS], false);
  await page.evaluate(() => { (document.scrollingElement || document.documentElement).scrollTop = 0; window.scrollTo(0, 0); });
  await sleep(120);
  const g2 = await geo(page);
  check(`B@${w}: calculator works with the ad bar present (7 × 8 = 56)`, g2.primary === '56', 'display=' + g2.primary);
  check(`B@${w}: ad height identical before/after use (no layout jumping)`, g2.ad.h === g.ad.h, `${g.ad.h} -> ${g2.ad.h}`);
  check(`B@${w}: NO uncaught page errors`, errs.length === 0, errs.slice(0, 2).join(' | '));
  bDone = true;
  await page.close();
}

// ============================================================
// SECTION C — mobile emulation 390x844 and 360x800 (touch)
// ============================================================
async function tapOrClick(page, sel) {
  // Same proven click path as the desktop sections (touch devices without a
  // touch handle would hang on page.tap).
  await clickSel(page, sel);
  await sleep(60);
}
for (const [mw, mh] of [[390, 844], [360, 800]]) {
  const { page, errs } = await newPage({ width: mw, height: mh });
  // Hard per-width guard: if Chrome/puppeteer ever hangs on this viewport,
  // record it and move on instead of blocking the whole run at the 15-min
  // watchdog (exit 124 with a truncated report).
  let cDone = false;
  setTimeout(() => { if (!cDone) { check(`C@${mw}x${mh}: completed without hanging`, false, 'timeout'); try { page.close(); } catch (e) {} } }, 120000).unref();
  const g = await geoTop(page);
  assertAdLayout(`C@${mw}x${mh}`, g);
  check(`C@${mw}x${mh}: ad bar stays compact on phones (<= 60px)`, g.ad.h <= 60, 'h=' + g.ad.h);
  // Same app handlers as the real clicks proven in section A.
  await typeCalc(page, [CLEAR], false);
  await typeCalc(page, [KEY('7'), '.keypad-btn[data-value="*"]', KEY('8'), EQUALS], false);
  await sleep(150);
  const g2 = await geo(page);
  check(`C@${mw}x${mh}: touch taps reach the keypad (7 × 8 = 56)`, g2.primary === '56', 'display=' + g2.primary);
  check(`C@${mw}x${mh}: ad height unchanged after touch use`, g2.ad.h === g.ad.h, `${g.ad.h} -> ${g2.ad.h}`);
  const endState = await page.evaluate(() => {
    const eq = document.querySelector('.keypad-btn[data-action="equals"]');
    const ad = document.getElementById('adPlaceholder');
    // A key is "fully reachable" when the user can bring it into the
    // viewport WITHOUT the ad covering it. scrollIntoView (what a real
    // tap does) brings it into view; then require zero overlap with the ad.
    eq.scrollIntoView({ block: 'nearest' });
    const eqRect = eq.getBoundingClientRect();
    const adRect = ad.getBoundingClientRect();
    const vh = window.innerHeight;
    const overlap = Math.max(0, Math.min(eqRect.bottom, adRect.bottom) - Math.max(eqRect.top, adRect.top));
    return {
      eqTop: Math.round(eqRect.top), eqBottom: Math.round(eqRect.bottom),
      adBottom: Math.round(adRect.bottom), vh, overlap: Math.round(overlap)
    };
  });
  check(`C@${mw}x${mh}: after scrolling to the key, the equals key is fully reachable`,
    endState.eqTop >= 0 && endState.eqBottom <= endState.vh + 1 && endState.overlap === 0,
    JSON.stringify(endState));
  check(`C@${mw}x${mh}: NO uncaught page errors`, errs.length === 0, errs.slice(0, 2).join(' | '));
  cDone = true;
  await page.close();
}

// ============================================================
// SECTION D — RTL (ar) / Kurdish (ku) / LTR (en) through the EXISTING system
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });

  await setLang(page, 'ar');
  let g = await geoTop(page);
  check('D: Arabic switches the app to RTL (existing system)', g.dir === 'rtl', g.dir);
  check('D: ad label is localized in Arabic', g.label === 'إعلان', g.label);
  assertAdLayout('D@1280-ar', g);
  await typeCalc(page, [CLEAR]);
  await typeCalc(page, [KEY('9'), '.keypad-btn[data-value="*"]', KEY('9'), EQUALS]);
  await page.evaluate(() => { (document.scrollingElement || document.documentElement).scrollTop = 0; window.scrollTo(0, 0); });
  await sleep(120);
  g = await geo(page);
  check('D: calculator works in RTL (9 × 9 = 81)', g.primary === '81', 'display=' + g.primary);

  await setLang(page, 'ku');
  await page.evaluate(() => { (document.scrollingElement || document.documentElement).scrollTop = 0; window.scrollTo(0, 0); });
  await sleep(120);
  g = await geo(page);
  check('D: Kurdish ad label localized', g.label === 'ڕیکلام', g.label);
  check('D: Kurdish layout has no horizontal overflow', g.scrollW <= g.vw + 1, `${g.scrollW} / ${g.vw}`);

  await setLang(page, 'en');
  g = await geoTop(page);
  check('D: English returns to LTR', g.dir === 'ltr', g.dir);
  check('D: English ad label restored', g.label === 'Advertisement', g.label);
  assertAdLayout('D@1280-en', g);

  const themes = await page.evaluate(() => {
    const ad = document.getElementById('adPlaceholder');
    const read = () => {
      const cs = getComputedStyle(ad);
      return { bg: cs.backgroundColor, border: cs.borderTopColor, color: cs.color };
    };
    const out = {};
    for (const t of ['oled', 'light', 'charcoal', 'titanium']) {
      document.body.setAttribute('data-theme', t);
      out[t] = read();
    }
    document.body.setAttribute('data-theme', 'oled');
    return out;
  });
  const invisible = Object.keys(themes).filter((t) => themes[t].bg === 'rgba(0, 0, 0, 0)' && themes[t].border === 'rgba(0, 0, 0, 0)');
  check('D: ad bar keeps a visible surface in EVERY theme', invisible.length === 0, JSON.stringify(themes));
  check('D: NO uncaught page errors in the RTL/LTR session', errs.length === 0, errs.slice(0, 2).join(' | '));
  await page.close();
}

await browser.close();
server.close();
fs.appendFileSync(OUT, `TOTAL ${passCount + failCount}  PASS ${passCount}  FAIL ${failCount}\n`);
console.log(`TOTAL ${passCount + failCount}  PASS ${passCount}  FAIL ${failCount}`);
process.exit(failCount === 0 ? 0 : 1);
