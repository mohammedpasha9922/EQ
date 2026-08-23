// PART 14 — SMART DOCUMENTS: Image Tool (أداة الصورة 🖼)
// Behavioral test in a real Chrome browser via Puppeteer.
// Covers: toolbar 🖼 File Picker, image insertion, selection state,
// corner-handle resize (aspect locked), drag-to-move, delete,
// multi-image independence, RTL/LTR, responsive 1280/768/390/360,
// pointer/touch behavior, no page horizontal overflow, no JS errors,
// no alert(), and Calculator/History/Notes regression.
// Run:  node tests/part14_smart_images.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8241;
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
setTimeout(() => process.exit(124), 300000);

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(viewport) {
  const page = await browser.newPage();
  if (viewport) await page.setViewport(viewport);
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await page.evaluateOnNewDocument(() => {
    window.__dialogs = { alert: 0 };
    window.alert = () => { window.__dialogs.alert++; };
  });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(600);
  return { page, errs };
}
async function openDrawer(page) {
  await page.evaluate(() => document.getElementById('drawerToggle').click());
  await sleep(250);
}
async function setLang(page, locale) {
  await page.evaluate((l) => {
    const s = document.getElementById('topBarLanguageSelect');
    if (s) { s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); }
  }, locale);
  await sleep(400);
}
async function openBlank(page, locale) {
  await openDrawer(page);
  if (locale) await setLang(page, locale);
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click());
  await sleep(400);
  await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-new-doc"]').click());
  await sleep(450);
}
async function insertImage(page, file) {
  const input = await page.$('#smartAddImageInput');
  await input.uploadFile(file);
  await sleep(400);
}
const imgBox = (page) => page.evaluate(() => {
  const el = document.querySelector('#smartDocumentContent .smart-doc-image-wrap img.smart-doc-image');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: Math.round(r.width), h: Math.round(r.height) };
});
const handleBox = (page, h) => page.evaluate((hh) => {
  const el = document.querySelector(`#smartDocumentContent .smart-image-handle[data-handle="${hh}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}, h);
async function mouseDrag(page, from, to, steps = 6) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + (to.x - from.x) * i / steps, from.y + (to.y - from.y) * i / steps);
    await sleep(20);
  }
  await page.mouse.up();
  await sleep(120);
}

const PNG_SRC = path.join(ROOT, 'icon-192.png.png');


// ================= 1-14: Desktop flow (English / LTR) =================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');
  const st = await page.evaluate(() => window.__smartBlank.getState());
  check('1) Smart Documents editor opens', st.editorVisible === true && st.pageSize === 'A4');

  check('2) Image tool button exists in toolbar',
    await page.evaluate(() => !!document.querySelector('[data-toolbar="blank-doc"] button[data-tool="image"]')));
  await page.evaluate(() => {
    const input = document.getElementById('smartAddImageInput');
    window.__pickerOpened = false;
    input.click = function () { window.__pickerOpened = true; };
    document.querySelector('[data-toolbar="blank-doc"] button[data-tool="image"]').click();
  });
  await sleep(200);
  check('3) Clicking the image tool opens the File Picker',
    await page.evaluate(() => window.__pickerOpened === true));

  await insertImage(page, PNG_SRC);
  const inserted = await page.evaluate(() => {
    const wrap = document.querySelector('#smartDocumentContent .smart-doc-image-wrap');
    const img = wrap && wrap.querySelector('img.smart-doc-image');
    return {
      inContent: !!(wrap && document.getElementById('smartDocumentContent').contains(wrap)),
      isPng: img ? img.src.startsWith('data:image/png') : false,
      visible: img ? img.offsetHeight > 0 : false,
      wrapped: !!wrap
    };
  });
  check('4) Selected image is inserted inside #smartDocumentContent', inserted.inContent && inserted.isPng, JSON.stringify(inserted));
  check('5) Inserted image is visible and wrapped for interaction', inserted.visible && inserted.wrapped);

  const box = await imgBox(page);
  await page.mouse.click(box.x, box.y);
  await sleep(150);
  const sel = await page.evaluate(() => ({
    selected: window.__smartImage.selected(),
    cls: !!document.querySelector('#smartDocumentContent .smart-doc-image-wrap.is-selected'),
    aria: document.querySelector('#smartDocumentContent .smart-doc-image-wrap img.smart-doc-image').getAttribute('aria-selected'),
    handles: document.querySelectorAll('#smartDocumentContent .smart-image-handle').length,
    delBtn: !!document.querySelector('#smartDocumentContent .smart-image-delete')
  }));
  check('6) Clicking the image selects it (border + handles + delete)', sel.cls && sel.handles === 4 && sel.delBtn, JSON.stringify(sel));
  check('7) Selection state exposed (window.__smartImage)', sel.selected === true && sel.aria === 'true');

  const before = await imgBox(page);
  const se = await handleBox(page, 'se');
  await mouseDrag(page, se, { x: se.x + 60, y: se.y + 60 });
  const afterBig = await imgBox(page);
  const ratioBefore = before.w / before.h;
  const ratioAfter = afterBig.w / afterBig.h;
  check('8) Dragging SE handle enlarges the image', afterBig.w > before.w + 20 && afterBig.h > before.h + 20,
    `${before.w}x${before.h} -> ${afterBig.w}x${afterBig.h}`);
  check('9) Aspect ratio preserved while resizing', Math.abs(ratioAfter - ratioBefore) < 0.06,
    `ratio ${ratioBefore.toFixed(3)} -> ${ratioAfter.toFixed(3)}`);

  const se2 = await handleBox(page, 'se');
  await mouseDrag(page, se2, { x: se2.x - 50, y: se2.y - 50 });
  const afterSmall = await imgBox(page);
  check('10) Dragging SE handle inward shrinks the image', afterSmall.w < afterBig.w - 15 && afterSmall.h < afterBig.h - 15,
    `${afterBig.w}x${afterBig.h} -> ${afterSmall.w}x${afterSmall.h}`);

  const b2 = await imgBox(page);
  await mouseDrag(page, b2, { x: b2.x + 70, y: b2.y + 40 });
  const moved = await page.evaluate(() => {
    const w = document.querySelector('#smartDocumentContent .smart-doc-image-wrap');
    return { tx: parseFloat(w.dataset.tx || '0'), ty: parseFloat(w.dataset.ty || '0') };
  });
  check('11) Dragging the image moves it inside the canvas', moved.tx > 30 && moved.ty > 10, JSON.stringify(moved));

  await page.evaluate(() => document.getElementById('smartBlankCanvas').dispatchEvent(
    new MouseEvent('click', { bubbles: true })));
  await sleep(150);
  check('12) Clicking outside the image removes selection',
    await page.evaluate(() => window.__smartImage.selected() === false &&
      !document.querySelector('#smartDocumentContent .smart-doc-image-wrap.is-selected')));

  await insertImage(page, PNG_SRC);
  await sleep(300);
  const countBefore = await page.evaluate(() =>
    document.querySelectorAll('#smartDocumentContent .smart-doc-image-wrap').length);
  const b3 = await imgBox(page);
  await page.mouse.click(b3.x, b3.y);
  await sleep(120);
  await page.evaluate(() => document.querySelector('#smartDocumentContent .smart-image-delete').click());
  await sleep(200);
  const countAfter = await page.evaluate(() =>
    document.querySelectorAll('#smartDocumentContent .smart-doc-image-wrap').length);
  check('13) Delete control removes the (selected) image only',
    countAfter === countBefore - 1 && await page.evaluate(() => window.__smartImage.selected() === false),
    `count ${countBefore} -> ${countAfter}`);

  await insertImage(page, PNG_SRC); await sleep(250);
  await insertImage(page, PNG_SRC); await sleep(250);
  const twoInfo = await page.evaluate(() => {
    const wraps = Array.from(document.querySelectorAll('#smartDocumentContent .smart-doc-image-wrap'));
    const lastTwo = wraps.slice(-2);
    lastTwo[0].querySelector('img.smart-doc-image').click();
    const firstSel = lastTwo[0].classList.contains('is-selected');
    lastTwo[1].querySelector('img.smart-doc-image').click();
    return {
      total: wraps.length,
      firstStillSelected: lastTwo[0].classList.contains('is-selected'),
      secondSelected: lastTwo[1].classList.contains('is-selected'),
      onlyOne: document.querySelectorAll('#smartDocumentContent .smart-doc-image-wrap.is-selected').length === 1,
      firstWasSelected: firstSel
    };
  });
  check('14) Multiple images: selecting one never corrupts the other state',
    twoInfo.total >= 2 && twoInfo.firstWasSelected && twoInfo.secondSelected && twoInfo.onlyOne && !twoInfo.firstStillSelected,
    JSON.stringify(twoInfo));
  check('No JS errors in desktop flow', errs.length === 0, errs.join(' | '));
  check('No alert() used in desktop flow', await page.evaluate(() => window.__dialogs.alert === 0));
  await page.close();
}


// ================= 15-16: RTL Arabic + LTR English =================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'ar');
  const dirInfo = await page.evaluate(() => ({
    docDir: document.documentElement.getAttribute('dir'),
    viewDir: document.getElementById('smartBlankView').getAttribute('dir'),
    label: document.querySelector('[data-toolbar="blank-doc"] button[data-tool="image"] span[data-i18n]').textContent.trim()
  }));
  check('15a) Arabic UI is RTL with localized image label (no English leakage)',
    dirInfo.docDir === 'rtl' && dirInfo.viewDir === 'rtl' && dirInfo.label === '\u0635\u0648\u0631\u0629', JSON.stringify(dirInfo));
  await insertImage(page, PNG_SRC);
  await sleep(300);
  const b = await imgBox(page);
  await page.mouse.click(b.x, b.y); await sleep(120);
  await mouseDrag(page, b, { x: b.x - 60, y: b.y + 30 });
  const rtlMove = await page.evaluate(() => {
    const w = document.querySelector('#smartDocumentContent .smart-doc-image-wrap');
    return { tx: parseFloat(w.dataset.tx || '0'), ty: parseFloat(w.dataset.ty || '0') };
  });
  check('15b) RTL does not block free image movement', Math.abs(rtlMove.tx) > 20, JSON.stringify(rtlMove));
  check('RTL flow has no JS errors', errs.length === 0, errs.join(' | '));
  await page.close();

  const p2 = await newPage({ width: 1280, height: 800 });
  await openBlank(p2.page, 'en');
  const ltr = await p2.page.evaluate(() => ({
    docDir: document.documentElement.getAttribute('dir'),
    label: document.querySelector('[data-toolbar="blank-doc"] button[data-tool="image"] span[data-i18n]').textContent.trim()
  }));
  check('16) English UI stays LTR with "Image" label', ltr.docDir !== 'rtl' && ltr.label === 'Image', JSON.stringify(ltr));
  await p2.page.close();
}

// ================= 17: Responsive 1280 / 768 / 390 / 360 =================
for (const vp of [{ name: 'Desktop', width: 1280, height: 800 }, { name: 'Tablet', width: 768, height: 1024 },
                  { name: 'iPhone', width: 390, height: 844 }, { name: 'Mobile', width: 360, height: 780 }]) {
  const { page, errs } = await newPage({ width: vp.width, height: vp.height });
  await openBlank(page, 'en');
  await insertImage(page, PNG_SRC);
  await sleep(300);
  const b = await imgBox(page);
  await page.mouse.click(b.x, b.y); await sleep(120);
  const se = await handleBox(page, 'se');
  await mouseDrag(page, se, { x: se.x + 40, y: se.y + 40 });
  const st = await page.evaluate(() => {
    const bar = document.querySelector('[data-toolbar="blank-doc"]');
    const canvas = document.getElementById('smartBlankCanvas');
    return {
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      toolbarVisible: !!bar && bar.offsetHeight > 0,
      toolbarScrollable: getComputedStyle(bar).overflowX === 'auto' || getComputedStyle(bar).overflowX === 'scroll',
      canvasUsable: !!canvas && canvas.offsetHeight > 100,
      imgInDoc: !!document.querySelector('#smartDocumentContent .smart-doc-image-wrap')
    };
  });
  check(`17-${vp.name} ${vp.width}px) No page-level horizontal overflow`, st.overflowX <= 0, 'overflow=' + st.overflowX);
  check(`17-${vp.name} ${vp.width}px) Toolbar intact + canvas usable + image present`,
    st.toolbarVisible && st.toolbarScrollable && st.canvasUsable && st.imgInDoc, JSON.stringify(st));
  check(`17-${vp.name} ${vp.width}px) No JS errors`, errs.length === 0, errs.join(' | '));
  await page.close();
}


// ================= 18: Touch / Pointer Events behavior =================
{
  const { page, errs } = await newPage({ width: 390, height: 844, hasTouch: true, isMobile: true });
  await openBlank(page, 'en');
  await insertImage(page, PNG_SRC);
  await sleep(300);
  const touch = await page.evaluate(async () => {
    const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));
    const wrap = document.querySelector('#smartDocumentContent .smart-doc-image-wrap');
    const img = wrap.querySelector('img.smart-doc-image');
    const r = img.getBoundingClientRect();
    const sx = r.x + r.width / 2, sy = r.y + r.height / 2;
    const scrollBefore = window.scrollY;
    const pe = (type, x, y, target) => target.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true,
      clientX: x, clientY: y, buttons: type === 'pointerup' ? 0 : 1
    }));
    pe('pointerdown', sx, sy, img);
    await sleepMs(60);
    for (let i = 1; i <= 5; i++) pe('pointermove', sx + i * 8, sy + i * 5, wrap);
    await sleepMs(60);
    pe('pointerup', sx + 40, sy + 25, wrap);
    await sleepMs(120);
    return {
      tx: parseFloat(wrap.dataset.tx || '0'),
      ty: parseFloat(wrap.dataset.ty || '0'),
      selected: window.__smartImage.selected(),
      scrolled: window.scrollY !== scrollBefore,
      touchActionWhileIdle: getComputedStyle(wrap).touchAction
    };
  });
  check('18a) Touch pointer sequence moves the image (Pointer Events)', touch.tx > 20 && touch.ty > 10, JSON.stringify(touch));
  check('18b) Touch drag does not hijack page scrolling', touch.scrolled === false);
  check('18c) Wrap exposes touch-friendly touch-action when idle',
    ['pan-y', 'manipulation'].includes(touch.touchActionWhileIdle), touch.touchActionWhileIdle);
  const touchResize = await page.evaluate(async () => {
    const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));
    const wrap = document.querySelector('#smartDocumentContent .smart-doc-image-wrap');
    const img = wrap.querySelector('img.smart-doc-image');
    const w0 = img.getBoundingClientRect().width;
    const handleEl = document.querySelector('.smart-image-handle[data-handle="se"]');
    const h = handleEl.getBoundingClientRect();
    const hx = h.x + h.width / 2, hy = h.y + h.height / 2;
    const pe = (type, x, y, target) => target.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: 9, pointerType: 'touch', isPrimary: true,
      clientX: x, clientY: y, buttons: type === 'pointerup' ? 0 : 1
    }));
    pe('pointerdown', hx, hy, handleEl);
    await sleepMs(50);
    for (let i = 1; i <= 4; i++) pe('pointermove', hx + i * 10, hy + i * 10, wrap);
    await sleepMs(50);
    pe('pointerup', hx + 40, hy + 40, wrap);
    await sleepMs(120);
    return { w0: Math.round(w0), w1: Math.round(img.getBoundingClientRect().width) };
  });
  check('18d) Touch resize through a corner handle works', touchResize.w1 > touchResize.w0 + 15,
    `${touchResize.w0} -> ${touchResize.w1}`);
  check('Touch flow has no JS errors', errs.length === 0, errs.join(' | '));
  await page.close();
}

// ================= 19-20: Safety + regression =================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await page.evaluate(() => { const b = document.querySelector('.keypad-btn[data-value="7"]'); if (b) b.click(); });
  const display = await page.evaluate(() => document.getElementById('primaryDisplay').textContent);
  check('19a) Calculator regression: keypad still works', display.includes('7'), 'display=' + display);
  await openDrawer(page);
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
  await sleep(300);
  check('19b) Notes regression: notes manager still opens',
    await page.evaluate(() => document.getElementById('notesManagerModal').classList.contains('show')));
  await page.evaluate(() => { if (document.getElementById('closeNotesManager')) document.getElementById('closeNotesManager').click(); });
  await sleep(200);
  await openBlank(page, 'en');
  const reg = await page.evaluate(() => {
    const bar = document.querySelector('[data-toolbar="blank-doc"]');
    return {
      editor: window.__smartBlank.getState().editorVisible,
      contentSurface: !!document.getElementById('smartDocumentContent'),
      tools: Array.from(bar.querySelectorAll('.smart-tool-btn')).map((x) => x.getAttribute('data-tool')).join(','),
      addMenuItems: (() => {
        window.__smartBlank.toggleAddMenu();
        const m = document.getElementById('smartAddMenu');
        const items = m ? Array.from(m.querySelectorAll('.smart-add-item')).map((x) => x.getAttribute('data-add')).join(',') : '';
        window.__smartBlank.closeAddMenu();
        return items;
      })()
    };
  });
  check('20a) PART 6/8 regression: editor + A4 + content surface', reg.editor && reg.contentSurface);
  check('20b) PART 9 regression: toolbar order unchanged',
    reg.tools === 'undo,redo,add,text,table,signature,image,logo,divider,border,page,page-number,page-settings,more', reg.tools);
  check('20c) PART 10 regression: Add menu items unchanged',
    reg.addMenuItems === 'text,heading,table,image,divider,new-page', reg.addMenuItems);
  check('Regression pass has no JS errors', errs.length === 0, errs.join(' | '));
  check('No alert() anywhere in the run', await page.evaluate(() => window.__dialogs.alert === 0));
  await page.close();
}

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log('\n========================================');
console.log(`PART 14: ${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('FAILED:');
  failed.forEach((f) => console.log('  - ' + f.name));
  process.exitCode = 1;
} else {
  console.log('FINAL: ALL PASS');
}
