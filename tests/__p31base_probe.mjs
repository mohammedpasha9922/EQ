// PART 30 triage probe — BASELINE (git HEAD app/index/styles): mobile-first 390px.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const BASE = path.join(ROOT, '_p31base');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8473;
const FIXTURE = path.join(ROOT, '__notes_test', '_p19_fixture_2p.pdf');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.pdf': 'application/pdf' };
const server = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!p || p === '/') p = '/index.html';
    let f = path.join(BASE, p);
    if (!fs.existsSync(f)) f = path.join(ROOT, p);
    res.writeHead(200, { 'Content-Type': (MIME[path.extname(p)] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(fs.readFileSync(f));
  } catch (e) { if (!res.headersSent) { res.writeHead(404); res.end('nf'); } }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e.message || e)));
const out = [];
const log = (k, v) => { out.push(k + ' => ' + JSON.stringify(v)); console.log(k, JSON.stringify(v)); fs.writeFileSync(path.join(ROOT, '__p31base_out.txt'), out.join('\n')); };
await page.setViewport({ width: 390, height: 844 });
await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 }); await sleep(800);
const FIXTURE_B64 = fs.readFileSync(FIXTURE).toString('base64');
await page.evaluate(async (b64) => {
  const bin = atob(b64); const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const dt = new DataTransfer(); dt.items.add(new File([u8], 'p30_style_doc.pdf', { type: 'application/pdf' }));
  const fi = document.getElementById('smartImportFileInput');
  fi.files = dt.files; fi.dispatchEvent(new Event('change', { bubbles: true }));
}, FIXTURE_B64);
for (let i = 0; i < 120; i++) {
  const ok = await page.evaluate(() => {
    const ed = document.getElementById('smartEditorView');
    return !!(ed && ed.classList.contains('editor-visible') && document.querySelectorAll('#smartPdfEditor .smart-pdf-page').length >= 1 && document.querySelectorAll('#smartPdfEditor .smart-pdf-text').length > 0);
  });
  if (ok) break;
  await sleep(300);
}
await sleep(500);
log('BASE-mobile390', await page.evaluate(() => {
  const ed = document.getElementById('smartEditorView');
  const bd = document.getElementById('smartDocsModal');
  const btn = document.getElementById('smartPdfStyleBtn');
  const r = btn ? btn.getBoundingClientRect() : null;
  return {
    editorDisplay: ed ? getComputedStyle(ed).display : null,
    editorVisible: ed ? ed.classList.contains('editor-visible') : null,
    backdropCls: bd ? bd.className : null,
    styleBtn: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null
  };
}));
log('BASE-errors', errs.slice(0, 5));
await browser.close(); server.close(); process.exit(0);
