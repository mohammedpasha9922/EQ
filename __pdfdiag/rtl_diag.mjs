// TEMP DIAGNOSTIC (Smart PDF text editing geometry) — safe to delete.
// Builds realistic Chrome-printed PDFs (English / Arabic / mixed), loads each
// into the Smart PDF workspace and measures the edited-span geometry.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8391;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.txt': 'text/plain',
  '.wasm': 'application/wasm', '.pdf': 'application/pdf'
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
setTimeout(() => process.exit(124), 600000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});

// ---------------------------------------------------------------------------
// Fixtures — printed by Chrome itself (like real-world browser-exported PDFs).
// ---------------------------------------------------------------------------
const P = (body) => `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: A4; margin: 18mm; }
body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.9; }
p { margin: 0 0 10px; }
</style></head><body>${body}</body></html>`;

const fixtures = {
  en: P(`<p>Quarterly Report 2026</p>
      <p>The quick brown fox jumps over the lazy dog near the river bank today.</p>
      <p>Total invoice 1500 USD for the month of January</p>
      <p>tiny footnote line</p>`),
  ar: P(`<div dir="rtl"><p>تقرير الربع الأول للمشروع</p>
      <p>هذا نص عربي بسيط للاختبار يحتوي على كلمات مختلفة وعلامات ترقيم.</p>
      <p>القيمة 1500 دولار عن شهر يناير</p>
      <p>ملاحظة صغيرة هنالك</p></div>`),
  mixed: P(`<div dir="rtl"><p>التقرير Medical Report 2026</p>
      <p>تم إعداد المستند Day 3 مع الأرقام 45 و 90 بنجاح.</p>
      <p>اسم العميل John Doe رقم 12345</p></div>`)
};
fs.mkdirSync(path.join(ROOT, '__pdfdiag', 'fx'), { recursive: true });
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function openSmartPdf(page) {
  await page.evaluate(() => {
    const b = document.querySelector('.feature-nav-btn[data-action="open-smart-pdf"]');
    if (b) b.click();
  });
  await sleep(450);
}
async function upload(page, file) {
  const input = await page.$('#smartPdfFileInput');
  await input.uploadFile(file);
  let ready = false;
  const s0 = Date.now();
  while (Date.now() - s0 < 30000) {
    ready = await page.evaluate(() => {
      const v = document.getElementById('smartPdfViewerArea');
      return !!v && !v.hidden &&
        document.querySelectorAll('#smartPdfViewerPages .smart-pdf-text-layer > span').length >= 3;
    });
    if (ready) break;
    await sleep(150);
  }
  await sleep(600);
  return ready;
}

const INVENTORY = () => {
  const spans = [...document.querySelectorAll('#smartPdfViewerPages .smart-pdf-text-layer > span')];
  return spans.map((s) => {
    const r = s.getBoundingClientRect();
    return {
      t: (s.textContent || '').slice(0, 60),
      dir: s.getAttribute('dir'),
      x: Math.round(r.left), y: Math.round(r.top),
      w: Math.round(r.width), h: Math.round(r.height)
    };
  });
};

