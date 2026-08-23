// PART 6 — SMART DOCUMENTS: Blank Document (A4 page as canvas)
// Behavioral test in a real Chrome browser via Puppeteer.
// Run:  node tests/part6_smart_blank_document.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8206;
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
setTimeout(() => process.exit(124), 150000); // hard watchdog

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(viewport) {
  const page = await browser.newPage();
  if (viewport) await page.setViewport(viewport);
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(600);
  return { page, errs };
}

async function openDrawer(page) {
  await page.evaluate(() => document.getElementById('drawerToggle').click());
  await sleep(250);
}

async function clickSmartDocs(page) {
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click());
  await sleep(400);
}

async function setLang(page, locale) {
  await page.evaluate((l) => {
    const s = document.getElementById('topBarLanguageSelect');
    if (s) { s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); }
  }, locale);
  await sleep(400);
}

// Click the "New Document / مستند جديد" card.
async function clickNewDoc(page) {
  await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-new-doc"]').click());
  await sleep(450);
}

async function openBlank(page, locale) {
  await openDrawer(page);
  if (locale) await setLang(page, locale);
  await clickSmartDocs(page);
  await clickNewDoc(page);
}

const blankState = (page) => page.evaluate(() => window.__smartBlank.getState());

const viewInfo = (page) => page.evaluate(() => {
  const c = document.getElementById('smartBlankCanvas');
  const toolbar = document.querySelector('.smart-blank-toolbar');
  const nav = document.querySelector('.smart-blank-nav');
  return {
    homeShown: document.querySelector('.smart-docs-home')?.style.display !== 'none',
    blankVisible: document.getElementById('smartBlankView').classList.contains('blank-visible'),
    modalShow: document.getElementById('smartDocsModal').classList.contains('show'),
    dir: document.documentElement.dir,
    langAttr: document.body.getAttribute('data-language'),
    title: document.getElementById('smartBlankDocTitle').textContent.trim(),
    counter: document.getElementById('smartPageCount').textContent.trim(),
    toolbarDisplay: toolbar ? getComputedStyle(toolbar).display : null,
    navDisplay: nav ? getComputedStyle(nav).display : null,
    canvasWhite: c ? getComputedStyle(c).backgroundColor : null,
    canvas: c ? { w: c.getBoundingClientRect().width, h: c.getBoundingClientRect().height } : null
  };
});

const overflowInfo = (page) => page.evaluate(() => {
  const doc = document.documentElement;
  const canvas = document.getElementById('smartBlankCanvas');
  const r = canvas ? canvas.getBoundingClientRect() : null;
  return {
    docOverflow: doc.scrollWidth - window.innerWidth,
    innerW: window.innerWidth,
    canvasRight: r ? Math.round(r.right) : null,
    canvasLeft: r ? Math.round(r.left) : null
  };
});

