// PHASE — NOTES PDF DIRECT SHARE (no print) — real-Chrome verification.
// Run:  node tests/notesPdfDirectShare.browser.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8463;
const OUT = path.join(ROOT, '__notes_direct_share_result.txt');
try { fs.unlinkSync(OUT); } catch (e) {}
const check = (name, ok, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + String(detail).slice(0, 300) : ''}`;
  console.log(line); fs.appendFileSync(OUT, line + '\n');
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]) || '/index.html';
  if (p === '/') p = '/index.html';
  try {
    const data = fs.readFileSync(path.join(ROOT, p));
    res.writeHead(200, { 'Content-Type': (MIME[path.extname(p)] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(data);
  } catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}/`;
setTimeout(() => { console.log('WATCHDOG'); process.exit(124); }, 420000);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--lang=en'] });
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String((e && e.message) || e)));
await page.setViewport({ width: 1280, height: 900 });
await page.evaluateOnNewDocument(() => {
  if (navigator.serviceWorker) { try { navigator.serviceWorker.register = () => Promise.resolve({}); } catch (e) {} }
  window.alert = () => {}; window.confirm = () => true; window.prompt = () => '';
  window.__test = { printCalls: 0, genCalls: 0, shareCalls: [], downloads: [] };
  window.print = () => { window.__test.printCalls++; };
});
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });

let booted = false;
for (let i = 0; i < 40; i++) {
  booted = await page.evaluate(() => document.querySelector('#primaryDisplay')?.textContent === '0').catch(() => false);
  if (booted) break; await sleep(400);
}
check('app boots', booted);

await page.evaluate(() => document.querySelector('[data-action="open-notes"]')?.click());
await sleep(600);
await page.evaluate(() => document.querySelector('#openNewNoteButton')?.click());
await sleep(700);
const editor = await page.evaluate(() => !!document.querySelector('#fullScreenNoteModal')?.classList.contains('show'));
check('Notes editor opens', editor);

// type content
await page.evaluate(() => {
  const title = document.querySelector('#fullScreenNoteTitle') || document.querySelector('#noteTitleInput');
  if (title) { title.value = 'Direct Share Test'; title.dispatchEvent(new Event('input', { bubbles: true })); }
  const body = document.querySelector('#noteBodyInput') || document.querySelector('#fullScreenNoteBody');
  if (body) {
    body.innerHTML = '<h2>Header</h2><p>Direct share paragraph.</p><table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>';
    body.dispatchEvent(new Event('input', { bubbles: true }));
  }
});
await sleep(400);

// instrument: count html2pdf generations (incl. lazy CDN load via setter trap)
await page.evaluate(() => {
  const wrap = (nv) => {
    if (typeof nv !== 'function' || nv.__testWrapped) return nv;
    const orig = nv;
    const w = function (...a) { window.__test.genCalls++; return orig.apply(this, a); };
    Object.assign(w, orig); try { w.__testWrapped = true; } catch (e) {}
    return w;
  };
  let v = wrap(window.html2pdf);
  Object.defineProperty(window, 'html2pdf', {
    configurable: true,
    get() { return v; },
    set(nv) { v = wrap(nv); }
  });
});
// stable share stub + download capture
await page.evaluate(() => {
  navigator.share = async (opts) => { window.__test.shareCalls.push(opts); return; };
  navigator.canShare = (opts) => !!(opts && opts.files && opts.files[0] instanceof File);
  const origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    window.__test.anchorClicks = (window.__test.anchorClicks || 0) + 1;
    window.__test.anchorInfo = { tag: this.tagName, dl: this.getAttribute('download'), href: (this.getAttribute('href') || '').slice(0, 24) };
    if (this.hasAttribute('download')) window.__test.downloads.push(this.getAttribute('download'));
    return origClick.call(this);
  };
});

async function clickExport() {
  await page.evaluate(() => document.querySelector('#exportNotePdfBtn')?.click());
  await sleep(2500);
  return page.evaluate(() => JSON.parse(JSON.stringify(window.__test)));
}

// ---- 1) first tap: print never, PDF generated, share called
let t1 = await clickExport();
check('NO window.print() on export tap', t1.printCalls === 0, 'printCalls=' + t1.printCalls);
check('PDF generated (html2pdf used)', t1.genCalls >= 1, 'genCalls=' + t1.genCalls);
check('navigator.share called', t1.shareCalls.length === 1, 'shareCalls=' + t1.shareCalls.length);
check('share got a title', !!(t1.shareCalls[0] && t1.shareCalls[0].title), String(t1.shareCalls[0] && t1.shareCalls[0].title));
check('still no print after repeat taps', t1.printCalls === 0, 'printCalls=' + t1.printCalls);
check('no download on share success', t1.downloads.length === 0, 'downloads=' + t1.downloads.length);
const genAfterFirst = t1.genCalls;

// ---- 2) second tap: capture actual File bytes + verify NO regeneration
await page.evaluate(() => {
  navigator.share = async (opts) => {
    const f = opts && opts.files && opts.files[0];
    if (f) {
      const buf = await f.arrayBuffer();
      window.__test.sharedBytes = Array.from(new Uint8Array(buf.slice(0, 8)));
      window.__test.sharedType = f.type;
      window.__test.sharedName = f.name;
    }
    window.__test.shareCalls.push(opts || {});
  };
});
t1 = await clickExport();
check('NO second PDF generation (cache reuse)', t1.genCalls === genAfterFirst, 'genCalls=' + t1.genCalls + '/' + genAfterFirst);
check('second tap shares again', t1.shareCalls.length === 2, 'shareCalls=' + t1.shareCalls.length);
check('shared file type application/pdf', t1.sharedType === 'application/pdf', String(t1.sharedType));
check('shared file name set', !!t1.sharedName, String(t1.sharedName));
check('PDF magic %PDF', !!(t1.sharedBytes && String.fromCharCode(...t1.sharedBytes.slice(0, 4)) === '%PDF'), JSON.stringify(t1.sharedBytes));
check('still no print after repeat taps', t1.printCalls === 0, 'printCalls=' + t1.printCalls);

// ---- 3) AbortError: no download, no regeneration, no print
const genBeforeAbort = t1.genCalls;
await page.evaluate(() => { navigator.share = async () => { const e = new Error('aborted'); e.name = 'AbortError'; throw e; }; });
t1 = await clickExport();
check('AbortError -> NO download', t1.downloads.length === 0, 'downloads=' + t1.downloads.length);
check('AbortError -> NO regeneration', t1.genCalls === genBeforeAbort, 'genCalls=' + t1.genCalls + '/' + genBeforeAbort);
check('AbortError -> still no print', t1.printCalls === 0, 'printCalls=' + t1.printCalls);

// ---- 4) unsupported share -> download fallback
await page.evaluate(() => { navigator.share = undefined; navigator.canShare = undefined; });
t1 = await clickExport();
check('unsupported share -> download fallback fires', t1.downloads.length === 1, 'dl=' + JSON.stringify(t1.downloads) + ' anchorClicks=' + (t1.anchorClicks || 0) + ' info=' + JSON.stringify(t1.anchorInfo));
check('fallback still no print', t1.printCalls === 0, 'printCalls=' + t1.printCalls);

// ---- 5) no pageerror
check('no pageerror during whole flow', pageErrors.length === 0, pageErrors.join(' | ').slice(0, 300));

await browser.close();
server.close();
const all = fs.readFileSync(OUT, 'utf8');
const fails = (all.match(/^FAIL/gm) || []).length;
console.log(fails === 0 ? 'ALL PASS' : (fails + ' FAILURES'));
process.exit(fails === 0 ? 0 : 1);
