// PART 15 — SMART DOCUMENTS: Company Logo tool (شعار الشركة ◉)
// Behavioral test in a real Chrome browser via Puppeteer.
// Covers: toolbar ◉ Logo button opens an image File Picker, image
// insertion as an independent logo inside each A4 page, position
// choices (top-right / top-left / center), aspect-ratio preservation,
// RTL/LTR + all 7 languages, responsive 1280/768/390/360, no page
// horizontal overflow, no JS errors, no alert(), no accidental opening
// of History/Notes/Calculator, and multiple logos without conflict.
// Run:  node tests/part15_smart_logo.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8245;
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
async function clickLogoTool(page) {
  await page.evaluate(() => {
    const input = document.getElementById('smartAddLogoInput');
    window.__logoPickerOpened = false;
    input.click = function () { window.__logoPickerOpened = true; };
    document.querySelector('[data-toolbar="blank-doc"] button[data-tool="logo"]').click();
  });
  await sleep(200);
}
async function uploadLogo(page, file) {
  const input = await page.$('#smartAddLogoInput');
  await input.uploadFile(file);
  await sleep(500);
}
const logoState = (page) => page.evaluate(() => window.__smartLogo.getState());

const PNG_SRC = path.join(ROOT, 'icon-192.png.png');

// ================= 1-10: Desktop flow (English / LTR) =================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');
  const st = await page.evaluate(() => window.__smartBlank.getState());
  check('1) Smart Documents editor opens', st.editorVisible === true && st.pageSize === 'A4');

  check('2) Logo tool button exists in the existing toolbar',
    await page.evaluate(() => !!document.querySelector('[data-toolbar="blank-doc"] button[data-tool="logo"]')));

  await clickLogoTool(page);
  check('3) Clicking the Logo tool opens the image File Picker',
    await page.evaluate(() => window.__logoPickerOpened === true));
  check('3a) Logo File Picker accepts only images',
    await page.evaluate(() => document.getElementById('smartAddLogoInput').getAttribute('accept') === 'image/*'));

  await uploadLogo(page, PNG_SRC);
  const after = await page.evaluate(() => {
    const s = window.__smartLogo.getState();
    const img = document.querySelector('#smartBlankCanvasHolder .smart-doc-logo-wrap img.smart-doc-logo');
    return {
      count: s.count,
      srcType: s.logos[0] && s.logos[0].srcType,
      inHolder: !!document.querySelector('#smartBlankCanvasHolder .smart-doc-logo-wrap'),
      visible: !!(img && img.offsetHeight > 0),
      holderOpen: document.getElementById('smartLogoBar').classList.contains('open')
    };
  });
  check('4) Chosen image is inserted as a logo inside the document',
    after.count === 1 && after.srcType === 'data' && after.inHolder, JSON.stringify(after));
  check('4a) Logo is visible inside the A4 page', after.visible === true);
  check('4b) Logo position selector becomes available', after.holderOpen === true);
  check('4c) A4 canvas survives logo insertion',
    await page.evaluate(() => !!document.getElementById('smartBlankCanvas') && window.__smartBlank.getState().pageCount === 1));

  const pos = await logoState(page);
  check('5a) Logo keeps a square aspect ratio (icon is 192x192)',
    Math.abs(pos.logos[0].aspect - 1) < 0.05, 'aspect=' + pos.logos[0].aspect);
  check('5b) Logo stays inside the A4 page', pos.logos[0].withinPage === true, JSON.stringify(pos.logos[0]));

  await page.evaluate(() => document.querySelector('.smart-logo-pos[data-logo-pos="top-left"]').click());
  await sleep(120);
  check('6) Choosing Top-left repositions the logo', (await logoState(page)).activePosition === 'top-left');

  await page.evaluate(() => document.querySelector('.smart-logo-pos[data-logo-pos="top-right"]').click());
  await sleep(120);
  check('7) Choosing Top-right repositions the logo', (await logoState(page)).activePosition === 'top-right');

  await page.evaluate(() => document.querySelector('.smart-logo-pos[data-logo-pos="center"]').click());
  await sleep(150);
  const cen = await page.evaluate(() => {
    const img = document.querySelector('#smartBlankCanvasHolder .smart-doc-logo-wrap img.smart-doc-logo');
    const pageEl = document.getElementById('smartBlankCanvas');
    const r = img.getBoundingClientRect();
    const p = pageEl.getBoundingClientRect();
    return { l: Math.round(r.left - p.left), r: Math.round(p.right - r.right), active: window.__smartLogo.getState().activePosition };
  });
  check('8) Choosing Center horizontally centres the logo',
    cen.active === 'center' && Math.abs(cen.l - cen.r) <= 2, JSON.stringify(cen));

  const overflowLtr = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('9) Desktop LTR: no page-level horizontal overflow', overflowLtr <= 1, 'overflow=' + overflowLtr);
  check('Desktop LTR flow has no JS errors', errs.length === 0, errs.join(' | '));
  check('No alert() during LTR flow', await page.evaluate(() => window.__dialogs.alert === 0));
  await page.close();
}

