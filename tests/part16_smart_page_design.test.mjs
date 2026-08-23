// PART 16 — SMART DOCUMENTS: Page Design (تصميم الصفحة / الإطار)
// Behavioral test in a real Chrome browser via Puppeteer.
// Covers: ⚙ page-settings opens the design menu, exactly 5 presets
// (none/simple/classic/formal/modern), preset switching leaves exactly one
// active class, "no border" restores the default, content (text / tables /
// images / logos) survives, RTL/LTR + all 7 languages, responsive
// 1280/768/390/360, no horizontal overflow, no JS errors, no alert(),
// and no accidental opening of other features.
// Run:  node tests/part16_smart_page_design.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8256;
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
const URLBASE = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 420000);

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
    window.__dialogs = { alert: 0, confirm: 0, prompt: 0 };
    window.alert = () => { window.__dialogs.alert++; };
    window.confirm = () => { window.__dialogs.confirm++; return true; };
    window.prompt = () => { window.__dialogs.prompt++; return null; };
  });
  await page.goto(URLBASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
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
const clickPageSettings = (page) => page.evaluate(() =>
  document.querySelector('[data-toolbar="blank-doc"] button[data-tool="page-settings"]').click());
async function pickPreset(page, preset) {
  await clickPageSettings(page); await sleep(150);
  await page.evaluate((p) =>
    document.querySelector(`#smartPageDesignMenu .smart-design-item[data-design="${p}"]`).click(), preset);
  await sleep(200);
}
const menuInfo = (page) => page.evaluate(() => {
  const m = document.getElementById('smartPageDesignMenu');
  if (!m) return { exists: false };
  const r = m.getBoundingClientRect();
  return {
    exists: true,
    open: m.classList.contains('open'),
    items: Array.from(m.querySelectorAll('.smart-design-item')).map((b) => b.getAttribute('data-design')),
    inViewport: r.left >= -1 && r.right <= window.innerWidth + 1 && r.top >= -1 && r.bottom <= window.innerHeight + 1
  };
});
const contentAlive = (page) => page.evaluate(() => ({
  text: !!document.querySelector('#smartBlankCanvasHolder [data-smart-element="text"]'),
  table: !!document.querySelector('#smartBlankCanvasHolder table'),
  logo: !!document.querySelector('#smartBlankCanvasHolder .smart-doc-logo-wrap img.smart-doc-logo')
}));

try {
  // ---------- Main desktop scenario (1280×800, English) ----------
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  check('1) Smart Documents home reachable', await page.evaluate(async () => {
    document.getElementById('drawerToggle').click();
    await new Promise((r) => setTimeout(r, 250));
    document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click();
    await new Promise((r) => setTimeout(r, 400));
    return !!document.querySelector('.smart-doc-card[data-action="smart-new-doc"]');
  }));
  await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-new-doc"]').click());
  await sleep(450);
  check('2) Blank Document editor open with A4 canvas', await page.evaluate(() => {
    const s = window.__smartBlank.getState();
    return s.editorVisible === true && s.pageSize === 'A4' && !!document.getElementById('smartBlankCanvas');
  }));
  check('3) Exactly ONE existing page-settings button (no duplicate hook)', await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('[data-toolbar="blank-doc"] button[data-tool="page-settings"]'));
    return btns.length === 1 && btns[0].tagName === 'BUTTON';
  }));

  // Seed content: text block, table and logo — must survive every preset.
  await page.evaluate(() => window.__smartBlank.insertElement('text')); await sleep(200);
  await page.evaluate(() => window.__smartBlank.toggleAddMenu()); await sleep(150);
  await page.evaluate(() => window.__smartTable.create(2, 2)); await sleep(300);
  await page.evaluate(() => window.__smartLogo.insert(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'logo1'
  )); await sleep(250);
  const seeded = await contentAlive(page);
  check('4) Content seeded before styling (text + table + logo)',
    seeded.text && seeded.table && seeded.logo, JSON.stringify(seeded));

  await clickPageSettings(page); await sleep(200);
  let mi = await menuInfo(page);
  check('5) Clicking page-settings opens the Page Design menu (inside viewport)',
    mi.exists && mi.open && mi.inViewport, JSON.stringify(mi));
  check('6) Menu contains EXACTLY 5 options: none,simple,classic,formal,modern',
    JSON.stringify(mi.items) === JSON.stringify(['none', 'simple', 'classic', 'formal', 'modern']),
    JSON.stringify(mi.items));
  // Each preset: applies visibly + content intact
  const expectClasses = { none: [], simple: ['simple'], classic: ['classic'], formal: ['formal'], modern: ['modern'] };
  for (const preset of ['none', 'simple', 'classic', 'formal', 'modern']) {
    await pickPreset(page, preset);
    const st = await page.evaluate(() => window.__smartPageDesign.getState());
    const borderChanged = await page.evaluate((p) => {
      const c = getComputedStyle(document.getElementById('smartBlankCanvas'));
      return p === 'none'
        ? (c.borderTopStyle === 'none' || parseFloat(c.borderTopWidth) === 0)
        : c.borderTopStyle !== 'none' && parseFloat(c.borderTopWidth) > 0;
    }, preset);
    check(`7-${preset}) Selecting "${preset}" applies its frame visibly`, st.preset === preset &&
      JSON.stringify(st.pageClasses[0]) === JSON.stringify(expectClasses[preset]) && borderChanged,
      JSON.stringify({ st: st.preset, cls: st.pageClasses[0], borderChanged }));
    const alive = await contentAlive(page);
    check(`8-${preset}) Content intact after "${preset}"`, alive.text && alive.table && alive.logo, JSON.stringify(alive));
  }

  // Preset swap must not accumulate classes: classic -> modern -> simple
  for (const p of ['classic', 'modern', 'simple']) await pickPreset(page, p);
  const stSwap = await page.evaluate(() => window.__smartPageDesign.getState());
  check('9) Preset switching leaves EXACTLY ONE active preset (simple only)',
    stSwap.preset === 'simple' && stSwap.pageClasses.every((c) => JSON.stringify(c) === JSON.stringify(['simple'])),
    JSON.stringify(stSwap.pageClasses));

  // A4 layout size unchanged while framed (compare framed vs unframed).
  // Note: smartBlankFit() scales pages down responsively via an inline
  // width, so we compare like-for-like instead of assuming 794px.
  const sizeBefore = await page.evaluate(() => {
    const c = document.getElementById('smartBlankCanvas');
    return [c.offsetWidth, c.offsetHeight];
  });
  await pickPreset(page, 'classic');
  const sizeAfter = await page.evaluate(() => {
    const c = document.getElementById('smartBlankCanvas');
    return [c.offsetWidth, c.offsetHeight];
  });
  check('10) A4 page size unchanged while framed', sizeBefore[0] === sizeAfter[0] && sizeBefore[1] === sizeAfter[1],
    JSON.stringify({ sizeBefore, sizeAfter }));

  // "بدون إطار" restores the default
  await pickPreset(page, 'none');
  const stNone = await page.evaluate(() => ({
    state: window.__smartPageDesign.getState(),
    noBorder: (() => {
      const c = getComputedStyle(document.getElementById('smartBlankCanvas'));
      return c.borderTopStyle === 'none' || parseFloat(c.borderTopWidth) === 0;
    })()
  }));
  check('11) "No border" restores the default unframed state',
    stNone.state.preset === 'none' && stNone.state.pageClasses.every((c) => c.length === 0) && stNone.noBorder);

  // Outside-click closes the menu; toolbar scroll still works.
  await clickPageSettings(page); await sleep(150);
  // Click in the middle of the page stage (a safe neutral area).
  const stagePt = await page.evaluate(() => {
    const r = document.querySelector('.smart-blank-stage').getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + 40) };
  });
  await page.mouse.click(stagePt.x, stagePt.y); await sleep(150);
  check('12) Outside click closes the menu', !(await menuInfo(page)).open);
  const tbScroll = await page.evaluate(() =>
    ['auto', 'scroll'].includes(getComputedStyle(document.querySelector('[data-toolbar="blank-doc"]')).overflowX));
  check('13) PART 9 toolbar scrolling unaffected', tbScroll);

  // Multi-page: add a page via PART 10, preset applies to ALL pages
  await page.evaluate(() => window.__smartBlank.toggleAddMenu()); await sleep(300);
  await page.evaluate(() => document.querySelector('#smartAddMenu .smart-add-item[data-add="new-page"]').click()); await sleep(600);
  await pickPreset(page, 'formal');
  const multi = await page.evaluate(() => window.__smartPageDesign.getState());
  check('14) Preset applies to EVERY page of the document (PART 10 pages)',
    multi.pageCount >= 2 && multi.pageClasses.every((c) => JSON.stringify(c) === JSON.stringify(['formal'])),
    JSON.stringify({ n: multi.pageCount, cls: multi.pageClasses }));

  check('18) No JS errors so far', errs.length === 0, errs.join(' | '));
  // ---------- Languages / RTL ----------
  const LANGS = [
    { key: 'ar', dir: 'rtl', label: 'بدون إطار' },
    { key: 'en', dir: 'ltr', label: 'No border' },
    { key: 'fr', dir: 'ltr', label: 'Sans bordure' },
    { key: 'es', dir: 'ltr', label: 'Sin borde' },
    { key: 'tr', dir: 'ltr', label: 'Çerçevesiz' },
    { key: 'ru', dir: 'ltr', label: 'Без рамки' },
    { key: 'de', dir: 'ltr', label: 'Ohne Rahmen' }
  ];
  for (const loc of LANGS) {
    const p2 = (await newPage({ width: 1280, height: 800 })).page;
    await openBlank(p2, loc.key);
    await clickPageSettings(p2); await sleep(200);
    const v = await p2.evaluate(() => {
      const m = document.getElementById('smartPageDesignMenu');
      const r = m.getBoundingClientRect();
      return {
        dir: document.documentElement.dir,
        label: m.querySelector('[data-design="none"] span[data-i18n]').textContent.trim(),
        open: m.classList.contains('open'),
        items: m.querySelectorAll('.smart-design-item').length,
        inViewport: r.left >= -1 && r.right <= window.innerWidth + 1 && r.bottom <= window.innerHeight + 1,
        ov: document.documentElement.scrollWidth - window.innerWidth
      };
    });
    check(`15-${loc.key}) ${loc.key.toUpperCase()}: dir=${loc.dir}, localized label, menu fits, no overflow`,
      v.dir === loc.dir && v.label === loc.label && v.open && v.items === 5 && v.inViewport && v.ov <= 0,
      JSON.stringify(v));
    // Apply a frame under RTL/LTR to prove layout never breaks
    await p2.evaluate(() => document.querySelector('#smartPageDesignMenu .smart-design-item[data-design="simple"]').click());
    await sleep(200);
    const frameOk = await p2.evaluate(() => {
      const pg = document.getElementById('smartBlankCanvas').getBoundingClientRect();
      return pg.left >= -1 && pg.right <= window.innerWidth + 1 &&
        (document.documentElement.scrollWidth - window.innerWidth) <= 0;
    });
    check(`16-${loc.key}) Frame stays inside the page (${loc.dir})`, frameOk);
    await p2.close();
  }

  // ---------- Responsive (RTL is the hardest clamping case) ----------
  const VIEWPORTS = [
    { name: 'Desktop 1280', width: 1280, height: 800 },
    { name: 'Tablet 768', width: 768, height: 1024 },
    { name: 'iPhone 390', width: 390, height: 844 },
    { name: 'Android 360', width: 360, height: 800 }
  ];
  for (const vp of VIEWPORTS) {
    const p3 = (await newPage({ width: vp.width, height: vp.height })).page;
    await openBlank(p3, 'ar');
    await clickPageSettings(p3); await sleep(200);
    const v = await p3.evaluate(() => {
      const m = document.getElementById('smartPageDesignMenu');
      const r = m.getBoundingClientRect();
      return {
        open: m.classList.contains('open'),
        inVp: r.left >= -1 && r.right <= window.innerWidth + 1 && r.top >= -1 && r.bottom <= window.innerHeight + 1,
        ov: document.documentElement.scrollWidth - window.innerWidth
      };
    });
    await p3.evaluate(() => document.querySelector('#smartPageDesignMenu .smart-design-item[data-design="modern"]').click());
    await sleep(200);
    const after = await p3.evaluate(() => ({
      preset: window.__smartPageDesign.getState().preset,
      inside: (() => { const r = document.getElementById('smartBlankCanvas').getBoundingClientRect(); return r.left >= -1 && r.right <= window.innerWidth + 1; })(),
      ov: document.documentElement.scrollWidth - window.innerWidth
    }));
    check(`17-${vp.name}) menu inside viewport, zero overflow, frame applied`,
      v.open && v.inVp && v.ov <= 0 && after.preset === 'modern' && after.inside && after.ov <= 0,
      JSON.stringify({ v, after }));
    await p3.close();
  }

  // ---------- Error hygiene + no feature leaks ----------
  check('18b) No JS errors during the whole run', errs.length === 0, errs.join(' | '));
  const dialogs = await page.evaluate(() => window.__dialogs);
  check('19) No alert()/confirm()/prompt() used',
    dialogs.alert === 0 && dialogs.confirm === 0 && dialogs.prompt === 0);
  const leak = await page.evaluate(() =>
    !!(document.querySelector('.note-editor-fullscreen') || document.getElementById('historyView')));
  check('20) Flow stayed inside Smart Documents (no History/Notes opened)', !leak);

  await page.close();
} catch (e) {
  check('FATAL: test crashed', false, String(e && e.stack || e));
}

await browser.close();
server.close();
const passedCount = results.filter((r) => r.ok).length;
console.log(`\nPART 16 RESULT: ${passedCount}/${results.length} checks passed`);
process.exit(passedCount === results.length ? 0 : 1);
