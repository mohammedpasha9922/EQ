// Decisive overlap detector for Arabic RTL History PDF rendering.
// Renders the EXACT report HTML (mirroring buildHistoryPdfBlob) two ways:
//   A) html2canvas  -> the exact pre-image the PDF embeds.
//   B) browser-native element screenshot (ground-truth layout).
// For every table cell + total + footer it counts cross-cell ink collisions
// (a dark pixel of region i landing STRICTLY inside a neighbour region j's
//  interior = overlap/garbling), border-proof.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  const f = path.join(ROOT, p);
  try { const d = fs.readFileSync(f); res.writeHead(200, { 'Content-Type': (MIME[path.extname(f).toLowerCase()] || 'application/octet-stream') + '; charset=utf-8' }); res.end(d); }
  catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise((r, rej) => { server.once('error', rej); server.listen(0, '127.0.0.1', r); });
const BASE = `http://127.0.0.1:${server.address().port}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
setTimeout(() => process.exit(124), 200000);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage', '--force-color-profile=srgb'] });
let out = { collisionsA: -1, cells: [], native: null, error: null };
try {
  const page = await browser.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.setViewport({ width: 1280, height: 1000 });
  await sleep(2000);
  const h2pdf = fs.readFileSync(path.join(ROOT, '__pdfdiag/vendor/h2canvas.js'), 'utf8');
  await page.addScriptTag({ content: h2pdf });
  out = await page.evaluate(async () => {
  const R = { collisionsA: -1, cells: [], hostPng: null, error: null };
  function xsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function cellDir(t) { return /[\u0600-\u06FF]/.test(String(t || '').trim()) ? 'rtl' : 'auto'; }
  const entries = [
    { id: 'a1', exp: '250 + 75', res: '325', note: 'فاتورة شهر أغسطس 2026' },
    { id: 'a2', exp: '1250 x 4', res: '5,000', note: 'قيمة المشروع 2026 بالألف' },
    { id: 'a3', exp: '500 - 120', res: '380', note: 'رصيد المحفظة بعد العملية' }
  ];
  const rows = entries.map((e, i) => `
      <tr>
        <td class="col-num">${i + 1}</td>
        <td class="col-expr" dir="${cellDir(e.exp)}">${xsc(e.exp)}</td>
        <td class="col-result" dir="${cellDir(e.res)}">${xsc(e.res)}</td>
        <td class="col-note" dir="${cellDir(e.note)}">${e.note ? xsc(e.note) : '&mdash;'}</td>
      </tr>`).join('');
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#000;background:#fff;text-align:center}
      .report{width:794px;padding:36px 40px;margin:0 auto}
      table.history-table{width:100%;border-collapse:collapse;table-layout:fixed}
      table.history-table th,table.history-table td{border:1px solid #cbd5e1;padding:7px 8px;text-align:center;vertical-align:middle;overflow-wrap:anywhere;word-break:break-word}
      table.history-table thead th{background:#0d9488;color:#ffffff;font-size:12px;text-transform:uppercase;letter-spacing:.4px}
      table.history-table tbody tr{page-break-inside:avoid;break-inside:avoid;background:#ffffff}
      td.col-num{width:8%;font-weight:700}td.col-expr{width:37%;font-weight:600}td.col-result{width:20%;font-weight:800}td.col-note{width:35%}
      .total-summary{margin:20px auto 0;max-width:480px;padding:12px 16px;background:#e0f2f1;border:1px solid #0d9488;border-radius:6px;text-align:center}
      .total-summary .total-summary-total{font-size:15px;font-weight:800}
      .total-summary .total-summary-words{margin-top:4px;font-size:13px}
      .report-footer{margin-top:28px;padding-top:12px;border-top:2px solid #0891b2;text-align:center}
      .report-footer .footer-brand{font-size:12px;font-weight:700}
      .report-footer .footer-tagline{font-size:11px;font-style:italic}
    </style></head><body>
    <div class="report" id="report">
      <div class="report-header"><h1>EQ Calculator</h1><div class="meta" dir="rtl">الخميس، ٢٧ أغسطس — 10:00:00</div></div>
      <table class="history-table"><thead><tr><th class="col-num">#</th><th class="col-expr">Calculation</th><th class="col-result">Result</th><th class="col-note">Note</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="total-summary" dir="rtl"><div class="total-summary-total">المجموع الكلي: 5,680</div><div class="total-summary-words">${xsc('ألفان ومئتان فقط')}</div></div>
      <div class="report-footer"><div class="footer-brand" dir="rtl">تم الإنشاء باستخدام EQ Calculator</div><div class="footer-tagline" dir="rtl">Smart calculations. Simple results.</div></div>
    </div></body></html>`;
  const host = document.createElement('div');
  host.id = 'eq-host';
  host.style.cssText = 'position:absolute;left:-20000px;top:0;width:794px;background:#ffffff;';
  host.innerHTML = html;
  document.body.appendChild(host);
  const rep = host.querySelector('#report');
  await new Promise(r => setTimeout(r, 400));
  const A = await window.html2canvas(rep, { scale: 1, backgroundColor: '#ffffff' });
  // Regions relative to the report, inset to exclude the 1px cell borders.
  const ro = rep.getBoundingClientRect();
  const regions = [];
  rep.querySelectorAll('td, th, .total-summary-total, .total-summary-words, .footer-brand, .footer-tagline').forEach((el, i) => {
    const r = el.getBoundingClientRect();
    regions.push({ name: el.className || ('el' + i), x: r.left - ro.left, y: r.top - ro.top, w: r.width, h: r.height });
  });
  return { pngA: A.toDataURL('image/png'), regions, reportW: ro.width, reportH: ro.height };
  });
  // Native ground-truth: real browser raster of the very same element.
  const elh = await page.$('#eq-host #report');
  const bb = await elh.boundingBox();
  const bufB = await page.screenshot({ clip: { x: bb.x, y: bb.y, width: bb.width, height: bb.height }, type: 'png' });
  const pngB = 'data:image/png;base64,' + bufB.toString('base64');
  const verdict = await page.evaluate(async (pngA, pngB, regions, reportW, reportH) => {
    function loadImg(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
    function analyze(src, regions, rw, rh) {
      const c = document.createElement('canvas'); c.width = rw; c.height = rh;
      const cx = c.getContext('2d', { willReadFrequently: true });
      return loadImg(src).then(im => {
        cx.fillStyle = '#fff'; cx.fillRect(0, 0, rw, rh);
        cx.drawImage(im, 0, 0, rw, rh);
        const d = cx.getImageData(0, 0, rw, rh).data;
        const ink = (x, y) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= rw || y >= rh) return false; const i = (y * rw + x) * 4; return d[i] < 120 && d[i + 1] < 120 && d[i + 2] < 120; };
        // Text must not intrude into the inner 3..7px strip beside a cell border
        // (8px padding). Any ink there = glyph touching/crossing the border.
        const bad = [];
        for (const rg of regions) {
          const x0 = Math.round(rg.x), y0 = Math.round(rg.y), x1 = Math.round(rg.x + rg.w), y1 = Math.round(rg.y + rg.h);
          const iy0 = y0 + 3, iy1 = y1 - 3;
          let cnt = 0;
          for (let y = iy0; y < iy1; y++) {
            for (let x = x0 + 3; x < x0 + 7; x++) if (ink(x, y)) cnt++;
            for (let x = x1 - 7; x < x1 - 3; x++) if (ink(x, y)) cnt++;
          }
          if (cnt > 0) bad.push({ name: rg.name, cnt });
        }
        return bad;
      });
    }
    const a = await analyze(pngA, regions, reportW, reportH);
    const b = await analyze(pngB, regions, reportW, reportH);
    return { html2canvasOverflows: a, nativeOverflows: b, cells: regions.length };
  }, out.pngA, pngB, out.regions, out.reportW, out.reportH);
  console.log(JSON.stringify(verdict, null, 2));
  const fail = verdict.html2canvasOverflows.length > 0;
  console.log(fail ? 'FAIL: text overflow/garbling detected in html2canvas pre-image' : 'PASS: no text overflow/garbling detected');
  process.exitCode = fail ? 1 : 0;
} catch (e) {
  console.log('ERROR: ' + (e && e.stack || e));
  process.exitCode = 2;
} finally {
  await browser.close().catch(() => {});
  server.close();
}

