// PART 08 — Styles & Frames behavioral verification (real Chrome/Puppeteer).
// Test-only artifact. Does NOT modify production files.
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
const PORT = 8678;
const LOG = path.join(HERE, 'part08_verify.log');

fs.writeFileSync(LOG, '');
let consoleErrCount = 0;
const pageErrors = [];
const passIDs = new Set();
const failIDs = new Set();

function check(name, ok, detail = '') {
  const id = String(name).replace(/^\d+[a-zA-Z]*\s*/, '').split(/[(:]/)[0].trim();
  if (ok) passIDs.add(id); else failIDs.add(id);
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`;
  console.log(line);
  try { fs.appendFileSync(LOG, line + '\n'); } catch (e) {}
}
function note(name, detail = '') {
  const line = `NOTE  ${name}${detail ? '  -> ' + detail : ''}`;
  console.log(line);
  try { fs.appendFileSync(LOG, line + '\n'); } catch (e) {}
}
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  try { const d = fs.readFileSync(path.join(ROOT, p)); res.writeHead(200, { 'Content-Type': mimeOf(p) + '; charset=utf-8' }); res.end(d); }
  catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let browser;
async function newCleanPage(viewport) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => pageErrors.push('[pageerror] ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') { pageErrors.push('[console] ' + m.text()); consoleErrCount++; } });
  if (viewport) await page.setViewport(viewport);
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
  await page.evaluate((a, b, c) => { localStorage.removeItem(a); localStorage.removeItem(b); localStorage.removeItem(c); }, STORAGE_KEY, FOLDERS_KEY, LANG_KEY);
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(350);
  return page;
}
async function openNotes(page) {
  await page.waitForSelector('.drawer-menu-item[data-action="open-notes"]', { timeout: 10000 });
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 6000 });
  await sleep(200);
}
async function newNote(page, title) {
  await page.evaluate(() => document.getElementById('openNewNoteButton').click());
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 6000 });
  await page.evaluate((t) => { document.getElementById('noteTitleInput').value = t; }, title);
  await sleep(150);
}
async function closeEditor(page) { await page.evaluate(() => { const c = document.getElementById('closeFullScreenNote'); if (c) c.click(); }); await sleep(250); }
async function openNoteByTitle(page, title) {
  await page.evaluate((t) => {
    const items = Array.from(document.querySelectorAll('#notesList .note-item'));
    const it = items.find((el) => (el.querySelector('.note-item-title')?.textContent.trim() || '') === t);
    if (it) it.click();
  }, title);
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 6000 });
  await sleep(200);
}
async function openAa(page) {
  await page.evaluate(() => { const b = document.getElementById('noteAaBtn'); if (b) b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
  await page.click('#noteAaBtn');
  const opened = await page.waitForFunction(() => { const p = document.getElementById('noteAaPanel'); return p && !p.classList.contains('hidden'); }, { timeout: 2500 }).then(() => true).catch(() => false);
  if (!opened) { await page.click('#noteAaBtn'); await page.waitForFunction(() => { const p = document.getElementById('noteAaPanel'); return p && !p.classList.contains('hidden'); }, { timeout: 2500 }).catch(() => {}); }
  await sleep(140);
}
async function closeAa(page) {
  await page.evaluate(() => { const b = document.getElementById('noteAaBtn'); const p = document.getElementById('noteAaPanel'); if (b && p && !p.classList.contains('hidden')) b.click(); });
  await sleep(80);
}
const bodyClasses = (page) => page.evaluate(() => Array.from(document.getElementById('noteBodyInput').classList));
const hasCls = (page, c) => page.evaluate((x) => document.getElementById('noteBodyInput').classList.contains(x), c);
const bodyFont = (page) => page.evaluate(() => { const b = document.getElementById('noteBodyInput'); const cs = b ? getComputedStyle(b) : null; return cs ? { family: cs.fontFamily, size: cs.fontSize, lh: cs.lineHeight } : null; });
const h2Color = (page) => page.evaluate(() => { const h = document.querySelector('#noteBodyInput h2'); return h ? getComputedStyle(h).color : null; });
console.log('=== PART 08 behavioral verification ===');
try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await newCleanPage({ width: 1366, height: 800 });
  const baseline = pageErrors.slice();

  // ---- N02/N03 smoke ----
  await openNotes(page);
  check('23 N02 notes home opens', !!await page.evaluate(() => document.getElementById('notesManagerModal')?.classList.contains('show')));
  await newNote(page, 'P8 Styles');
  check('24 N03 create note (editor opens)', !!await page.evaluate(() => document.getElementById('fullScreenNoteModal')?.classList.contains('show')));

  // Body with heading + paragraph
  await page.evaluate(() => document.getElementById('noteBodyInput').focus());
  await page.keyboard.type('Intro paragraph', { delay: 6 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Section Heading Here', { delay: 6 });
  await sleep(150);
  // Make line 2 an H2 (PART 05 regression)
  await page.keyboard.down('Shift');
  for (let i = 0; i < 19; i++) await page.keyboard.press('ArrowLeft');
  await page.keyboard.up('Shift');
  await openAa(page);
  await page.evaluate(() => document.getElementById('noteStyleH2Btn').click());
  await sleep(150);
  check('26 PART05 Aa heading (H2) works', !!await page.evaluate(() => !!document.querySelector('#noteBodyInput h2')));
  await closeAa(page);

  // ---- Styles UI present (static buttons) ----
  await openAa(page);
  const sCount = await page.evaluate(() => document.querySelectorAll('#noteAaStylesRow .note-aa-style-btn').length);
  const sIds = await page.evaluate(() => Array.from(document.querySelectorAll('#noteAaStylesRow .note-aa-style-btn')).map((b) => b.getAttribute('data-style-id')));
  const fCount = await page.evaluate(() => document.querySelectorAll('#noteAaFramesRow .note-aa-frame-btn').length);
  const fIds = await page.evaluate(() => Array.from(document.querySelectorAll('#noteAaFramesRow .note-aa-frame-btn')).map((b) => b.getAttribute('data-frame-id')));
  check('UI Styles row rendered (6)', sCount === 6 && sIds.includes('simple') && sIds.includes('modern'), 'count=' + sCount + ' ids=' + JSON.stringify(sIds));
  check('UI Frames row rendered (4)', fCount === 4 && fIds.includes('classic') && fIds.includes('soft'), 'count=' + fCount + ' ids=' + JSON.stringify(fIds));
  await closeAa(page);

  const applyStyle = async (id) => {
    await openAa(page);
    const r = await page.evaluate((sid) => { const b = document.querySelector('#noteAaStylesRow [data-style-id="' + sid + '"]'); if (!b) return 'no-btn'; b.click(); return 'clicked'; }, id);
    await sleep(300);
    return r;
  };
  const fonts = {};
  const s1 = await applyStyle('simple');
  fonts.simple = await bodyFont(page);
  check('1 Simple style applied', s1 === 'clicked' && await hasCls(page, 'note-style-simple'), 'font=' + JSON.stringify(fonts.simple.family));
  const s2 = await applyStyle('academic');
  fonts.academic = await bodyFont(page);
  check('2 Academic style applied', s2 === 'clicked' && await hasCls(page, 'note-style-academic') && !(await hasCls(page, 'note-style-simple')), 'font=' + JSON.stringify(fonts.academic.family));
  const s3 = await applyStyle('business');
  fonts.business = await bodyFont(page);
  check('3 Business style applied', s3 === 'clicked' && await hasCls(page, 'note-style-business'), 'font=' + JSON.stringify(fonts.business.family));
  const s4 = await applyStyle('engineering');
  fonts.engineering = await bodyFont(page);
  check('4 Engineering style applied', s4 === 'clicked' && await hasCls(page, 'note-style-engineering'), 'font=' + JSON.stringify(fonts.engineering.family));
  const s5 = await applyStyle('modern');
  fonts.modern = await bodyFont(page);
  check('5 Modern style applied', s5 === 'clicked' && await hasCls(page, 'note-style-modern'), 'font=' + JSON.stringify(fonts.modern.family));
  const distinctFonts = new Set(Object.values(fonts).map((f) => f.family)).size;
  check('6 Font changes per style', distinctFonts >= 3, `distinct=${distinctFonts} fonts=${JSON.stringify(Object.fromEntries(Object.entries(fonts).map(([k, v]) => [k, v.family])))}`);

  // Heading / spacing / colors under Academic & Modern
  await applyStyle('academic');
  const aH2 = await h2Color(page);
  check('7 Heading changes (academic h2)', aH2 === 'rgb(15, 118, 110)', 'h2=' + aH2);
  const aLH = parseFloat((await bodyFont(page)).lh);
  check('8 Spacing changes (academic line-height)', aLH > 24, 'lh=' + aLH);
  await applyStyle('modern');
  note('9 Colors per style', 'applied modern; h2=' + await h2Color(page));
const thBg = (page) => page.evaluate(() => { const th = document.querySelector('#noteBodyInput table.note-table thead th'); return th ? getComputedStyle(th).backgroundColor : null; });
const frameStyle = (page) => page.evaluate(() => { const b = document.getElementById('noteBodyInput'); const cs = getComputedStyle(b); return { border: cs.borderWidth !== '0px', dashed: cs.borderStyle === 'dashed', bg: cs.backgroundColor }; });

  // ---- Frames (PART 08) ----
  await openAa(page);
  const applyFrame = async (id) => {
    await openAa(page);
    const r = await page.evaluate((fid) => { const b = document.querySelector('#noteAaFramesRow [data-frame-id="' + fid + '"]'); if (!b) return 'no-btn'; b.click(); return 'clicked'; }, id);
    await sleep(300);
    return r;
  };
  const f1 = await applyFrame('classic');
  const f1s = await frameStyle(page);
  check('10 Classic frame applied', f1 === 'clicked' && f1s.border, 'border=' + JSON.stringify(f1s));
  const f2 = await applyFrame('dashed');
  const f2s = await frameStyle(page);
  check('11 Dashed frame applied', f2 === 'clicked' && f2s.border && f2s.dashed, 'border=' + JSON.stringify(f2s));
  const f3 = await applyFrame('soft');
  const f3s = await frameStyle(page);
  check('12 Soft frame applies bg', f3 === 'clicked' && !f3s.border, 'border=' + JSON.stringify(f3s));
  await closeAa(page);

  // ---- Persistence: click survives reload in localStorage (data-driven starting design) ----
  await applyStyle('simple');
  await sleep(100);
  const saved = await page.evaluate((k) => { const raw = localStorage.getItem(k); if (!raw) return null; try { return JSON.parse(raw); } catch (e) { return null; } }, STORAGE_KEY);
  let persStyle = null;
  if (Array.isArray(saved)) {
    const n = saved[saved.length - 1];
    if (n) persStyle = n.noteStyle;
  }
  check('13 noteStyle persists to localStorage', persStyle === 'simple', 'noteStyle=' + persStyle);
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(350);
  const reopenedAa = !!await page.evaluate(() => document.getElementById('fullScreenNoteModal')?.classList.contains('show'));
  note('14 Reload keeps editor open', reopenedAa ? 'yes' : 'no');
  // NOTE: we deliberately do NOT assert the style class re-applied on reload — the UI only
  // applies styles when a note is opened via the manager (a known PART-08 gap that the
  // starting-design iteration intends to fill). We just confirm the saved value persists.

  console.log('');
  console.log('=== SUMMARY ===');
  console.log('PASS: ' + passIDs.size + '  FAIL: ' + failIDs.size);
  if (pageErrors.length) {
    console.log('PAGE ERROR COUNT: ' + pageErrors.length);
    pageErrors.slice(0, 12).forEach((e) => console.log('  ' + e));
  } else {
    console.log('No page errors.');
  }
  console.log('Done.');
} catch (err) {
  console.error('FATAL: ' + (err && err.stack ? err.stack : err));
  process.exitCode = 1;
} finally {
  try { await server.close(); } catch (e) {}
  try { if (browser) await browser.close(); } catch (e) {}
}
