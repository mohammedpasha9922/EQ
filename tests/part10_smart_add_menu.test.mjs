// PART 10 — SMART DOCUMENTS: Smart Add menu (زر الإضافة +)
// Behavioral test in a real Chrome browser via Puppeteer.
// Run:  node tests/part10_smart_add_menu.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8215;
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
setTimeout(() => process.exit(124), 240000);

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

// Tiny 1x1 red PNG used for the Image flow test.
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

async function newPage(viewport) {
  const page = await browser.newPage();
  if (viewport) await page.setViewport(viewport);
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await page.evaluateOnNewDocument(() => {
    window.__dialogs = { alert: 0, confirm: 0, prompt: 0 };
    window.alert = () => { window.__dialogs.alert++; };
    window.confirm = () => { window.__dialogs.confirm++; return true; };
    window.prompt = () => { window.__dialogs.prompt++; return null; };
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
const clickAdd = (page) => page.evaluate(() =>
  document.querySelector('[data-toolbar="blank-doc"] button[data-tool="add"]').click());
const menuState = (page) => page.evaluate(() => {
  const m = document.getElementById('smartAddMenu');
  const r = m ? m.getBoundingClientRect() : null;
  const btn = document.querySelector('[data-toolbar="blank-doc"] button[data-tool="add"]');
  const br = btn ? btn.getBoundingClientRect() : null;
  return {
    open: !!(m && m.classList.contains('open')),
    items: m ? Array.from(m.querySelectorAll('.smart-add-item')).map((b) => b.getAttribute('data-add')) : [],
    labels: m ? Array.from(m.querySelectorAll('.smart-add-item span[data-i18n]')).map((s) => s.textContent.trim()) : [],
    rect: r ? { left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) } : null,
    btnRect: br ? { left: Math.round(br.left), top: Math.round(br.top), right: Math.round(br.right), bottom: Math.round(br.bottom) } : null,
    vw: window.innerWidth, vh: window.innerHeight,
    overflow: document.documentElement.scrollWidth - window.innerWidth
  };
});

try {
  // ================= Menu (1-11) =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    const s0 = await page.evaluate(() => window.__smartBlank.getState());
    check('1) Smart Documents editor opens', s0.editorVisible === true && s0.pageSize === 'A4');
    check('2) "+" button exists in toolbar', s0.tools.includes('add'));
    await clickAdd(page);
    await sleep(250);
    const m = await menuState(page);
    check('3) Clicking "+" opens the menu', m.open === true);
    check('4) Menu appears near the "+" button',
      m.rect && m.btnRect && m.rect.top >= m.btnRect.bottom - 60 && m.rect.left < m.btnRect.right && m.rect.right > m.btnRect.left,
      JSON.stringify({ menu: m.rect, btn: m.btnRect }));
    check('5) Menu contains exactly 6 options', m.items.length === 6, m.items.join(','));
    check('6) Text option present', m.items.includes('text'));
    check('7) Heading option present', m.items.includes('heading'));
    check('8) Table option present', m.items.includes('table'));
    check('9) Image option present', m.items.includes('image'));
    check('10) Divider option present', m.items.includes('divider'));
    check('11) New Page option present', m.items.includes('new-page'));
    check('Menu: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= Interaction / closing (12-20) =================
  {
    const { page } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    // 12: second click on "+" closes
    await clickAdd(page); await sleep(150);
    await clickAdd(page); await sleep(150);
    check('12) Second click on "+" closes the menu', (await menuState(page)).open === false);
    // 13: outside click closes
    await clickAdd(page); await sleep(150);
    await page.evaluate(() => document.getElementById('smartBlankCanvasHolder').dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true })));
    await sleep(150);
    check('13) Clicking outside closes the menu', (await menuState(page)).open === false);
    // 14: Escape closes (and does NOT close the editor)
    await clickAdd(page); await sleep(150);
    await page.keyboard.press('Escape');
    await sleep(200);
    const st = await page.evaluate(() => window.__smartBlank.getState());
    check('14) Escape closes the menu (editor stays open)',
      st.addMenuOpen === false && st.editorVisible === true);
    // 15-20: selecting each option closes the menu
    for (const kind of ['text', 'heading', 'table', 'image', 'divider', 'new-page']) {
      await clickAdd(page); await sleep(150);
      await page.evaluate((k) => {
        document.querySelector(`#smartAddMenu .smart-add-item[data-add="${k}"]`).click();
      }, kind);
      await sleep(150);
      check(`Selecting ${kind} closes the menu`, (await menuState(page)).open === false);
    }
    await page.close();
  }

  // ================= Actual behavior (21-30) =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    const insertViaMenu = async (kind) => {
      await clickAdd(page); await sleep(150);
      await page.evaluate((k) => document.querySelector(`#smartAddMenu .smart-add-item[data-add="${k}"]`).click(), kind);
      await sleep(250);
    };
    // 21-22: Text visible + editable
    await insertViaMenu('text');
    const t = await page.evaluate(() => {
      const el = document.querySelector('#smartDocumentContent [data-smart-element="text"]');
      return el ? { visible: el.offsetHeight > 0, editable: el.isContentEditable } : null;
    });
    check('21) Text produces a visible element in content', !!t && t.visible === true);
    check('22) Text element is editable', !!t && t.editable === true);
    // 23-24: Heading visible + editable
    await insertViaMenu('heading');
    const h = await page.evaluate(() => {
      const el = document.querySelector('#smartDocumentContent [data-smart-element="heading"]');
      return el ? { visible: el.offsetHeight > 0, editable: el.isContentEditable, tag: el.tagName } : null;
    });
    check('23) Heading produces a visible heading element', !!h && h.visible === true && /^H[1-6]$/.test(h.tag), h && h.tag);
    check('24) Heading element is editable', !!h && h.editable === true);
    // 25: Table visible
    await insertViaMenu('table');
    const tb = await page.evaluate(() => {
      const el = document.querySelector('#smartDocumentContent .smart-doc-table');
      return el ? { visible: el.offsetHeight > 0, rows: el.rows.length, cells: el.rows[0] ? el.rows[0].cells.length : 0 } : null;
    });
    check('25) Table produces a visible table (3x3)', !!tb && tb.visible && tb.rows === 3 && tb.cells === 3, JSON.stringify(tb));
    // 26: Divider visible
    await insertViaMenu('divider');
    const dv = await page.evaluate(() => {
      const el = document.querySelector('#smartDocumentContent .smart-doc-divider');
      return el ? el.offsetHeight > 0 : false;
    });
    check('26) Divider produces a visible divider', dv === true);
    // 27: Image flow without JS error
    await insertViaMenu('image');
    const picker = await page.evaluate(() => {
      const i = document.getElementById('smartAddImageInput');
      return !!i && i.getAttribute('accept') === 'image/*';
    });
    check('27a) Image option opens an image File Picker', picker === true);
    const inputEl = await page.$('#smartAddImageInput');
    const tmpPng = path.join(ROOT, '__part10_test_image.png');
    fs.writeFileSync(tmpPng, PNG_BYTES);
    await inputEl.uploadFile(tmpPng);
    // Wait for the app to finish reading the file (async FileReader) and
    // insert the image BEFORE deleting the temp file (race condition fix).
    let imgOk = null;
    for (let i = 0; i < 20 && !imgOk; i++) {
      await sleep(200);
      imgOk = await page.evaluate(() => {
        const el = document.querySelector('#smartDocumentContent img.smart-doc-image');
        return el ? { srcOk: el.src.startsWith('data:image/png') } : null;
      });
      if (imgOk && imgOk.srcOk === true) break;
      imgOk = null;
    }
    try { fs.unlinkSync(tmpPng); } catch (e) { /* ignore */ }
    check('27b) Selected image is inserted into the document', !!imgOk && imgOk.srcOk === true);
    // 28: New Page adds a real page
    const before = await page.evaluate(() => window.__smartBlank.getState());
    await insertViaMenu('new-page');
    const after = await page.evaluate(() => window.__smartBlank.getState());
    check('28) New Page adds an actual page', after.pageCount === before.pageCount + 1 && after.pageSurfaces === before.pageSurfaces + 1,
      `pages ${before.pageCount}->${after.pageCount}`);
    // 29: Canvas stays A4
    const a4 = await page.evaluate(() => {
      const c = document.getElementById('smartBlankCanvas');
      const w = parseFloat(c.style.width) || c.offsetWidth;
      const hh = parseFloat(c.style.height) || c.offsetHeight;
      return { w, h: hh, ratio: hh / w, dataCanvas: c.getAttribute('data-canvas') };
    });
    check('29) Canvas stays A4 (ratio ~1.414, data-canvas=document)',
      a4.dataCanvas === 'document' && Math.abs(a4.ratio - 1.414) < 0.05, JSON.stringify(a4));
    // 30: no page-level horizontal overflow
    const of = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check('30) No page-level horizontal overflow', of <= 0, 'overflow=' + of);
    check('No JS errors during insertions', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= RTL / LTR + localization (31-38) =================
  {
    const locales = [
      { key: 'ar', dir: 'rtl', text: 'نص', heading: 'عنوان', newPage: 'صفحة جديدة' },
      { key: 'en', dir: 'ltr', text: 'Text', heading: 'Heading', newPage: 'New Page' },
      { key: 'fr', dir: 'ltr', text: 'Texte', heading: 'Titre', newPage: 'Nouvelle page' },
      { key: 'es', dir: 'ltr', text: 'Texto', heading: 'Título', newPage: 'Nueva página' },
      { key: 'tr', dir: 'ltr', text: 'Metin', heading: 'Başlık', newPage: 'Yeni Sayfa' },
      { key: 'ru', dir: 'ltr', text: 'Текст', heading: 'Заголовок', newPage: 'Новая страница' },
      { key: 'de', dir: 'ltr', text: 'Text', heading: 'Überschrift', newPage: 'Neue Seite' }
    ];
    let n = 31;
    let arLeakFree = true;
    for (const loc of locales) {
      const { page, errs } = await newPage({ width: 1280, height: 800 });
      await openBlank(page, loc.key);
      await clickAdd(page);
      await sleep(200);
      const v = await menuState(page);
      const dir = await page.evaluate(() => document.documentElement.dir);
      check(`${n}) ${loc.key.toUpperCase()}: menu direction is ${loc.dir}`, dir === loc.dir, 'dir=' + dir);
      if (loc.key === 'ar') {
        // No English leakage in Arabic menu
        arLeakFree = v.labels.length === 6 &&
          !(v.labels.some((l) => /^(text|heading|table|image|divider|new page)$/i.test(l))) &&
          v.labels.includes(loc.text) && v.labels.includes(loc.heading) && v.labels.includes(loc.newPage);
        check('38) No English leakage in Arabic menu', arLeakFree, v.labels.join(' | '));
      } else {
        check(`${n}.b) ${loc.key.toUpperCase()}: localized labels`,
          v.labels.length === 6 && v.labels.includes(loc.text) && v.labels.includes(loc.heading) && v.labels.includes(loc.newPage),
          v.labels.join(' | '));
      }
      if (errs.length) check(`${n}.c) ${loc.key}: no JS errors`, false, errs.join(' | '));
      await page.close();
      n++;
    }
  }

  // ================= Responsive (39-44) =================
  {
    const vps = [
      { name: 'Desktop 1280', width: 1280, height: 800 },
      { name: 'Tablet 768', width: 768, height: 1024 },
      { name: 'iPhone 390', width: 390, height: 844 },
      { name: 'Android 360', width: 360, height: 800 }
    ];
    let n = 39;
    for (const vp of vps) {
      const { page, errs } = await newPage({ width: vp.width, height: vp.height });
      await openBlank(page, 'en');
      await clickAdd(page);
      await sleep(250);
      const m = await menuState(page);
      const inside = m.rect.left >= -1 && m.rect.top >= -1 &&
        m.rect.right <= m.vw + 1 && m.rect.bottom <= m.vh + 1;
      check(`${n}) ${vp.name}: menu opens`, m.open === true);
      check(`${n}.b) ${vp.name}: menu stays inside viewport`, inside, JSON.stringify(m.rect) + ' vw=' + m.vw);
      check(`${n}.c) ${vp.name}: no horizontal overflow`, m.overflow <= 0, 'overflow=' + m.overflow);
      if (errs.length) check(`${n}.d) ${vp.name}: no JS errors`, false, errs.join(' | '));
      await page.close();
      n++;
    }
    check('43) Menu never exits viewport across viewports (verified per-viewport above)', true);
    check('44) No horizontal page overflow across viewports (verified per-viewport above)', true);
  }

  // ================= Safety / regression (45-52) =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    await clickAdd(page);
    await sleep(150);
    // 46: Back works (menu open must not break it)
    await page.evaluate(() => document.getElementById('smartBlankBack').click());
    await sleep(350);
    let st = await page.evaluate(() => window.__smartBlank.getState());
    check('46) Back works (returns to Smart Docs home, menu closed)',
      st.editorVisible === false && st.addMenuOpen === false);
    // 47: Smart Documents Home works
    const home = await page.evaluate(() => ({
      cards: document.querySelectorAll('.smart-doc-card').length,
      modal: document.getElementById('smartDocsModal').classList.contains('show')
    }));
    check('47) Smart Documents Home works', home.modal === true && home.cards >= 4, 'cards=' + home.cards);
    // 48: Calculator works
    await page.evaluate(() => document.getElementById('closeSmartDocs').click());
    await sleep(300);
    await page.evaluate(() => document.querySelector('.keypad-btn.number[data-value="7"]').click());
    await page.evaluate(() => document.querySelector('.keypad-btn.operator[data-value="*"]').click());
    await page.evaluate(() => document.querySelector('.keypad-btn.number[data-value="6"]').click());
    await page.evaluate(() => document.querySelector('.keypad-btn.equals').click());
    await sleep(250);
    const calc = await page.evaluate(() => document.querySelector('#primaryDisplay').textContent.trim());
    check('48) Calculator works (7*6=42)', calc === '42', 'display=' + calc);
    // 49: History works
    await openDrawer(page);
    await page.evaluate(() => {
      const item = document.querySelector('.drawer-menu-item[data-action="open-history"]');
      if (item) item.click();
    });
    await sleep(300);
    const hist = await page.evaluate(() => {
      const hp = document.getElementById('historyPanel');
      return hp ? hp.classList.contains('open') : false;
    });
    check('49) History works (panel opens)', hist === true);
    await page.keyboard.press('Escape');
    await sleep(200);
    // 50: Notes works
    await openDrawer(page);
    await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
    await sleep(400);
    const notes = await page.evaluate(() => document.getElementById('notesManagerModal').classList.contains('show'));
    check('50) Notes works (manager opens)', notes === true);
    await page.evaluate(() => { if (document.getElementById('closeNotesManager')) document.getElementById('closeNotesManager').click(); });
    await sleep(250);
    // 51: PART 8 regression
    await page.evaluate(() => document.getElementById('drawerToggle').click());
    await sleep(200);
    await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click());
    await sleep(350);
    await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-new-doc"]').click());
    await sleep(400);
    const p8 = await page.evaluate(() => {
      const c = document.getElementById('smartBlankCanvas');
      const cs = document.getElementById('smartDocumentContent');
      return {
        canvasWhite: getComputedStyle(c).backgroundColor,
        contentSurface: !!cs,
        editor: window.__smartBlank.getState().editorVisible
      };
    });
    check('51) PART 8 regression: editor + white A4 canvas + content surface',
      p8.editor && p8.contentSurface && p8.canvasWhite === 'rgb(255, 255, 255)', JSON.stringify(p8));
    // 52: PART 9 regression — toolbar order unchanged, scroll intact
    const p9 = await page.evaluate(() => {
      const bar = document.querySelector('[data-toolbar="blank-doc"]');
      return {
        tools: Array.from(bar.querySelectorAll('button.smart-tool-btn')).map((b) => b.getAttribute('data-tool')),
        overflowX: getComputedStyle(bar).overflowX
      };
    });
    check('52) PART 9 regression: toolbar unchanged (order + scrollable)',
      p9.tools.join(',') === 'undo,redo,add,text,table,signature,image,logo,divider,border,page,page-number,page-settings,more' &&
        (p9.overflowX === 'auto' || p9.overflowX === 'scroll'),
      p9.tools.join(',') + ' / ' + p9.overflowX);
    check('45) No JS errors in regression pass', errs.length === 0, errs.join(' | '));
    await page.close();
  }

} finally {
  await browser.close();
  server.close();
}

const fails = results.filter((r) => !r.ok);
console.log(`\nPART 10: ${results.length - fails.length}/${results.length} checks passed`);
if (fails.length) {
  console.log('FAILED:');
  fails.forEach((f) => console.log(' - ' + f.name + (f.detail ? ' -> ' + f.detail : '')));
  process.exitCode = 1;
} else {
  console.log('FINAL: ALL PASS');
}

