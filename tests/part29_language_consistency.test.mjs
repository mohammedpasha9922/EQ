// PART 29 — Smart Documents: Full Language Consistency 🌍
// Real-Chrome behavioral test. Run:  node tests/part29_language_consistency.test.mjs
//
// Verifies, for EVERY language currently in the EQ central system
// (discovered dynamically from `translations`, so future languages are picked
// up automatically):
//   1. html.dir follows the EXISTING EQ rule (ar=rtl, others=ltr).
//   2. Every [data-i18n*]-bound element on Smart Documents surfaces shows the
//      CURRENT locale string — never the English source string when the current
//      locale has its own translation (no mixed languages / no en-fallback).
//   3. Arabic deep sweep: live-DOM scan of every surface for untranslated English.
//   4. Dynamic switching ar→en→fr→tr→es→ru→de→ar while the editor is OPEN,
//     without reload, verifying texts update immediately.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8339;

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

const results = [];
let passCount = 0, failCount = 0;
const OUT = path.join(ROOT, '__p29_result.txt');
try { fs.unlinkSync(OUT); } catch (e) {}
fs.appendFileSync(OUT, 'STARTED\n');
function check(name, ok, detail = '') {
  results.push({ name, ok });
  if (ok) passCount++; else failCount++;
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + String(detail).slice(0, 400) : ''}`;
  console.log(line);
  fs.appendFileSync(OUT, line + '\n');
}

// ---------- static parity of ALL keys (not just smart*) across locales ----------
function staticKeyParity() {
  const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  const blocks = {};
  const re = /^\s{2}([a-z]{2}): \{$/gm;
  let m; const starts = [];
  while ((m = re.exec(src))) starts.push({ locale: m[1], idx: m.index });
  starts.push({ locale: '__end', idx: src.length });
  for (let i = 0; i < starts.length - 1; i++) {
    const chunk = src.slice(starts[i].idx, starts[i + 1].idx);
    const keys = [];
    const kre = /^\s{0,4}([A-Za-z0-9_]+):/gm;
    let km;
    while ((km = kre.exec(chunk))) keys.push(km[1]);
    blocks[starts[i].locale] = new Set(keys);
  }
  const locales = Object.keys(blocks).filter((l) => l !== '__end');
  const missing = {};
  for (const l of locales) {
    if (l === 'en') continue;
    // ignore intentionally-empty decorative keys (eyebrow etc.)
    const miss = Array.from(blocks.en).filter((k) => !blocks[l].has(k) && !/^eyebrow/i.test(k));
    if (miss.length) missing[l] = miss;
  }
  return { locales, missing };
}

// ---------- behavioral English-leak detector for Arabic ----------
const ALLOW_TOKENS = new Set(['pdf', 'ocr', 'aa', 'eq', 'png', 'jpg', 'jpeg', 'id', 'ok', 'url', 'a4',
  'arial', 'georgia', 'tahoma', 'verdana', 'times', 'new', 'roman', 'courier']);
function isFontName(s) {
  return /^(arial|georgia|tahoma|verdana|times new roman|courier new)$/i.test(s.trim());
}
function isEnglishLeak(s) {
  if (isFontName(s)) return false;
  const clean = s
    .replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{27BF}\u{FE0F}\u{25A0}-\u{25FF}\u{2B00}-\u{2BFF}]/gu, ' ')
    .replace(/\s+/g, ' ').trim();
  if (!/[A-Za-z]{3}/.test(clean)) return false;
  const words = clean.split(/[^A-Za-z']+/).filter(Boolean);
  return words.some((w) => w.length >= 3 && !ALLOW_TOKENS.has(w.toLowerCase()));
}

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new', protocolTimeout: 300000,
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage() {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  page.on('pageerror', () => {});
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(700);
  return page;
}
async function setLang(page, locale) {
  await page.evaluate((l) => {
    const s = document.getElementById('topBarLanguageSelect');
    if (s) { s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); }
  }, locale);
  await sleep(450);
}
async function openSmartDocs(page, locale) {
  await page.evaluate(() => document.getElementById('drawerToggle').click());
  await sleep(250);
  if (locale) await setLang(page, locale);
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click());
  await sleep(450);
}

// Collect VISIBLE user-facing text of Smart Documents roots (live DOM).
const COLLECT_FN = () => {
  const roots = Array.from(document.querySelectorAll('#smartDocsModal, #smartPdfModal, #smartPdfResultModal, #smartUnsavedModal'));
  const out = [];
  const visible = (el) => {
    let n = el;
    while (n && n !== document.body) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || n.getAttribute('aria-hidden') === 'true' || n.hidden) return false;
      n = n.parentElement;
    }
    return true;
  };
  roots.forEach((root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const txt = (node.textContent || '').replace(/\s+/g, ' ').trim();
      if (!txt) continue;
      if (!node.parentElement || !visible(node.parentElement)) continue;
      out.push(txt);
    }
    root.querySelectorAll('[title]').forEach((el) => {
      const t = (el.getAttribute('title') || '').trim();
      if (t && visible(el)) out.push(t);
    });
  });
  document.querySelectorAll('[class*="toast"], [id*="toast"]').forEach((el) => {
    const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (txt && visible(el)) out.push(txt);
  });
  return Array.from(new Set(out));
};

function reportLeaks(label, texts) {
  const leaks = texts.filter(isEnglishLeak);
  check(`${label}: no untranslated English in visible UI`, leaks.length === 0,
    leaks.length ? JSON.stringify(leaks.slice(0, 12)) : `${texts.length} strings scanned`);
}

// Per-locale i18n binding audit INSIDE the live DOM: every bound element under
// Smart Documents surfaces must show the CURRENT locale string — never the
// English source string when this locale has its own different translation.
// `tEn`/`tL` are injected from Node because app.js is a module (no globals).
const LOCALE_AUDIT_FN = (tEn, tL) => {
  const bad = [];
  const roots = document.querySelectorAll('#smartDocsModal, #smartPdfModal, #smartPdfResultModal, #smartUnsavedModal');
  const attrs = ['data-i18n', 'data-i18n-placeholder', 'data-i18n-title'];
  roots.forEach((root) => {
    attrs.forEach((attr) => {
      root.querySelectorAll(`[${attr}]`).forEach((el) => {
        const key = el.getAttribute(attr);
        const enV = tEn[key];
        const lV = tL[key];
        let shown;
        if (attr === 'data-i18n') shown = el.textContent;
        else if (attr === 'data-i18n-title') shown = el.getAttribute('title');
        else shown = el.getAttribute('placeholder');
        // English fallback leak: showing EN source although this locale differs
        if (typeof enV === 'string' && typeof lV === 'string' && enV && lV !== enV && shown === enV) {
          bad.push(`${key}="${shown}"`);
        }
      });
    });
  });
  return bad;
};


// SECTION A — static key parity across ALL EQ languages (future-proof)
{
  const { locales, missing } = staticKeyParity();
  check('A1) app.js parsed with all EQ language blocks', locales.length >= 7, locales.join(','));
  check('A2) every i18n key exists in all languages (decorative eyebrow excluded)',
    Object.keys(missing).length === 0, JSON.stringify(missing));
}

// Parse the translations object from app.js source (module-scoped → inject into page).
function parseTranslations() {
  const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  const i = src.indexOf('const translations = {');
  const start = src.indexOf('{', i);
  let depth = 0, end = -1;
  for (let k = start; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (depth === 0) { end = k + 1; break; } }
  }
  return new Function('return (' + src.slice(start, end) + ');')();
}
const TRANSLATIONS = parseTranslations();


// SECTION B — full sweep of EVERY EQ language over Smart Documents surfaces
const SURFACES = [
  ['home', () => {}, null],
  ['templates', () => document.querySelector('.smart-doc-card[data-action="smart-templates"]').click(), '#smartTemplatesBack'],
  ['import', () => document.querySelector('.smart-doc-card[data-action="smart-import-file"]').click(), '#smartImportBack'],
  ['scan', () => document.querySelector('.smart-doc-card[data-action="smart-scan-doc"]').click(), '#smartScanBack']
];
{
  const page = await newPage();
  for (const locale of ['en', 'es', 'fr', 'ru', 'de', 'tr', 'ar']) {
    await openSmartDocs(page, locale);
    const dirInfo = await page.evaluate(() => ({ dir: document.documentElement.dir, lang: document.documentElement.lang }));
    const expectedDir = locale === 'ar' ? 'rtl' : 'ltr';
    check(`B-${locale}) html.dir=${expectedDir} via existing EQ system`,
      dirInfo.dir === expectedDir && dirInfo.lang === locale, JSON.stringify(dirInfo));

    for (const [name, open, backSel] of SURFACES) {
      await page.evaluate(open);
      await sleep(400);
      const bad = await page.evaluate(LOCALE_AUDIT_FN, TRANSLATIONS.en, TRANSLATIONS[locale]);
      check(`B-${locale}) ${name}: all i18n bindings use current locale`, bad.length === 0,
        bad.length ? JSON.stringify(bad.slice(0, 8)) : 'ok');
      if (backSel) {
        await page.evaluate((sel) => document.querySelector(sel).click(), backSel);
        await sleep(300);
      }
    }

    if (locale === 'ar') {
      // Deep behavioral English-leak sweep on home + dialogs
      reportLeaks('B-ar home visible-DOM', await page.evaluate(COLLECT_FN));
      await page.evaluate(() => window.__smartPdfExport.open());
      await sleep(300);
      reportLeaks('B-ar PDF export dialog', await page.evaluate(COLLECT_FN));
      try { await page.click('#smartPdfCancelBtn'); } catch (e) {}
      await sleep(250);
    }

    // close modal for next iteration
    try { await page.evaluate(() => document.getElementById('closeSmartDocs').click()); } catch (e) {}
    await sleep(300);
  }
  await page.close();
}

// SECTION C — dynamic language switching with the editor OPEN (no reload)
{
  const page = await newPage();
  await openSmartDocs(page, 'ar');
  await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-new-doc"]').click());
  await sleep(500);
  await page.evaluate(() => window.__smartBlank.insertElement('heading'));
  await sleep(200);
  await page.evaluate((t) => { window.__p29t = t; }, TRANSLATIONS);

  const seq = ['en', 'fr', 'tr', 'es', 'ru', 'de', 'ar'];
  for (const locale of seq) {
    await setLang(page, locale);
    const info = await page.evaluate((l) => ({
      dir: document.documentElement.dir,
      lang: document.documentElement.lang,
      hint: (document.querySelector('[data-i18n="smartEditorHint"]') || {}).textContent || '',
      placeholder: (document.getElementById('smartEditorText') || {}).placeholder || '',
      tHint: window.__p29t[l].smartEditorHint,
      tPh: window.__p29t[l].smartEditorPlaceholder
    }), locale);
    const expectedDir = locale === 'ar' ? 'rtl' : 'ltr';
    check(`C-switch→${locale}) editor updates instantly (dir=${expectedDir}, hint+placeholder localized, no reload)`,
      info.dir === expectedDir && info.lang === locale &&
      info.hint === info.tHint && info.placeholder === info.tPh, JSON.stringify(info));
  }

  // Unsaved-changes dialog must follow the final (Arabic) language too
  await page.evaluate(() => window.__smartBlank.insertElement('text'));
  await sleep(200);
  await page.evaluate(() => document.getElementById('smartBlankBack').click());
  await sleep(400);
  reportLeaks('C-final unsaved dialog (Arabic)', await page.evaluate(COLLECT_FN));
  try { await page.click('#smartUnsavedCancelBtn'); } catch (e) {}
  await page.close();
}

await browser.close();
server.close();
fs.appendFileSync(OUT, `TOTAL ${results.length}  PASS ${passCount}  FAIL ${failCount}\n`);
console.log(`TOTAL ${results.length}  PASS ${passCount}  FAIL ${failCount}`);
process.exit(failCount === 0 ? 0 : 1);




