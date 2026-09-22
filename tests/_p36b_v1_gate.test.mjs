import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8396;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon' };
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
setTimeout(() => { console.error('TIMEOUT'); process.exit(124); }, 180000).unref();

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1280,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e && e.message || e).slice(0, 300)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + String(m.text()).slice(0, 300)); });
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => document.body && document.body.getAttribute('data-pdf-v1') === '1', { timeout: 30000 });
const out = await page.evaluate(() => {
  const r = {};
  r.gate = document.body.getAttribute('data-pdf-v1');
  const ws = document.getElementById('pdfReportsWorkspace');
  r.wsExists = !!ws;
  const cs = (id) => { const el = document.getElementById(id); if (!el) return 'missing'; return getComputedStyle(el).display; };
  r.scanCardTitle = (document.querySelector('#pdfScanCreateCard .smart-doc-card-title') || {}).textContent || null;
  r.recentHidden = cs('pdfRecentList') === 'none' || !!document.querySelector('.pdf-recent-section') && getComputedStyle(document.querySelector('.pdf-recent-section')).display === 'none';
  r.markHidden = cs('smartPdfMarkWrap');
  r.styleHidden = cs('smartPdfStyleWrap');
  r.sigPanelHidden = cs('smartPdfSigPanel');
  r.dateMenuHidden = cs('smartPdfDateMenu');
  const items = Array.from(document.querySelectorAll('#smartPdfAddMenu .smart-pdf-add-item')).map(b => b.getAttribute('data-add') + ':' + getComputedStyle(b).display);
  r.addItems = items;
  r.dupHidden = (() => { const el = document.querySelector('[data-pact="dup"]'); return el ? getComputedStyle(el).display : 'missing'; })();
  r.movesHidden = Array.from(document.querySelectorAll('.smart-pdf-page-move')).map(b => getComputedStyle(b).display);
  r.shareHidden = cs('smartPdfShareBtn');
  r.sendHidden = cs('smartEditorSendBtn');
  // workspace open check
  return r;
});
// open workspace via drawer
await page.evaluate(() => { const b = document.querySelector('[data-action="open-pdf-reports"]'); if (b) b.click(); });
await new Promise((r) => setTimeout(r, 800));
const ws = await page.evaluate(() => {
  const w = document.getElementById('pdfReportsWorkspace');
  const vis = w ? getComputedStyle(w).display : 'missing';
  const hasShow = w ? w.classList.contains('show') : false;
  const card = document.getElementById('pdfScanCreateCard');
  const cr = card ? card.getBoundingClientRect() : null;
  const open = document.getElementById('pdfOpenCard');
  const orr = open ? open.getBoundingClientRect() : null;
  return { vis, hasShow, cardRect: cr ? { x: cr.x, y: cr.y, w: cr.width, h: cr.height } : null, openRect: orr ? { x: orr.x, y: orr.y, w: orr.width, h: orr.height } : null };
});
console.log(JSON.stringify({ ...out, ws }, null, 2));
console.log('ERRORS=' + JSON.stringify(errors.slice(0, 20)));
await browser.close();
server.close();
