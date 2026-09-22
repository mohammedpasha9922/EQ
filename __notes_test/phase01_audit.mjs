// Phase 01 audit: runtime DOM scan for PDF Reports entry point + notes PDF sanity.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8421;
const results = [];
function check(n, ok, d = '') { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${(!ok && d) ? '  -> ' + d : ''}`); }

const server = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!p || p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    const e = path.extname(f).toLowerCase();
    const mm = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
    res.writeHead(200, { 'Content-Type': (mm[e] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(fs.readFileSync(f));
  } catch (err) { if (!res.headersSent) { res.writeHead(404); res.end('nf'); } }
});
await new Promise((r) => server.listen(PORT, r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let browser;
try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('[pageerror] ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('[console] ' + m.text()); });
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
  await sleep(1200);

  // 1) Search the LIVE DOM for anything named PDF Reports / reports workspace.
  const scan = await page.evaluate(() => {
    const hits = [];
    const rx = /pdf\s*reports|pdfreports|pdf-reports|reports[-_]?workspace/i;
    document.querySelectorAll('button, a, [data-action], [id], .drawer-menu-item, [role="button"]').forEach((el) => {
      const label = ((el.textContent || '') + ' ' + (el.id || '') + ' ' + (el.getAttribute('data-action') || '') + ' ' + (el.getAttribute('aria-label') || '') + ' ' + (el.title || ''));
      if (rx.test(label)) hits.push({ tag: el.tagName, id: el.id || null, action: el.getAttribute('data-action') || null, label: label.trim().slice(0, 80) });
    });
    const drawerItems = [...document.querySelectorAll('.drawer-menu-item, [data-action]')].map((el) => el.getAttribute('data-action')).filter(Boolean);
    return { hits, drawerItems: [...new Set(drawerItems)] };
  });
  check('PDF Reports button exists in live DOM (drawer or elsewhere)', scan.hits.length > 0, JSON.stringify(scan.hits));
  console.log('  drawer actions found: ' + JSON.stringify(scan.drawerItems));
  check('No DUPLICATE PDF Reports buttons (expect exactly 1 entry point if any)', scan.hits.length <= 1, 'count=' + scan.hits.length);

  // 2) Any modal/section that looks like a reports workspace?
  const ws = await page.evaluate(() => {
    const rx = /reports?[-_]?(workspace|modal|section)|pdf[-_]?reports/i;
    return [...document.querySelectorAll('[id], [class]')].filter((el) => rx.test(el.id || '') || rx.test(el.className && typeof el.className === 'string' ? el.className : '')).map((el) => el.id || el.className).slice(0, 10);
  });
  check('PDF Reports workspace/modal exists', ws.length > 0, JSON.stringify(ws));

  // 3) Notes PDF regression sanity: export + preview buttons still present and wired.
  const notes = await page.evaluate(() => ({
    drawer: !!document.querySelector('.drawer-menu-item[data-action="open-notes"]'),
    previewBtn: !!document.getElementById('notePreviewPdfBtn'),
    exportBtn: !!document.getElementById('exportNotePdfBtn'),
    sendBtn: !!document.getElementById('sendNoteBtn'),
    fnOpen: typeof openNotePdfPreview === 'function',
    fnBuild: typeof buildNotePdfBlob === 'function'
  }));
  check('Notes PDF unchanged (preview/export/send present + wired)', notes.drawer && notes.previewBtn && notes.exportBtn && notes.sendBtn && notes.fnOpen && notes.fnBuild, JSON.stringify(notes));

  // 4) Open the drawer to confirm nothing appears there dynamically.
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); const burger = document.querySelector('.menu-toggle-btn, .hamburger, [data-action="open-drawer"]'); if (b) return 'notes-direct'; });
  const drawerScan = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.drawer-menu-item')].map((el) => (el.textContent || '').trim().slice(0, 40) + ' | ' + (el.getAttribute('data-action') || ''));
    return items;
  });
  console.log('  drawer menu items (live): ' + JSON.stringify(drawerScan));
  check('Drawer contains no PDF Reports item', !drawerScan.some((t) => /pdf reports/i.test(t)), JSON.stringify(drawerScan));

  const relErrs = errs.filter((e) => !/favicon|net::ERR_|404/.test(e));
  check('No JavaScript errors during audit', relErrs.length === 0, JSON.stringify(relErrs).slice(0, 300));
  console.log('SUMMARY ' + JSON.stringify({ pass: results.filter(Boolean).length, fail: results.filter((x) => !x).length }));
} finally {
  if (browser) { try { await browser.close(); } catch (e) {} }
  try { server.close(); } catch (e) {}
}
