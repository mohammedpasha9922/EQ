// PART 28 — اللغات 🌍 (i18n compliance + English-leakage guard)
// Real-Chrome behavioral test. Run:  node tests/part28_i18n.test.mjs
//
// Verifies Smart Documents is fully wired into the EXISTING EQ i18n system:
//   - Arabic UI: collect VISIBLE user-facing text from every Smart Documents
//     surface (home, scan, import, templates, editor, toolbar menus, pages,
//     signature, logo, table tools, save toast, review bar, PDF export dialog,
//     PDF result dialog, unsaved-changes dialog) from the LIVE DOM and FAIL on
//     unexpected untranslated English strings (behavioral, not grep).
//   - RTL/LTR follows the existing EQ system (html.dir).
//   - Other EQ languages (es/fr/ru/de/tr) must NOT show English fallback for
//     translated Smart Documents strings.
//   - Static key parity: every smart* i18n key present in `en` exists in all
//     other EQ languages inside app.js translations.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8328;

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
const OUT = path.join(ROOT, '__p28_result.txt');
try { fs.unlinkSync(OUT); } catch (e) {}
fs.appendFileSync(OUT, 'STARTED\n');
function check(name, ok, detail = '') {
  results.push({ name, ok });
  if (ok) passCount++; else failCount++;
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + String(detail).slice(0, 400) : ''}`;
  console.log(line);
  fs.appendFileSync(OUT, line + '\n');
}

// ---------- static key parity (app.js translations blocks) ----------
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
    const miss = Array.from(blocks.en).filter((k) => /^smart/i.test(k) && !blocks[l].has(k));
    if (miss.length) missing[l] = miss;
  }
  return { locales, missing };
}

// ---------- behavioral English-leak detector ----------
// Allowlisted tokens that legitimately stay Latin inside localized UI.
const ALLOW_TOKENS = new Set(['pdf', 'ocr', 'aa', 'eq', 'png', 'jpg', 'jpeg', 'id', 'ok', 'url', 'a4',
  // Font family proper nouns are brand names and stay Latin in every language.
  'arial', 'georgia', 'tahoma', 'verdana', 'times', 'new', 'roman', 'courier']);
// Whole strings that are pure font names (multi-word) are never leaks.
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
// Collect visible user-facing strings from the LIVE DOM of Smart Documents roots.
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

// SECTION A — static key parity across EQ languages
{
  const { locales, missing } = staticKeyParity();
  check('A1) app.js parsed with all EQ language blocks', locales.length >= 6, locales.join(','));
  check('A2) every smart* i18n key exists in all languages (no en-fallback by design)',
    Object.keys(missing).length === 0, JSON.stringify(missing));
}

// SECTION B — Arabic deep sweep (behavioral, live DOM)
{
  const page = await newPage();
  await openSmartDocs(page, 'ar');

  const dir1 = await page.evaluate(() => ({ dir: document.documentElement.dir, lang: document.documentElement.lang }));
  check('B1) Arabic: html dir=rtl via existing EQ system', dir1.dir === 'rtl' && dir1.lang === 'ar', JSON.stringify(dir1));

  reportLeaks('B2 Home', await page.evaluate(COLLECT_FN));

  // Templates view
  await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-templates"]').click());
  await sleep(400);
  reportLeaks('B3 Templates view', await page.evaluate(COLLECT_FN));
  await page.evaluate(() => document.getElementById('smartTemplatesBack').click());
  await sleep(300);

  // Import view
  await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-import-file"]').click());
  await sleep(400);
  reportLeaks('B4 Import view', await page.evaluate(COLLECT_FN));
  await page.evaluate(() => document.getElementById('smartImportBack').click());
  await sleep(300);

  // Scan view
  await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-scan-doc"]').click());
  await sleep(500);
  reportLeaks('B5 Scan view', await page.evaluate(COLLECT_FN));
  await page.evaluate(() => document.getElementById('smartScanBack').click());
  await sleep(300);

  // Blank editor + toolbar menus + pages controls
  await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-new-doc"]').click());
  await sleep(500);
  await page.evaluate(() => window.__smartBlank.insertElement('heading'));
  await page.evaluate(() => window.__smartBlank.insertElement('text'));
  await page.evaluate(() => window.__smartBlank.insertElement('table'));
  await sleep(300);
  reportLeaks('B6 Editor (heading/text/table)', await page.evaluate(COLLECT_FN));

  const tools = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-toolbar="blank-doc"] button[data-tool]')).map((b) => b.getAttribute('data-tool')));
  for (const tool of tools) {
    try {
      await page.evaluate((t) => {
        const b = document.querySelector(`[data-toolbar="blank-doc"] button[data-tool="${t}"]`);
        if (b) b.click();
      }, tool);
      await sleep(280);
      reportLeaks(`B7 toolbar menu [${tool}]`, await page.evaluate(COLLECT_FN));
      await page.keyboard.press('Escape');
      await sleep(150);
    } catch (e) { /* non-blocking */ }
  }

  // Pages controls labels
  await page.evaluate(() => window.__smartPages.add());
  await sleep(250);
  reportLeaks('B8 Page controls', await page.evaluate(COLLECT_FN));

  // Save toast
  await page.evaluate(() => document.getElementById('smartSaveDraftBtn').click());
  await sleep(600);
  reportLeaks('B9 Save toast/dialog', await page.evaluate(COLLECT_FN));

  // Review mode
  await page.evaluate(() => document.getElementById('smartReviewBtn').click());
  await sleep(400);
  const revDir = await page.evaluate(() => document.getElementById('smartBlankView').dir || document.documentElement.dir);
  check('B10 Review mode direction recorded', true, 'dir=' + revDir);
  reportLeaks('B11 Review mode', await page.evaluate(COLLECT_FN));
  await page.evaluate(() => document.getElementById('smartReviewExitBtn').click());
  await sleep(300);

  // PDF export dialog + result + toast
  await page.evaluate(() => window.__smartPdfExport.open());
  await sleep(300);
  reportLeaks('B12 PDF export dialog', await page.evaluate(COLLECT_FN));
  await page.click('#smartPdfConfirmBtn');
  await sleep(1800);
  reportLeaks('B13 PDF result dialog + toast', await page.evaluate(COLLECT_FN));
  const resDir = await page.evaluate(() => document.getElementById('smartPdfResultModal').dir || document.documentElement.dir);
  check('B14 PDF dialogs direction recorded', true, 'dir=' + resDir);
  try { await page.click('#smartPdfResultCloseBtn'); } catch (e) {}
  await sleep(300);

  // Unsaved-changes dialog
  await page.evaluate(() => window.__smartBlank.insertElement('text'));
  await sleep(200);
  await page.evaluate(() => document.getElementById('smartBlankBack').click());
  await sleep(400);
  reportLeaks('B15 Unsaved-changes dialog', await page.evaluate(COLLECT_FN));
  try { await page.click('#smartUnsavedCancelBtn'); } catch (e) {}

  // Filename fallback uses the CURRENT locale translation (PART 24 logic untouched):
  // Arabic UI must show the Arabic fallback name, never the English source string.
  const fname = await page.evaluate(() => {
    const inp = document.getElementById('smartPdfFilenameInput');
    return inp ? inp.value : null;
  });
  check('B16 PDF filename default is locale-translated (not English fallback)',
    typeof fname === 'string' && fname.length > 0 && fname !== 'New Document', String(fname));
  await page.close();
}

// SECTION C — other EQ languages must not show English fallback
{
  const page = await newPage();
  await openSmartDocs(page, null);
  for (const locale of ['en', 'es', 'fr', 'ru', 'de', 'tr']) {
    await setLang(page, locale);
    const dir = await page.evaluate(() => document.documentElement.dir);
    check(`C-${locale}) dir=ltr via existing EQ system`, dir === 'ltr', dir);
    const sample = await page.evaluate(() => ({
      title: (document.querySelector('[data-i18n="smartDocsHeading"]') || {}).textContent || '',
      scanDesc: (document.querySelector('[data-i18n="smartDocsCardScanDesc"]') || {}).textContent || ''
    }));
    if (locale === 'en') {
      check('C-en) English renders English source strings',
        sample.title === 'What would you like to do?', JSON.stringify(sample));
    } else {
      check(`C-${locale}) Smart Documents strings not left as English fallback`,
        sample.scanDesc.length > 0 && sample.scanDesc !== 'Choose a PDF or a supported file from your device.',
        JSON.stringify(sample));
    }
  }
  await page.close();
}

await browser.close();
server.close();
fs.appendFileSync(OUT, `TOTAL ${results.length}  PASS ${passCount}  FAIL ${failCount}\n`);
console.log(`TOTAL ${results.length}  PASS ${passCount}  FAIL ${failCount}`);
process.exit(failCount === 0 ? 0 : 1);
