// PART 08 debug probe: confirm actual style apply + persist behavior.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const STORAGE_KEY = 'eq-note-manager-notes';
const FOLDERS_KEY = 'eq-note-folders';
const LANG_KEY = 'eq-language';
const PORT = 8679;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  try { const d = fs.readFileSync(path.join(ROOT, p)); res.writeHead(200, { 'Content-Type': (p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : 'text/html') + '; charset=utf-8' }); res.end(d); }
  catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERR: ' + m.text()); });
await page.setViewport({ width: 1366, height: 800 });
await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
await page.evaluate((a, b, c) => { localStorage.removeItem(a); localStorage.removeItem(b); localStorage.removeItem(c); }, STORAGE_KEY, FOLDERS_KEY, LANG_KEY);
await page.reload({ waitUntil: 'load', timeout: 60000 });
await sleep(400);

await page.waitForSelector('.drawer-menu-item[data-action="open-notes"]', { timeout: 10000 });
await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 6000 });
await sleep(200);
await page.evaluate(() => document.getElementById('openNewNoteButton').click());
await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 6000 });
await page.evaluate((t) => { document.getElementById('noteTitleInput').value = 'P8Dbg'; }, );
await sleep(200);

// count handlers
console.log('styleBtn count =', await page.evaluate(() => document.querySelectorAll('#noteAaStylesRow .note-aa-style-btn').length));
console.log('NOTE_A handler count:', await page.evaluate(() => {
  // count click listeners by dispatching
  let calls = 0;
  const b = document.querySelector('#noteAaStylesRow [data-style-id="simple"]');
  if (!b) return 'no-btn';
  b.addEventListener('click', () => calls++, true);
  b.click();
  return 'click dispatched';
}));
await sleep(300);
console.log('after click bodyInput classes:', JSON.stringify(await page.evaluate(() => Array.from(document.getElementById('noteBodyInput').classList).filter((c) => c.startsWith('note-style')))));
console.log('note.noteStyle (live):', await page.evaluate(() => { try { const n=window.Eq?.state?.currentOpenNote || (window.state||{}).currentOpenNote; return n ? n.noteStyle : 'no-state'; } catch(e){return 'err:'+e.message} }));
const ls = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('eq-note-manager-notes') || 'null'); } catch (e) { return 'parse-err'; } });
console.log('localStorage noteStyle:', ls && ls.notes ? ls.notes[0].noteStyle : 'none', 'styleId:', ls && ls.notes ? ls.notes[0].styleId : 'none', 'style:', ls && ls.notes ? ls.notes[0].style : 'none');


// reopen
await page.evaluate(() => { const c = document.getElementById('closeFullScreenNote'); if (c) c.click(); });
await sleep(300);
await page.evaluate(() => document.querySelector('#notesList .note-item').click());
await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 6000 });
await sleep(300);
console.log('after-reopen bodyInput classes:', JSON.stringify(await page.evaluate(() => Array.from(document.getElementById('noteBodyInput').classList).filter((c) => c.startsWith('note-style')))));

await browser.close();
server.close();
process.exit(0);
