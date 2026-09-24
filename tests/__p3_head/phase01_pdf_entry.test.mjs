// PHASE 01 — PDF REPORTS ENTRY POINT — behavioral test in a real Chrome browser.
// Verifies drawer, button uniqueness/clickability, workspace open/close, RTL/LTR,
// desktop + coarse-pointer (mobile) behaviour, and that the existing Notes PDF
// export and Notes manager are untouched and still functional.
// Run:  node tests/phase01_pdf_entry.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8291;
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

async function newPage(isMobile) {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  if (isMobile) {
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  } else {
    await page.setViewport({ width: 1280, height: 800 });
  }
  await sleep(700); // let the module boot and wire events
  return { page, errors: errs };
}

async function bootOk(page) {
  return page.evaluate(() => !!document.getElementById('primaryDisplay'));
}

async function openDrawer(page) {
  await page.evaluate(() => {
    const b = document.getElementById('drawerToggle');
    if (b) b.click();
  });
  await sleep(250);
  return page.evaluate(() => document.getElementById('drawer')?.classList.contains('open'));
}

async function openPdfReportsBtn(page) {
  return page.evaluate(() => {
    const list = Array.from(document.querySelectorAll('.drawer-menu-item[data-action="open-pdf-reports"]'));
    list.forEach((b) => b.click());
    return list.length;
  });
}

async function openNotesBtn(page) {
  return page.evaluate(() => {
    const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]');
    if (b) b.click();
    return !!b;
  });
}

async function pdfState(page) {
  return page.evaluate(() => {
    const m = document.getElementById('pdfReportsModal');
    const t = m ? m.querySelector('#pdfReportsTitle')?.textContent : '';
    return { shown: m ? m.classList.contains('show') : false, text: t || '' };
  });
}

// ---------- DESKTOP PASS ----------
{
  const { page, errors } = await newPage(false);
  check('Desktop: app boots (primaryDisplay present)', await bootOk(page));

  const open = await openDrawer(page);
  check('Desktop: Side Drawer opens', open, open ? '' : 'drawer.open not set');

  const count = await page.evaluate(() =>
    document.querySelectorAll('.drawer-menu-item[data-action="open-pdf-reports"]').length);
  check('Desktop: PDF Reports button present', count >= 1);
  check('Desktop: exactly one PDF Reports button (no duplicate)', count === 1, `count=${count}`);
const btnCount = await openPdfReportsBtn(page);
  await sleep(250);
  const opened = await pdfState(page);
  check('Desktop: clicking PDF Reports opens workspace', opened.shown && btnCount === 1,
    'shown=' + opened.shown + ' text=' + JSON.stringify(opened.text));

  const content = await page.evaluate(() => {
    const m = document.getElementById('pdfReportsModal');
    const backExists = !!document.getElementById('closePdfReports');
    const title = m ? m.querySelector('#pdfReportsTitle').textContent : '';
    const hasToolbar = !!(m && m.querySelector('.pdf-toolbar'));
    const toolCount = m ? m.querySelectorAll('.pdf-tool').length : 0;
    const hasPage = !!document.getElementById('pdfPreviewPage');
    const hasStage = !!document.getElementById('pdfPreviewStage');
    const hasZoom = !!(m && m.querySelector('.pdf-zoom'));
    return { backExists, title: title || '', hasToolbar, toolCount, hasPage, hasStage, hasZoom };
  });
  check('Desktop: workspace has title', /PDF Reports/i.test(content.title), JSON.stringify(content.title));
  check('Desktop: workspace has single toolbar', content.hasToolbar, 'toolbar=' + content.hasToolbar);
  check('Desktop: toolbar has organized tools', content.toolCount >= 3, 'count=' + content.toolCount);
  check('Desktop: workspace has PDF preview page + stage', content.hasPage && content.hasStage);
  check('Desktop: workspace has zoom controls', content.hasZoom);
  check('Desktop: workspace has back button', content.backExists);

  await page.evaluate(() => document.getElementById('closePdfReports').click());
  await sleep(300);
  const afterBack = await pdfState(page);
  check('Desktop: back returns from workspace', !afterBack.shown);
  check('Desktop: drawer not stuck open (overlay hidden)', await page.evaluate(() =>
    !document.getElementById('drawerOverlay').classList.contains('open')));

  const exportBtn = await page.evaluate(() => !!document.getElementById('exportNotePdfBtn'));
  check('Desktop: Notes PDF export button still present', exportBtn);
  const hadNotes = await openNotesBtn(page);
  await sleep(400);
  const notesShown = await page.evaluate(() =>
    document.getElementById('notesManagerModal').classList.contains('show'));
  check('Desktop: Notes manager still opens', hadNotes && notesShown);
  await page.evaluate(() => { const b = document.getElementById('closeNotesManager'); if (b) b.click(); });
  await sleep(200);

  check('Desktop: no JavaScript errors', (errors || []).length === 0, (errors || []).join(' | ') || 'no errors');
  await page.close();
}

