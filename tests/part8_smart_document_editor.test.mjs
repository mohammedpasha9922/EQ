// PART 8 — SMART DOCUMENTS: Document Editor (header + toolbar + A4 canvas + content surface)
// Behavioral test in a real Chrome browser via Puppeteer.
// Run:  node tests/part8_smart_document_editor.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8208;
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
setTimeout(() => process.exit(124), 150000); // hard watchdog

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

async function newPage(viewport) {
  const page = await browser.newPage();
  if (viewport) await page.setViewport(viewport);
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(600);
  return { page, errs };
}

async function openDrawer(page) {
  await page.evaluate(() => document.getElementById('drawerToggle').click());
  await sleep(250);
}

async function clickSmartDocs(page) {
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click());
  await sleep(400);
}

async function setLang(page, locale) {
  await page.evaluate((l) => {
    const s = document.getElementById('topBarLanguageSelect');
    if (s) { s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); }
  }, locale);
  await sleep(400);
}

async function clickNewDoc(page) {
  await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-new-doc"]').click());
  await sleep(450);
}

async function openBlank(page, locale) {
  await openDrawer(page);
  if (locale) await setLang(page, locale);
  await clickSmartDocs(page);
  await clickNewDoc(page);
}

const blankState = (page) => page.evaluate(() => window.__smartBlank.getState());

const overflowInfo = (page) => page.evaluate(() => {
  const doc = document.documentElement;
  const canvas = document.getElementById('smartBlankCanvas');
  const r = canvas ? canvas.getBoundingClientRect() : null;
  return {
    docOverflow: doc.scrollWidth - window.innerWidth,
    innerW: window.innerWidth,
    canvasLeft: r ? Math.round(r.left) : null,
    canvasRight: r ? Math.round(r.right) : null
  };
});

// Whether any tool OUTSIDE Smart Documents is currently open.
const othersOpen = (page) => page.evaluate(() => {
  const opened = [];
  const mayOpen = (id, cls) => {
    const el = document.getElementById(id);
    if (el && el.classList.contains(cls)) opened.push(id);
  };
  mayOpen('notesManagerModal', 'show');
  mayOpen('fullScreenNoteModal', 'show');
  mayOpen('pdfReportsModal', 'show');
  mayOpen('currencyConverterModal', 'show');
  mayOpen('settingsModal', 'show');
  mayOpen('helpModal', 'show');
  const hp = document.getElementById('historyPanel');
  if (hp && hp.classList.contains('open')) opened.push('historyPanel');
  return opened;
});
try {
  // ================= 1) Open Smart Docs -> New Document -> Step 2 editor =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    const v = await page.evaluate(() => ({
      modalShow: document.getElementById('smartDocsModal').classList.contains('show'),
      homeShown: document.querySelector('.smart-docs-home')?.style.display !== 'none',
      editorVisible: document.getElementById('smartBlankView').classList.contains('blank-visible')
    }));
    const s = await blankState(page);
    check('PART1 regression: Smart Docs modal opens', v.modalShow === true);
    check('PART6 regression: home hidden when editor active', v.homeShown === false);
    check('PART3 regression: reaches Step 2', s.step === 2, 'step=' + s.step);
    check('Editor workspace is visible', s.editorVisible === true, 'editorVisible=' + s.editorVisible);
    check('No feature outside Smart Documents opened', (await othersOpen(page)).length === 0, (await othersOpen(page)).join(','));
    await page.close();
  }

  // ================= 2) Header + document name + back label =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    const h = await page.evaluate(() => ({
      header: !!document.querySelector('#smartBlankView .smart-scan-header'),
      backBtn: !!document.getElementById('smartBlankBack'),
      hasBackLabel: !!document.querySelector('#smartBlankView .smart-blank-back-label'),
      backLabel: document.getElementById('smartBlankView').querySelector('.smart-blank-back-label')?.textContent.trim(),
      name: document.getElementById('smartBlankDocTitle').textContent.trim(),
      step2active: document.querySelectorAll('.smart-step.is-active').length >= 2
    }));
    check('Editor header is present', h.header);
    check('Back button is present', h.backBtn);
    check('Back returns label is present', h.hasBackLabel);
    check('Back label shows Smart Documents', h.backLabel === 'Smart Documents', 'label=' + h.backLabel);
    check('Document name is shown', h.name === 'New Document', 'name=' + h.name);
    check('Step indicator shows 2 of 4 active', h.step2active, JSON.stringify(h));
    await page.close();
  }

  // ================= 3) Toolbar with tools in the required order =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    const tb = await page.evaluate(() => {
      const bar = document.querySelector('[data-toolbar="blank-doc"]');
      const btns = Array.from(bar.querySelectorAll('button.smart-tool-btn')).map((b) => b.getAttribute('data-tool'));
      const first = bar.querySelector('button.smart-tool-btn');
      if (first) first.focus();
      return {
        role: bar.getAttribute('role'),
        display: getComputedStyle(bar).display,
        btns,
        focusable: first ? document.activeElement === first : false,
        count: btns.length
      };
    });
    const expected = ['undo', 'redo', 'add', 'text', 'table', 'signature', 'image', 'logo', 'divider', 'border', 'page', 'page-number', 'page-settings', 'more'];
    check('Toolbar role=toolbar exists', tb.role === 'toolbar');
    check('Toolbar is flex (visible)', tb.display === 'flex', 'display=' + tb.display);
    check('Toolbar has 14 tools', tb.count === 14, 'count=' + tb.count);
    check('Toolbar tools in expected order', JSON.stringify(tb.btns) === JSON.stringify(expected), JSON.stringify(tb.btns));
    check('Toolbar buttons are focusable/clickable', tb.focusable === true);
    await page.close();
  }
