// PART 19 — SMART DOCUMENTS: Page Management (إدارة الصفحات)
// Behavioral test in real Chrome via Puppeteer. Covers: page creation,
// delete (last page protected), copy (content cloned, signature validity
// NOT carried over), reorder (content stays bound to its page), navigation,
// PART 10/16 integration, PART 18 signature invalidation, RTL/LTR in the
// 7 locales, responsive 1280/768/390/360, no alert/confirm/prompt, no JS
// errors, Calculator/History/Notes/Back/Home unaffected.
// Run:  node tests/part19_smart_pages.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8281;
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
  } catch (e) {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const URL = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 900000);

const results = [];
const OUT = path.join(ROOT, '__p19_result.txt');
try { fs.unlinkSync(OUT); } catch (e) {}
fs.appendFileSync(OUT, 'STARTED\n');
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`;
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
const pngPath = path.join(os.tmpdir(), 'part19_image.png');
fs.writeFileSync(pngPath, Buffer.from(PNG_B64, 'base64'));

async function newPage(viewport) {
  const page = await browser.newPage();
  if (viewport) await page.setViewport(viewport);
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await page.evaluateOnNewDocument(() => {
    window.__dialogs = { alert: 0, confirm: 0, prompt: 0 };
    window.alert = () => { window.__dialogs.alert++; };
    window.confirm = () => { window.__dialogs.confirm++; return true; };
    window.prompt = () => { window.__dialogs.prompt++; return ''; };
  });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(600);
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
async function openBlank(page, locale) {
  await openDrawer(page);
  if (locale) await setLang(page, locale);
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click());
  await sleep(400);
  await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-new-doc"]').click());
  await sleep(450);
}
const noHOverflow = (page) => page.evaluate(() =>
  document.documentElement.scrollWidth <= window.innerWidth + 1);
const dialogs = (page) => page.evaluate(() => window.__dialogs);
const st = (page) => page.evaluate(() => window.__smartBlank.getState());
const pagesDesc = (page) => page.evaluate(() => window.__smartPages.describe());
const navState = (page) => page.evaluate(() => ({
  prevDisabled: document.getElementById('smartBlankPrevPage').disabled,
  nextDisabled: document.getElementById('smartBlankNextPage').disabled,
  delDisabled: document.getElementById('smartPageDeleteBtn').disabled,
  upDisabled: document.getElementById('smartPageMoveUpBtn').disabled,
  downDisabled: document.getElementById('smartPageMoveDownBtn').disabled,
  counter: document.getElementById('smartPageCount').textContent.trim(),
  counterLabel: document.querySelector('.smart-page-counter').textContent.replace(/\s+/g, ' ').trim()
}));
async function seedText(page, txt) {
  await page.evaluate(() => window.__smartBlank.insertElement('text'));
  await sleep(200);
  await page.evaluate((t) => {
    const holder = document.getElementById('smartBlankCanvasHolder');
    const cv = Array.from(holder.querySelectorAll('.smart-blank-canvas'))
      .find((c) => !c.classList.contains('smart-page-hidden')) || holder.lastElementChild;
    const b = cv.querySelector('.smart-doc-text-block:last-of-type');
    if (b) b.textContent = t;
  }, txt);
  await sleep(150);
}
async function upload(page, sel) {
  const inp = await page.$(sel);
  if (inp) await inp.uploadFile(pngPath);
  await sleep(500);
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
const protState = (page) => page.evaluate(() => ({
  status: window.__smartSignatureProtection.status(),
  inv: window.__smartSignatureProtection.invalidated(),
  cnt: window.__smartSignatureProtection.signedCount()
}));

// ============================================================
// A) Page creation (checks 1-10)
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'ar');
  let s = await st(page);
  let n = await navState(page);
  check('1) Smart Documents opens', s.editorVisible === true);
  check('2) Blank Document opens with A4', s.pageSize === 'A4');
  check('3) Exactly ONE page at start', s.pageCount === 1 && (await pagesDesc(page)).length === 1, JSON.stringify(s.pages));
  check('4) Counter shows صفحة 1 من 1', n.counterLabel.indexOf('صفحة 1 من 1') !== -1, n.counterLabel);
  await page.evaluate(() => document.getElementById('smartPageAddBtn').click());
  await sleep(300);
  s = await st(page);
  check('5) Add page -> pageCount = 2', s.pageCount === 2 && (await pagesDesc(page)).length === 2);
  check('6) New page becomes current (2)', s.currentPage === 2);
  check('7) Counter shows صفحة 2 من 2', (await navState(page)).counterLabel.indexOf('صفحة 2 من 2') !== -1, (await navState(page)).counterLabel);
  await page.evaluate(() => document.getElementById('smartPageAddBtn').click());
  await sleep(300);
  s = await st(page);
  check('8) Add page -> pageCount = 3', s.pageCount === 3);
  check('9) Counter shows صفحة 3 من 3', (await navState(page)).counterLabel.indexOf('صفحة 3 من 3') !== -1, (await navState(page)).counterLabel);
  check('10) Only ONE page visible at a time', (await pagesDesc(page)).filter((p) => !p.hidden).length === 1);
  check('A) No JS errors (page creation)', errs.length === 0, errs.join(' | ').slice(0, 160));
  await page.close();
}

// ============================================================
// B) Delete (checks 11-14)
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');
  await page.evaluate(() => window.__smartPages.add()); await sleep(250);
  await page.evaluate(() => window.__smartPages.add()); await sleep(250);
  await page.evaluate(() => document.getElementById('smartPageDeleteBtn').click());
  await sleep(300);
  let s = await st(page);
  check('11) Delete current page works', s.pageCount === 2, 'count=' + s.pageCount);
  const n1 = await navState(page);
  check('12) Count indicator updated', n1.counter === '2 of 2', n1.counter);
  check('13) currentPage moved to a nearby page (2)', s.currentPage === 2, 'cur=' + s.currentPage);
  await page.evaluate(() => document.getElementById('smartPageDeleteBtn').click()); await sleep(250);
  const removed = await page.evaluate(() => window.__smartPages.remove());
  s = await st(page);
  const n = await navState(page);
  check('14) Last page can NEVER be deleted', s.pageCount === 1 && removed === false && n.delDisabled === true,
    'count=' + s.pageCount + ' removed=' + removed + ' delDisabled=' + n.delDisabled);
  check('B) No JS errors (delete)', errs.length === 0, errs.join(' | ').slice(0, 160));
  await page.close();
}

// ============================================================
// C) Copy (checks 15-25)
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');
  await seedText(page, 'ORIGINAL TEXT');
  await page.evaluate(() => window.__smartBlank.insertElement('table')); await sleep(300);
  await upload(page, '#smartAddImageInput');
  await upload(page, '#smartAddLogoInput');
  let d = await pagesDesc(page);
  check('15) Rich content created (text/table/image/logo)', d[0].text[0] === 'ORIGINAL TEXT' &&
    d[0].tables >= 1 && d[0].images >= 1 && d[0].logos >= 1, JSON.stringify(d[0]));
  await page.evaluate(() => window.__smartPageDesign.apply('formal')); await sleep(250);
  await page.evaluate(() => window.__smartPages.copy());
  await sleep(400);
  const s = await st(page);
  check('16) Copy creates a new page', s.pageCount === 2 && s.currentPage === 2, JSON.stringify({ c: s.pageCount, cur: s.currentPage }));
  d = await pagesDesc(page);
  const clone = d[1];
  check('17) New page appears after the original', !!clone);
  check('18) Text copied', clone.text[0] === 'ORIGINAL TEXT', JSON.stringify(clone.text));
  check('19) Table copied', clone.tables === 1, 'tables=' + clone.tables);
  check('20) Image copied', clone.images === 1, 'images=' + clone.images);
  check('21) Logo copied', clone.logos === 1, 'logos=' + clone.logos);
  check('22) Page design copied (PART 16)', clone.design.indexOf('formal') !== -1, JSON.stringify(clone.design));
  await page.evaluate(() => {
    const cvs = document.querySelectorAll('#smartBlankCanvasHolder .smart-blank-canvas');
    cvs[1].querySelector('.smart-doc-text-block').textContent = 'EDITED CLONE';
  });
  await sleep(300);
  d = await pagesDesc(page);
  check('23) Editing the clone leaves the ORIGINAL unchanged',
    d[0].text[0] === 'ORIGINAL TEXT' && d[1].text[0] === 'EDITED CLONE', JSON.stringify(d.map((x) => x.text)));
  check('24) Original keeps its own table/image/logo',
    d[0].tables === 1 && d[0].images === 1 && d[0].logos === 1, JSON.stringify(d[0]));
  check('25) Clone is a real A4 canvas', await page.evaluate(() => {
    const cv = document.querySelectorAll('#smartBlankCanvasHolder .smart-blank-canvas')[1];
    return cv.classList.contains('smart-document-canvas') && parseFloat(cv.style.height) > 0;
  }));
  check('C) No JS errors (copy)', errs.length === 0, errs.join(' | ').slice(0, 160));
  await page.close();
}

// ============================================================
// D) Reordering (checks 26-30)
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');
  await seedText(page, 'AAA');
  await page.evaluate(() => window.__smartPages.add()); await sleep(250);
  await seedText(page, 'BBB');
  await page.evaluate(() => window.__smartPages.add()); await sleep(250);
  await seedText(page, 'CCC');
  let d = await pagesDesc(page);
  check('26) Three pages with distinct content',
    d.length === 3 && d[0].text[0] === 'AAA' && d[1].text[0] === 'BBB' && d[2].text[0] === 'CCC',
    JSON.stringify(d.map((x) => x.text)));
  // move current (page 3 'CCC') up
  const moved = await page.evaluate(() => window.__smartPages.move(-1));
  await sleep(300);
  d = await pagesDesc(page);
  let s = await st(page);
  check('27) Reorder works (move up)', moved === true && d[1].text[0] === 'CCC' && d[2].text[0] === 'BBB',
    JSON.stringify(d.map((x) => x.text)));
  check('28) Content stays bound to its page after reorder',
    d[0].text[0] === 'AAA' && d.map((x) => x.text[0]).sort().join(',') === 'AAA,BBB,CCC');
  check('29) Page order reflected in state', s.pages.length === 3 && s.currentPage === 2,
    JSON.stringify({ pages: s.pages, cur: s.currentPage }));
  check('30) currentPage follows the moved page + counter updates',
    (await navState(page)).counter.indexOf('2 of 3') !== -1, (await navState(page)).counter);
  // move back down to restore
  await page.evaluate(() => window.__smartPages.move(1)); await sleep(300);
  d = await pagesDesc(page);
  check('D1) Move down restores the original order',
    d[0].text[0] === 'AAA' && d[1].text[0] === 'BBB' && d[2].text[0] === 'CCC', JSON.stringify(d.map((x) => x.text)));
  check('D2) No JS errors (reorder)', errs.length === 0, errs.join(' | ').slice(0, 160));
  await page.close();
}

// ============================================================
// E) Navigation (checks 31-35)
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');
  await page.evaluate(() => window.__smartPages.add()); await sleep(250);
  await page.evaluate(() => window.__smartPages.add()); await sleep(250);
  let n = await navState(page);
  check('31) Prev disabled on last page bounds logic', n.prevDisabled === false && n.nextDisabled === true, JSON.stringify(n));
  await page.click('#smartBlankPrevPage'); await sleep(250);
  n = await navState(page);
  check('32) Previous navigates (2 of 3)', n.counter.indexOf('2 of 3') !== -1, n.counter);
  await page.click('#smartBlankPrevPage'); await sleep(250);
  n = await navState(page);
  check('33) Current page indicator correct (1 of 3)', n.counter.indexOf('1 of 3') !== -1, n.counter);
  check('34) Cannot go before the first page', n.prevDisabled === true);
  await page.click('#smartBlankNextPage'); await sleep(200);
  await page.click('#smartBlankNextPage'); await sleep(250);
  n = await navState(page);
  check('35) Cannot go past the last page', n.nextDisabled === true && n.counter.indexOf('3 of 3') !== -1, n.counter);
  // content preserved while navigating
  const vis = await pagesDesc(page);
  check('E) Navigation never loses content (pages intact)', vis.length === 3, 'n=' + vis.length);
  check('E2) No JS errors (navigation)', errs.length === 0, errs.join(' | ').slice(0, 160));
  await page.close();
}

// ============================================================
// F) PART 10 + PART 16 integration (checks 36-40)
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');
  // 36: "new-page" from the Add menu uses the SAME page model
  await page.evaluate(() => document.querySelector('[data-toolbar="blank-doc"] button[data-tool="add"]').click());
  await sleep(250);
  await page.evaluate(() => document.querySelector('#smartAddMenu .smart-add-item[data-add="new-page"]').click());
  await sleep(400);
  let s = await st(page);
  let d = await pagesDesc(page);
  check('36) Add-menu new-page uses the same page model (no parallel system)',
    s.pageCount === 2 && d.length === 2 && s.pages.length === 2,
    JSON.stringify({ pc: s.pageCount, dom: d.length, pages: s.pages.length }));
  // 37-40: design survives add / copy / reorder
  await page.evaluate(() => window.__smartPageDesign.apply('classic')); await sleep(300);
  d = await pagesDesc(page);
  check('37) Design applies to ALL pages after Add', d.every((p) => p.design.indexOf('classic') !== -1), JSON.stringify(d.map((p) => p.design)));
  await page.evaluate(() => window.__smartPages.copy()); await sleep(350);
  d = await pagesDesc(page);
  check('38) Design survives Copy', d.length === 3 && d.every((p) => p.design.indexOf('classic') !== -1), JSON.stringify(d.map((p) => p.design)));
  await page.evaluate(() => window.__smartPages.go(3)); await sleep(200);
  await page.evaluate(() => window.__smartPages.move(-1)); await sleep(300);
  d = await pagesDesc(page);
  check('39) Design survives Reorder', d.every((p) => p.design.indexOf('classic') !== -1), JSON.stringify(d.map((p) => p.design)));
  check('40) A4 size intact on every page after all operations', await page.evaluate(() => {
    const cvs = document.querySelectorAll('#smartBlankCanvasHolder .smart-blank-canvas');
    return cvs.length === 3 && Array.from(cvs).every((c) => parseFloat(c.style.width) > 0 && parseFloat(c.style.height) > 0);
  }));
  check('F) No JS errors (PART 10/16 integration)', errs.length === 0, errs.join(' | ').slice(0, 160));
  await page.close();
}

// ============================================================
// G) PART 18 — signature protection (checks 41-45)
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');
  await seedText(page, 'SIGNED DOC');
  await signDraw(page);
  await sleep(650);
  let p = await protState(page);
  check('41) Document signed (baseline captured)', p.status === 'signed', JSON.stringify(p));
  // 42: Add page after signing -> invalidation
  await page.evaluate(() => window.__smartPages.add()); await sleep(800);
  p = await protState(page);
  check('42) Add page after signing invalidates', p.status === 'modified' && p.inv >= 1, JSON.stringify(p));
  // re-sign to restore baseline
  await signDraw(page); await sleep(650);
  p = await protState(page);
  check('43) Re-signing restores a valid baseline', p.status === 'signed', JSON.stringify(p));
  // 44: Delete page after signing -> invalidation
  await page.evaluate(() => window.__smartPages.remove()); await sleep(800);
  p = await protState(page);
  check('44) Delete page after signing invalidates', p.status === 'modified', JSON.stringify(p));
  // re-sign, then copy the signed page -> validity must NOT carry over
  await signDraw(page); await sleep(650);
  await page.evaluate(() => window.__smartPages.copy()); await sleep(800);
  p = await protState(page);
  const d = await pagesDesc(page);
  check('45) Copying a signed page does NOT carry valid signed state',
    p.status === 'modified' && d[1].signatures >= 1 && d[1].signaturesUncertified >= 1,
    JSON.stringify({ st: p.status, sig: d[1].signatures, uncert: d[1].signaturesUncertified }));
  // re-sign, then reorder -> invalidation
  await signDraw(page); await sleep(650);
  await page.evaluate(() => window.__smartPages.move(-1)); await sleep(800);
  p = await protState(page);
  check('46) Reordering after signing invalidates (page order is protected)', p.status === 'modified', JSON.stringify(p));
  // 47: re-sign again -> baseline correct again
  await signDraw(page); await sleep(650);
  p = await protState(page);
  check('47) Re-sign after page operations rebuilds a correct baseline', p.status === 'signed', JSON.stringify(p));
  check('G) No JS errors (PART 18 integration)', errs.length === 0, errs.join(' | ').slice(0, 160));
  await page.close();
}

// ============================================================
// H) RTL / LTR — all 7 locales
// ============================================================
{
  const locales = [
    { key: 'ar', dir: 'rtl', counter: 'صفحة 1 من 1', banned: ['Page', 'of'] },
    { key: 'en', dir: 'ltr', counter: 'Page 1 of 1' },
    { key: 'fr', dir: 'ltr', counter: 'Page 1 sur 1' },
    { key: 'es', dir: 'ltr', counter: 'Página 1 de 1' },
    { key: 'tr', dir: 'ltr', counter: 'Sayfa 1 / 1' },
    { key: 'ru', dir: 'ltr', counter: 'Страница 1 из 1' },
    { key: 'de', dir: 'ltr', counter: 'Seite 1 von 1' }
  ];
  for (const c of locales) {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, c.key);
    const v = await page.evaluate(() => ({
      dirAttr: document.getElementById('smartBlankView').getAttribute('dir'),
      computed: getComputedStyle(document.getElementById('smartBlankView')).direction,
      label: document.querySelector('.smart-page-counter').textContent.replace(/\s+/g, ' ').trim(),
      navVisible: getComputedStyle(document.getElementById('smartPageAddBtn')).display !== 'none'
    }));
    check(c.key + ') view direction is ' + c.dir, v.dirAttr === c.dir && v.computed === c.dir, v.dirAttr + '/' + v.computed);
    check(c.key + ') counter localized "' + c.counter + '"', v.label.indexOf(c.counter) !== -1, v.label);
    if (c.key === 'ar') {
      check('48) No English leakage in Arabic counter', v.label.indexOf('صفحة') !== -1 &&
        c.banned.every((b) => v.label.indexOf(b) === -1), v.label);
      const btnTexts = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.smart-blank-nav .smart-nav-btn span[data-i18n]')).map((x) => x.textContent.trim()));
      check('49) No English leakage in Arabic nav buttons', !btnTexts.some((t) => /^(Add page|Copy page|Delete page|Previous|Next)$/.test(t)),
        JSON.stringify(btnTexts));
    }
    check(c.key + ') page management buttons present', v.navVisible);
    check(c.key + ') no JS errors', errs.length === 0, errs.join(' | ').slice(0, 120));
    await page.close();
  }
}

// ============================================================
// I) Responsive — 1280 / 768 / 390 / 360
// ============================================================
for (const vp of [
  { name: 'Desktop 1280', width: 1280, height: 800 },
  { name: 'Tablet 768', width: 768, height: 1024 },
  { name: 'iPhone 390', width: 390, height: 844 },
  { name: 'Android 360', width: 360, height: 800 }
]) {
  const { page, errs } = await newPage({ width: vp.width, height: vp.height });
  await openBlank(page, 'en');
  await page.evaluate(() => window.__smartPages.add()); await sleep(300);
  const r = await page.evaluate(() => {
    const holder = document.getElementById('smartBlankCanvasHolder');
    const vis = Array.from(holder.querySelectorAll('.smart-blank-canvas'))
      .find((c) => !c.classList.contains('smart-page-hidden')) || document.getElementById('smartBlankCanvas');
    const cr = vis.getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      ratio: cr.height / cr.width,
      navBtnH: document.getElementById('smartPageAddBtn').getBoundingClientRect().height,
      navBtnW: document.getElementById('smartPageAddBtn').getBoundingClientRect().width,
      counter: document.getElementById('smartPageCount').textContent.trim()
    };
  });
  check(vp.name + ') zero horizontal overflow', r.overflow <= 1, 'overflow=' + r.overflow);
  check(vp.name + ') page stays A4 (ratio ~1.414)', r.ratio != null && Math.abs(r.ratio - Math.SQRT2) < 0.06, 'ratio=' + r.ratio);
  check(vp.name + ') touch-friendly nav button', r.navBtnH >= 36 && r.navBtnW >= 34,
    'h=' + Math.round(r.navBtnH) + ' w=' + Math.round(r.navBtnW));
  check(vp.name + ') counter visible', /[12] of 2/.test(r.counter), r.counter);
  check(vp.name + ') no JS errors', errs.length === 0, errs.join(' | ').slice(0, 120));
  await page.close();
}

// ============================================================
// J) Safety + Smart Documents regression
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  check('55) No JS errors on load', errs.length === 0, errs.join(' | ').slice(0, 120));
  await openBlank(page, 'en');
  await page.evaluate(() => window.__smartPages.add()); await sleep(250);
  await page.evaluate(() => document.getElementById('smartBlankBack').click());
  await sleep(350);
  const home = await page.evaluate(() => ({
    modal: document.getElementById('smartDocsModal').classList.contains('show'),
    cards: document.querySelectorAll('.smart-doc-card').length
  }));
  check('56) Back returns to Smart Documents home', home.modal && home.cards >= 4, 'cards=' + home.cards);
  // reopen -> exactly one page again (session reset, no persistence)
  await openDrawer(page);
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click());
  await sleep(400);
  await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-new-doc"]').click());
  await sleep(450);
  let s = await st(page);
  check('57) Reopening starts from ONE page (no stale pages)', s.pageCount === 1 && (await pagesDesc(page)).length === 1,
    JSON.stringify({ pc: s.pageCount }));
  check('58) No persistence of page state across sessions', s.currentPage === 1);
  await page.evaluate(() => document.getElementById('closeSmartDocs').click());
  await sleep(300);
  // Calculator
  await page.evaluate(() => document.querySelector('.keypad-btn.number[data-value="7"]').click());
  await page.evaluate(() => document.querySelector('.keypad-btn.operator[data-value="*"]').click());
  await page.evaluate(() => document.querySelector('.keypad-btn.number[data-value="6"]').click());
  await page.evaluate(() => document.querySelector('.keypad-btn.equals').click());
  await sleep(250);
  const calc = await page.evaluate(() => document.querySelector('#primaryDisplay').textContent.trim());
  check('59) Calculator works (7*6=42)', calc === '42', calc);
  // History
  await openDrawer(page);
  await page.evaluate(() => { const i = document.querySelector('.drawer-menu-item[data-action="open-history"]'); if (i) i.click(); });
  await sleep(300);
  check('60) History works', await page.evaluate(() => document.getElementById('historyPanel').classList.contains('open')));
  await page.keyboard.press('Escape'); await sleep(200);
  // Notes
  await openDrawer(page);
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
  await sleep(400);
  check('61) Notes works', await page.evaluate(() => document.getElementById('notesManagerModal').classList.contains('show')));
  await page.evaluate(() => { if (document.getElementById('closeNotesManager')) document.getElementById('closeNotesManager').click(); });
  await sleep(250);
  const dg = await dialogs(page);
  check('62) No alert()/confirm()/prompt() anywhere', dg.alert === 0 && dg.confirm === 0 && dg.prompt === 0, JSON.stringify(dg));
  check('63) Zero JS errors in the whole safety run', errs.length === 0, errs.join(' | ').slice(0, 160));
  await page.close();
}

// ============================================================
const failed = results.filter((r) => !r.ok);
fs.appendFileSync(OUT, `\nTOTAL=${results.length} PASS=${results.length - failed.length} FAIL=${failed.length}\n`);
console.log(`\nPART 19 RESULT: TOTAL=${results.length} PASS=${results.length - failed.length} FAIL=${failed.length}`);
await browser.close();
server.close();
process.exit(failed.length ? 1 : 0);