// TEMPORARY DOM probe for the PDF-content-clear pass (deleted after running).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8297;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.txt': 'text/plain', '.wasm': 'application/wasm' };

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': (MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(data);
  } catch (e) { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--no-first-run'] });
const page = await browser.newPage();
const bad = [];
const errs = [];
page.on('response', (r) => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
page.on('pageerror', (e) => errs.push(String((e && e.message) || e)));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
await new Promise((r) => setTimeout(r, 1500));

const info = await page.evaluate(() => {
  const items = Array.from(document.querySelectorAll('.drawer-menu-item'));
  const keypad = document.querySelector('#keypad, .keypad, .keys, #calcKeys');
  return {
    drawerItems: items.map((b) => b.getAttribute('data-action')),
    pdfBtnInDrawer: !!document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]'),
    pdfBtnAnywhere: Array.from(document.querySelectorAll('[data-action="open-pdf-reports"]')).length,
    featureNavBar: !!document.getElementById('featureNavBar'),
    featureNavBtns: document.querySelectorAll('#featureNavBar .feature-nav-btn').length,
    wsExists: !!document.getElementById('pdfReportsWorkspace'),
    wsBodyHtml: (document.querySelector('#pdfReportsWorkspace .settings-modal-body') || {}).innerHTML,
    keypadSample: keypad ? keypad.outerHTML.slice(0, 700) : null,
    liveEd: document.querySelectorAll('[id^="livePdfEd"]').length,
    calcDisplay: !!document.getElementById('primaryDisplay'),
    notesInput: !!document.getElementById('noteBodyInput')
  };
});
await browser.close();
server.close();
const out = ['--- 4xx/5xx requests ---'].concat(bad).concat(['--- page errors ---']).concat(errs).concat(['--- info ---', JSON.stringify(info, null, 2)]);
fs.writeFileSync(path.join(ROOT, '_pdfclear_probe_out.txt'), out.join('\r\n'), 'utf8');
console.log(out.join('\n'));
process.exit(0);
