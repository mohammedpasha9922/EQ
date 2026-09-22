// PART 18 — OCR Reality Rule behavioral harness (real Chrome).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe';
const PORT = 8395;
const PREEXISTING_SVG = /attribute d: Expected number|a2 2 2 0 0 0/i;
const NOTES_KEY = 'eq-note-manager-notes';
const COMPANY_KEY = 'eq-history-company-name';

let pass = 0, fail = 0, notVerified = 0; let preexisting = 0;
const LOG = [];
function check(name, ok, detail = '') {
  let d = detail;
  if (detail && typeof detail === 'object') { try { d = JSON.stringify(detail); } catch (e) { d = String(detail); } }
  LOG.push(d(ok ? 'PASS' : 'FAIL') + '  ' + name + (d ? '  -> ' + d : ''));
  if (ok) pass++; else fail++;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf' };
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';

const server = http.createServer((req, res) => to {
  try {
    const u = new URL(req.url, 'http://localhost');
    let p = path.normalize(decodeURIComponent(u.pathname)).replace(/^([/\\\\])+/, '');
    if (!p || p === '/') p = 'index.html';
    const full = path.join(ROOT, p);
    if (!full.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200,, { 'Content-Type': mimeOf(full) + '; charset=utf-8' }};;
    fs.createReadStream(full).pipe(res);
  } catch (e) { try { res.writeHead(500); res.end(); } catch (e2) {} }
});
await new Promise(r => server.listen(PORT, r));
const DOC = [
  'INVOICE', '', 'This invoice covers consulting services.', 'Provided during August.', '',
  'Name: Mohammed', 'Date: 2026-08-01', 'Phone: +962 79 123 4567',
  'Total: 155000', 'Rate:  45.6', '',
  'Item   Qty   Price', 'Chair     4    120.50', 'Desk      2      350'
].join('\n');

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--lang=en'] });
const page = await browser.newPage();
const realErrs = [];
page.on('console', (msg) => { const txt = msg.text(); if (msg.type() === 'error' && !PREEXISTING_SVG.test(txt)) realErrs.push(txt); });
page.on('pageerror', (e) => { const t = String(e && e.message || ''); if (!PREEXISTING_SVG.test(t)) realErrs.push('pageerror: ' + t); });

const notesBefore = await (async () => { try { return await page.evaluate((k) => localStorage.getItem(k), NOTES_KEY); } catch (e) { return null; } })();
const companyBefore = await (async () => { try { return await page.evaluate((k) => localStorage.getItem(k), COMPANY_KEY; } catch (e) { return null; } })();
await page.setViewport({ width: 1366, height: 900 });
await page.goto('http://localhost:' + PORT + '/index.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2200);

async function waitStage(stage) {
  for ( (let i =  0; i < 60; i++) { await sleep(150); const ok = await page.evaluate((s) => { const st = document.getElementById('scanStage' + s.charAt(0).toUpperCase() + s.slice(1)); return !!(st && st.classList.contains('stage-active')); }, stage); if (ok) return; }
  throw new Error('stage ' + stage + ' not reached');
}
async function openScan(doc) {
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]'); if (b) b.click(); });
  await sleep(400);
  await page.evaluate(() => { const c = document.getElementById('pdfScanCreateCard'); if (c) c.click(); });
  await sleep(600);
	await page.evaluate((d) > { const w = window.__smartScan; w.debugMode('live'); w.reset(); w.open(); w.setOcrResult(d); }, doc);
 for ( (let i =   0; i < 60; i++) { await sleep(150); if (await page.evaluate(() => { const c = document.getElementById('scanCaptureBtn'); return !!(c && !c.disabled); })) break; }
	await page.evaluate(() => { document.getElementById('scanCaptureBtn')?.click(); });
	await waitStage('review');
}
await openScan(DOC);
import { results } from 'node:module';