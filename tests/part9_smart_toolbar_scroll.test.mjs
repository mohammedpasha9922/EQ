// PART 9 — SMART DOCUMENTS: Scrollable Toolbar (الشريط المتحرك)
// Behavioral test in a real Chrome browser via Puppeteer.
// Run:  node tests/part9_smart_toolbar_scroll.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8209;
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
setTimeout(() => process.exit(124), 180000);

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

const ALL_TOOLS = ['undo', 'redo', 'add', 'text', 'table', 'signature',
  'image', 'logo', 'divider', 'border', 'page', 'page-number', 'page-settings', 'more'];
const SECONDARY = ['image', 'logo', 'divider', 'border', 'page', 'page-number', 'page-settings', 'more'];


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

// Toolbar layout / visibility metrics.
const toolbarInfo = (page) => page.evaluate(() => {
  const bar = document.querySelector('[data-toolbar="blank-doc"]');
  const r = bar.getBoundingClientRect();
  const byTool = {};
  Array.from(bar.querySelectorAll('button.smart-tool-btn')).forEach((b) => {
    const br = b.getBoundingClientRect();
    byTool[b.getAttribute('data-tool')] = {
      left: Math.round(br.left), right: Math.round(br.right),
      inView: br.left >= r.left - 1 && br.right <= r.right + 1
    };
  });
  return {
    scrollLeft: bar.scrollLeft,
    scrollWidth: bar.scrollWidth,
    clientWidth: bar.clientWidth,
    byTool
  };
});

// Scroll a specific tool into the toolbar's visible area.
const revealTool = (page, dataTool) => page.evaluate((t) => {
  const bar = document.querySelector('[data-toolbar="blank-doc"]');
  const btn = bar.querySelector(`button[data-tool="${t}"]`);
  if (!btn) return { exists: false };
  btn.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  const b = btn.getBoundingClientRect();
  const r = bar.getBoundingClientRect();
  return {
    exists: true,
    inView: b.left >= r.left - 1 && b.right <= r.right + 1
  };
}, dataTool);

const pageOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

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

  // ================= Toolbar structure (1-16) =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    const s = await page.evaluate(() => window.__smartBlank.getState());
    const tools = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-toolbar="blank-doc"] button.smart-tool-btn'))
        .map((b) => b.getAttribute('data-tool')));
    check('1) Editor opens from PART 6 (New Document)', s.editorVisible === true && s.pageSize === 'A4');
    check('2) Toolbar exists', tools.length > 0);
    for (const t of ALL_TOOLS) {
      check(`${ALL_TOOLS.indexOf(t) + 3}) Tool ${t} exists`, tools.includes(t), tools.join(','));
    }
    check('Toolbar has all 14 tools in order',
      JSON.stringify(tools) === JSON.stringify(ALL_TOOLS), JSON.stringify(tools));
    check('Toolbar buttons are <button> and focusable',
      await page.evaluate(() => {
        const bar = document.querySelector('[data-toolbar="blank-doc"]');
        const btns = Array.from(bar.querySelectorAll('button.smart-tool-btn'));
        return btns.every((b) => b.tagName === 'BUTTON' && typeof b.focus === 'function');
      }));
    check('Structure: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= Basic visibility without scroll (17-22) =================
  {
    const { page, errs } = await newPage({ width: 768, height: 1024 });
    await openBlank(page, 'en');
    const info = await toolbarInfo(page);
    check('17) Undo visible without scroll', info.byTool.undo && info.byTool.undo.inView);
    check('18) Redo visible without scroll', info.byTool.redo && info.byTool.redo.inView);
    check('19) Add visible without scroll', info.byTool.add && info.byTool.add.inView);
    check('20) Text visible without scroll', info.byTool.text && info.byTool.text.inView);
    check('21) Table visible without scroll', info.byTool.table && info.byTool.table.inView);
    check('22) Signature visible without scroll', info.byTool.signature && info.byTool.signature.inView);
    check('Primary tools require no horizontal scroll', info.scrollLeft === 0, 'scrollLeft=' + info.scrollLeft);
    check('Basic visibility: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= Scroll behavior (23-33) at mobile width =================
  {
    const { page, errs } = await newPage({ width: 390, height: 844 });
    await openBlank(page, 'en');
    const info = await toolbarInfo(page);
    check('23) Toolbar has internal horizontal overflow',
      info.scrollWidth > info.clientWidth,
      `scrollW=${info.scrollWidth} clientW=${info.clientWidth}`);
    check('24) Page itself has NO horizontal overflow', (await pageOverflow(page)) <= 2,
      'overflow=' + (await pageOverflow(page)));
    let allReachable = true;
    for (const t of SECONDARY) {
      const r = await revealTool(page, t);
      if (!r.exists || !r.inView) allReachable = false;
    }
    check('25) Secondary tools reachable after scroll', allReachable);
    for (const t of SECONDARY) {
      const idx = SECONDARY.indexOf(t);
      const r = await revealTool(page, t);
      check(`${26 + idx}) ${t} reachable after scroll`, r.exists && r.inView);
    }
    check('Scroll behavior: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }



  // ================= Interaction safety (34-39) =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    await page.evaluate((tools) => {
      tools.forEach((t) => {
        const b = document.querySelector(`[data-toolbar="blank-doc"] button[data-tool="${t}"]`);
        if (b) b.click();
      });
    }, ALL_TOOLS);
    await sleep(200);
    const dialogs = await page.evaluate(() => window.__dialogs);
    const opened = await othersOpen(page);
    check('34) Clicking PART 9 tools opens no feature', opened.length === 0, opened.join(','));
    check('35) No fake alerts', dialogs.alert === 0, 'alert=' + dialogs.alert);
    check('36) No fake dialogs/confirms/prompts',
      dialogs.confirm === 0 && dialogs.prompt === 0,
      `confirm=${dialogs.confirm} prompt=${dialogs.prompt}`);
    check('37) No JS errors during interaction', errs.length === 0, errs.join(' | '));
    await page.evaluate(() => document.getElementById('smartBlankBack').click());
    await sleep(300);
    const home = await page.evaluate(() => ({
      homeShown: document.querySelector('.smart-docs-home')?.style.display !== 'none',
      editorHidden: document.getElementById('smartBlankView').classList.contains('blank-visible') === false,
      modalOpen: document.getElementById('smartDocsModal').classList.contains('show')
    }));
    check('38) Back returns to Smart Documents home', home.homeShown && home.editorHidden);
    check('39) Smart Documents Home still works (cards present)',
      home.modalOpen &&
      await page.evaluate(() => document.querySelectorAll('.smart-doc-card').length >= 4));
    check('Interaction: no JS errors after back', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= Localization (40-46) =================
  {
    const locales = [
      { key: 'ar', dir: 'rtl', image: 'صورة', name: 'Arabic (RTL)' },
      { key: 'en', dir: 'ltr', image: 'Image', name: 'English (LTR)' },
      { key: 'fr', dir: 'ltr', image: 'Image', name: 'French' },
      { key: 'es', dir: 'ltr', image: 'Imagen', name: 'Spanish' },
      { key: 'tr', dir: 'ltr', image: 'Resim', name: 'Turkish' },
      { key: 'ru', dir: 'ltr', image: 'Изображение', name: 'Russian' },
      { key: 'de', dir: 'ltr', image: 'Bild', name: 'German' }
    ];
    for (const loc of locales) {
      const { page, errs } = await newPage({ width: 1280, height: 800 });
      await openBlank(page, loc.key);
      const v = await page.evaluate(() => {
        const imgLabel = document.querySelector('[data-toolbar="blank-doc"] [data-tool="image"] span[data-i18n]')?.textContent.trim();
        return { dir: document.documentElement.dir, imgLabel };
      });
      const num = 40 + locales.indexOf(loc);
      check(`${num}) ${loc.name}: dir=${loc.dir}`, v.dir === loc.dir, 'dir=' + v.dir);
      check(`${num}.1 ${loc.name}: image tool localized`, v.imgLabel === loc.image, 'label=' + v.imgLabel);
      check(`${num}.2 ${loc.name}: no hardcoded-English leakage`, v.imgLabel !== 'Image' || loc.image === 'Image', 'label=' + v.imgLabel);
      check(`${num}.3 ${loc.name}: no JS errors`, errs.length === 0, errs.join(' | '));
      await page.close();
    }
  }



  // ================= Responsive (47-53) =================
  {
    const viewports = [
      { name: 'Desktop 1280', vp: { width: 1280, height: 800 } },
      { name: 'Tablet 768', vp: { width: 768, height: 1024 } },
      { name: 'iPhone 390', vp: { width: 390, height: 844 } },
      { name: 'Android 360', vp: { width: 360, height: 740 } }
    ];
    for (const t of viewports) {
      const { page, errs } = await newPage(t.vp);
      await openBlank(page, 'en');
      const ov = await pageOverflow(page);
      const canvas = await page.evaluate(() => {
        const c = document.getElementById('smartBlankCanvas').getBoundingClientRect();
        return { left: Math.round(c.left), right: Math.round(c.right) };
      });
      const info = await toolbarInfo(page);
      const num = 47 + viewports.indexOf(t);
      check(`${num}) ${t.name}: no page horizontal overflow`, ov <= 2, 'overflow=' + ov);
      check(`${num}.1 ${t.name}: toolbar usable`, info.clientWidth > 0);
      check(`${num}.2 ${t.name}: canvas stays inside viewport`,
        canvas.left >= -1 && canvas.right <= t.vp.width + 1,
        `left=${canvas.left} right=${canvas.right}`);
      check(`${num}.3 ${t.name}: no JS errors`, errs.length === 0, errs.join(' | '));
      await page.close();
    }
    {
      const { page } = await newPage({ width: 390, height: 844 });
      await openBlank(page, 'en');
      const info = await toolbarInfo(page);
      check('52) Toolbar alone scrolls horizontally at mobile width',
        info.scrollWidth - info.clientWidth > 0,
        `scrollW=${info.scrollWidth} clientW=${info.clientWidth}`);
      await page.close();
    }
  }

  // ================= Regression (54-60) — lightweight inline checks =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    const st = await page.evaluate(() => window.__smartBlank.getState());
    check('56) PART6 regression: editor opens as A4, 1 page',
      st.editorVisible && st.pageSize === 'A4' && st.pageCount === 1);
    check('58) PART8 regression: content surface present',
      await page.evaluate(() => !!document.getElementById('smartDocumentContent')));
    await page.close();
  }
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await clickSmartDocs(page);
    check('55) PART5 regression: import card present',
      await page.evaluate(() => !!document.querySelector('.smart-doc-card[data-action="smart-import-file"]')));
    check('57) PART7 regression: templates card present',
      await page.evaluate(() => !!document.querySelector('.smart-doc-card[data-action="smart-templates"]')));
    check('54) PART3 regression: 4 workflow steps present',
      (await page.evaluate(() => document.querySelectorAll('[data-widget="smart-steps"] .smart-step').length)) === 4);
    await page.close();
  }
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await page.evaluate(() => {
      const b = document.querySelector('.keypad-btn[data-value="7"]');
      if (b) b.click();
    });
    const display = await page.evaluate(() => document.getElementById('primaryDisplay').textContent);
    check('54) PART1 regression: calculator works', display.includes('7'), 'display=' + display);
    await openDrawer(page);
    await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
    await sleep(300);
    check('54) PART1 regression: notes still opens',
      await page.evaluate(() => document.getElementById('notesManagerModal').classList.contains('show')));
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

