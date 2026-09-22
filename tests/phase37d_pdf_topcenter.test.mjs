// PHASE 37D — History PDF top-center text (company name / fallback branding).
// Real Chrome + the REAL buildHistoryPdfBlob generator. Verifies:
//  - title/company text centered on the true PDF PAGE center;
//  - company name when saved, existing fallback branding when empty;
//  - all 8 app languages incl. RTL (ar, ku), no drift;
//  - no clipping, no overlap with logo/date blocks;
//  - real PDF blob produced; multi-page regression.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mjs': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/' || p === '') p = '/index.html';
  try { const d = fs.readFileSync(path.join(ROOT, p)); res.writeHead(200, { 'Content-Type': (MIME[path.extname(p).toLowerCase()] || 'application/octet-stream') + '; charset=utf-8' }); res.end(d); }
  catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
setTimeout(() => process.exit(124), 600000);
const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const failures = [];
const check = (name, ok, extra) => { console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (extra ? '  [' + extra + ']' : '')); if (!ok) failures.push(name); };
// Build a real PDF via the app's generator, keeping the rasterized report DOM,
// then measure it (the exact DOM html2canvas screenshots into the PDF).
async function buildAndMeasure({ ents, comp }) {
  window.__m = null;
  const origRemove = document.body.removeChild.bind(document.body);
  document.body.removeChild = function (el) {
    try { if (el && el.tagName === 'IFRAME' && el.contentDocument && el.contentDocument.getElementById('report')) window.__m = el.contentDocument; } catch (e) {}
    return origRemove(el);
  };
  const blob = await window.__historyPdfBlob(ents, comp || undefined);
  document.body.removeChild = origRemove;
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = ''; for (const c of buf) s += String.fromCharCode(c);
  const report = window.__m && window.__m.getElementById('report');
  let geo = null;
  if (report) {
    const rr = report.getBoundingClientRect();
    const pageCenter = rr.left + rr.width / 2;
    const h1 = report.querySelector('.hdr-title h1');
    const sub = report.querySelector('.hdr-title .sub');
    const hr = h1.getBoundingClientRect();
    const date = report.querySelector('.hdr-date').getBoundingClientRect();
    const logo = report.querySelector('.hdr-logo').getBoundingClientRect();
    const hits = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
    geo = {
      off: +(Math.abs((hr.left + hr.width / 2) - pageCenter)).toFixed(2),
      subOff: sub ? +(Math.abs((sub.getBoundingClientRect().left + sub.getBoundingClientRect().width / 2) - pageCenter)).toFixed(2) : null,
      clip: (hr.left < rr.left - 0.5 || hr.right > rr.right + 0.5),
      overlapDate: hits(hr, date), overlapLogo: hits(hr, logo),
      rows: report.querySelectorAll('.history-table tbody tr').length,
      title: h1.textContent
    };
  }
  return { pdf: s.slice(0, 5), size: s.length, raw: s, geo };
}
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });
  const consoleErrors = [];
  page.on('pageerror', e => consoleErrors.push(String(e)));
  const LOCALES = ['en', 'ar', 'ku', 'fr', 'de', 'es', 'ru', 'tr'];
  const ENTRIES = [
    { expression: '2 + 3', result: '5', note: 'n1' },
    { expression: '10 * 4', result: '40', note: '' },
    { expression: '100 / 8', result: '12.5', note: 'long note text here' }
  ];
  for (const loc of LOCALES) {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 40000 });
    await page.evaluate((l) => { try { localStorage.setItem('eq-language', l); } catch (e) {} }, loc);
    await page.reload({ waitUntil: 'load', timeout: 40000 });
    await sleep(1200);
    for (const [label, company] of [['company', 'Al Baraka Wholesale Trading'], ['fallback', '']]) {
      await page.evaluate((c) => { try { if (c) localStorage.setItem('eq-history-company-name', c); else localStorage.removeItem('eq-history-company-name'); } catch (e) {} }, company);
      const res = await page.evaluate(buildAndMeasure, { ents: ENTRIES, comp: company });
      check(`${loc}/${label}: real PDF blob generated (${res.size} bytes)`, res.size > 500 && res.pdf === '%PDF-');
      const m = res.geo;
      check(`${loc}/${label}: rasterized report captured`, !!m);
      if (!m) continue;
      check(`${loc}/${label}: title page-centered (<2px)`, m.off < 2, 'off=' + m.off);
      check(`${loc}/${label}: no clipping`, !m.clip);
      check(`${loc}/${label}: no overlap with logo/date`, !m.overlapDate && !m.overlapLogo);
      check(`${loc}/${label}: table rows intact`, m.rows === ENTRIES.length, 'rows=' + m.rows);
      check(`${loc}/${label}: ${label === 'company' ? 'company name' : 'fallback brand'} used`,
        label === 'company' ? m.title === 'Al Baraka Wholesale Trading' : m.title === 'EQ7 Calculator', 'title=' + m.title);
      if (label === 'fallback') check(`${loc}/fallback: subtitle centered`, m.subOff !== null && m.subOff < 2, 'off=' + m.subOff);
    }
  }
  // Multi-page regression: many entries → real multi-page PDF; header only on page 1.
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 40000 });
  await sleep(1200);
  const many = Array.from({ length: 60 }, (_, i) => ({ expression: `${i} + ${i}`, result: String(2 * i), note: '' }));
  const res = await page.evaluate(buildAndMeasure, { ents: many, comp: 'Multi Page Co' });
  const pageCount = (res.raw.match(/\/Type\s*\/Page[^s]/g) || []).length;
  check('multi-page: PDF spans multiple pages', pageCount >= 2, 'pages=' + pageCount);
  const m = res.geo;
  check('multi-page: rasterized report captured', !!m);
  if (m) {
    check('multi-page: title still page-centered', m.off < 2, 'off=' + m.off);
    check('multi-page: rows intact', m.rows === many.length, 'rows=' + m.rows);
  }
  const newErrors = consoleErrors.filter(e => !/favicon|net::ERR_|Failed to load resource|speech/i.test(e));
  check('no new JS errors', newErrors.length === 0, newErrors.slice(0, 3).join(' | '));
  console.log(failures.length === 0 ? 'ALL PASS: PHASE 37D verified' : 'FAILURES: ' + failures.join('; '));
  process.exitCode = failures.length === 0 ? 0 : 1;
} catch (e) { console.log('ERROR: ' + (e && e.stack || e)); process.exitCode = 2; }
finally { await browser.close().catch(() => {}); server.close(); }