try {
  // ================= 1) Clicking "New Document" opens the blank workspace, Step 2 =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    const s = await blankState(page);
    const v = await viewInfo(page);
    check('New Document: blank view is visible', v.blankVisible === true, 'visible=' + v.blankVisible);
    check('New Document: home is hidden', v.homeShown === false, 'homeShown=' + v.homeShown);
    check('New Document: Smart Docs modal stays open (no extra tool)', v.modalShow === true, 'modalShow=' + v.modalShow);
    check('New Document: reaches Step 2', s.step === 2, 'step=' + s.step);
    check('New Document: document type = blank', s.type === 'blank', 'type=' + s.type);
    check('No JS errors opening blank document', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 2) One page / A4 / white / default name =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    const s = await blankState(page);
    const v = await viewInfo(page);
    check('One page only (state pageCount = 1)', s.pageCount === 1, 'pageCount=' + s.pageCount);
    check('Page counter shows "1 / 1"', v.counter === '1 / 1', 'counter=' + v.counter);
    check('Page size = A4', s.pageSize === 'A4', 'pageSize=' + s.pageSize);
    check('Empty content (content length 0)', s.contentLength === 0, 'len=' + s.contentLength);
    check('Page is white', v.canvasWhite === 'rgb(255, 255, 255)', 'color=' + v.canvasWhite);
    const ratio = v.canvas && v.canvas.w > 0 ? v.canvas.w / v.canvas.h : 0;
    check('Page preserves A4 ratio (~0.707)', Math.abs(ratio - (210 / 297)) < 0.02, 'ratio=' + ratio.toFixed(3));
    check('Default name = New Document', v.title === 'New Document', 'title=' + v.title);
    check('State default name = New Document', s.name === 'New Document', 'name=' + s.name);
    check('No JS errors (state/page checks)', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 3) Toolbar + navigation are visible =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    const v = await viewInfo(page);
    const tools = await page.evaluate(() => document.querySelectorAll('[data-toolbar="blank-doc"] .smart-tool-btn').length);
    const navBtns = await page.evaluate(() => document.querySelectorAll('.smart-nav-btn').length);
    check('Toolbar is visible', v.toolbarDisplay === 'flex', 'display=' + v.toolbarDisplay);
    check('Toolbar has tool buttons', tools >= 5, 'tools=' + tools);
    check('Navigation bar is visible', v.navDisplay === 'flex', 'display=' + v.navDisplay);
    check('Navigation has prev/next controls', navBtns === 2, 'navBtns=' + navBtns);
    check('No JS errors (toolbar/nav)', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 4) Back returns to Smart Documents home =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    await page.evaluate(() => document.getElementById('smartBlankBack').click());
    await sleep(250);
    const v = await viewInfo(page);
    const s = await blankState(page);
    check('Back: home is shown again', v.homeShown === true, 'homeShown=' + v.homeShown);
    check('Back: blank view is hidden', v.blankVisible === false, 'blankVisible=' + v.blankVisible);
    check('Back: Smart Docs modal stays open (calculator not closed)', v.modalShow === true, 'modalShow=' + v.modalShow);
    check('Back: returns to Smart Docs home step', s.step === 1, 'step=' + s.step);
    check('Back: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 5) RTL (Arabic) =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'ar');
    const v = await viewInfo(page);
    const s = await blankState(page);
    check('RTL: document direction is rtl', v.dir === 'rtl', 'dir=' + v.dir);
    check('RTL: body language marker = ar', v.langAttr === 'ar', 'lang=' + v.langAttr);
    check('RTL: default name is Arabic (مستند جديد)', v.title === 'مستند جديد', 'title=' + v.title);
    check('RTL: state name is Arabic', s.name === 'مستند جديد', 'name=' + s.name);
    check('RTL: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 6) LTR (English) =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    const v = await viewInfo(page);
    check('LTR: document direction is ltr', v.dir === 'ltr', 'dir=' + v.dir);
    check('LTR: default name is English', v.title === 'New Document', 'title=' + v.title);
    check('LTR: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 7) Responsive: Desktop =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    const o = await overflowInfo(page);
    check('Desktop: no horizontal overflow', o.docOverflow <= 2, 'overflow=' + o.docOverflow);
    check('Desktop: canvas inside viewport', o.canvasLeft >= -1 && o.canvasRight <= o.innerW + 1,
      `left=${o.canvasLeft} right=${o.canvasRight} inner=${o.innerW}`);
    check('Desktop: blank visible', (await viewInfo(page)).blankVisible === true);
    check('Desktop: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 8) Responsive: Tablet =================
  {
    const { page, errs } = await newPage({ width: 768, height: 1024 });
    await openBlank(page, 'en');
    const o = await overflowInfo(page);
    check('Tablet: no horizontal overflow', o.docOverflow <= 2, 'overflow=' + o.docOverflow);
    check('Tablet: canvas inside viewport', o.canvasLeft >= -1 && o.canvasRight <= o.innerW + 1,
      `left=${o.canvasLeft} right=${o.canvasRight} inner=${o.innerW}`);
    check('Tablet: blank visible', (await viewInfo(page)).blankVisible === true);
    check('Tablet: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 9) Responsive: iPhone 390 =================
  {
    const { page, errs } = await newPage({ width: 390, height: 844 });
    await openBlank(page, 'en');
    const o = await overflowInfo(page);
    check('iPhone 390: no horizontal overflow', o.docOverflow <= 2, 'overflow=' + o.docOverflow);
    check('iPhone 390: canvas inside viewport', o.canvasLeft >= -1 && o.canvasRight <= o.innerW + 1,
      `left=${o.canvasLeft} right=${o.canvasRight} inner=${o.innerW}`);
    check('iPhone 390: toolbar present', (await viewInfo(page)).toolbarDisplay === 'flex');
    check('iPhone 390: blank visible', (await viewInfo(page)).blankVisible === true);
    check('iPhone 390: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 10) Responsive: Android 360 =================
  {
    const { page, errs } = await newPage({ width: 360, height: 740 });
    await openBlank(page, 'en');
    const o = await overflowInfo(page);
    check('Android 360: no horizontal overflow', o.docOverflow <= 2, 'overflow=' + o.docOverflow);
    check('Android 360: canvas inside viewport', o.canvasLeft >= -1 && o.canvasRight <= o.innerW + 1,
      `left=${o.canvasLeft} right=${o.canvasRight} inner=${o.innerW}`);
    check('Android 360: toolbar present', (await viewInfo(page)).toolbarDisplay === 'flex');
    check('Android 360: nav present', (await viewInfo(page)).navDisplay === 'flex');
    check('Android 360: blank visible', (await viewInfo(page)).blankVisible === true);
    check('Android 360: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 11) Regression: Calculator still works =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await page.evaluate(() => {
      const b = document.querySelector('.keypad-btn[data-value="7"]');
      if (b) b.click();
    });
    const display = await page.evaluate(() => document.getElementById('primaryDisplay').textContent);
    check('Regression: Calculator still works (pressed 7)', display.includes('7'), 'display=' + display);
    check('Regression: no JS errors (calculator)', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 12) Regression: History still works =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-history"]').click());
    await sleep(400);
    const histOpen = await page.evaluate(() => document.getElementById('historyPanel').classList.contains('open'));
    check('Regression: History still opens', histOpen);
    check('Regression: no JS errors (history)', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 13) Regression: Notes still works =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
    await sleep(400);
    const notesOpen = await page.evaluate(() => document.getElementById('notesManagerModal').classList.contains('show'));
    check('Regression: Notes manager still opens', notesOpen);
    check('Regression: no JS errors (notes)', errs.length === 0, errs.join(' | '));
    await page.close();
  }

} catch (err) {
  console.log('ERROR', err);
  results.push({ name: 'test harness', ok: false, detail: String(err && err.stack || err) });
} finally {
  try { await browser.close(); } catch (e) {}
  server.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${failed.length === 0 ? 'ALL PASS' : failed.length + ' FAILED'}  (${results.length} checks)`);
process.exit(failed.length === 0 ? 0 : 1);
