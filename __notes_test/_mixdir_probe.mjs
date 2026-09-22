// SCRATCH PROBE (test-only, real Chrome) — measure mixed AR/EN direction + list
// geometry inside the REAL Notes editor, with candidate CSS variants injected at
// runtime. Writes JSON + screenshots so the correct CSS can be chosen before any
// production file is edited.
// Run: node __notes_test/_mixdir_probe.mjs --lang=en --variant=0,1,2,3
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.join(HERE, '_mixdir');
fs.mkdirSync(OUT, { recursive: true });
const arg = (n, d) => { const a = process.argv.find(x => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const LANGS = String(arg('lang', 'en')).split(',');
const VARIANTS = String(arg('variant', '0')).split(',');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  try {
    const d = fs.readFileSync(path.join(ROOT, p));
    res.writeHead(200, { 'Content-Type': (MIME[path.extname(p).toLowerCase()] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(d);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Mixed AR/EN content modelled exactly like the Notes editor stores it
// (plain text + formatting runs carrying list markers).
const LINES = [
  { t: 'فقرة عربية فقط', list: null },
  { t: 'English paragraph only', list: null },
  { t: 'مرحبا hello world 123', list: null },
  { t: 'Hello مرحبا world', list: null },
  { t: 'بند عربي واحد', list: 'ul' },
  { t: 'بند عربي اثنان', list: 'ul' },
  { t: 'فاصل نصي spacer', list: null },
  { t: 'English bullet one', list: 'ul' },
  { t: 'English bullet two', list: 'ul' },
  { t: 'فاصل spacer two', list: null },
  { t: 'بند مختلط mixed', list: 'ul' },
  { t: 'mixed بند English first', list: 'ul' },
  { t: 'فاصل spacer three', list: null },
  { t: 'العنصر الأول', list: 'ol' },
  { t: 'Second numbered item', list: 'ol' },
  { t: 'مرحبا hello numbered', list: 'ol' }
];
function buildNote(title) {
  let body = '', pos = 0; const formatting = [];
  LINES.forEach((l, i) => {
    if (i) { body += '\n'; pos += 1; }
    const s = pos; body += l.t; pos += l.t.length;
    if (l.list) formatting.push({ start: s, end: pos, list: l.list });
  });
  return { id: 'n-mixed', title, body, bodyFormatting: formatting, folderId: 'personal', createdAt: Date.now() - 3600e3, updatedAt: Date.now() - 3600e3 };
}
const FOLDERS = [{ id: 'personal', name: 'Personal', createdAt: Date.now() }];

const VAR_CSS = {
  '0': '',
  '1': '.note-body-input p, .note-body-input li { text-align: start; unicode-bidi: plaintext; } .note-body-input ul, .note-body-input ol { padding-inline-start: 20px; padding-inline-end: 0; }',
  '2': '.note-body-input, .note-body-input p, .note-body-input li { text-align: start; unicode-bidi: plaintext; } .note-body-input ul, .note-body-input ol { padding-inline-start: 20px; padding-inline-end: 0; }',
  '3': '.note-body-input, .note-body-input .note-block, .note-body-input p, .note-body-input h1, .note-body-input h2, .note-body-input h3, .note-body-input li { text-align: start; unicode-bidi: plaintext; } .note-body-input ul, .note-body-input ol { padding-inline-start: 20px; padding-inline-end: 0; }',
  '4': '.note-body-input, .note-body-input .note-block, .note-body-input p, .note-body-input h1, .note-body-input h2, .note-body-input h3, .note-body-input li { text-align: start; unicode-bidi: plaintext; } .note-body-input ul, .note-body-input ol { padding-inline-start: 20px; padding-inline-end: 0; unicode-bidi: plaintext; }'
};
const setDirAttr = (v) => v !== '0';
const setListDirAttr = (v) => v === '4';

const PROBE_FN = function () {
  const ed = document.getElementById('noteBodyInput');
  if (!ed) return { error: 'no editor' };
  const r2 = (r) => ({ l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), w: Math.round(r.width) });
  const cs = (el) => {
    const c = getComputedStyle(el);
    return { dir: c.direction, align: c.textAlign, bidi: c.unicodeBidi, pl: c.paddingLeft, pr: c.paddingRight };
  };
  const inkOf = (nodes) => {
    if (!nodes || !nodes.length) return null;
    try {
      const rg = document.createRange();
      rg.setStartBefore(nodes[0]); rg.setEndAfter(nodes[nodes.length - 1]);
      return r2(rg.getBoundingClientRect());
    } catch (e) { return null; }
  };
  const out = { editor: { rect: r2(ed.getBoundingClientRect()), ...cs(ed), dirAttr: ed.getAttribute('dir') }, lines: [], lists: [] };
  let seg = [];
  const flush = (label) => { const ink = inkOf(seg); if (ink && ink.w > 0) out.lines.push({ kind: 'inline', label, ink }); seg = []; };
  for (const child of Array.from(ed.childNodes)) {
    if (child.nodeName === 'BR') { flush('br'); continue; }
    if (child.nodeType === 3) { seg.push(child); continue; }
    if (child.nodeType === 1) {
      flush('before:' + child.tagName);
      if (child.tagName === 'UL' || child.tagName === 'OL') {
        out.lists.push({ tag: child.tagName, ...cs(child), rect: r2(child.getBoundingClientRect()), dirAttr: child.getAttribute('dir'), items: [] });
        const L = out.lists[out.lists.length - 1];
        for (const li of Array.from(child.children)) {
          const ink = inkOf(Array.from(li.childNodes).length ? Array.from(li.childNodes) : [li]);
          L.items.push({ text: (li.textContent || '').slice(0, 24), ink, rect: r2(li.getBoundingClientRect()), ...cs(li), dirAttr: li.getAttribute('dir') });
        }
      } else {
        const ink = inkOf([child]);
        out.lines.push({ kind: child.tagName, label: (child.textContent || '').slice(0, 24), ink, rect: r2(child.getBoundingClientRect()), ...cs(child) });
      }
    }
  }
  flush('end');
  out.overflowX = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  return out;
};
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
try {
  for (const lang of LANGS) {
    for (const variant of VARIANTS) {
      const page = await browser.newPage();
      const errs = [];
      page.on('pageerror', e => errs.push('pageerror: ' + e.message));
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      await page.setViewport({ width: 1280, height: 900 });
      await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'load', timeout: 60000 });
      await sleep(900);
      await page.evaluate((kf, f, kn, n, kl, lg) => {
        localStorage.setItem(kf, JSON.stringify(f));
        localStorage.setItem(kn, JSON.stringify(n));
        localStorage.setItem(kl, lg);
      }, 'eq-note-folders', FOLDERS, 'eq-note-manager-notes', [buildNote('Mixed Direction Note')], 'eq-language', lang);
      await page.reload({ waitUntil: 'load' });
      await sleep(1200);
      await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
      await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 15000 });
      await sleep(300);
      await page.evaluate(() => {
        const card = Array.from(document.querySelectorAll('#notesList .note-item'))
          .find(li => (li.querySelector('.note-item-title')?.textContent.trim() || '') === 'Mixed Direction Note');
        if (card) card.click();
      });
      await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 15000 });
      await sleep(600);
      if (VAR_CSS[variant]) await page.addStyleTag({ content: VAR_CSS[variant] });
      if (setDirAttr(variant)) {
        await page.evaluate((listOnly) => {
          const ed = document.getElementById('noteBodyInput');
          if (!ed) return;
          if (!listOnly) ed.setAttribute('dir', 'auto');
          ed.querySelectorAll('ul, ol').forEach(el => el.setAttribute('dir', 'auto'));
        }, setListDirAttr(variant));
      }
      await sleep(300);
      const data = await page.evaluate(PROBE_FN);
      data.probe = { lang, variant, errors: errs };
      const clip = await page.evaluate(() => {
        const r = document.getElementById('noteBodyInput').getBoundingClientRect();
        return { x: 0, y: Math.max(0, Math.floor(r.top)), width: 1280, height: Math.max(80, Math.min(900, Math.ceil(r.height) + 40)) };
      });
      await page.screenshot({ path: path.join(OUT, `editor-${lang}-v${variant}.png`), clip });
      fs.writeFileSync(path.join(OUT, `probe-${lang}-v${variant}.json`), JSON.stringify(data, null, 1));
      console.log(`--- lang=${lang} variant=${variant} errors=${errs.length} overflowX=${data.overflowX}`);
      console.log(`    editor dir=${data.editor.dir} (attr=${data.editor.dirAttr}) bidi=${data.editor.bidi}`);
      for (const L of data.lists) {
        console.log(`    ${L.tag} dir=${L.dir} padL=${L.pl} padR=${L.pr} bidi=${L.bidi} rect=[${L.rect.l}..${L.rect.r}]`);
        for (const it of L.items) console.log(`       li dir=${it.dir} align=${it.align} ink=[${it.ink ? it.ink.l + '..' + it.ink.r : '-'}] box=[${it.rect.l}..${it.rect.r}] :: ${it.text}`);
      }
      for (const l of data.lines) console.log(`    line(${l.kind}) dir=${l.dir} align=${l.align} ink=[${l.ink ? l.ink.l + '..' + l.ink.r : '-'}] :: ${l.label}`);
      await page.close();
    }
  }
} finally { await browser.close(); server.close(); }

