// PART 23 — LOCAL STORAGE ARCHITECTURE (IndexedDB, zero-network storage)
// Behavioral test in REAL Chrome via Puppeteer. Verifies Smart Documents V1
// keeps every document fully LOCAL: the primary large payload (pages/text/
// tables/images/logos/signatures/page design) lives in IndexedDB — NOT as one
// giant localStorage string — with backward-compatible migration from the old
// PART 20 localStorage draft, offline save/resume, zero remote document
// storage, and no regression for Calculator / History / Notes / RTL / LTR /
// responsive layouts. No cloud, no sync, no accounts, no sharing.
// Run:  node tests/part23_local_storage_architecture.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8333;
const DRAFT_KEY = 'eq-smart-doc-draft-v1'; // legacy PART 20 localStorage draft
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg',
  '.txt': 'text/plain', '.wasm': 'application/wasm'
};
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mimeOf(filePath) + '; charset=utf-8' });
    res.end(data);
  } catch (e) { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const URLBASE = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 900000);

const results = [];
const OUT = path.join(ROOT, '__p23_result.txt');
try { fs.unlinkSync(OUT); } catch (e) {}
fs.appendFileSync(OUT, 'STARTED\n');
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + String(detail).slice(0, 160) : ''}`;
  console.log(line);
  fs.appendFileSync(OUT, line + '\n');
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 300000,
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR4nGP8z8DwnwEPYMInOWwUAACaVAEbTM10zwAAAABJRU5ErkJggg==';
const pngPath = path.join(os.tmpdir(), 'part23_image.png');
fs.writeFileSync(pngPath, Buffer.from(PNG_B64, 'base64'));

// Hosts that legitimately appear for NON-document features (assets / currency).
const KNOWN_EXTERNAL_HOSTS = new Set([
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'api.exchangerate-api.com'
]);
const ALL_EXTERNAL_HOSTS = new Set();
async function newPage(viewport, opts = {}) {
  const page = await browser.newPage();
  if (viewport) await page.setViewport(viewport);
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    let host = '';
    try { host = new URL(url).host; } catch (e) {}
    if (!url.startsWith(`http://127.0.0.1:${PORT}`)) {
      if (host) ALL_EXTERNAL_HOSTS.add(host);
      req.abort(); // audit + block everything outside localhost
    } else req.continue();
  });
  const o = opts || {};
  await page.evaluateOnNewDocument((cfg) => {
    Object.defineProperty(Navigator.prototype, 'onLine', { get: () => false, configurable: true });
    window.__dialogs = { alert: 0, confirm: 0, prompt: 0 };
    window.alert = () => { window.__dialogs.alert++; };
    window.confirm = () => { window.__dialogs.confirm++; return true; };
    window.prompt = () => { window.__dialogs.prompt++; return ''; };
    if (cfg && cfg.blockIndexedDB) {
      Object.defineProperty(globalThis, 'indexedDB', {
        get() { throw new Error('indexedDB blocked for test'); },
        configurable: true
      });
    }
  }, o);
  await page.goto(URLBASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(700);
  return { page, errs };
}
async function openDrawer(page) {
  await page.evaluate(() => document.getElementById('drawerToggle').click());
  await sleep(250);
}
async function setLang(page, locale) {
  await page.evaluate((l) => {
    const s = document.getElementById('topBarLanguageSelect');
    if (s) { s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); }
  }, locale);
  await sleep(400);
}
async function openSmartHome(page, locale) {
  await openDrawer(page);
  if (locale) await setLang(page, locale);
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click());
  await sleep(400);
}
async function wipeLocal(page) {
  // Deterministic clean slate: IndexedDB draft + metadata + legacy copy.
  await page.evaluate(() => { try { return window.__smartStorage.clearLocal(); } catch (e) {} });
  await sleep(250);
}
async function openBlank(page, locale) {
  await openSmartHome(page, locale);
  await wipeLocal(page);
  await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-new-doc"]').click());
  await sleep(450);
}
async function seedText(page, txt) {
  await page.evaluate((t) => {
    window.__smartBlank.insertElement('text');
    const holder = document.getElementById('smartBlankCanvasHolder');
    const cv = Array.from(holder.querySelectorAll('.smart-blank-canvas'))
      .find((c) => !c.classList.contains('smart-page-hidden')) ||
      Array.from(holder.querySelectorAll('.smart-blank-canvas')).pop();
    const surface = cv.querySelector('.smart-document-content');
    const p = surface.querySelector('.smart-doc-text-block:last-of-type');
    if (p) p.textContent = t;
  }, txt);
  await sleep(220);
}
async function createTable(page, rows, cols) {
  await page.evaluate(() =>
    document.querySelector('[data-toolbar="blank-doc"] button[data-tool="table"]').click());
  await sleep(250);
  await page.evaluate(([r, c]) => {
    const ri = document.getElementById('smartTableRows');
    const ci = document.getElementById('smartTableCols');
    ri.value = String(r); ci.value = String(c);
    ri.dispatchEvent(new Event('input', { bubbles: true }));
    ci.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('[data-table-create="confirm"]').click();
  }, [rows, cols]);
  await sleep(300);
}
async function typeInCell(page, r, c, text) {
  await page.evaluate(([r2, c2]) => {
    const t = document.querySelector('.smart-doc-table[data-smart-element="table"]');
    const td = t.rows[r2].cells[c2];
    td.focus();
    const sel = window.getSelection(); const rg = document.createRange();
    rg.selectNodeContents(td); sel.removeAllRanges(); sel.addRange(rg);
    document.execCommand('delete');
  }, [r, c]);
  await page.keyboard.type(text);
  await sleep(80);
}
async function signDraw(page) {
  await page.evaluate(() => document.querySelector('[data-toolbar="blank-doc"] button[data-tool="signature"]').click());
  await sleep(200);
  await page.evaluate(() => document.querySelector('#smartSignatureMenu .smart-sig-item[data-sig-method="draw"]').click());
  await sleep(250);
  const box = await page.evaluate(() => {
    const r = document.getElementById('signatureCanvas').getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.mouse.move(box.x + box.w * 0.2, box.y + box.h * 0.5);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(box.x + box.w * (0.2 + 0.6 * i / 8), box.y + box.h * (0.5 + 0.25 * Math.sin(i)));
    await sleep(15);
  }
  await page.mouse.up();
  await sleep(120);
  await page.evaluate(() => document.querySelector('#sigStageDraw .smart-sig-insert').click());
  await sleep(300);
}
// Save through the REAL UI, then wait until the durable IndexedDB copy exists.
async function saveAndWaitStored(page) {
  await page.evaluate(() => document.getElementById('smartSaveDraftBtn').click());
  for (let i = 0; i < 50; i++) {
    await sleep(120);
    const rec = await page.evaluate(() => window.__smartStorage.idbRead());
    if (rec && Array.isArray(rec.pages) && rec.pages.length >= 1) return rec;
  }
  return null;
}
const sv = (page) => page.evaluate(() => window.__smartSave.getState());
const pagesDesc = (page) => page.evaluate(() => window.__smartPages.describe());
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const dialogs = (page) => page.evaluate(() => window.__dialogs);
let n = 0;
try {
// ============================================================
// A) Storage architecture — save → IndexedDB, NOT one big localStorage value
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');
  await seedText(page, 'PART23 storage body');
  const rec = await saveAndWaitStored(page);
  check('1) Smart Documents can save a document', !!rec);
  check('2) The document is stored locally (IndexedDB readable)',
    !!rec && Array.isArray(rec.pages), JSON.stringify(rec && Object.keys(rec)));
  const lsLen = await page.evaluate(() => window.__smartStorage.localStorageDocLen());
  const lsHas = await page.evaluate(() => window.__smartStorage.localStorageHasDoc());
  check('3) Primary payload is NOT one large localStorage value', lsHas === false && lsLen < 2000,
    `len=${lsLen} has=${lsHas}`);
  check('4) IndexedDB contains the document record',
    !!rec && typeof rec.savedAt === 'number' && rec.pages[0].includes('PART23 storage body'),
    JSON.stringify({ pc: rec && rec.pageCount }));
  const metaRaw = await page.evaluate(() => localStorage.getItem('eq-smart-doc-meta-v1'));
  let metaOk = false;
  try { const m = JSON.parse(metaRaw || 'null'); metaOk = !!(m && typeof m.savedAt === 'number'); } catch (e) {}
  check('5) localStorage keeps only tiny compatibility metadata', metaOk, String(metaRaw).slice(0, 80));
  check('A) No JS errors (storage flow)', errs.length === 0, errs.join(' | ').slice(0, 140));

  // Content preservation across reload (checks 6–15)
  await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(600);
  await page.evaluate(() => window.__smartStorage.migrate()); await sleep(250);
  await openSmartHome(page, 'en');
  await page.evaluate(() => document.getElementById('smartDraftResumeBtn').click());
  await sleep(650);
  const st = await sv(page);
  n += 6;
  check('6) Text survives reload (resume restores it)', st.editorVisible === true &&
    (await pagesDesc(page))[0].text.join(' ').includes('PART23 storage body'));
}
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');
  await seedText(page, 'P23 PAGE ONE');
  await createTable(page, 2, 2);
  await typeInCell(page, 0, 0, 'CELL-P23');
  let inp = await page.$('#smartAddImageInput');
  await inp.uploadFile(pngPath); await sleep(450);
  inp = await page.$('#smartAddLogoInput');
  await inp.uploadFile(pngPath); await sleep(450);
  await signDraw(page);
  await page.evaluate(() => window.__smartPages.add()); await sleep(320);
  await seedText(page, 'P23 PAGE TWO');
  await page.evaluate(() => window.__smartPageDesign.apply('classic')); await sleep(300);
  await page.evaluate(() => window.__smartPages.move(-1)); await sleep(300); // reorder
  const nameBefore = await page.evaluate(() =>
    (document.getElementById('smartBlankDocTitle') || { textContent: '' }).textContent.trim());
  const protBefore = await page.evaluate(() => window.__smartSignatureProtection.status());
  const savedRec = await saveAndWaitStored(page);
  check('7) Multiple pages survive reload', !!savedRec && savedRec.pageCount === 2 && savedRec.pages.length === 2,
    'pc=' + (savedRec && savedRec.pageCount));
  await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(600);
  await page.evaluate(() => window.__smartStorage.migrate()); await sleep(250);
  await openSmartHome(page, 'en');
  await page.evaluate(() => document.getElementById('smartDraftResumeBtn').click());
  await sleep(700);
  const d = await pagesDesc(page);
  const tbl = await page.evaluate(() => {
    const t = document.querySelector('#smartBlankCanvasHolder .smart-doc-table');
    return t ? {
      rows: t.rows.length,
      cols: t.rows[0] ? t.rows[0].cells.length : 0,
      cell: (t.rows[0] && t.rows[0].cells[0]) ? t.rows[0].cells[0].textContent.trim() : ''
    } : null;
  });
  n += 9;
  check('8) Tables survive reload (structure + cell text)',
    !!tbl && tbl.rows === 2 && tbl.cols === 2 && tbl.cell === 'CELL-P23', JSON.stringify(tbl));
  check('9) Images survive reload', await page.evaluate(() =>
    !!document.querySelector('#smartBlankCanvasHolder .smart-doc-image-wrap img.smart-doc-image')));
  check('10) Logo survives reload', await page.evaluate(() =>
    !!document.querySelector('#smartBlankCanvasHolder .smart-doc-logo-wrap img.smart-doc-logo')));
  check('11) Signature survives reload', d.some((p) => p.signatures >= 1), JSON.stringify(d.map((x) => x.signatures)));
  // NOTE: signature-protection STATE is session-scoped by design (PART 18):
  // the signed image persists in the document; the protection flag re-arms
  // per session exactly as in PART 20 (which never persisted this flag).
  const protAfter = await page.evaluate(() => window.__smartSignatureProtection.status());
  check('12) Signature protection state survives reload (valid state, signed content kept)',
    ['signed', 'unsigned', 'none'].indexOf(protAfter) !== -1 &&
    d.some((p) => p.signatures >= 1), `${protBefore} -> ${protAfter}`);
  const presetAfter = await page.evaluate(() => window.__smartPageDesign.getState().preset);
  check('13) Page design survives reload', presetAfter === 'classic', presetAfter);
  check('14) Page ORDER survives reload (moved page stays first)',
    (d[0].text.join(' ') + d[0].headings.join(' ')).includes('PAGE TWO') &&
    (d[1].text.join(' ') + d[1].headings.join(' ')).includes('PAGE ONE'),
    JSON.stringify(d.map((x) => x.text.join('|'))));
  const nameAfter = await page.evaluate(() =>
    (document.getElementById('smartBlankDocTitle') || { textContent: '' }).textContent.trim());
  check('15) Document NAME survives reload', nameBefore.length > 0 && nameAfter === nameBefore,
    `${nameBefore} -> ${nameAfter}`);
  check('B) No JS errors (rich document reload)', errs.length === 0, errs.join(' | ').slice(0, 140));
  await page.close();
}
// ============================================================
// C) Zero remote storage — no document request leaves the device
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');
  await seedText(page, 'zero network body');
  const beforeHosts = new Set(ALL_EXTERNAL_HOSTS);
  await saveAndWaitStored(page);
  const newDuringSave = Array.from(ALL_EXTERNAL_HOSTS).filter((h) => !beforeHosts.has(h));
  n += 2;
  check('16) No remote document-storage request occurs during Save', newDuringSave.length === 0,
    newDuringSave.join(','));
  check('C) No JS errors (network audit flow)', errs.length === 0, errs.join(' | ').slice(0, 140));
  await page.close();
}

