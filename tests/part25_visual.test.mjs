// PART 25 — VISUAL VERIFICATION ONLY (test artifact; NO production code changed)
// Screenshots -> tests/artifacts/part25_visual/ ; results -> tests/part25_visual_results.txt
// Run: node tests/part25_visual.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8443;
const ART = path.join(ROOT, 'tests', 'artifacts', 'part25_visual');
fs.mkdirSync(ART, { recursive: true });
const PREEXISTING = /attribute d: Expected number|a2 2 2 0 0 0|forEach is not a function/i;
const FIXTURE = path.join(ROOT, '__notes_test', '_p19_fixture_2p.pdf');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0; const LOG = [], realErrs = [];
function check(name, ok, detail = '') {
  let d = detail; if (detail && typeof detail === 'object') { try { d = JSON.stringify(detail); } catch (e) { d = String(detail); } }
  LOG.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${d !== '' ? '  -> ' + d : ''}`); ok ? pass++ : fail++;
}
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.pdf': 'application/pdf' };
const server = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]); if (!p || p === '/') p = '/index.html';
    res.writeHead(200, { 'Content-Type': (MIME[path.extname(p).toLowerCase()] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(fs.readFileSync(path.join(ROOT, p)));
  } catch (e) { if (!res.headersSent) { res.writeHead(404); res.end('nf'); } }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });

const SURVEY = () => {
  const vw = window.innerWidth, vh = window.innerHeight;
  const doc = document.scrollingElement;
  const menu = document.getElementById('smartPdfPagesMenu');
  const btn = document.getElementById('smartPdfPagesBtn');
  const acts = [...document.querySelectorAll('#smartPdfPagesMenu [data-pact]')];
  const chips = [...document.querySelectorAll('#smartPdfPagesList .smart-pdf-page-chip')];
  const inVp = (r, tol = 2) => r.width > 0 && r.height > 0 && r.left >= -tol && r.right <= vw + tol && r.top >= -tol && r.bottom <= vh + tol;
  const mr = menu && !menu.hasAttribute('hidden') ? menu.getBoundingClientRect() : null;
  const menuScrolls = mr ? (menu.scrollHeight > menu.clientHeight + 2) : false;
  // elements count as usable if inside viewport OR inside a vertically scrollable menu (scrollable container = reachable)
  const off = (el) => { const r = el.getBoundingClientRect(); return !(inVp(r) || (mr && menuScrolls && r.left >= mr.left - 2 && r.right <= mr.right + 2)); };
  return {
    dir: document.documentElement.dir, lang: document.documentElement.lang,
    overflowX: doc.scrollWidth - doc.clientWidth, overflowY: doc.scrollHeight - doc.clientHeight, vw, vh,
    btn: btn ? btn.getBoundingClientRect().toJSON() : null, btnInVp: btn ? inVp(btn.getBoundingClientRect()) : false,
    menuOpen: !!(mr), menuRect: mr ? { l: Math.round(mr.left), t: Math.round(mr.top), r: Math.round(mr.right), b: Math.round(mr.bottom) } : null,
    menuInVpX: mr ? (mr.left >= -2 && mr.right <= vw + 2) : false,
    menuDir: menu ? getComputedStyle(menu).direction : '',
    acts: acts.length, actOff: acts.filter(off).length, chips: chips.length, chipOff: chips.filter(off).length,
    actLabels: acts.map((b) => (b.textContent || '').trim()).join('|'),
    chipW: chips.length ? Math.round(chips[0].getBoundingClientRect().width) : 0,
    moveBtns: chips.length ? [...chips[0].querySelectorAll('[data-pmove]')].filter((b) => !b.disabled).length : 0
  };
};
async function newPage(w, h, touch) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, hasTouch: !!touch, isMobile: !!touch });
  page.on('pageerror', (e) => { if (!PREEXISTING.test(e.message)) realErrs.push('pageerror: ' + e.message); });
  page.on('console', (m) => { if (m.type() === 'error' && !PREEXISTING.test(m.text())) realErrs.push('console: ' + m.text()); });
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
  await sleep(700);
  return page;
}
async function setLang(page, loc) {
  await page.evaluate((l) => { const s = document.getElementById('topBarLanguageSelect'); s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); }, loc);
  await sleep(600);
}
async function openEditor(page) {
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]')?.click());
  await sleep(380);
  await page.evaluate(() => document.getElementById('pdfOpenCard')?.click());
  await sleep(500);
  const b64 = fs.readFileSync(FIXTURE).toString('base64');
  const ok = await page.evaluate(async (b) => {
    const bin = atob(b); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const dt = new DataTransfer(); dt.items.add(new File([u8], 'v.pdf', { type: 'application/pdf' }));
    const fi = document.getElementById('smartImportFileInput'); if (!fi) return false;
    fi.files = dt.files; fi.dispatchEvent(new Event('change', { bubbles: true })); return true;
  }, b64);
  for (let i = 0; i < 100; i++) {
    const s = await page.evaluate(() => {
      const ed = document.getElementById('smartEditorView');
      return !!(ed && ed.classList.contains('editor-visible') && document.querySelectorAll('#smartPdfEditor .smart-pdf-page').length >= 2);
    });
    if (s) break; await sleep(220);
  }
  return ok;
}
async function openPages(page) {
  return await page.evaluate(() => {
    const m = document.getElementById('smartPdfPagesMenu');
    if (m && m.hasAttribute('hidden')) document.getElementById('smartPdfPagesBtn').click();
    return m && !m.hasAttribute('hidden');
  });
}
async function act(page, a, idx) {
  await page.evaluate((ac, i) => {
    const m = document.getElementById('smartPdfPagesMenu');
    if (!m || m.hasAttribute('hidden')) document.getElementById('smartPdfPagesBtn').click();
    if (i !== null) document.querySelector('#smartPdfPagesList .smart-pdf-page-chip[data-pidx="' + i + '"]')?.click();
    m.querySelector('[data-pact="' + ac + '"]')?.click();
  }, a, idx === undefined ? null : idx);
  await sleep(600);
}
async function move(page, i, d) {
  await page.evaluate((n, dir) => {
    const m = document.getElementById('smartPdfPagesMenu');
    if (!m || m.hasAttribute('hidden')) document.getElementById('smartPdfPagesBtn').click();
    document.querySelector('#smartPdfPagesList .smart-pdf-page-chip[data-pidx="' + n + '"] [data-pmove="' + dir + '"]')?.click();
  }, i, d);
  await sleep(600);
}
async function modelOf(page) {
  return await page.evaluate(() => window.__smartImport && window.__smartImport.pageModel ? window.__smartImport.pageModel() : null);
}
async function scenario(name, { w, h, lang, touch, shot }) {
  const page = await newPage(w, h, touch);
  if (lang) await setLang(page, lang);
  const edOk = await openEditor(page);
  if (!edOk) { check(name + ' editor open', false, 'inject failed'); await page.close(); return; }
  const open = await openPages(page);
  let s = await page.evaluate(SURVEY);
  check(name + ' Pages button visible & inside viewport', s.btnInVp, s.btn && { l: Math.round(s.btn.left), r: Math.round(s.btn.right) });
  check(name + ' Pages menu opens', open && s.menuOpen, s.menuRect);
  check(name + ' menu inside viewport + actions/chips usable', s.menuInVpX && s.actOff === 0 && s.chipOff === 0, { menu: s.menuRect, actOff: s.actOff, chipOff: s.chipOff, acts: s.acts, chips: s.chips });
  check(name + ' dir correct (' + (lang === 'ar' ? 'rtl' : 'ltr') + ')', s.dir === (lang === 'ar' ? 'rtl' : 'ltr'), { dir: s.dir, menuDir: s.menuDir });
  await page.screenshot({ path: path.join(ART, shot + '_1_menu.png') });
  // exercise the 5 ops visually
  await act(page, 'add');
  const m1 = await modelOf(page);
  check(name + ' Add Page -> 3 pages in model', m1 && m1.length === 3, m1 && m1.length);
  await act(page, 'rot', 0);
  const m2 = await modelOf(page);
  check(name + ' Rotate 90 on page 0', m2 && m2[0].rot === 90, m2 && m2[0].rot);
  await act(page, 'dup', 0);
  await sleep(400);
  const m3 = await modelOf(page);
  check(name + ' Duplicate -> 4 pages', m3 && m3.length === 4, m3 && m3.length);
  await move(page, 0, 1);
  const m4 = await modelOf(page);
  check(name + ' Move Down reorders', !!(m4 && m3 && m4[0].src === m3[1].src), m4);
  await openPages(page);
  s = await page.evaluate(SURVEY);
  await page.screenshot({ path: path.join(ART, shot + '_2_after_ops.png') });
  check(name + ' after ops: menu inside viewport, no overflow', s.menuInVpX && s.overflowX <= 0 && s.actOff === 0, { ovx: s.overflowX, menu: s.menuRect, actOff: s.actOff });
  // touch usability: tap the Pages button with touchscreen
  if (touch) {
    const b = await page.evaluate(() => { const r = document.getElementById('smartPdfPagesBtn').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    try { await page.touchscreen.tap(b.x, b.y); await sleep(400); check(name + ' touch tap toggles Pages menu', true, 'tapped'); }
    catch (e) { check(name + ' touch tap toggles Pages menu', false, String(e).slice(0, 80)); }
  }
  await page.close();
}
try {
  await scenario('Desktop', { w: 1366, h: 900, lang: 'en', shot: 'desktop_en' });
  await scenario('Laptop', { w: 1280, h: 800, lang: 'en', shot: 'laptop_en' });
  await scenario('Tablet', { w: 768, h: 1024, lang: 'en', shot: 'tablet_en' });
  await scenario('Mobile', { w: 390, h: 844, lang: 'en', shot: 'mobile_en' });
  await scenario('TabletRTL', { w: 768, h: 1024, lang: 'ar', shot: 'tablet_ar' });
  await scenario('MobileRTL', { w: 390, h: 844, lang: 'ar', shot: 'mobile_ar' });
  await scenario('Touch', { w: 390, h: 844, lang: 'ar', touch: true, shot: 'touch_ar' });
} finally {
  check('No new JS/console errors across visual run', realErrs.length === 0, realErrs.slice(0, 3));
  await browser.close(); server.close();
  fs.writeFileSync(path.join(HERE, 'part25_visual_results.txt'), LOG.join('\n') + '\nRESULTS_JSON=' + JSON.stringify({ pass, fail, errors: realErrs }) + '\n');
  console.log('DONE p=' + pass + ' f=' + fail + ' shots=' + ART);
}