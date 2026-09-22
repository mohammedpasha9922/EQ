import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url'; import puppeteer from 'puppeteer-core';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const STORAGE_KEY = 'eq-note-manager-notes';
const FOLDERS_KEY = 'eq-note-folders';
const PORT = 8847;
let fail = 0;
const check = (n, ok, d) => { console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  -> ' + d : '')); if (!ok) fail++; };
const svr = http.createServer((req, res) => {
  try {
    let u = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!u || u === '/') u = '/index.html';
    const f = path.join(ROOT, u);
    const m = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
    res.writeHead(200, { 'Content-Type': (m[path.extname(f).toLowerCase()] || 'text/plain') + '; charset=utf-8' });
    res.end(fs.readFileSync(f));
  } catch (e) { if (!res.headersSent) { res.writeHead(200); res.end(''); } }
});
await new Promise((r) => svr.listen(PORT, r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function openEditor(page) {
  await page.evaluate((a, b) => { localStorage.removeItem(a); localStorage.removeItem(b); }, STORAGE_KEY, FOLDERS_KEY);
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(200);
  await page.evaluate(() => { const q = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (q) q.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 5000 });
  await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
  await page.evaluate(() => { const ed = document.getElementById('noteBodyInput'); ed.focus(); ed.innerHTML = 'Hello world'; });
  await sleep(100);
}
async function sel(page, w) {
  await page.evaluate((wd) => {
    const ed = document.getElementById('noteBodyInput');
    const tn = ed.firstChild;
    const rng = document.createRange();
    const s = String(tn.nodeValue).indexOf(wd);
    rng.setStart(tn, s); rng.setEnd(tn, s + wd.length);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(rng);
  }, w);
}
async function pressA(page) {
  const b = await page.$eval('#noteTextColorBtn', (el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await page.mouse.click(b.x, b.y);
  await sleep(140);
}
async function pick(page, hex) {
  await page.evaluate((h) => { const s = document.querySelector('#noteTextColorPalette [data-color="' + h + '"]'); if (s) s.click(); }, hex);
  await sleep(240);
}
async function coloredText(page, re) {
  return page.evaluate((r) => { const sp = [...document.querySelectorAll('#noteBodyInput span')].find((x) => r.test(getComputedStyle(x).color)); return sp ? sp.textContent : null; }, re);
}
async function scenario(page, lab) {
  check(lab + 'one button', (await page.evaluate(() => document.querySelectorAll('#noteTextColorBtn').length)) === 1, '');
  await sel(page, 'world');
  await pressA(page);
  const vis = await page.evaluate(() => { const p = document.getElementById('noteTextColorPalette'); return p ? !p.classList.contains('hidden') && getComputedStyle(p).display !== 'none' : false; });
  check(lab + 'palette appears', vis, '');
  check(lab + '14 swatches', (await page.evaluate(() => document.querySelectorAll('#noteTextColorPalette .note-text-color-swatch').length)) === 14, '');
  await pick(page, '#e53935');
  check(lab + 'red selection', (await coloredText(page, /255,\s*0,\s*0/)) === 'world', '');
  check(lab + 'body intact', (await page.evaluate(() => document.getElementById('noteBodyInput').textContent)).replace(/\u200b/g, '') === 'Hello world', '');
  check(lab + 'palette closed', (await page.evaluate(() => document.getElementById('noteTextColorPalette').classList.contains('hidden'))) === true, '');
  await sel(page, 'Hello');
  await pressA(page);
  await pick(page, '#1e88e5');
  check(lab + 'blue second word', (await coloredText(page, /0,\s*0,\s*255/)) === 'Hello', '');
  const runs = await page.evaluate((k) => { const n = JSON.parse(localStorage.getItem(k) || '[]')[0]; if (!n || !n.bodyBlocks || !n.bodyBlocks[0]) return null; const f = n.bodyBlocks[0].formatting || []; return f.map((r) => r.color).filter(Boolean); }, STORAGE_KEY);
  check(lab + 'persisted', Array.isArray(runs) && runs.includes('#e53935') && runs.includes('#1e88e5'), 'runs=' + JSON.stringify(runs));
}
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => { console.log('PAGEERROR ' + e.message); fail++; });
  await page.setViewport({ width: 1280, height: 800 });
  await openEditor(page); await scenario(page, 'DESKTOP ');
  await page.setViewport({ width: 390, height: 844, hasTouch: true, isMobile: true });
  await openEditor(page); await scenario(page, 'MOBILE ');
  await page.setViewport({ width: 360, height: 720 });
  await openEditor(page); await scenario(page, '360 ');
  await page.evaluate(() => { document.documentElement.setAttribute('dir', 'rtl'); });
  await openEditor(page); await sel(page, 'world'); await pressA(page);
  const rtl = await page.evaluate(() => { const p = document.getElementById('noteTextColorPalette'); const r = p.getBoundingClientRect(); return { left: r.left, right: r.right, vw: innerWidth, vis: !p.classList.contains('hidden') }; });
  check('RTL in viewport', rtl.vis && rtl.left >= 0 && rtl.right <= rtl.vw + 1, JSON.stringify(rtl));
} finally { if (browser) await browser.close(); svr.close(); }
console.log('FAIL_COUNT=' + fail);
process.exitCode = fail ? 1 : 0;