// ================= RTL (Arabic) =================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'ar');
  const st = await logoState(page);
  check('11) RTL: editor is in rtl direction', st.viewDir === 'rtl', st.viewDir);
  await clickLogoTool(page);
  await uploadLogo(page, PNG_SRC);
  const sl = await logoState(page);
  check('12) RTL: logo can be inserted into the document', sl.count === 1 && sl.logos[0].withinPage, JSON.stringify(sl));
  await page.evaluate(() => document.querySelector('.smart-logo-pos[data-logo-pos="top-left"]').click());
  await sleep(120);
  check('13) RTL: choosing Top-left works', (await logoState(page)).activePosition === 'top-left');
  const arLabel = await page.evaluate(() => document.querySelector('.smart-logo-bar-label').textContent.trim());
  check('14) Arabic position label is localized', arLabel === 'موضع الشعار', arLabel);
  const arRight = await page.evaluate(() => document.querySelector('.smart-logo-pos[data-logo-pos="top-right"]').textContent.trim());
  check('14a) Arabic top-right option localized', arRight === 'أعلى اليمين', arRight);
  const ofrtl = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('RTL: no page-level horizontal overflow', ofrtl <= 1, 'overflow=' + ofrtl);
  check('RTL flow has no JS errors', errs.length === 0, errs.join(' | '));
  await page.close();
}

// ================= All 7 languages =================
{
  const locales = [
    { key: 'ar', label: 'موضع الشعار', tr: 'أعلى اليمين' },
    { key: 'en', label: 'Logo position', tr: 'Top right' },
    { key: 'fr', label: 'Position du logo', tr: 'En haut à droite' },
    { key: 'es', label: 'Posición del logotipo', tr: 'Arriba a la derecha' },
    { key: 'tr', label: 'Logo konumu', tr: 'Sağ üst' },
    { key: 'ru', label: 'Положение логотипа', tr: 'Вверху справа' },
    { key: 'de', label: 'Logo-Position', tr: 'Oben rechts' }
  ];
  for (const loc of locales) {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, loc.key);
    await uploadLogo(page, PNG_SRC);
    const ui = await page.evaluate(() => ({
      lbl: document.querySelector('.smart-logo-bar-label').textContent.trim(),
      tr: document.querySelector('.smart-logo-pos[data-logo-pos="top-right"]').textContent.trim(),
      count: window.__smartLogo.getState().count
    }));
    const leak = loc.key !== 'en' && /top right|logo position/i.test(ui.lbl);
    check(`${loc.key.toUpperCase()}: logo inserted + position bar localized (no English leak)`,
      ui.count === 1 && ui.lbl === loc.label && ui.tr === loc.tr && !leak, JSON.stringify(ui));
    check(`${loc.key.toUpperCase()}: no JS errors`, errs.length === 0, errs.join(' | '));
    await page.close();
  }
}