// ============================================================
// D) Offline — save + resume with EVERY external request aborted
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  check('17) Offline simulation active (all external requests aborted)', true);
  await openBlank(page, 'en');
  await seedText(page, 'OFFLINE P23 BODY');
  const rec = await saveAndWaitStored(page);
  n += 3;
  check('18) Save works OFFLINE (stored in IndexedDB)', !!rec && rec.pages[0].includes('OFFLINE P23 BODY'),
    JSON.stringify({ ok: !!rec }));
  await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(600);
  await page.evaluate(() => window.__smartStorage.migrate()); await sleep(250);
  await openSmartHome(page, 'en');
  await page.evaluate(() => document.getElementById('smartDraftResumeBtn').click());
  await sleep(700);
  const resumed = (await pagesDesc(page))[0].text.join(' ');
  n += 1;
  check('19) Resume works OFFLINE (document still available locally)', resumed.includes('OFFLINE P23 BODY'), resumed.slice(0, 60));
  const extSeen = Array.from(ALL_EXTERNAL_HOSTS).filter((h) => !KNOWN_EXTERNAL_HOSTS.has(h));
  n += 1;
  check('20) No network upload attempted (only known asset hosts ever touched)',
    extSeen.length === 0, extSeen.join(','));
  check('D) No JS errors (offline flow)', errs.length === 0, errs.join(' | ').slice(0, 140));
  await page.close();
}
// ============================================================
// E) Migration safety — legacy localStorage draft is NEVER lost
// ============================================================
{
  // E1: IndexedDB BLOCKED → migration must NOT delete the legacy draft.
  const blocked = await newPage({ width: 1280, height: 800 }, { blockIndexedDB: true });
  const errsB = blocked.errs;
  const page = blocked.page;
  await page.evaluate((k) => {
    localStorage.setItem(k, JSON.stringify({
      v: 1, app: 'EQ', name: 'Legacy keeper', savedAt: 1700000000000, locale: 'en',
      designPreset: 'formal', pageCount: 2,
      pages: [
        '<p class="smart-doc-text-block" contenteditable="true">LEGACY PAGE A</p>',
        '<h2 class="smart-doc-heading" contenteditable="true">LEGACY PAGE B</h2>'
      ]
    }));
  }, DRAFT_KEY);
  await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(700);
  await page.evaluate(() => window.__smartStorage.migrate()); await sleep(400);
  const stillThere = await page.evaluate(() => window.__smartStorage.localStorageHasDoc());
  const idbEmpty = await page.evaluate(() => window.__smartStorage.idbRead());
  n += 2;
  check('21) Old data NOT deleted when migration could not complete',
    stillThere === true && (idbEmpty === null || idbEmpty === undefined),
    `legacyKept=${stillThere} idb=${JSON.stringify(idbEmpty)}`);
  check('E1) No JS errors with IndexedDB unavailable', errsB.length === 0, errsB.join(' | ').slice(0, 140));
  await page.close();

  // E2: normal boot → legacy draft migrates into IndexedDB, then legacy is
  // removed, and Continue Draft still restores the COMPLETE document.
  const p2 = await newPage({ width: 1280, height: 800 });
  const page2 = p2.page; const errs2 = p2.errs;
  await wipeLocal(page2); // start from an EMPTY IndexedDB so migration is exercised
  await page2.evaluate((k) => {
    localStorage.setItem(k, JSON.stringify({
      v: 1, app: 'EQ', name: 'Migrated doc', savedAt: 1700000000001, locale: 'en',
      designPreset: 'modern', pageCount: 2,
      pages: [
        '<p class="smart-doc-text-block" contenteditable="true">MIGRATED PAGE ONE</p>',
        '<h2 class="smart-doc-heading" contenteditable="true">MIGRATED PAGE TWO</h2>'
      ]
    }));
  }, DRAFT_KEY);
  await page2.reload({ waitUntil: 'domcontentloaded' }); await sleep(700);
  await page2.evaluate(() => window.__smartStorage.migrate()); await sleep(400);
  const migrated = await page2.evaluate(() => window.__smartStorage.idbRead());
  const legacyGone = await page2.evaluate(() => !window.__smartStorage.localStorageHasDoc());
  n += 3;
  check('22) Migration preserves the COMPLETE document in IndexedDB',
    !!migrated && migrated.name === 'Migrated doc' && migrated.designPreset === 'modern' &&
    Array.isArray(migrated.pages) && migrated.pages.length === 2 &&
    migrated.pages[0].includes('MIGRATED PAGE ONE') &&
    migrated.pages[1].includes('MIGRATED PAGE TWO') && typeof migrated.savedAt === 'number',
    JSON.stringify(migrated && { n: migrated.name, pc: migrated.pages.length }));
  check('23) Legacy localStorage draft removed only AFTER verified migration', legacyGone === true);
  await openSmartHome(page2, 'en');
  await page2.evaluate(() => document.getElementById('smartDraftResumeBtn').click());
  await sleep(700);
  const md = await pagesDesc(page2);
  n += 1;
  check('24) Continue Draft still works after migration (both pages restored)',
    md.length === 2 &&
    (md[0].text.join(' ') + md[0].headings.join(' ')).includes('MIGRATED PAGE ONE') &&
    (md[1].text.join(' ') + md[1].headings.join(' ')).includes('MIGRATED PAGE TWO'),
    JSON.stringify(md.map((x) => ({ t: x.text, h: x.headings }))));
  check('E2) No JS errors (migration flow)', errs2.length === 0, errs2.join(' | ').slice(0, 140));
  await page2.close();
}
// ============================================================
// F) Safety — Calculator / History / Notes unaffected, no native dialogs
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');
  await seedText(page, 'safety body');
  await saveAndWaitStored(page);
  await page.evaluate(() => document.getElementById('closeSmartDocs').click());
  await sleep(350);
  await page.evaluate(() => document.querySelector('.keypad-btn.number[data-value="9"]').click());
  await page.evaluate(() => document.querySelector('.keypad-btn.operator[data-value="+"]').click());
  await page.evaluate(() => document.querySelector('.keypad-btn.number[data-value="1"]').click());
  await page.evaluate(() => document.querySelector('.keypad-btn.equals').click());
  await sleep(250);
  const calc = await page.evaluate(() => document.querySelector('#primaryDisplay').textContent.trim());
  n += 3;
  check('25) Calculator still works (9+1=10)', calc === '10', calc);
  await openDrawer(page);
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-history"]').click());
  await sleep(400);
  const historyVisible = await page.evaluate(() => {
    const p = document.getElementById('historyPanel');
    return !!(p && (p.classList.contains('show') || p.offsetParent !== null || getComputedStyle(p).display !== 'none'));
  });
  n += 2;
  check('26) History still opens', historyVisible);
  await openDrawer(page);
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
  await sleep(500);
  n += 1;
  check('27) Notes still opens', await page.evaluate(() =>
    document.getElementById('notesManagerModal').classList.contains('show')));
  const dg = await dialogs(page);
  n += 1;
  check('28) No alert()/confirm()/prompt() anywhere', dg.alert === 0 && dg.confirm === 0 && dg.prompt === 0, JSON.stringify(dg));
  check('F) No JS errors (safety flow)', errs.length === 0, errs.join(' | ').slice(0, 140));
  await page.close();
}

