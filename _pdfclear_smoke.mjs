// TEMPORARY smoke test for the PDF-content-clear pass (deleted after running).
// Scope: PDF button still works, workspace opens EMPTY, no JS errors, calculator
// and Notes still work, no other navigation changed. Uses the existing
// puppeteer-core + local static server pattern from tests/.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = HERE;
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8294;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg',
  '.txt': 'text/plain', '.wasm': 'application/wasm'
};
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mimeOf(filePath) + '; charset=utf-8' });
    res.end(data);
  } catch (e) { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const URL = `http://127.0.0.1:${PORT}/`;

const lines = [];
let failed = 0;
function check(name, ok, detail = '') {
  if (!ok) failed++;
  lines.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String((e && e.message) || e)));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await page.setViewport({ width: 1280, height: 800 });
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
await sleep(1200);

check('app boots (calculator display present)', await page.evaluate(() => !!document.getElementById('primaryDisplay')));
check('no JS errors on boot', errs.length === 0, errs.join(' | '));

// --- PDF Reports button ---
await page.evaluate(() => document.getElementById('drawerToggle')?.click());
await sleep(300);
const btn = await page.evaluate(() => {
  const list = Array.from(document.querySelectorAll('.drawer-menu-item[data-action="open-pdf-reports"]'));
  return { count: list.length, text: list.map((b) => b.textContent.trim().replace(/\s+/g, ' ')) };
});
check('PDF button exists (exactly one)', btn.count === 1, 'count=' + btn.count + ' text=' + JSON.stringify(btn.text));

await page.evaluate(() => {
  document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]')?.click();
});
await sleep(250);
const openedNow = await page.evaluate(() => {
  const ws = document.getElementById('pdfReportsWorkspace');
  return { show: !!ws && ws.classList.contains('show'), aria: ws ? ws.getAttribute('aria-hidden') : null };
});
check('clicking PDF opens the workspace shell', openedNow.show === true && openedNow.aria === 'false',
  JSON.stringify(openedNow));
// --- workspace must be EMPTY of old PDF content ---
const content = await page.evaluate(() => {
  const ws = document.getElementById('pdfReportsWorkspace');
  if (!ws) return null;
  return {
    title: (ws.querySelector('#pdfReportsTitle') || {}).textContent || '',
    backBtn: !!ws.querySelector('#pdfReportsBackBtn'),
    bodyHtml: (ws.querySelector('.settings-modal-body') || {}).innerHTML || '',
    cards: ws.querySelectorAll('.smart-doc-card').length,
    scanCard: !!ws.querySelector('#pdfScanCreateCard'),
    openCard: !!ws.querySelector('#pdfOpenCard'),
    recent: !!ws.querySelector('.pdf-recent-section, #pdfRecentList'),
    buttons: ws.querySelectorAll('button').length
  };
});
check('workspace header kept (PDF title + Back button)', content.backBtn === true, JSON.stringify(content.title));
check('workspace body content cleared', content.bodyHtml.trim() === '', JSON.stringify(content.bodyHtml.slice(0, 120)));
check('old cards gone (Scan/Create + Open PDF)', content.cards === 0 && !content.scanCard && !content.openCard);
check('old Recent PDFs section gone', !content.recent);
check('only the Back button remains inside the workspace', content.buttons === 1, 'buttons=' + content.buttons);

// --- global old-PDF DOM gone ---
const globalGone = await page.evaluate(() => ({
  liveEdAnywhere: !!document.getElementById('livePdfEdBackdrop'),
  liveEdRefs: document.querySelectorAll('[id^="livePdfEd"], [class^="live-pdf-ed"]').length,
  pdfOpenCard: !!document.getElementById('pdfOpenCard'),
  pdfScanCard: !!document.getElementById('pdfScanCreateCard')
}));
check('inline live PDF editor removed from the DOM',
  globalGone.liveEdAnywhere === false && globalGone.liveEdRefs === 0, JSON.stringify(globalGone));
check('old PDF cards removed globally',
  globalGone.pdfOpenCard === false && globalGone.pdfScanCard === false, JSON.stringify(globalGone));

// --- back button closes ---
const closed = await page.evaluate(async () => {
  document.getElementById('pdfReportsBackBtn')?.click();
  await new Promise((r) => setTimeout(r, 250));
  const ws = document.getElementById('pdfReportsWorkspace');
  return { show: !!ws && ws.classList.contains('show'), aria: ws ? ws.getAttribute('aria-hidden') : null };
});
check('Back button closes the workspace', closed.show === false, JSON.stringify(closed));

// --- calculator still works ---
await page.evaluate(() => document.getElementById('drawerCloseButton')?.click());
await sleep(250);
const calc = await page.evaluate(() => {
  const press = (sels) => { for (const s of sels) { const b = document.querySelector(s); if (b) { b.click(); return true; } } return false; };
  press(['.key[data-value="5"]', '[data-value="5"]']);
  press(['.key[data-operator="+"]', '[data-operator="+"]']);
  press(['.key[data-value="3"]', '[data-value="3"]']);
  press(['[data-action="equals"]', '.key[data-action="equals"]', '[data-operator="="]']);
  const d = document.getElementById('primaryDisplay');
  return d ? d.textContent.trim() : null;
});
check('calculator still works (5+3=8)', calc === '8', 'display=' + JSON.stringify(calc));
check('no JS errors after calculator use', errs.length === 0, errs.join(' | '));

// --- notes still works ---
await page.evaluate(() => document.getElementById('drawerToggle')?.click());
await sleep(300);
await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]')?.click());
await sleep(600);
const notes = await page.evaluate(() => ({ body: !!document.getElementById('noteBodyInput') }));
check('Notes opens (editor present)', notes.body === true, JSON.stringify(notes));

// --- other navigation unchanged ---
await page.evaluate(() => document.getElementById('drawerToggle')?.click());
await sleep(300);
const nav = await page.evaluate(() => {
  const actions = Array.from(document.querySelectorAll('.drawer-menu-item')).map((b) => b.getAttribute('data-action'));
  const want = ['open-notes', 'open-smart-docs', 'open-settings', 'open-history', 'open-pdf-reports'];
  return { total: actions.length, has: want.filter((a) => actions.includes(a)) };
});
check('drawer navigation unchanged (key actions present)', nav.has.length === 5, JSON.stringify(nav));
check('feature nav bar unchanged',
  await page.evaluate(() => document.querySelectorAll('#featureNavBar .feature-nav-btn').length >= 5));

check('NO JS errors for the whole session', errs.length === 0, errs.join(' | '));

await browser.close();
server.close();
lines.push('');
lines.push(failed === 0 ? 'ALL CHECKS PASSED' : failed + ' CHECK(S) FAILED');
fs.writeFileSync(path.join(ROOT, '_pdfclear_smoke_results.txt'), lines.join("`r`n"), 'utf8');
console.log(lines.join("`n"));
process.exit(0);
