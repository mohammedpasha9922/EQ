// PHASE 37D — multi-page regression only (real 60-entry History PDF).
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
setTimeout(() => process.exit(124), 480000);
const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const failures = [];
const check = (name, ok, extra) => { console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (extra ? '  [' + extra + ']' : '')); if (!ok) failures.push(name); };
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 40000 });
  await sleep(1500);
  const many = Array.from({ length: 60 }, (_, i) => ({ expression: `${i} + ${i}`, result: String(2 * i), note: '' }));
  const res = await page.evaluate(async (ents) => {
    window.__m = null;
    const origRemove = document.body.removeChild.bind(document.body);
    document.body.removeChild = function (el) {
      try { if (el && el.tagName === 'IFRAME' && el.contentDocument && el.contentDocument.getElementById('report')) window.__m = el.contentDocument; } catch (e) {}
      return origRemove(el);
    };
    const blob = await window.__historyPdfBlob(ents, 'Multi Page Co');
    document.body.removeChild = origRemove;
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = ''; for (const c of buf) s += String.fromCharCode(c);
    const report = window.__m.getElementById('report');
    const rr = report.getBoundingClientRect();
    const hr = report.querySelector('.hdr-title h1').getBoundingClientRect();
    return {
      head: s.slice(0, 5), size: s.length,
      pages: (s.match(/\/Type\s*\/Page[^s]/g) || []).length,
      rows: report.querySelectorAll('.history-table tbody tr').length,
      total: report.querySelector('.total-summary-total') ? report.querySelector('.total-summary-total').textContent : '',
      off: +(Math.abs((hr.left + hr.width / 2) - (rr.left + rr.width / 2))).toFixed(2)
    };
  }, many);
  check('multi-page: real PDF generated', res.head === '%PDF-' && res.size > 500, res.size + ' bytes');
  check('multi-page: PDF spans multiple pages', res.pages >= 2, 'pages=' + res.pages);
  check('multi-page: all 60 rows present', res.rows === 60, 'rows=' + res.rows);
  check('multi-page: Total summary correct', res.total.replace(/[^0-9]/g, '') === '3540', 'total=' + res.total);
  check('multi-page: title page-centered', res.off < 2, 'off=' + res.off);
  const clean = errs.filter(e => !/favicon|net::ERR_|Failed to load resource|speech/i.test(e));
  check('no new JS errors', clean.length === 0, clean.slice(0, 2).join(' | '));
  console.log(failures.length === 0 ? 'ALL PASS: multi-page regression verified' : 'FAILURES: ' + failures.join('; '));
  process.exitCode = failures.length === 0 ? 0 : 1;
} catch (e) { console.log('ERROR: ' + (e && e.stack || e)); process.exitCode = 2; }
finally { await browser.close().catch(() => {}); server.close(); }

