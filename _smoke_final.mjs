// Smart Documents CLEAN RESET — Chrome smoke test (reuses the existing harness pattern).
// Run: node _smoke_final.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '.');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8311;
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
  } catch (e) {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const URL = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 120000);

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String((e && e.message) || e)));
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
await sleep(700);

check('1) App loads without JS errors', errs.length === 0, errs.join(' | '));

const entry = await page.evaluate(() => ({
  nav: document.querySelectorAll('[data-action="open-smart-docs"]').length,
  modal: !!document.getElementById('smartDocsModal')
}));
check('2) Smart Documents button present', entry.nav >= 1, 'openers=' + entry.nav);
check('3) Smart Documents modal present', entry.modal === true);

const errsBefore = errs.length;
await page.evaluate(() => {
  const b = document.querySelector('#featureNavBar [data-action="open-smart-docs"]')
    || document.querySelector('[data-action="open-smart-docs"]');
  b.click();
});
await sleep(500);
const opened = await page.evaluate(() => {
  const m = document.getElementById('smartDocsModal');
  const ws = m && m.querySelector('.smart-docs-home');
  return {
    show: !!(m && m.classList.contains('show')),
    title: (document.getElementById('smartDocsTitle') || {}).textContent || '',
    wsVisible: !!(ws && ws.offsetHeight > 0)
  };
});
check('4) Workspace opens on click', opened.show && opened.wsVisible, JSON.stringify(opened));
check('5) Title is "Smart Documents"', /Smart Documents/.test(opened.title), opened.title.trim());
check('6) No JS errors while opening', errs.length === errsBefore, errs.slice(errsBefore).join(' | '));

const content = await page.evaluate(() => {
  const body = document.querySelector('#smartDocsModal .smart-docs-body');
  const leftover = document.querySelectorAll([
    '#smartDocsModal .smart-doc-card',
    '#smartDocsModal [data-toolbar]',
    '#smartDocsModal .smart-tool-btn',
    '#smartBlankCanvas', '#smartBlankCanvasHolder',
    '#smartDocumentContent', '#smartAddMenu',
    '#smartDocToolbar', '#smartLogoBar',
    '#smartDocsModal button:not(#closeSmartDocs)',
    '#smartDocsModal input', '#smartDocsModal textarea', '#smartDocsModal select',
    '#smartDocsModal canvas', '#smartDocsModal iframe',
    '#smartDocsModal [contenteditable="true"]'
  ].join(',')).length;
  return {
    children: body ? body.children.length : -1,
    html: body ? body.innerHTML.trim() : '',
    leftover
  };
});
check('7) Workspace has no old tools/panels/editors', content.leftover === 0, 'leftover=' + content.leftover);
check('8) Workspace is only the empty placeholder', content.children === 1 && content.html === '<div class="smart-workspace-empty"></div>', content.html);
check('9) No duplicate Smart Documents buttons', entry.nav <= 2, 'openers=' + entry.nav);

await page.evaluate(() => document.getElementById('closeSmartDocs').click());
await sleep(400);
const closed = await page.evaluate(() => {
  const m = document.getElementById('smartDocsModal');
  return { show: m.classList.contains('show'), aria: m.getAttribute('aria-hidden') };
});
check('10) Back button closes workspace', closed.show === false && closed.aria === 'true', JSON.stringify(closed));

const calc = await page.evaluate(() => {
  const d = document.getElementById('primaryDisplay');
  const keys = document.querySelectorAll('[data-num],[data-key],.key-btn').length;
  return { ok: !!d, keys };
});
check('11) Calculator display + keys intact', calc.ok && calc.keys > 5, JSON.stringify(calc));

const notes = await page.evaluate(() => ({
  modal: !!document.getElementById('notesManagerModal'),
  opener: document.querySelectorAll('[data-action="open-notes"],[data-action="notes"],#openNotesBtn').length
}));
check('12) Notes entry point present', notes.modal || notes.opener > 0, JSON.stringify(notes));

const currency = await page.evaluate(() => ({
  modal: !!document.getElementById('currencyConverterModal'),
  menu: !!document.getElementById('currencyMenuButton')
}));
check('13) Currency entry point present', currency.modal || currency.menu, JSON.stringify(currency));

const pdf = await page.evaluate(() => ({
  reports: !!document.querySelector('[data-action="open-pdf-reports"], #pdfReportsWorkspace'),
  notesPdf: !!document.getElementById('notePreviewPdfBtn') || !!document.getElementById('notePdfPreviewModal')
}));
check('14) PDF Reports entry point present', pdf.reports === true, JSON.stringify(pdf));
check('15) Notes PDF entry point present', pdf.notesPdf === true, JSON.stringify(pdf));

const nav = await page.evaluate(() => ({
  bar: !!document.getElementById('featureNavBar'),
  buttons: document.querySelectorAll('#featureNavBar .feature-nav-btn').length
}));
check('16) Feature navigation intact', nav.bar && nav.buttons > 3, JSON.stringify(nav));

const finErr = errs.length;
await page.evaluate(() => document.querySelector('[data-action="open-smart-docs"]').click());
await sleep(300);
await page.evaluate(() => document.getElementById('closeSmartDocs').click());
await sleep(250);
check('17) Open/close cycle keeps zero JS errors', errs.length === finErr, errs.slice(finErr).join(' | '));

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log(`\nSUMMARY: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log('FAILED:'); failed.forEach((f) => console.log(`  - ${f.name} ${f.detail}`));
  process.exit(1);
}
process.exit(0);

