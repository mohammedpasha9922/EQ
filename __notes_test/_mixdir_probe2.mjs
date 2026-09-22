// SCRATCH PROBE 2 (test-only, real Chrome) — decides the final scoped fix.
// Objective marker detection: li::marker is painted red (probe only), the editor
// is screenshotted, the PNG is decoded back inside the page and red pixels are
// clustered per row band -> marker x. Compared with the text ink of each item.
// Run: node __notes_test/_mixdir_probe2.mjs --lang=en,ar --variant=0,1,2,3,4 --w=1280,390
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.join(HERE, '_mixdir2');
fs.mkdirSync(OUT, { recursive: true });
const LOG = path.join(OUT, 'probe.log');
try { fs.unlinkSync(LOG); } catch (e) {}
const log = (s) => { try { fs.appendFileSync(LOG, s + '\n'); } catch (e) {} console.log(s); };
const arg = (n, d) => { const a = process.argv.find(x => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const LANGS = String(arg('lang', 'en')).split(',');
const WIDTHS = String(arg('w', '1280')).split(',').map(Number);
const VARIANTS_ARG = String(arg('variant', '0')).split(',');

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

// Mixed AR/EN content, stored exactly the way the Notes editor stores it
// (plain text + formatting runs carrying heading/list markers) — no synthetic HTML.
const LINES = [
  { t: 'فقرة عربية فقط', list: null },
  { t: 'English paragraph only', list: null },
  { t: 'مرحبا hello world 123', list: null },
  { t: 'Hello مرحبا world', list: null },
  { t: 'بند عربي واحد', list: 'ul' },
  { t: 'بند عربي اثنان', list: 'ul' },
  { t: 'فاصل نصي', list: null },
  { t: 'English bullet one', list: 'ul' },
  { t: 'English bullet two', list: 'ul' },
  { t: 'فاصل', list: null },
  { t: 'بند مختلط mixed', list: 'ul' },
  { t: 'mixed بند English first', list: 'ul' },
  { t: 'فاصل ثانٍ', list: null },
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
const MARKER_INK = 'li::marker { color: rgb(255,0,0) !important; }';

const MEASURE_FN = function () {
  const ed = document.getElementById('noteBodyInput');
  if (!ed) return { error: 'no editor' };
  const rr = (r) => ({ l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) });
  const cs = (el) => {
    const c = getComputedStyle(el);
    return { dir: c.direction, align: c.textAlign, bidi: c.unicodeBidi, pl: c.paddingLeft, pr: c.paddingRight };
  };
  const inkOf = (nodes) => {
    if (!nodes || !nodes.length) return null;
    try {
      const rg = document.createRange();
      rg.setStartBefore(nodes[0]); rg.setEndAfter(nodes[nodes.length - 1]);
      const rects = Array.from(rg.getClientRects()).filter(x => x.width > 0);
      if (!rects.length) return null;
      const f = rr(rects[0]);
      const bb = rr(rg.getBoundingClientRect());
      return { ...f, lw: Math.round(bb.width), lines: rects.length };
    } catch (e) { return null; }
  };
  const edRect = rr(ed.getBoundingClientRect());
  const out = { editor: { rect: edRect, ...cs(ed), dirAttr: ed.getAttribute('dir') }, inline: [], items: [] };
  let seg = [];
  const flush = () => { const ink = inkOf(seg); if (ink && ink.w > 0) out.inline.push({ ink }); seg = []; };
  for (const child of Array.from(ed.childNodes)) {
    if (child.nodeName === 'BR') { flush(); continue; }
    if (child.nodeType === 3) { seg.push(child); continue; }
    if (child.nodeType === 1) {
      flush();
      if (child.tagName === 'UL' || child.tagName === 'OL') {
        const ulBox = rr(child.getBoundingClientRect());
        const ul = { tag: child.tagName, ulBox, ...cs(child), dirAttr: child.getAttribute('dir') };
        for (const li of Array.from(child.children)) {
          const box = rr(li.getBoundingClientRect());
          const ink = inkOf(Array.from(li.childNodes).length ? Array.from(li.childNodes) : [li]);
          out.items.push({ ul, box, ink, ...cs(li), dirAttr: li.getAttribute('dir'), text: (li.textContent || '').slice(0, 26) });
        }
      } else {
        const ink = inkOf([child]);
        out.inline.push({ kind: child.tagName, ink });
      }
    }
  }
  flush();
  out.editorScroll = { sw: ed.scrollWidth, cw: ed.clientWidth, docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  return out;
};

// Decode the screenshot inside the page and cluster RED marker pixels.
const DECODE_FN = async function (dataUrl, clipTop) {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const px = ctx.getImageData(0, 0, c.width, c.height).data;
  const rows = new Map();
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4;
      if (px[i] > 170 && px[i + 1] < 110 && px[i + 2] < 110) {
        const o = rows.get(y) || { minX: 1e9, maxX: -1, n: 0 };
        if (x < o.minX) o.minX = x; if (x > o.maxX) o.maxX = x; o.n++;
        rows.set(y, o);
      }
    }
  }
  const ys = Array.from(rows.keys()).sort((a, b) => a - b);
  const clusters = [];
  for (const y of ys) {
    const r = rows.get(y);
    const last = clusters[clusters.length - 1];
    if (last && y - last.yb <= 2) { last.yb = y; last.minX = Math.min(last.minX, r.minX); last.maxX = Math.max(last.maxX, r.maxX); last.n += r.n; }
    else clusters.push({ yt: y, yb: y, minX: r.minX, maxX: r.maxX, n: r.n });
  }
  return clusters.map(cl => ({ ...cl, yt: cl.yt + clipTop, yb: cl.yb + clipTop, cx: Math.round((cl.minX + cl.maxX) / 2) }));
};

const BASE_CSS = '.note-body-input, .note-body-input p, .note-body-input li { text-align: start; unicode-bidi: plaintext; } .note-body-input ul, .note-body-input ol { padding-inline-start: 20px; padding-inline-end: 0; }';
const BASE_NO_LI_PLAIN = '.note-body-input, .note-body-input p { text-align: start; unicode-bidi: plaintext; } .note-body-input li { text-align: start; } .note-body-input ul, .note-body-input ol { padding-inline-start: 20px; padding-inline-end: 0; }';
const VARIANTS = {
  '0': { css: '', attrs: 'none' },
  '1': { css: BASE_CSS, attrs: 'none' },
  '2': { css: BASE_CSS, attrs: 'all' },
  '3': { css: BASE_CSS + ' .note-body-input ul, .note-body-input ol { list-style-position: inside; }', attrs: 'none' },
  '5': { css: BASE_CSS, attrs: 'li' },
  '6': { css: BASE_CSS, attrs: 'li', listDir: true },
  '7': { css: BASE_CSS, attrs: 'rootli' },
  '8': { css: BASE_NO_LI_PLAIN, attrs: 'li', listDir: true }
};
const RTL_RE = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
const applyVariant = async (page, v) => {
  const cfg = VARIANTS[v] || { css: '', attrs: 'none' };
  if (cfg.css) await page.addStyleTag({ content: cfg.css });
  if (cfg.attrs !== 'none' || cfg.listDir) {
    await page.evaluate((mode, listDir, rtlSrc) => {
      const ed = document.getElementById('noteBodyInput');
      if (!ed) return;
      if (mode !== 'only-lists') ed.setAttribute('dir', 'auto');
      if (listDir) {
        const re = new RegExp(rtlSrc);
        ed.querySelectorAll('ul, ol').forEach(el => el.setAttribute('dir', re.test(el.textContent || '') ? 'rtl' : 'ltr'));
      }
      if (mode === 'all' || mode === 'only-lists') ed.querySelectorAll('ul, ol').forEach(el => el.setAttribute('dir', 'auto'));
      if (mode === 'all' || mode === 'li' || mode === 'rootli') ed.querySelectorAll('li').forEach(el => el.setAttribute('dir', 'auto'));
      if (mode === 'rootli') ed.setAttribute('dir', 'auto');
    }, cfg.attrs === 'all' ? 'all' : cfg.attrs === 'li' ? 'li' : cfg.attrs === 'rootli' ? 'rootli' : cfg.attrs === 'lists' ? 'only-lists' : 'root-only',
      !!cfg.listDir, RTL_RE.source);
  }
};
const sideOf = (ink, box) => (!ink || !box) ? 'unknown'
  : (ink.l - box.l <= 12 ? 'left' : (box.r - ink.r <= 12 ? 'right' : 'center'));
const attachedOf = (item, marker) => {
  const side = sideOf(item.ink, item.box);
  if (!marker || side === 'unknown') return 'n/a';
  const near = side === 'left' ? Math.abs(marker.maxX - item.box.l) : Math.abs(marker.minX - item.box.r);
  return near <= 26 ? 'yes' : 'NO(off=' + near + ')';
};
const VARIANTS_LIST = VARIANTS_ARG;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
try {
  for (const lang of LANGS) {
    for (const width of WIDTHS) {
      for (const variant of VARIANTS_LIST) {
        const page = await browser.newPage();
        const errs = [];
        page.on('pageerror', e => errs.push('pageerror: ' + e.message));
        page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
        await page.setViewport({ width, height: 900 });
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
        await sleep(250);
        await page.evaluate(() => {
          const card = Array.from(document.querySelectorAll('#notesList .note-item'))
            .find(li => (li.querySelector('.note-item-title')?.textContent.trim() || '') === 'Mixed Direction Note');
          if (card) card.click();
        });
        await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 15000 });
        await sleep(500);
        await applyVariant(page, variant);
        await page.addStyleTag({ content: MARKER_INK });
        await sleep(250);
        const data = await page.evaluate(MEASURE_FN);
        data.probe = { lang, width, variant, errors: errs };
        const clipTop = Math.max(0, Math.floor(data.editor.rect.t));
        const shot = await page.screenshot({ encoding: 'base64', clip: { x: 0, y: clipTop, width: Math.min(width, data.editor.rect.r + 30), height: Math.min(900, Math.ceil(data.editor.rect.h) + 10) } });
        const clusters = await page.evaluate(DECODE_FN, 'data:image/png;base64,' + shot, clipTop);
        data.markers = clusters;
        for (const it of data.items) {
          it.marker = clusters.find(cl => cl.yb >= it.box.t - 4 && cl.yt <= it.box.b + 4) || null;
        }
        fs.writeFileSync(path.join(OUT, `m-${lang}-${width}-v${variant}.json`), JSON.stringify(data, null, 1));
        fs.writeFileSync(path.join(OUT, `s-${lang}-${width}-v${variant}.png`), Buffer.from(shot, 'base64'));
        log(`### lang=${lang} w=${width} v=${variant} errs=${errs.length} ovf=${data.editorScroll.docOverflow} edScroll=${data.editorScroll.sw - data.editorScroll.cw} edDir=${data.editor.dir}/${data.editor.dirAttr} markers=${clusters.length}`);
        for (const l of data.inline) log(`   para side=${sideOf(l.ink, { l: data.editor.rect.l, r: data.editor.rect.r })} ink=[${l.ink.l}..${l.ink.r} w=${l.ink.w} lines=${l.ink.lines}]`);
        for (const it of data.items) {
          const m = it.marker;
          log(`   ${it.ul.tag} ul(dir=${it.ul.dir} padL=${it.ul.pl} padR=${it.ul.pr}) li(dir=${it.dir}/${it.dirAttr}) text=[${it.ink.l}..${it.ink.r} lines=${it.ink.lines}] box=[${it.box.l}..${it.box.r}] textSide=${sideOf(it.ink, it.box)} markerX=${m ? m.minX + '..' + m.maxX : 'none'} attached=${attachedOf(it, m)} :: ${it.text}`);
        }
        await page.close();
      }
    }
  }
} finally { await browser.close(); server.close(); }