// Click a span, select ALL its text, type `replacement`, then measure.
async function editAndMeasure(page, needle, replacement) {
  const clicked = await page.evaluate((n) => {
    const spans = [...document.querySelectorAll('#smartPdfViewerPages .smart-pdf-text-layer > span')];
    const s = spans.find((el) => (el.textContent || '').includes(n));
    if (!s) return false;
    const r = s.getBoundingClientRect();
    const cx = r.left + Math.min(r.width / 2, 6), cy = r.top + r.height / 2;
    const ev = new MouseEvent('click', { bubbles: true, clientX: cx, clientY: cy });
    s.dispatchEvent(ev);
    return document.querySelector('.smart-pdf-text-editing') === s;
  }, needle);
  if (!clicked) return { clicked };
  await sleep(150);
  await page.evaluate(() => {
    const s = document.querySelector('.smart-pdf-text-editing');
    const node = s.firstChild;
    const r = document.createRange();
    r.setStart(node, 0); r.setEnd(node, node.data.length);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
  });
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.type(replacement, { delay: 12 });
  await sleep(300);
  const during = await page.evaluate(() => {
    const s = document.querySelector('.smart-pdf-text-editing');
    if (!s) return { err: 'no editing span' };
    const cs = getComputedStyle(s);
    const r = s.getBoundingClientRect();
    const node = s.firstChild;
    const rng = document.createRange();
    rng.selectNodeContents(s);
    const rects = [...rng.getClientRects()].map((q) => ({
      x: Math.round(q.left), y: Math.round(q.top), w: Math.round(q.width), h: Math.round(q.height)
    }));
    let caret = null;
    try {
      const c = document.createRange();
      c.setStart(node, node.data.length); c.collapse(true);
      const q = c.getClientRects()[0] || c.getBoundingClientRect();
      caret = q ? { x: Math.round(q.left), y: Math.round(q.top), w: Math.round(q.width), h: Math.round(q.height) } : null;
    } catch (e) {}
    const layer = s.parentElement;
    const sibs = [...layer.children].filter((el) => el !== s);
    const overlaps = [];
    for (const b of sibs) {
      const q = b.getBoundingClientRect();
      const ox = Math.min(r.right, q.right) - Math.max(r.left, q.left);
      const oy = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top);
      if (ox > 1 && oy > 1) overlaps.push({ t: (b.textContent || '').slice(0, 30), ox: Math.round(ox), oy: Math.round(oy) });
    }
    return {
      text: s.textContent,
      dir: s.getAttribute('dir'),
      style: { maxWidth: s.style.maxWidth, whiteSpace: s.style.whiteSpace, overflow: s.style.overflow, height: s.style.height, left: s.style.left, right: s.style.right, minWidth: s.style.minWidth },
      box: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
      lineHeight: cs.lineHeight, fontSize: cs.fontSize,
      lineCount: rects.length, rects, caret, overlaps
    };
  });
  await page.evaluate(() => {
    const s = document.querySelector('.smart-pdf-text-editing');
    if (s) s.blur();
  });
  await sleep(250);
  const after = await page.evaluate(() => {
    const spans = [...document.querySelectorAll('#smartPdfViewerPages .smart-pdf-text-layer > span')];
    const s = spans.find((el) => el.classList.contains('smart-pdf-text-edited'));
    if (!s) return { err: 'no edited span' };
    const r = s.getBoundingClientRect();
    const rng = document.createRange(); rng.selectNodeContents(s);
    const rects = [...rng.getClientRects()].map((q) => ({ x: Math.round(q.left), y: Math.round(q.top), w: Math.round(q.width), h: Math.round(q.height) }));
    return { text: s.textContent, dir: s.getAttribute('dir'), box: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }, lineCount: rects.length, rects, style: { maxWidth: s.style.maxWidth, whiteSpace: s.style.whiteSpace } };
  });
  return { clicked, during, after };
}

const pdfPages = await browser.newPage();
await pdfPages.setViewport({ width: 1000, height: 1200 });
const fxPaths = {};
for (const [k, html] of Object.entries(fixtures)) {
  await pdfPages.setContent(html, { waitUntil: 'load' });
  const out = path.join(ROOT, '__pdfdiag', 'fx', `${k}.pdf`);
  await pdfPages.pdf({ path: out, format: 'A4', printBackground: false });
  fxPaths[k] = out;
  console.log('fixture', k, fs.statSync(out).size, 'bytes');
}

// ---------------------------------------------------------------------------
const which = process.argv[2] || 'all';
const jobs = [];
if (which === 'all' || which === 'en') jobs.push(['en', 'brown', 'BROWNIEJUMP']);
if (which === 'all' || which === 'ar') jobs.push(['ar', 'بسيط', 'مستخدمبشكلكبير']);
if (which === 'all' || which === 'mixed') jobs.push(['mixed', 'Medical', 'MedicalXReport2026']);

const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', String((e && e.message) || e)));
await page.setViewport({ width: 1280, height: 900 });
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
await sleep(700);

for (const [key, needle, repl] of jobs) {
  await openSmartPdf(page);
  const ok = await upload(page, fxPaths[key]);
  console.log('\n====', key, 'uploaded=', ok);
  if (!ok) continue;
  const inv = await page.evaluate(INVENTORY);
  console.log('INVENTORY', JSON.stringify(inv));
  const res = await editAndMeasure(page, needle, repl);
  console.log('EDIT', JSON.stringify(res, null, 1));
  await page.evaluate(() => { const b = document.getElementById('smartPdfBackBtn'); if (b) b.click(); });
  await sleep(400);
}

await browser.close();
server.close();
process.exit(0);