// ================= 4) A4 white canvas + content surface =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    const v = await page.evaluate(() => {
      const c = document.getElementById('smartBlankCanvas');
      const cs = document.getElementById('smartDocumentContent');
      return {
        canvasHsClass: c.classList.contains('smart-document-canvas'),
        canvasWhite: getComputedStyle(c).backgroundColor,
        contentSurface: !!cs,
        contentData: cs ? cs.getAttribute('data-canvas-content') : null,
        contentInsideCanvas: cs ? c.contains(cs) : false,
        canvas: { w: c.getBoundingClientRect().width, h: c.getBoundingClientRect().height }
      };
    });
    const ratio = v.canvas.w > 0 ? v.canvas.w / v.canvas.h : 0;
    check('A4 canvas element exists', v.canvasHsClass);
    check('Canvas is white', v.canvasWhite === 'rgb(255, 255, 255)', 'color=' + v.canvasWhite);
    check('A4 aspect ratio ~0.707', Math.abs(ratio - (210 / 297)) < 0.02, 'ratio=' + ratio.toFixed(3));
    check('Content surface exists', v.contentSurface);
    check('Content surface is the editable marker', v.contentData === 'document');
    check('Content surface lives inside the canvas', v.contentInsideCanvas);
    await page.close();
  }

  // ================= 5) No feature outside Smart Documents on editor =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    check('Opening editor opens no external tool', (await othersOpen(page)).length === 0, (await othersOpen(page)).join(','));
    check('No JS errors while on editor', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 6) Back returns to Smart Documents Home =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    await page.evaluate(() => document.getElementById('smartBlankBack').click());
    await sleep(300);
    const v = await page.evaluate(() => ({
      homeShown: document.querySelector('.smart-docs-home')?.style.display !== 'none',
      editorVisible: document.getElementById('smartBlankView').classList.contains('blank-visible'),
      modalShow: document.getElementById('smartDocsModal').classList.contains('show')
    }));
    const s = await blankState(page);
    check('Back: returns to Smart Documents Home', v.homeShown === true);
    check('Back: editor hidden', v.editorVisible === false);
    check('Back: Smart Docs modal stays open (calculator not closed)', v.modalShow === true);
    check('Back: workflow resets to Step 1', s.step === 1, 'step=' + s.step);
    await page.close();
  }