// ---------- MOBILE / COARSE POINTER ----------
{
  const { page, errors } = await newPage(true);
  const open = await openDrawer(page);
  check('Mobile(coarse): Side Drawer opens', open);

  const count = await page.evaluate(() =>
    document.querySelectorAll('.drawer-menu-item[data-action="open-pdf-reports"]').length);
  check('Mobile: PDF Reports button present and unique', count === 1, 'count=' + count);

  await openPdfReportsBtn(page);
  await sleep(400);
  const opened = await pdfState(page);
  check('Mobile: tapping PDF Reports opens workspace', opened.shown, 'shown=' + opened.shown);

  await page.evaluate(() => document.getElementById('closePdfReports').click());
  await sleep(300);
  const afterBack = await pdfState(page);
  check('Mobile: back returns from workspace', !afterBack.shown);

  check('Mobile: no JavaScript errors', (errors || []).length === 0, (errors || []).join(' | ') || 'no errors');
  await page.close();
}
// ---------- RTL / LTR ----------
{
  const { page, errors } = await newPage(false);

  await page.evaluate(() => {
    const sel = document.querySelector('#topBarLanguageSelect');
    sel.value = 'ar';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await sleep(400);
  const rtl = await page.evaluate(() => ({
    dir: document.documentElement.dir,
    bodyLang: document.body.getAttribute('data-language'),
    drawerLabel: document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"] span:last-child').textContent
  }));
  check('RTL: document direction set to rtl', rtl.dir === 'rtl', JSON.stringify(rtl.dir));
  check('RTL: body data-language ar', rtl.bodyLang === 'ar', JSON.stringify(rtl.bodyLang));
  check('RTL: drawer label localized to Arabic', rtl.drawerLabel === 'تقارير PDF', JSON.stringify(rtl.drawerLabel));

  await openPdfReportsBtn(page);
  await sleep(400);
  const pdfArabic = await pdfState(page);
  check('RTL: workspace opens in Arabic', pdfArabic.shown, JSON.stringify(pdfArabic));
  check('RTL: workspace title is Arabic', pdfArabic.text === 'تقارير PDF', JSON.stringify(pdfArabic.text));
  await page.evaluate(() => document.getElementById('closePdfReports').click());
  await sleep(300);

  await page.evaluate(() => {
    const sel = document.querySelector('#topBarLanguageSelect');
    sel.value = 'en';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await sleep(400);
  const ltr = await page.evaluate(() => ({
    dir: document.documentElement.dir,
    drawerLabel: document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"] span:last-child').textContent
  }));
  check('LTR: document direction set to ltr', ltr.dir === 'ltr', JSON.stringify(ltr.dir));
  check('LTR: drawer label localized to English', ltr.drawerLabel === 'PDF Reports', JSON.stringify(ltr.drawerLabel));

  await openPdfReportsBtn(page);
  await sleep(400);
  const pdfEnglish = await pdfState(page);
  check('LTR: workspace opens with English title', pdfEnglish.shown && pdfEnglish.text === 'PDF Reports',
    JSON.stringify(pdfEnglish));
  await page.evaluate(() => document.getElementById('closePdfReports').click());
  await sleep(200);

  check('RTL/LTR: no JavaScript errors', (errors || []).length === 0, (errors || []).join(' | ') || 'no errors');
  await page.close();
}

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log('\n=== PHASE 01 RESULTS: ' + (results.length - failed.length) + '/' + results.length + ' PASSED ===');
if (failed.length) {
  console.log('FAILED:');
  failed.forEach((f) => console.log(' - ' + f.name + ': ' + f.detail));
  process.exit(1);
}
process.exit(0);