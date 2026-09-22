// NOTES UI audit probe (test-only artifact, modifies nothing).
// Measures the CURRENT Notes editor layout: toolbar row, Aa panel visibility/size,
// bottom large controls, header buttons, overflow at 390/360 LTR+RTL.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8431;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };
const out = [];
const log = (s) => { out.push(s); console.log(s); };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  try { const d = fs.readFileSync(path.join(ROOT, p)); res.writeHead(200, { 'Content-Type': (MIME[path.extname(p).toLowerCase()] || 'application/octet-stream') + '; charset=utf-8' }); res.end(d); }
  catch { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let browser;
try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 30000 });
  await sleep(700);
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 8000 });
  await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 8000 });
  await sleep(400);

  const dump = await page.evaluate(() => {
    const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), display: cs.display, visibility: cs.visibility, pos: cs.position }; };
    const tb = document.querySelector('.note-format-toolbar');
    const header = document.querySelector('.full-screen-note-header');
    const map = {};
    ['noteAaPanel', 'noteImageMenu', 'noteTextColorPalette', 'noteHighlightPalette', 'noteTablePanel', 'noteCellBgColorPalette'].forEach((id) => { map[id] = r(document.getElementById(id)); });
    const tbCS = tb ? getComputedStyle(tb) : null;
    return {
      headerChildren: header ? Array.from(header.children).flatMap((c) => c.id ? [c.id] : Array.from(c.querySelectorAll('button')).map((b) => b.id)) : [],
      header: r(header),
      toolbar: r(tb),
      toolbarStyle: tbCS ? { display: tbCS.display, wrap: tbCS.flexWrap, gap: tbCS.gap, overflowX: tbCS.overflowX, pos: tbCS.position } : null,
      toolbarButtons: tb ? Array.from(tb.querySelectorAll('button')).map((b) => ({ id: b.id, visible: getComputedStyle(b).display !== 'none', rect: r(b) })) : [],
      deleteBtn: r(document.getElementById('deleteCurrentNote')),
      body: r(document.getElementById('noteBodyInput')),
      others: map,
      hiddenRule: (() => { const d = document.createElement('div'); d.className = 'hidden'; document.body.appendChild(d); const disp = getComputedStyle(d).display; d.remove(); return disp; })(),
      modalH: (() => { const m = document.querySelector('.full-screen-note'); return m ? Math.round(m.getBoundingClientRect().height) : null; })()
    };
  });
  log(JSON.stringify(dump, null, 2));
} catch (e) {
  log('HARNESS ERROR: ' + e.message);
} finally {
  try { await browser?.close(); } catch (_) {}
  server.close();
}
fs.writeFileSync(path.join(HERE, 'notes_minimal_probe.txt'), out.join('\n'));
