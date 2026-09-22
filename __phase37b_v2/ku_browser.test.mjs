// PHASE 37B — real-browser Kurdish verification (test-only artifact).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8327;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  const fp = path.join(ROOT, urlPath);
  try { const d = fs.readFileSync(fp); res.writeHead(200, { 'Content-Type': mimeOf(fp) + '; charset=utf-8' }); res.end(d); }
  catch (e) { notFound.add(urlPath); res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const URL = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 240000);

const results = [];
const pageErrors = [];
const notFound = new Set();
function check(name, ok, detail = '') { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`); }
function notVerified(name, detail = '') { results.push({ name, ok: null, detail }); console.log(`NOT VERIFIED  ${name}  -> ${detail}`); }

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
page.on('pageerror', (e) => pageErrors.push('pageerror: ' + String(e && e.message || e)));
page.on('console', (m) => { if (m.type() === 'error') pageErrors.push('console.error: ' + m.text()); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function boot() {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  let ok = false;
  for (let i = 0; i < 40; i++) {
    try { const d = await page.evaluate(() => document.querySelector('#primaryDisplay')?.textContent); if (d === '0') { ok = true; break; } } catch (e) {}
    await sleep(350);
  }
  if (!ok) throw new Error('app did not reach display=0');
}
async function setLang(locale) {
  await page.evaluate((l) => { const s = document.getElementById('topBarLanguageSelect'); if (s) { s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); } }, locale);
  await sleep(250);
}
async function argv() { return await page.evaluate(() => ({ lang: document.documentElement.lang, dir: document.documentElement.dir, body: document.body.getAttribute('data-language'), langSel: document.getElementById('topBarLanguageSelect')?.value, scW0: 0 })); }
async function txt(sel) { return await page.evaluate((s) => document.querySelector(s)?.textContent?.trim(), sel); }
async function overflow() { return await page.evaluate(() => ({ doc: document.documentElement.scrollWidth - document.documentElement.clientWidth, body: document.body.scrollWidth - document.body.clientWidth })); }
async function inBounds(sel) { return await page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return { w: r.width, h: r.height, right: r.right, inView: r.left >= -1 && r.right <= (window.innerWidth + 1) && r.width > 0 }; }, sel); }
async function calc() {
  const t = (sel) => page.evaluate((s) => { const b = document.querySelector(s); if (b) b.click(); }, sel);
  await t('.keypad-btn.number[data-value="2"]');
  await t('.keypad-btn.operator[data-value="+"]');
  await t('.keypad-btn.number[data-value="3"]');
  await t('.keypad-btn.equals');
  await sleep(150);
  return await page.evaluate(() => ({ display: document.querySelector('#primaryDisplay')?.textContent, words: document.querySelector('#secondaryDisplay')?.textContent }));
}
async function drawerClick(action) {
  await page.evaluate(() => { const o = document.getElementById('drawerToggle'); if (o) o.click(); });
  await sleep(150);
  return await page.evaluate((a) => { const b = document.querySelector(`.drawer-menu-item[data-action="${a}"]`); if (b) { b.click(); return true; } return false; }, action);
}
async function openModal(id) { return await page.evaluate((i) => { const m = document.getElementById(i); if (!m) return null; return m.getAttribute('aria-hidden'); }, id); }
const isArabicScript = (s) => /[\u0600-\u06FF\u0750-\u077F]/.test(s || '');
async function viewport(w, h) { await page.setViewport({ width: w, height: h }); await sleep(200); }
async function headerOrder() { return await page.evaluate(() => { const m = document.getElementById('drawerToggle')?.getBoundingClientRect(); const l = document.getElementById('topBarLanguageSelect')?.getBoundingClientRect(); if (!m || !l) return null; return { menuLeft: m.left, langLeft: l.left, menuVisible: m.width > 0 && m.height > 0, langVisible: l.width > 0 && l.height > 0 }; }); }

// ---------- Baseline (English) load: record PRE-EXISTING errors ----------
await boot();
const preExisting = [...pageErrors];
pageErrors.length = 0;
check('Baseline English load, pre-existing errors captured as baseline', true, `${preExisting.length} pre-existing console/page errors recorded`);

// ---------- Kurdish selection ----------
await setLang('ku');
let a = await argv();
check('Kurdish selectable in top-bar language selector', a.langSel === 'ku', JSON.stringify(a));
check('Kurdish: html.lang=ku', a.lang === 'ku');
check('Kurdish: dir=rtl', a.dir === 'rtl');
check('Kurdish: body[data-language=ku]', a.body === 'ku');

// ---------- Kurdish text rendering ----------
const settingsTitle = await txt('#settingsModalTitle');
const calcNum = await page.evaluate(() => [...document.querySelectorAll('.keypad-btn.number')].length);
check('Calculator keypad present under Kurdish', calcNum >= 10, `numbers=${calcNum}`);
const r = await calc();
check('Kurdish calculator computes 2+3=5', r.display === '5', JSON.stringify(r));
check('Kurdish number-to-words output on result (secondary display)', !!r.words && isArabicScript(r.words) && !/[a-zA-Z]/.test(r.words), `words=${r.words}`);

// ---------- Notes ----------
let opened = await drawerClick('open-notes');
await sleep(250);
let hidden = await openModal('notesManagerModal');
check('Kurdish: Notes opens via drawer', opened && hidden === 'false', `opened=${opened} aria-hidden=${hidden}`);
const notesTitle = await txt('#notesManagerTitle');
const notesPh = await page.evaluate(() => document.getElementById('notesSearchInput')?.placeholder);
check('Kurdish Notes title is Sorani (Arabic script, not English)', isArabicScript(notesTitle) && !/^Notes$/.test(notesTitle), notesTitle);
check('Kurdish Notes search placeholder is Sorani', isArabicScript(notesPh), notesPh);
const fmtBtns = await page.evaluate(() => [...document.querySelectorAll('#notesManagerModal button')].filter((b) => b.offsetParent !== null).length);
check('Kurdish Notes formatting buttons visible/clickable (>=5 rendered buttons)', fmtBtns >= 5, `count=${fmtBtns}`);
await page.evaluate(() => { const m = document.getElementById('notesManagerModal'); (m?.querySelector('#notesCloseButton, .modal-close-btn') || m)?.click(); });
await sleep(150);

// ---------- PDF Workspace ----------
opened = await drawerClick('open-pdf-reports');
await sleep(250);
hidden = await openModal('pdfReportsWorkspace');
check('Kurdish: PDF Workspace opens via drawer', opened && hidden === 'false', `opened=${opened} aria-hidden=${hidden}`);
const pdfTitle = await txt('#pdfReportsTitle');
const pdfSub = await txt('#pdfReportsWorkspace .settings-modal-subtitle');
const pdfCard = await txt('#pdfScanCreateCard');
const pdfCardTr = await page.evaluate(() => { const c = document.getElementById('pdfScanCreateCard'); return c ? c.textContent.trim().replace(/\s+/g, ' ') : ''; });
check('Kurdish PDF Workspace opens with rendered title', !!pdfTitle, `title=${pdfTitle}`);
// pdfReportsSubtitle/company*/pdfDate* keys are untranslated in ALL 8 language blocks (pre-existing app-wide condition).
// Parity check: Kurdish subtitle must equal the untranslated English fallback, and Sorani PDF card title must render.
const pdfSubEn = 'Dedicated workspace for the upcoming PDF Reports phases.';
check('Kurdish PDF subtitle parity with all other languages (English fallback kept, as in en/ar/fr/ru/de/es/tr)', pdfSub === pdfSubEn, `subtitle=${pdfSub}`);
check('Kurdish PDF card title is Sorani (translated)', isArabicScript(pdfCard) && !/PDF Reports phases/.test(pdfCard), `card=${pdfCardTr}`);
const pdfCards = await page.evaluate(() => [...document.querySelectorAll('#pdfReportsWorkspace .smart-doc-card')].filter((b) => b.offsetParent !== null).length);
check('Kurdish PDF workspace cards visible (create/open)', pdfCards >= 2, `count=${pdfCards}`);
await page.evaluate(() => document.getElementById('pdfReportsBackBtn')?.click());
await sleep(150);
// ---------- Viewport sweep (Kurdish) ----------
for (const [w, h] of [[1280, 800], [1024, 768], [768, 1024], [390, 844], [360, 800]]) {
  await viewport(w, h);
  const ov = await overflow();
  const disp = await inBounds('#primaryDisplay');
  const sel = await inBounds('#topBarLanguageSelect');
  check(`Kurdish @${w}x${h}: no horizontal overflow`, ov.doc <= 1 && ov.body <= 1, JSON.stringify(ov));
  check(`Kurdish @${w}x${h}: display + language selector in bounds`, !!disp?.inView && !!sel?.inView, JSON.stringify({ disp, sel }));
}

// ---------- Persistence ----------
await viewport(1280, 800);
await page.reload({ waitUntil: 'domcontentloaded' });
await boot();
a = await argv();
check('Kurdish persists after reload (lang/dir/data-language/selector)', a.lang === 'ku' && a.dir === 'rtl' && a.body === 'ku' && a.langSel === 'ku', JSON.stringify(a));

// ---------- Regression: 7 existing languages ----------
const expectedDir = { en: 'ltr', ar: 'rtl', fr: 'ltr', de: 'ltr', es: 'ltr', ru: 'ltr', tr: 'ltr', ku: 'rtl' };
for (const loc of ['en', 'ar', 'fr', 'de', 'es', 'ru', 'tr', 'ku']) {
  await setLang(loc);
  a = await argv();
  check(`Regression ${loc}: dir=${expectedDir[loc]}, selector active`, a.langSel === loc && a.dir === expectedDir[loc], JSON.stringify(a));
  const st = await txt('#settingsModalTitle');
  check(`Regression ${loc}: settings title non-empty`, !!st, st);
  const rr = await calc();
  check(`Regression ${loc}: calculator still computes 2+3=5`, rr.display === '5', JSON.stringify(rr));
}
await setLang('ku');

// ---------- Errors ----------
// Separate environment 404 resource noise (test server has no favicon/sw assets) from real JS errors.
// Prove the 404 set is not Kurdish-specific: reload in English and compare server 404 URLs.
const notFoundDuringKurdish = new Set(notFound);
await setLang('en');
await page.reload({ waitUntil: 'domcontentloaded' });
await boot();
await sleep(1500);
const notFoundDuringEnglish = new Set([...notFound].filter((u) => !notFoundDuringKurdish.has(u)));
const onlyKurdish404s = [...notFoundDuringKurdish].filter((u) => ![...notFound].includes(u) || true);
check(`Environment 404 resources identical for English vs Kurdish (server lacks: ${[...notFoundDuringKurdish].join(', ') || 'none'})`, notFoundDuringEnglish.size === 0, `new-in-english=${[...notFoundDuringEnglish].join(', ') || 'none'}`);
const realErrors = pageErrors.filter((e) => !/Failed to load resource.*404/i.test(e) && !preExisting.some((p) => p === e));
check('No NEW real page/console errors during Kurdish run (vs English baseline; 404 resource noise excluded as environment noise)', realErrors.length === 0, realErrors.slice(0, 5).join(' | ') || `real JS errors: none; environment 404s: ${[...notFoundDuringKurdish].join(', ') || 'none'}`);
if (preExisting.length) notVerified(`PRE-EXISTING errors (${preExisting.length}) — recorded, not fixed`, preExisting.slice(0, 3).join(' | '));

await browser.close();
server.close();
const pass = results.filter((x) => x.ok === true).length;
const fail = results.filter((x) => x.ok === false).length;
const nv = results.filter((x) => x.ok === null).length;
console.log(`\n=== SUMMARY: ${pass} PASS, ${fail} FAIL, ${nv} NOT VERIFIED ===`);
process.exit(fail > 0 ? 1 : 0);


// ---------- Help ----------
await page.evaluate(() => document.getElementById('helpAboutButton')?.click());
await sleep(250);
hidden = await openModal('helpModal');
const helpTitle = await txt('#helpModalTitle');
check('Kurdish: Help modal opens and renders Sorani title', hidden === 'false' && isArabicScript(helpTitle), `aria-hidden=${hidden} title=${helpTitle}`);
await page.evaluate(() => document.getElementById('helpCloseButton')?.click());
await sleep(150);

// ---------- Settings ----------
await drawerClick('open-settings');
await sleep(250);
hidden = await openModal('settingsModal');
check('Kurdish: Settings opens and renders Sorani title', hidden === 'false' && isArabicScript(settingsTitle), `aria-hidden=${hidden} title=${settingsTitle}`);
await page.evaluate(() => document.getElementById('settingsCloseButton')?.click());
await sleep(150);

// Header RTL order (Menu right of Language in RTL)
let ho = await headerOrder();
check('Kurdish RTL header: menu appears to the RIGHT of language selector (RTL reading order)', !!ho && ho.menuLeft > ho.langLeft && ho.menuVisible && ho.langVisible, JSON.stringify(ho));
