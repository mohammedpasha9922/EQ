// PHASE — COMPANY PROFILE REMOVAL FROM THE NOTES EDITOR HEADER (real-browser test).
//
// Proves in a real Chrome (Puppeteer, not grep) that:
//   1. the Company Profile button/modal/JS are ABSENT from the app,
//   2. the 4 REMAINING circular header buttons are evenly distributed with no
//      leftover space, no overlap and no overflow at 1280/768/430/390/360 in
//      English LTR, Arabic RTL and Kurdish RTL,
//   3. Back / Save / Send / Preview PDF / Export PDF still work (real clicks),
//   4. the PDF Export "Use Company Profile" checkbox is PRESERVED,
//   5. no JavaScript errors occur.
//
// Run:  node tests/notesCompanyProfileRemoval.browser.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8391;
const OUT = path.join(ROOT, '__cp_removal_result.txt');
const SHOTS = path.join(HERE, 'artifacts');
fs.mkdirSync(SHOTS, { recursive: true });

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/' || u === '') u = '/index.html';
  try {
    const d = fs.readFileSync(path.join(ROOT, u));
    res.writeHead(200, { 'Content-Type': (MIME[path.extname(u).toLowerCase()] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(d);
  } catch (e) { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}/`;
setTimeout(() => { console.log('WATCHDOG TIMEOUT'); process.exit(124); }, 600000);

let passCount = 0, failCount = 0;
try { fs.unlinkSync(OUT); } catch (e) {}
function check(name, ok, detail = '') {
  if (ok) passCount++; else failCount++;
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + String(detail).slice(0, 400) : ''}`;
  console.log(line);
  fs.appendFileSync(OUT, line + '\n');
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--lang=en']
});
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String((e && e.message) || e)));
page.on('console', (m) => { if (m.type() === 'error') pageErrors.push('console: ' + m.text()); });
await page.evaluateOnNewDocument(() => {
  // Test-only: never let a cached service worker serve a stale app.js, and
  // silence native dialogs so a click cannot hang the harness.
  if (navigator.serviceWorker) { try { navigator.serviceWorker.register = () => Promise.resolve({}); } catch (e) {} }
  window.__dialogs = { alert: 0, confirm: 0, prompt: 0 };
  window.alert = () => { window.__dialogs.alert++; };
  window.confirm = () => { window.__dialogs.confirm++; return true; };
  window.prompt = () => { window.__dialogs.prompt++; return ''; };
});
const cdp = await page.createCDPSession();

// Real browser-level handler check (not source inspection).
async function clickListenerCount(selector) {
  const { result } = await cdp.send('Runtime.evaluate', { expression: `document.querySelector(${JSON.stringify(selector)})` });
  if (!result || !result.objectId) return -1;
  const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
  return (listeners || []).filter((l) => l.type === 'click').length;
}

const SELECTOR_ORDER = ['#saveFullScreenNote', '#sendNoteBtn', '#notePreviewPdfBtn', '#exportNotePdfBtn'];
