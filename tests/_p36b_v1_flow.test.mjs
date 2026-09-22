import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8397;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.pdf': 'application/pdf' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  try {
    const data = fs.readFileSync(path.join(ROOT, p));
    res.writeHead(200, { 'Content-Type': (MIME[path.extname(p).toLowerCase()] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(data);
  } catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
setTimeout(() => { console.error('TIMEOUT'); process.exit(124); }, 240000).unref();

async function makePage(browser, w, h) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e && e.message || e).slice(0, 300)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + String(m.text()).slice(0, 300)); });
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => document.body && document.body.getAttribute('data-pdf-v1') === '1', { timeout: 30000 });
  return { page, errors };
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const results = {};

// 1) Blank-document flow: open smart docs -> new doc -> add text via toolbar -> save -> export header check
{
  const { page, errors } = await makePage(browser, 1280, 900);
  await page.evaluate(() => { document.querySelector('[data-action="open-smart-docs"]')?.click(); });
  await new Promise((r) => setTimeout(r, 700));
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.smart-doc-card'));
    const c = cards.find((b) => (b.getAttribute('data-action') || '') === 'smart-new-doc');
    if (c) c.click();
  });
  await new Promise((r) => setTimeout(r, 900));
  const blankVisible = await page.evaluate(() => {
    const v = document.getElementById('smartBlankView');
    return v ? v.getAttribute('aria-hidden') : 'missing';
  });
  // basic edit: click Add tool then type into canvas? use contenteditable add via toolbar text
  await page.evaluate(() => {
    const t = document.querySelector('.smart-blank-toolbar [data-tool="text"]');
    if (t) t.click();
  });
  await new Promise((r) => setTimeout(r, 700));
  const afterAdd = await page.evaluate(() => ({
    blocks: document.querySelectorAll('#smartBlankCanvas [data-block]').length,
    hasPreview: !!document.getElementById('smartReviewBtn'),
    hasExport: !!document.getElementById('smartPdfExportBtn')
  }));
  // preview/review
  await page.evaluate(() => { document.getElementById('smartReviewBtn')?.click(); });
  await new Promise((r) => setTimeout(r, 700));
  const review = await page.evaluate(() => ({
    barHidden: document.getElementById('smartReviewBar') ? document.getElementById('smartReviewBar').hasAttribute('hidden') : 'missing'
  }));
  await page.evaluate(() => { document.getElementById('smartReviewExitBtn')?.click(); });
  await new Promise((r) => setTimeout(r, 500));
  // export -> confirm -> result modal + save button; intercept download not needed, check blob type via __smartPdfExport seam if present
  results.blank = { blankVisible, afterAdd, review, errors: errors.slice(0, 10) };
  await page.close();
}

// 2) Responsive overflow checks (desktop/tablet/390/360)
for (const [name, w] of [['desktop', 1280], ['tablet', 768], ['m390', 390], ['m360', 360]]) {
  const { page, errors } = await makePage(browser, w, 844);
  await page.evaluate(() => { document.querySelector('[data-action="open-pdf-reports"]')?.click(); });
  await new Promise((r) => setTimeout(r, 600));
  const o = await page.evaluate(() => {
    const de = document.documentElement;
    return {
      scrollW: de.scrollWidth, clientW: de.clientWidth, overflowX: de.scrollWidth - de.clientWidth,
      wsVisible: document.getElementById('pdfReportsWorkspace')?.classList.contains('show')
    };
  });
  results[name] = { ...o, errors: errors.slice(0, 6) };
  await page.close();
}

// 3) RTL/LTR
for (const lang of ['ar', 'en']) {
  const { page } = await makePage(browser, 1280, 900);
  await page.evaluate((l) => {
    const sel = document.getElementById('topBarLanguageSelect');
    if (sel) { sel.value = l; sel.dispatchEvent(new Event('change', { bubbles: true })); }
  }, lang);
  await new Promise((r) => setTimeout(r, 700));
  const d = await page.evaluate(() => ({ dir: document.documentElement.dir, lang: document.documentElement.lang, gate: document.body.getAttribute('data-pdf-v1') }));
  results['lang_' + lang] = d;
  await page.close();
}

console.log(JSON.stringify(results, null, 2));
await browser.close();
server.close();
