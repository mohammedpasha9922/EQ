// PART 12 diagnostic — does EXPORT mutate the stored note?
// Compares stored bodyBlocks BEFORE export vs AFTER export (semantic, key-order-insensitive),
// isolating export-induced mutation from app load/normalization.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const STORAGE_KEY = 'eq-note-manager-notes';
const FOLDERS_KEY = 'eq-note-folders';
const LANG_KEY = 'eq-language';
const PORT = 8373;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png' };
const server = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!p || p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    res.writeHead(200, { 'Content-Type': (MIME[path.extname(f).toLowerCase()] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(fs.readFileSync(f));
  } catch (e) { if (!res.headersSent) { res.writeHead(404); res.end('nf'); } }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
  window.html2pdf = function () {
    let src = null;
    const chain = { set() { return chain; }, from(el) { src = el; return chain; }, toPdf() { return chain; }, save() { return chain; }, output() {
      if (src) { try { window.__capturedHtml = src.outerHTML || ''; } catch (e) {} }
      return Promise.resolve(new Blob(['%PDF-1.5 stub'], { type: 'application/pdf' }));
    } };
    return chain;
  };
});

const now = Date.now();
const seedNote = { id: 'n-2x2', title: 'Two By Two', body: '', bodyFormatting: [], folderId: 'personal', createdAt: now - 1000, updatedAt: now - 1000,
  bodyBlocks: [
    { type: 'text', body: 'A 2x2 table.', formatting: [] },
    { type: 'table', header: true, colWidths: [120, 180],
      rows: [
        [{ text: 'Col A', formatting: [] }, { text: 'Col B', formatting: [] }],
        [{ text: 'Alpha', formatting: [] }, { text: 'Beta', formatting: [] }],
        [{ text: 'Gamma', formatting: [] }, { text: 'Delta', formatting: [] }]
      ] }
  ] };

await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
await page.evaluate((k, n, f, l) => {
  localStorage.setItem(k, JSON.stringify([n]));
  localStorage.setItem(f, JSON.stringify([{ id: 'personal', name: 'Personal' }]));
  localStorage.setItem(l, 'en');
}, STORAGE_KEY, seedNote, FOLDERS_KEY, LANG_KEY);
await page.reload({ waitUntil: 'load', timeout: 60000 }); await sleep(600);

// canonicalize: sort object keys recursively so key ORDER never matters
const canon = (v) => {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') {
    const o = {};
    Object.keys(v).sort().forEach((k) => { o[k] = canon(v[k]); });
    return o;
  }
  return v;
};
const grab = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k))[0].bodyBlocks, STORAGE_KEY);

// Open the note (app may normalize), close WITHOUT exporting → baseline
await page.evaluate(() => { document.querySelector('.drawer-menu-item[data-action="open-notes"]').click(); });
await sleep(500);
await page.evaluate(() => { const it = Array.from(document.querySelectorAll('#notesList .note-item')).find((i) => i.textContent.includes('Two By Two')); if (it) it.click(); });
await sleep(600);
await page.evaluate(() => { const b = document.getElementById('closeFullScreenNote'); if (b) b.click(); });
await sleep(500);
const before = canon(await grab());

// Now export once (Create PDF via stub)
await page.evaluate(() => { document.querySelector('.drawer-menu-item[data-action="open-notes"]').click(); });
await sleep(500);
await page.evaluate(() => { const it = Array.from(document.querySelectorAll('#notesList .note-item')).find((i) => i.textContent.includes('Two By Two')); if (it) it.click(); });
await sleep(600);
await page.evaluate(() => { const b = document.getElementById('exportNotePdfBtn'); if (b) b.click(); });
await sleep(500);
await page.evaluate(() => { const b = document.getElementById('noteExportCreateBtn'); if (b) b.click(); });
for (let i = 0; i < 30; i++) { await sleep(150); const has = await page.evaluate(() => (window.__capturedHtml || '').length > 10); if (has) break; }
await sleep(500);
await page.evaluate(() => { const b = document.getElementById('closeFullScreenNote'); if (b) b.click(); });
await sleep(500);
const after = canon(await grab());

const same = JSON.stringify(before) === JSON.stringify(after);
console.log('SEMANTIC_EQUAL=' + same);
if (!same) {
  console.log('--- BEFORE ---');
  console.log(JSON.stringify(before, null, 1).slice(0, 3000));
  console.log('--- AFTER ---');
  console.log(JSON.stringify(after, null, 1).slice(0, 3000));
}
await browser.close(); server.close();
process.exit(same ? 0 : 1);