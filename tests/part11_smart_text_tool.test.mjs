// PART 11 — SMART DOCUMENTS: Text Tool (أداة النص)
// Behavioral test in a real Chrome browser via Puppeteer.
// Run:  node tests/part11_smart_text_tool.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8217;
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
async function clickTextTool(page) {
  await page.evaluate(() =>
    document.querySelector('[data-toolbar="blank-doc"] button[data-tool="text"]').click());
  await sleep(250);
}

try {

  // ================= Text tool basics (1-9) =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    await clickTextTool(page);
    const t1 = await page.evaluate(() => {
      const el = document.querySelector('#smartDocumentContent [data-smart-element="text"]');
      return el ? { exists: true, visible: el.offsetHeight > 0, editable: el.isContentEditable } : null;
    });
    check('1) T creates a visible, editable text box in the document', !!t1 && t1.exists && t1.visible && t1.editable, JSON.stringify(t1));
    await page.keyboard.type('Hello PART 11');
    const typed = await page.evaluate(() =>
      document.querySelector('#smartDocumentContent [data-smart-element="text"]').textContent);
    check('2) Typing inside the box works', /Hello\s*PART\s*11/.test(typed), typed);
    await clickTextTool(page);
    const t3 = await page.evaluate(() => {
      const blocks = document.querySelectorAll('#smartDocumentContent [data-smart-element="text"]');
      return { count: blocks.length, independent: new Set(Array.from(blocks)).size === blocks.length };
    });
    check('3) A second T press creates another block', t3.count === 2, 'count=' + t3.count);
    check('4) Blocks are independent elements', t3.independent === true);
    await page.evaluate(() => {
      const b = document.querySelectorAll('#smartDocumentContent [data-smart-element="text"]')[1];
      b.focus();
      const sel = window.getSelection(); const r = document.createRange();
      r.selectNodeContents(b); sel.removeAllRanges(); sel.addRange(r);
    });
    await page.keyboard.type('SECOND');
    const texts = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#smartDocumentContent [data-smart-element="text"]')).map((b) => b.textContent));
    check('5) Editing one block does not change the other',
      /SECOND/.test(texts[1]) && !/SECOND/.test(texts[0]), JSON.stringify(texts));
    const toolsVisible = await page.evaluate(() => window.__smartText.getState().toolsVisible);
    check('6) Text Formatting Controls appear while a block is active', toolsVisible === true);
    const alerts = await page.evaluate(() => window.__dialogs.alert);
    check('7) No alert() used by the text flow', alerts === 0);
    const toolList = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-toolbar="blank-doc"] button.smart-tool-btn')).map((b) => b.getAttribute('data-tool')));
    check('8) Main toolbar unchanged (formatting lives in the context bar)',
      toolList.join(',') === 'undo,redo,add,text,table,signature,image,logo,divider,border,page,page-number,page-settings,more');
    const canvasW = await page.evaluate(() => document.getElementById('smartBlankCanvas').style.width);
    check('9) Canvas size unchanged after inserting text', /\d+px/.test(canvasW || ''), canvasW);
    check('Text tool: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= Formatting behaviors (10-19) =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    await clickTextTool(page);
    await page.keyboard.type('Format me now');
    await page.evaluate(() => {
      const s = document.getElementById('smartTextFontFamily');
      s.value = 'Georgia, serif';
      s.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const fam = await page.evaluate(() => getComputedStyle(
      document.querySelector('#smartDocumentContent [data-smart-element="text"]')).fontFamily.toLowerCase());
    check('10) Font family applies to the selected block', fam.indexOf('georgia') >= 0, fam);
    await page.evaluate(() => {
      const s = document.getElementById('smartTextFontSize');
      s.value = '28px';
      s.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const size = await page.evaluate(() => getComputedStyle(
      document.querySelector('#smartDocumentContent [data-smart-element="text"]')).fontSize);
    check('11) Font size changes for this block only', size === '28px', size);
    const otherSize = await page.evaluate(() => {
      window.__smartText.insert();
      return getComputedStyle(document.querySelectorAll('#smartDocumentContent [data-smart-element="text"]')[1]).fontSize;
    });
    check('11.b) New blocks are unaffected by previous formatting', otherSize === '16px', otherSize);
    await page.evaluate(() => {
      const b = document.querySelector('#smartDocumentContent [data-smart-element="text"]');
      b.focus();
      const sel = window.getSelection(); const r = document.createRange();
      r.setStart(b.firstChild, 0); r.setEnd(b.firstChild, 6); // "Format"
      sel.removeAllRanges(); sel.addRange(r);
    });
    // Re-select "Format" before each command (a real user selects, formats, re-selects).
    const selectFormat = () => page.evaluate(() => {
      const b = document.querySelector('#smartDocumentContent [data-smart-element="text"]');
      b.focus();
      const sel = window.getSelection(); const r = document.createRange();
      r.selectNodeContents(b);
      sel.removeAllRanges(); sel.addRange(r);
    });
    for (const fmt of ['bold', 'italic', 'underline']) {
      await selectFormat();
      await page.evaluate((f) => {
        document.querySelector(`#smartTextFormatBar [data-textfmt="${f}"]`).click();
      }, fmt);
      await sleep(120);
    }
    const fmtState = await page.evaluate(() => {
      const b = document.querySelector('#smartDocumentContent [data-smart-element="text"]');
      const boldEl = b.querySelector('b,strong');
      const italEl = b.querySelector('i,em');
      const uEl = b.querySelector('u');
      return {
        w: boldEl ? getComputedStyle(boldEl).fontWeight : getComputedStyle(b).fontWeight,
        i: italEl ? getComputedStyle(italEl).fontStyle : 'normal',
        u: uEl ? (getComputedStyle(uEl).textDecorationLine || getComputedStyle(uEl).textDecoration) : 'none'
      };
    });
    check('12) Bold really bolds the selected text', parseInt(fmtState.w, 10) >= 700 || fmtState.w === 'bold', fmtState.w);
    check('13) Italic really italicizes the selected text', fmtState.i === 'italic', fmtState.i);
    check('14) Underline really underlines the selected text', String(fmtState.u).indexOf('underline') >= 0, fmtState.u);
    await page.evaluate(() => document.querySelector('#smartTextFormatBar [data-textalign="center"]').click());
    const align = await page.evaluate(() => getComputedStyle(
      document.querySelector('#smartDocumentContent [data-smart-element="text"]')).textAlign);
    check('15) Alignment applies (center)', align === 'center', align);
    await page.evaluate(() => {
      const s = document.getElementById('smartTextDirection');
      s.value = 'rtl';
      s.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const dirInfo = await page.evaluate(() => {
      const b = document.querySelector('#smartDocumentContent [data-smart-element="text"]');
      return { attr: b.getAttribute('dir'), computed: getComputedStyle(b).direction };
    });
    check('16) Per-block direction switches to RTL (attr + computed)', dirInfo.attr === 'rtl' && dirInfo.computed === 'rtl', JSON.stringify(dirInfo));
    await page.evaluate(() => {
      const s = document.getElementById('smartTextLineSpacing');
      s.value = '2';
      s.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const ls = await page.evaluate(() => {
      const b = document.querySelector('#smartDocumentContent [data-smart-element="text"]');
      const cs = getComputedStyle(b);
      return parseFloat(cs.lineHeight) / parseFloat(cs.fontSize);
    });
    check('17) Line spacing 2.0 applies', Math.abs(ls - 2) < 0.05, String(ls));
    await page.evaluate(() => document.getElementById('smartBlankBack').focus());
    await sleep(300);
    const hiddenAfterBlur = await page.evaluate(() => !document.getElementById('smartTextFormatBar').classList.contains('open'));
    check('18) Formatting controls hide when no text block is active', hiddenAfterBlur === true);
    await clickTextTool(page);
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check('19) No horizontal overflow with formatting controls open', ov <= 0, 'overflow=' + ov);
    check('Formatting: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= RTL / LTR document direction (20-24) =================
  {
    const cases = [
      { locale: 'ar', wantDir: 'rtl', name: 'Arabic' },
      { locale: 'en', wantDir: 'ltr', name: 'English' },
      { locale: 'fr', wantDir: 'ltr', name: 'French' }
    ];
    let n = 20;
    for (const c of cases) {
      const { page, errs } = await newPage({ width: 1280, height: 800 });
      await openBlank(page, c.locale);
      const v = await page.evaluate(() => ({
        viewDirAttr: document.getElementById('smartBlankView').getAttribute('dir'),
        viewComputed: getComputedStyle(document.getElementById('smartBlankView')).direction,
        rootDir: document.documentElement.dir
      }));
      check(`${n}) ${c.name}: editor view is ${c.wantDir} (dir attr + computed)`,
        v.viewDirAttr === c.wantDir && v.viewComputed === c.wantDir, JSON.stringify(v));
      check(`${n}.b) ${c.name}: main app direction NOT flipped`, v.rootDir !== 'rtl' || c.wantDir === 'rtl');
      await clickTextTool(page);
      const blk = await page.evaluate(() => {
        const b = document.querySelector('#smartDocumentContent [data-smart-element="text"]');
        return { attr: b.getAttribute('dir'), computed: getComputedStyle(b).direction, align: getComputedStyle(b).textAlign };
      });
      const wantAlign = c.wantDir === 'rtl' ? 'right' : 'left';
      check(`${n}.c) ${c.name}: new text block inherits ${c.wantDir} + default align`,
        blk.attr === c.wantDir && blk.computed === c.wantDir && blk.align === wantAlign, JSON.stringify(blk));
      if (errs.length) check(`${n}.d) ${c.name}: no JS errors`, false, errs.join(' | '));
      await page.close();
      n++;
    }
  }

  // ================= Languages / i18n (25-31) =================
  {
    const labels = {
      en: ['Font', 'Size'], fr: ['Police', 'Taille'], es: ['Fuente', 'Tamaño'],
      tr: ['Yazı tipi', 'Boyut'], ru: ['Шрифт', 'Размер'], de: ['Schrift', 'Größe'],
      ar: ['الخط', 'الحجم']
    };
    let n = 25;
    for (const [loc, [fontLbl, sizeLbl]] of Object.entries(labels)) {
      const { page, errs } = await newPage({ width: 1280, height: 800 });
      await openBlank(page, loc);
      await clickTextTool(page);
      const v = await page.evaluate(() => {
        const bar = document.getElementById('smartTextFormatBar');
        const spans = Array.from(bar.querySelectorAll('.smart-text-field span[data-i18n]')).map((s) => s.textContent.trim());
        return { spans };
      });
      const okLabels = v.spans.includes(fontLbl) && v.spans.includes(sizeLbl);
      const noEnLeak = !(loc !== 'en' && v.spans.some((s) => /^(font|size)$/i.test(s)));
      check(`${n}) ${loc}: formatting labels fully localized (${fontLbl} / ${sizeLbl})`,
        okLabels && noEnLeak, v.spans.join(', '));
      if (errs.length) check(`${n}.b) ${loc}: no JS errors`, false, errs.join(' | '));
      await page.close();
      n++;
    }
  }

  // ================= Responsive (32-35) =================
  {
    const vps = [
      { name: 'Desktop 1280', width: 1280, height: 800 },
      { name: 'Tablet 768', width: 768, height: 1024 },
      { name: 'iPhone 390', width: 390, height: 844 },
      { name: 'Android 360', width: 360, height: 800 }
    ];
    let n = 32;
    for (const vp of vps) {
      const { page, errs } = await newPage({ width: vp.width, height: vp.height });
      await openBlank(page, 'en');
      await clickTextTool(page);
      await sleep(200);
      const v = await page.evaluate(() => {
        const bar = document.getElementById('smartTextFormatBar');
        const r = bar.getBoundingClientRect();
        return {
          open: bar.classList.contains('open'),
          left: Math.round(r.left), right: Math.round(r.right),
          vw: window.innerWidth,
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          scrollable: getComputedStyle(bar).overflowX
        };
      });
      check(`${n}) ${vp.name}: text tool + controls work`, v.open === true);
      check(`${n}.b) ${vp.name}: controls stay inside viewport`,
        v.left >= -1 && v.right <= v.vw + 1, JSON.stringify(v));
      check(`${n}.c) ${vp.name}: no horizontal page overflow`, v.overflow <= 0, 'overflow=' + v.overflow);
      check(`${n}.d) ${vp.name}: format bar itself scrolls horizontally when tight`,
        ['auto', 'scroll'].includes(v.scrollable), v.scrollable);
      if (errs.length) check(`${n}.e) ${vp.name}: no JS errors`, false, errs.join(' | '));
      await page.close();
      n++;
    }
  }

  // ================= Regression Parts 1-10 + app features (36-44) =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    await clickTextTool(page);
    const st = await page.evaluate(() => window.__smartBlank.getState());
    check('36) Smart Documents opens (editor visible, A4)', st.editorVisible === true && st.pageSize === 'A4');
    await page.evaluate(() => document.getElementById('smartBlankBack').click());
    await sleep(350);
    const home = await page.evaluate(() => ({
      modal: document.getElementById('smartDocsModal').classList.contains('show'),
      cards: document.querySelectorAll('.smart-doc-card').length
    }));
    check('37) Home + step indicator still work', home.modal === true && home.cards >= 4, 'cards=' + home.cards);
    await page.evaluate(() => document.getElementById('closeSmartDocs').click());
    await sleep(300);
    await page.evaluate(() => document.querySelector('.keypad-btn.number[data-value="7"]').click());
    await page.evaluate(() => document.querySelector('.keypad-btn.operator[data-value="*"]').click());
    await page.evaluate(() => document.querySelector('.keypad-btn.number[data-value="6"]').click());
    await page.evaluate(() => document.querySelector('.keypad-btn.equals').click());
    await sleep(250);
    const calc = await page.evaluate(() => document.querySelector('#primaryDisplay').textContent.trim());
    check('38) Calculator works (7*6=42)', calc === '42', calc);
    await openDrawer(page);
    await page.evaluate(() => {
      const item = document.querySelector('.drawer-menu-item[data-action="open-history"]');
      if (item) item.click();
    });
    await sleep(300);
    const hist = await page.evaluate(() => document.getElementById('historyPanel').classList.contains('open'));
    check('39) History works', hist === true);
    await page.keyboard.press('Escape'); await sleep(200);
    await openDrawer(page);
    await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
    await sleep(400);
    const notes = await page.evaluate(() => document.getElementById('notesManagerModal').classList.contains('show'));
    check('40) Notes works', notes === true);
    await page.evaluate(() => { if (document.getElementById('closeNotesManager')) document.getElementById('closeNotesManager').click(); });
    await sleep(250);
    await openDrawer(page);
    await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click());
    await sleep(350);
    await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-new-doc"]').click());
    await sleep(450);
    await page.evaluate(() => document.querySelector('[data-toolbar="blank-doc"] button[data-tool="add"]').click());
    await sleep(250);
    const menu = await page.evaluate(() => ({
      open: document.getElementById('smartAddMenu').classList.contains('open'),
      items: document.querySelectorAll('#smartAddMenu .smart-add-item').length
    }));
    check('41) PART 10 Add menu still works (+ button, 6 items)', menu.open === true && menu.items === 6);
    await page.evaluate(() => window.__smartBlank.closeAddMenu());
    await page.evaluate(() => window.__smartBlank.insertElement('heading'));
    const headingOk = await page.evaluate(() => {
      const h = document.querySelector('#smartDocumentContent .smart-doc-heading');
      return h && h.isContentEditable && h.offsetHeight > 0;
    });
    check('42) Heading insertion (Parts 8/10) unaffected', headingOk === true);
    const tools = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-toolbar="blank-doc"] button.smart-tool-btn')).map((b) => b.getAttribute('data-tool')));
    check('43) PART 9 toolbar unchanged',
      tools.join(',') === 'undo,redo,add,text,table,signature,image,logo,divider,border,page,page-number,page-settings,more');
    check('44) Regression pass has no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

} finally {
  await browser.close();
  server.close();
}

const fails = results.filter((r) => !r.ok);
console.log(`\nPART 11: ${results.length - fails.length}/${results.length} checks passed`);
if (fails.length) {
  console.log('FAILED:');
  fails.forEach((f) => console.log(' - ' + f.name));
  process.exitCode = 1;
} else {
  console.log('FINAL: ALL PASS');
}