// ================= 7) RTL Arabic =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'ar');
    const v = await page.evaluate(() => ({
      dir: document.documentElement.dir,
      langAttr: document.body.getAttribute('data-language'),
      name: document.getElementById('smartBlankDocTitle').textContent.trim(),
      backLabel: document.getElementById('smartBlankView').querySelector('.smart-blank-back-label')?.textContent.trim(),
      undoLabel: document.querySelector('[data-toolbar="blank-doc"] [data-tool="undo"] span[data-i18n]')?.textContent.trim()
    }));
    check('RTL: document direction is rtl', v.dir === 'rtl', 'dir=' + v.dir);
    check('RTL: body language marker = ar', v.langAttr === 'ar', 'lang=' + v.langAttr);
    check('RTL: name is Arabic (مستند جديد)', v.name === 'مستند جديد', 'name=' + v.name);
    check('RTL: back label is Arabic', v.backLabel === 'المستندات الذكية', 'label=' + v.backLabel);
    check('RTL: no English string leaked in toolbar', v.undoLabel !== 'Undo', 'undo=' + v.undoLabel);
    check('RTL: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 8) LTR English =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    const v = await page.evaluate(() => ({
      dir: document.documentElement.dir,
      name: document.getElementById('smartBlankDocTitle').textContent.trim(),
      backLabel: document.getElementById('smartBlankView').querySelector('.smart-blank-back-label')?.textContent.trim()
    }));
    check('LTR: document direction is ltr', v.dir === 'ltr', 'dir=' + v.dir);
    check('LTR: name is English', v.name === 'New Document', 'name=' + v.name);
    check('LTR: back label is English', v.backLabel === 'Smart Documents', 'label=' + v.backLabel);
    check('LTR: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // -------- Responsive: no horizontal overflow + visible editor --------
  const viewportTests = [
    { name: 'Desktop', vp: { width: 1280, height: 800 } },
    { name: 'Tablet 768', vp: { width: 768, height: 1024 } },
    { name: 'iPhone 390', vp: { width: 390, height: 844 } },
    { name: 'Android 360', vp: { width: 360, height: 740 } }
  ];
  for (const t of viewportTests) {
    const { page, errs } = await newPage(t.vp);
    await openBlank(page, 'en');
    const o = await overflowInfo(page);
    check(`${t.name}: no horizontal overflow`, o.docOverflow <= 2, 'overflow=' + o.docOverflow);
    check(`${t.name}: canvas inside viewport`, o.canvasLeft >= -1 && o.canvasRight <= o.innerW + 1,
      `left=${o.canvasLeft} right=${o.canvasRight} inner=${o.innerW}`);
    const s = await blankState(page);
    check(`${t.name}: editor visible`, s.editorVisible === true);
    check(`${t.name}: toolbar present`, (await page.evaluate(() => getComputedStyle(document.querySelector('[data-toolbar="blank-doc"]')).display)) === 'flex');
    check(`${t.name}: no JS errors`, errs.length === 0, errs.join(' | '));
    await page.close();
  }
// ================= PART 1/3/4/5/7 regressions =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await clickSmartDocs(page);
    check('PART1: Smart Docs opens', await page.evaluate(() => document.getElementById('smartDocsModal').classList.contains('show')));
    const cards = await page.evaluate(() => document.querySelectorAll('.smart-doc-card').length);
    check('PART1: home grid cards present', cards >= 4, 'cards=' + cards);
    const steps = await page.evaluate(() => document.querySelectorAll('[data-widget="smart-steps"] .smart-step').length);
    check('PART3: smart steps indicator present', steps === 4, 'steps=' + steps);
    check('PART4: scan card present', await page.evaluate(() => !!document.querySelector('.smart-doc-card[data-action="smart-scan-doc"]')));
    check('PART5: import card present', await page.evaluate(() => !!document.querySelector('.smart-doc-card[data-action="smart-import-file"]')));
    check('PART7: templates card present', await page.evaluate(() => !!document.querySelector('.smart-doc-card[data-action="smart-templates"]')));
    check('Regressions: no external tool opened', (await othersOpen(page)).length === 0, (await othersOpen(page)).join(','));
    check('Regressions: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= PART 6 regression: blank canvas still fits =================
  {
    const { page, errs } = await newPage({ width: 768, height: 1024 });
    await openBlank(page, 'en');
    const o = await overflowInfo(page);
    const st = await blankState(page);
    check('PART6 regression: blank doc still 1 page', st.pageCount === 1 && st.pageSize === 'A4', `pages=${st.pageCount} size=${st.pageSize}`);
    check('PART6 regression: no overflow after toolbar change', o.docOverflow <= 2, 'overflow=' + o.docOverflow);
    check('PART6 regression: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= PART 1 regression: calculator / history / notes =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await page.evaluate(() => {
      const b = document.querySelector('.keypad-btn[data-value="7"]');
      if (b) b.click();
    });
    const display = await page.evaluate(() => document.getElementById('primaryDisplay').textContent);
    check('PART1 regression: Calculator still works (pressed 7)', display.includes('7'), 'display=' + display);
    await page.close();
  }
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-history"]').click());
    await sleep(400);
    check('PART1 regression: History still opens', await page.evaluate(() => document.getElementById('historyPanel').classList.contains('open')));
    await page.close();
  }
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
    await sleep(400);
    check('PART1 regression: Notes manager still opens', await page.evaluate(() => document.getElementById('notesManagerModal').classList.contains('show')));
    check('Regressions: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

} catch (err) {
  console.log('ERROR', err);
  results.push({ name: 'test harness', ok: false, detail: String(err && err.stack || err) });
} finally {
  try { await browser.close(); } catch (e) {}
  server.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${failed.length === 0 ? 'ALL PASS' : failed.length + ' FAILED'}  (${results.length} checks)`);
process.exit(failed.length === 0 ? 0 : 1);