// ================= Responsive: 768 / 390 / 360 =================
{
  const vps = [
    { name: 'Tablet 768', width: 768, height: 1024 },
    { name: 'iPhone 390', width: 390, height: 844 },
    { name: 'Android 360', width: 360, height: 800 }
  ];
  let n = 16;
  for (const vp of vps) {
    const { page, errs } = await newPage({
      width: vp.width, height: vp.height, isMobile: vp.width < 768, hasTouch: vp.width < 768
    });
    await openBlank(page, 'en');
    await uploadLogo(page, PNG_SRC);
    await page.evaluate(() => document.querySelector('.smart-logo-pos[data-logo-pos="center"]').click());
    await sleep(150);
    const info = await page.evaluate((vw) => {
      const bar = document.getElementById('smartLogoBar');
      const br = bar.getBoundingClientRect();
      const s = window.__smartLogo.getState();
      const canvas = document.getElementById('smartBlankCanvas').getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        inside: !!(s.logos[0] && s.logos[0].withinPage),
        aspectOk: !!(s.logos[0] && Math.abs(s.logos[0].aspect - 1) < 0.05),
        pickerUsable: bar.classList.contains('open') && br.width > 0 && br.height > 0,
        pickerInViewport: br.left >= -1 && br.right <= vw + 1,
        canvasLeft: Math.round(canvas.left),
        vw
      };
    }, vp.width);
    check(`${n}${vp.name}: no page horizontal overflow`, info.overflow <= 2, 'overflow=' + info.overflow);
    check(`${n}.1 ${vp.name}: logo inside A4 + aspect preserved`, info.inside && info.aspectOk, JSON.stringify(info));
    check(`${n}.2 ${vp.name}: position picker usable & inside viewport`, info.pickerUsable && info.pickerInViewport);
    check(`${n}.3 ${vp.name}: A4 canvas not broken`, info.canvasLeft >= -1, 'left=' + info.canvasLeft);
    check(`${n}.4 ${vp.name}: no JS errors`, errs.length === 0, errs.join(' | '));
    await page.close();
    n++;
  }
}

// ================= No accidental Feature open + multi-logo =================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');
  await uploadLogo(page, PNG_SRC);
  const safety = await page.evaluate(() => ({
    notesModal: document.getElementById('notesManagerModal') ? document.getElementById('notesManagerModal').classList.contains('show') : false,
    historyOpen: !!document.querySelector('#historyPanel.show, #historyView.show, [data-history-open="true"]'),
    alertCount: window.__dialogs.alert,
    editorVisible: window.__smartBlank.getState().editorVisible
  }));
  check('17a) Logo does not open Notes', safety.notesModal === false, JSON.stringify(safety));
  check('17b) Logo does not open History', safety.historyOpen === false);
  check('17c) Editor remains open (no feature switch)', safety.editorVisible === true);
  check('17d) No alert() triggered', safety.alertCount === 0);
  check('17e) No JS errors', errs.length === 0, errs.join(' | '));

  const src = await page.evaluate(() => document.querySelector('#smartBlankCanvasHolder .smart-doc-logo-wrap img.smart-doc-logo').src);
  await page.evaluate((s) => window.__smartLogo.insert(s, 'logo2'), src);
  await sleep(200);
  const multi = await logoState(page);
  check('18) Multiple logos coexist without conflict',
    multi.count === 2 && multi.logos.every((l) => l.withinPage), JSON.stringify(multi));
  check('18a) Position applies to all logos together',
    multi.logos.every((l) => l.position === multi.activePosition));
  await page.close();
}

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log('\n========================================');
console.log(`PART 15: ${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('FAILED:');
  failed.forEach((f) => console.log('  - ' + f.name));
  console.log('RESULT: SOME FAILED');
} else {
  console.log('FINAL: ALL PASS');
}
// Hard exit — force-close the browser/server so the harness can never hang.
process.exit(failed.length ? 1 : 0);