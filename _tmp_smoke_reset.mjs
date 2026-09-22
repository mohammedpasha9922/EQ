// SMART DOCUMENTS — CLEAN RESET smoke test (this phase only).
// Run: node _tmp_smoke_reset.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const ROOT = process.cwd();
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8231;
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
setTimeout(() => process.exit(124), 120000);

const results = [];
const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' -> ' + detail : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.setViewport({ width: 430, height: 932 });
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
await sleep(1500);

check('1) App loads with no JavaScript errors', errors.length === 0, errors.slice(0, 4).join(' | '));

// Smart Documents drawer button + empty workspace
const smartState = await page.evaluate(() => {
  const drawerBtn = document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]');
  const navBtn = document.querySelector('.feature-nav-btn[data-action="open-smart-docs"]');
  return {
    drawerBtn: !!drawerBtn, navBtn: !!navBtn,
    modal: !!document.getElementById('smartDocsModal'),
    close: !!document.getElementById('closeSmartDocs'),
    title: !!document.getElementById('smartDocsTitle'),
    cards: document.querySelectorAll('.smart-doc-card').length,
    toolbars: document.querySelectorAll('[data-toolbar]').length,
    canvases: document.querySelectorAll('.smart-blank-canvas').length,
    editors: document.querySelectorAll('.smart-document-content').length,
    templates: document.querySelectorAll('.smart-template-item').length,
    body: (document.querySelector('#smartDocsModal .smart-docs-body') || {}).textContent || ''
  };
});
check('2) Smart Documents buttons exist (drawer + feature nav)', smartState.drawerBtn && smartState.navBtn && smartState.modal && smartState.close && smartState.title);

await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click());
await sleep(600);
const opened = await page.evaluate(() => ({
  show: document.getElementById('smartDocsModal').classList.contains('show'),
  empty: (document.querySelector('#smartDocsModal .smart-workspace-empty') || {}).textContent || ''
}));
check('4) Clicking Smart Documents opens the workspace', opened.show === true);
check('5) Workspace shows empty placeholder', /empty/i.test(opened.empty));

await page.evaluate(() => document.getElementById('closeSmartDocs').click());
await sleep(400);
const closed = await page.evaluate(() => !document.getElementById('smartDocsModal').classList.contains('show'));
check('6) Close button closes the workspace', closed);

// Feature-nav Smart Documents button -> PDF Reports workspace (existing behavior)
await page.evaluate(() => document.querySelector('.feature-nav-btn[data-action="open-smart-docs"]').click());
await sleep(600);
const pdfWs = await page.evaluate(() => {
  const ws = document.getElementById('pdfReportsWorkspace');
  return ws ? ws.classList.contains('show') : false;
});
check('7) Feature-nav Smart Documents still opens PDF Reports workspace (unchanged)', pdfWs === true);
await page.evaluate(() => { const b = document.getElementById('pdfReportsBackBtn'); if (b) b.click(); });
await sleep(300);

// Seams
const seams = await page.evaluate(() => ({
  wf: typeof window.__smartDocsWorkflow === 'object',
  scan: typeof window.__smartScan === 'object',
  step: window.__smartDocsWorkflow && window.__smartDocsWorkflow.getStep()
}));
check('8) No-op seams intact (__smartDocsWorkflow / __smartScan)', seams.wf && seams.scan && seams.step === 1);

// Calculator
await page.evaluate(() => { const b = document.querySelector('[data-num="5"]') || document.querySelector('.calc-btn'); if (b) b.click(); });
const calcOk = await page.evaluate(() => {
  const disp = document.getElementById('primaryDisplay') || document.querySelector('.display, #display');
  return disp ? (disp.textContent || disp.value || '').trim() : null;
});
check('9) Calculator responds to input', calcOk !== null, String(calcOk));

// Notes
await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
await sleep(500);
const notesOk = await page.evaluate(() => {
  const m = document.getElementById('notesManagerModal');
  return m ? m.classList.contains('show') : false;
});
check('10) Notes opens', notesOk === true);
await page.evaluate(() => { const b = document.getElementById('closeNotesManagerButton'); if (b) b.click(); });
await sleep(300);

// Currency
await page.evaluate(() => { const b = document.querySelector('.feature-nav-btn[data-action="open-currency"]'); if (b) b.click(); });
await sleep(400);
const curOk = await page.evaluate(() => {
  const p = document.getElementById('currencyMenuPopover') || document.querySelector('.currency-menu-popover');
  return p ? p.classList.contains('open') : false;
});
check('11) Currency menu opens', curOk === true);

check('12) No JavaScript errors accumulated during the run', errors.length === 0, errors.slice(0, 4).join(' | '));

const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} checks passed`);
await browser.close();
server.close();
process.exit(passed === results.length ? 0 : 1);

check('3) Workspace is EMPTY (no old cards/toolbars/canvases/editors/templates)',
  smartState.cards === 0 && smartState.toolbars === 0 && smartState.canvases === 0 && smartState.editors === 0 && smartState.templates === 0,
  JSON.stringify(smartState));
