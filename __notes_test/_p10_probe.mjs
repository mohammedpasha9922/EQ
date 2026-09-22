import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8261;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml' };
const server = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!p || p === '/') p = '/index.html';
    res.writeHead(200, { 'Content-Type': (MIME[path.extname(p).toLowerCase()] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(fs.readFileSync(path.join(ROOT, p)));
  } catch (e) { if (!res.headersSent) { res.writeHead(404); res.end('nf'); } }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
await sleep(300);
await page.evaluate(() => { localStorage.removeItem('eq-note-manager-notes'); localStorage.removeItem('eq-note-folders'); });
const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const notes = [
  { id: 'plain', title: 'Plain', body: 'x', folderId: 'personal' },
  { id: 'r1', title: 'R1 h1block', body: 'Intro paragraph', bodyFormatting: [], folderId: 'personal',
    bodyBlocks: [ { type: 'text', body: 'Nested heading', formatting: [{ t: 'h1' }] } ] },
  { id: 'r2', title: 'R2 checklist', body: '', bodyFormatting: [], folderId: 'personal',
    bodyBlocks: [ { type: 'checklist', items: [{ text: 'item one', checked: true }, { text: 'item two', checked: false }] } ] },
  { id: 'r3', title: 'R3 divider', body: '', bodyFormatting: [], folderId: 'personal',
    bodyBlocks: [ { type: 'divider' } ] },
  { id: 'r4', title: 'R4 table', body: '', bodyFormatting: [], folderId: 'personal',
    bodyBlocks: [ { type: 'table', header: true, rows: [[{ text: 'Name', formatting: [] }, { text: 'Value', formatting: [] }]] } ] },
  { id: 'r5', title: 'R5 image', body: '', bodyFormatting: [], folderId: 'personal',
    bodyBlocks: [ { type: 'image', src: pixel, alt: 'test', width: 120, align: 'center' } ] },
  { id: 'rRich', title: 'Rich Content', body: 'Intro paragraph', bodyFormatting: [],
    bodyBlocks: [
      { type: 'text', body: 'Nested heading', formatting: [{ t: 'h1' }] },
      { type: 'checklist', items: [{ text: 'item one', checked: true }, { text: 'item two', checked: false }] },
      { type: 'divider' },
      { type: 'table', header: true, rows: [[{ text: 'Name', formatting: [] }, { text: 'Value', formatting: [] }]] },
      { type: 'image', src: pixel, alt: 'test', width: 120, align: 'center' }
    ] }
];
await page.evaluate((k, n) => localStorage.setItem(k, JSON.stringify(n)), 'eq-note-manager-notes', notes);
await page.evaluate((k) => localStorage.setItem(k, JSON.stringify([{ id: 'personal', name: 'Personal' }])), 'eq-note-folders');
await page.reload({ waitUntil: 'load', timeout: 60000 });
await sleep(400);
await page.waitForSelector('.drawer-menu-item[data-action="open-notes"]', { timeout: 10000 });
await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 6000 });
await sleep(400);
const diag = await page.evaluate(() => {
  const items = Array.from(document.querySelectorAll('#notesList .note-item')).map((li) => ({
    id: li.getAttribute('data-note-id'),
    title: (li.querySelector('.note-item-title') || {}).textContent
  }));
  let rawNotes = []; try { rawNotes = JSON.parse(localStorage.getItem('eq-note-manager-notes') || '[]'); } catch (e) {}
  const summarized = rawNotes.map((n) => ({ id: n.id, folderId: n.folderId, deletedAt: !!n.deletedAt, blocks: Array.isArray(n.bodyBlocks) ? n.bodyBlocks.map((b) => b.type) : 'none' }));
  return { items, raw: summarized };
});
console.log(JSON.stringify(diag, null, 2));
try { await browser.close(); } catch (e) {}
try { server.close(); } catch (e) {}
process.exit(0);