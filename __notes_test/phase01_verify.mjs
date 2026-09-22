// Phase 01 verification: PDF Reports entry point (implemented). Positive checks.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8427;
const results = [];
function check(n, ok, d = '') { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${(!ok && d) ? '  -> ' + d : ''}`); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function runViewport(browser, width, height, isMobile, label) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, isMobile: !!isMobile });
  const errs = [];
  page.on('pageerror', (e) => errs.push('[pageerror] ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('[console] ' + m.text()); });
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
  await sleep(1100);

  const drawerOpened = await page.evaluate(() => {
    const o = document.getElementById('drawerToggle');
    if (!o) return false;
    o.click();
    return true;
  });
  await sleep(400);
  check(label + ': drawer toggle works', !!drawerOpened);

  const count = await page.evaluate(() => document.querySelectorAll('.drawer-menu-item[data-action="open-pdf-reports"]').length);
  check(label + ': exactly one PDF Reports drawer item', count === 1, 'count=' + count);

  const itemVisible = await page.evaluate(() => {
    const el = document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]');
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
  check(label + ': PDF Reports item visible after opening drawer', !!itemVisible);

  const clicked = await page.evaluate(() => {
    const el = document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]');
    if (!el) return false;
    el.click();
    return true;
  });
  await sleep(500);
  check(label + ': PDF Reports button clickable', !!clicked);

  const ws = await page.evaluate(() => {
    const m = document.getElementById('pdfReportsWorkspace');
    if (!m) return null;
    return {
      visible: m.classList.contains('show'),
      title: (m.querySelector('#pdfReportsTitle') || {}).textContent || '',
      ph: (m.querySelector('.pdf-reports-placeholder') || {}).textContent || '',
      back: !!document.getElementById('pdfReportsBackBtn')
    };
  });
  check(label + ': PDF Reports workspace opens', !!(ws && ws.visible), JSON.stringify(ws));
  check(label + ': workspace title = "PDF Reports"', !!(ws && /pdf reports/i.test(ws.title)), ws ? ws.title : '');
  check(label + ': workspace placeholder present', !!(ws && ws.ph && ws.ph.length > 3), ws ? ws.ph : '');
  check(label + ': Back button present', !!(ws && ws.back));

  const backClick = await page.evaluate(() => {
    const b = document.getElementById('pdfReportsBackBtn');
    if (!b) return false;
    b.click();
    return true;
  });
  await sleep(400);
  const afterBack = await page.evaluate(() => {
    const m = document.getElementById('pdfReportsWorkspace');
    return m ? !m.classList.contains('show') : true;
  });
  check(label + ': Back closes workspace (returns to previous section)', !!backClick && afterBack);

  const notes = await page.evaluate(() => ({
    previewBtn: !!document.getElementById('notePreviewPdfBtn'),
    exportBtn: !!document.getElementById('exportNotePdfBtn'),
    sendBtn: !!document.getElementById('sendNoteBtn'),
    notesDrawer: !!document.querySelector('.drawer-menu-item[data-action="open-notes"]')
  }));
  check(label + ': Notes PDF entry points intact', notes.previewBtn && notes.exportBtn && notes.sendBtn && notes.notesDrawer, JSON.stringify(notes));

  const rel = errs.filter((e) => !/favicon|net::ERR_|404|attribute d/.test(e));
  check(label + ': no new JS errors during Phase 01', rel.length === 0, JSON.stringify(rel).slice(0, 200));
  await page.close();
}
let browser;
try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  await runViewport(browser, 1280, 800, false, 'Desktop(1280,LTR)');
  await runViewport(browser, 768, 1024, true, 'Tablet(768)');
  await runViewport(browser, 390, 844, true, 'Mobile(390)');

  // RTL environment.
  const pr = await browser.newPage();
  await pr.setViewport({ width: 390, height: 844, isMobile: true });
  const errsR = [];
  pr.on('pageerror', (e) => errsR.push('[pageerror] ' + e.message));
  pr.on('console', (m) => { if (m.type() === 'error') errsR.push('[console] ' + m.text()); });
  await pr.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
  await pr.evaluate(() => { document.documentElement.setAttribute('dir', 'rtl'); });
  await sleep(700);
  const rtlDrawer = await pr.evaluate(() => { const o = document.getElementById('drawerToggle'); if (!o) return false; o.click(); return true; });
  await sleep(400);
  const rtlClick = await pr.evaluate(() => { const el = document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]'); if (!el) return false; el.click(); return true; });
  await sleep(500);
  const rtlWs = await pr.evaluate(() => { const m = document.getElementById('pdfReportsWorkspace'); return m ? m.classList.contains('show') : false; });
  check('RTL(390,Mobile): drawer opens + PDF Reports workspace opens', !!rtlDrawer && !!rtlClick && !!rtlWs);
  const relR = errsR.filter((e) => !/favicon|net::ERR_|404|attribute d/.test(e));
  check('RTL(390,Mobile): no new JS errors', relR.length === 0, JSON.stringify(relR).slice(0, 200));
  await pr.close();

  console.log('SUMMARY ' + JSON.stringify({ pass: results.filter(Boolean).length, fail: results.filter((x) => !x).length }));
} finally {
  if (browser) { try { await browser.close(); } catch (e) {} }
  try { server.close(); } catch (e) {}
}