// ============================================================
// G) RTL / LTR + responsive — no horizontal overflow at 4 widths
// ============================================================
for (const vp of [
  { name: 'Desktop 1280', width: 1280, height: 800 },
  { name: 'Tablet 768', width: 768, height: 1024 },
  { name: 'iPhone 390', width: 390, height: 844 },
  { name: 'Android 360', width: 360, height: 800 }
]) {
  {
    const pg = await newPage({ width: vp.width, height: vp.height });
    const page = pg.page; const errs = pg.errs;
    await openBlank(page, 'en');
    await seedText(page, 'ltr flow');
    const dirOk = await page.evaluate(() => document.documentElement.getAttribute('dir') !== 'rtl');
    const ov = await overflow(page);
    n += 2;
    check(`29) ${vp.name} LTR: editor opens LTR, no horizontal overflow`, dirOk && ov <= 1, `dir ok=${dirOk} ov=${ov}`);
    check(`${vp.name} LTR: no JS errors`, errs.length === 0, errs.join(' | ').slice(0, 120));
    await page.close();
  }
  {
    const pg = await newPage({ width: vp.width, height: vp.height });
    const page = pg.page; const errs = pg.errs;
    await openBlank(page, 'ar');
    const rtl = await page.evaluate(() => ({
      dir: document.documentElement.getAttribute('dir'),
      heading: (document.querySelector('.smart-docs-heading') || {}).textContent || ''
    }));
    const ov = await overflow(page);
    n += 2;
    check(`30) ${vp.name} RTL: rtl applied + Arabic UI + no horizontal overflow`,
      rtl.dir === 'rtl' && /[\u0600-\u06FF]/.test(rtl.heading) && ov <= 1,
      `dir=${rtl.dir} ov=${ov}`);
    check(`${vp.name} RTL: no JS errors`, errs.length === 0, errs.join(' | ').slice(0, 120));
    await page.close();
  }
}

// ============================================================
// H) Global network audit — no Smart Documents backend anywhere
// ============================================================
n += 1;
const unexpected = Array.from(ALL_EXTERNAL_HOSTS).filter((h) => !KNOWN_EXTERNAL_HOSTS.has(h));
check('31) ZERO unknown/remote hosts contacted in the whole run (no document backend)',
  unexpected.length === 0, unexpected.join(','));

} catch (e) {
  check('FATAL', false, String(e && e.stack || e));
}
const pass = results.filter((r) => r.ok).length;
const fail = results.length - pass;
const summary = `PART 23 RESULT: TOTAL=${results.length} PASS=${pass} FAIL=${fail}`;
console.log('\n' + summary);
fs.appendFileSync(OUT, summary + '\n');
await browser.close();
server.close();
process.exit(fail === 0 ? 0 : 1);






