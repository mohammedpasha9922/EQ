// PART 17 — SMART DOCUMENTS: Signature Tool (أداة التوقيع ✍)
// Behavioral test in a real Chrome browser via Puppeteer.
// Covers: ✍ toolbar button, 3-method menu (Draw/Type/Image), real
// pointer drawing on Canvas, Clear, Insert, typed-signature preview,
// image file picker + preview, multi-signature isolation, existing
// content (text/table/image/logo/design) untouched, RTL/LTR across
// 7 locales, responsive 1280/768/390/360, no horizontal overflow,
// no alert(), no JS errors, Escape/Cancel/Back reset, no stale state.
// Run:  node tests/part17_smart_signature.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8251;
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
const OUT = path.join(ROOT, '__p17_result.txt');
try { fs.unlinkSync(OUT); } catch (e) {}
fs.appendFileSync(OUT, 'STARTED\n');
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`;
  console.log(line);
  fs.appendFileSync(OUT, line + '\n');
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A tiny valid PNG used for the Image method (signature picture).
const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR4nGP8z8DwnwEPYMInOWwUAACaVAEbTM10zwAAAABJRU5ErkJggg==';
const pngPath = path.join(os.tmpdir(), 'part17_signature.png');
fs.writeFileSync(pngPath, Buffer.from(PNG_B64, 'base64'));

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
const clickSigBtn = (page) => page.evaluate(() =>
  document.querySelector('[data-toolbar="blank-doc"] button[data-tool="signature"]').click());
async function pickMethod(page, method) {
  await clickSigBtn(page); await sleep(200);
  await page.evaluate((m) =>
    document.querySelector(`#smartSignatureMenu .smart-sig-item[data-sig-method="${m}"]`).click(), method);
  await sleep(250);
}
// Draw a real stroke across the canvas with actual mouse pointer events.
async function drawStroke(page) {
  const box = await page.evaluate(() => {
    const r = document.getElementById('signatureCanvas').getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.mouse.move(box.x + box.w * 0.2, box.y + box.h * 0.5);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(box.x + box.w * (0.2 + 0.6 * i / 8), box.y + box.h * (0.5 + 0.25 * Math.sin(i)));
    await sleep(15);
  }
  await page.mouse.up();
  await sleep(120);
}
const canvasInk = (page) => page.evaluate(() => {
  const c = document.getElementById('signatureCanvas');
  const ctx = c.getContext('2d');
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
  return n;
});
const noHOverflow = (page) => page.evaluate(() =>
  document.documentElement.scrollWidth <= window.innerWidth + 1);

// ============================================================
// 1) Opening the tool
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');

  check('1) Smart Documents editor is open',
    await page.evaluate(() => window.__smartBlank.getState().editorVisible));
  check('2) Content surface exists',
    await page.evaluate(() => !!document.getElementById('smartDocumentContent')));
  check('3) Existing signature button present (no duplicate)',
    await page.evaluate(() => {
      const b = document.querySelectorAll('[data-toolbar="blank-doc"] button[data-tool="signature"]');
      return b.length === 1 && b[0].tagName === 'BUTTON';
    }));

  await clickSigBtn(page); await sleep(200);
  check('4) Clicking the button opens the signature menu',
    await page.evaluate(() => window.__smartSignature.isOpen()));
  const methods = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#smartSignatureMenu .smart-sig-item'))
      .map((b) => b.getAttribute('data-sig-method')));
  check('5) Exactly THREE methods: draw/type/image', JSON.stringify(methods) === '["draw","type","image"]',
    methods.join(','));

  // ============================================================
  // Draw
  // ============================================================
  await pickMethod(page, 'draw');
  check('6) Draw stage shows the canvas',
    await page.evaluate(() => {
      const c = document.getElementById('signatureCanvas');
      return !document.getElementById('sigStageDraw').hidden && c.offsetHeight > 60;
    }));
  const inkBefore = await canvasInk(page);
  await drawStroke(page);
  const inkAfter = await canvasInk(page);
  check('7) Drawing really changes the canvas pixels', inkAfter > inkBefore,
    `${inkBefore} -> ${inkAfter}`);
  check('8) hasInk state reflects real drawing',
    await page.evaluate(() => window.__smartSignature.hasInk() === true));

  // Clear
  await page.evaluate(() => document.querySelector('#sigStageDraw .smart-sig-clear').click());
  await sleep(150);
  check('9) Clear empties the canvas and ink state',
    (await canvasInk(page)) === 0 && await page.evaluate(() => !window.__smartSignature.hasInk()));

  // Draw again + insert
  await drawStroke(page);
  await page.evaluate(() => document.querySelector('#sigStageDraw .smart-sig-insert').click());
  await sleep(250);
  const drawn = await page.evaluate(() => {
    const sig = document.querySelector('#smartDocumentContent .smart-doc-signature');
    if (!sig) return null;
    const r = sig.getBoundingClientRect();
    return { count: document.querySelectorAll('#smartDocumentContent .smart-doc-signature').length, w: Math.round(r.width), h: Math.round(r.height), src: sig.src.startsWith('data:image/png') };
  });
  check('10) Drawn signature inserted inside the document',
    !!drawn && drawn.count === 1 && drawn.w > 0 && drawn.src, JSON.stringify(drawn));
  check('11) Signature UI fully closed after insert',
    await page.evaluate(() => !window.__smartSignature.isOpen() && !window.__smartSignature.isPanelOpen()));

  // Empty-draw guard: open draw stage fresh, insert without drawing must be a no-op.
  await pickMethod(page, 'draw');
  const cnt = await page.evaluate(() => window.__smartSignature.count());
  await page.evaluate(() => document.querySelector('#sigStageDraw .smart-sig-insert').click());
  await sleep(150);
  check('12) Empty draw never inserts an empty signature',
    await page.evaluate((c) => window.__smartSignature.count() === c, cnt));

  // ============================================================
  // Type
  // ============================================================
  await page.evaluate(() => document.querySelector('#sigStageDraw .smart-sig-cancel').click());
  await sleep(120);
  await pickMethod(page, 'type');
  await page.type('#signatureNameInput', 'Ahmad Ali');
  await sleep(150);
  const preview = await page.evaluate(() => {
    const p = document.getElementById('signatureTypePreview');
    return { text: p.textContent, font: p.style.fontFamily };
  });
  check('13) Typed name shows live visual preview',
    preview.text === 'Ahmad Ali' && preview.font.length > 0, JSON.stringify(preview));
  // switch style
  await page.evaluate(() => document.querySelectorAll('.smart-sig-style-btn')[1].click());
  const font2 = await page.evaluate(() => document.getElementById('signatureTypePreview').style.fontFamily);
  check('14) Limited style switching works (3 styles)', font2 !== preview.font);
  await page.evaluate(() => document.querySelectorAll('.smart-sig-style-btn')[0].click());
  await page.evaluate(() => document.querySelector('#sigStageType .smart-sig-insert').click());
  await sleep(250);
  check('15) Typed signature inserted into the document',
    await page.evaluate(() => window.__smartSignature.count() === 2));

  // ============================================================
  // Image
  // ============================================================
  await pickMethod(page, 'image');
  const accept = await page.evaluate(() => {
    const i = document.getElementById('smartSignatureImageInput');
    return i ? i.getAttribute('accept') : null;
  });
  check('16) Image method uses a file input accepting images only', accept === 'image/*', String(accept));
  const input = await page.$('#smartSignatureImageInput');
  await input.uploadFile(pngPath);
  await sleep(500);
  const imgPrev = await page.evaluate(() => {
    const p = document.getElementById('signatureImagePreview');
    return { visible: !p.hidden && !!p.src, png: p.src.startsWith('data:image/') };
  });
  check('17) Chosen image appears in the preview', imgPrev.visible && imgPrev.png, JSON.stringify(imgPrev));
  await page.evaluate(() => document.querySelector('#sigStageImage .smart-sig-insert').click());
  await sleep(250);
  check('18) Image signature inserted into the document',
    await page.evaluate(() => window.__smartSignature.count() === 3));

  // ============================================================
  // Isolation — existing content untouched
  // ============================================================
  await page.evaluate(() => {
    window.__smartBlank.insertElement('text');
    window.__smartBlank.insertElement('table');
    window.__smartBlank.insertElement('divider');
  });
  await sleep(200);
  // Insert one more signature via the draw flow.
  await pickMethod(page, 'draw'); await drawStroke(page);
  await page.evaluate(() => document.querySelector('#sigStageDraw .smart-sig-insert').click());
  await sleep(250);
  const iso = await page.evaluate(() => ({
    text: !!document.querySelector('#smartDocumentContent [data-smart-element="text"]'),
    table: !!document.querySelector('#smartDocumentContent [data-smart-element="table"]'),
    divider: !!document.querySelector('#smartDocumentContent [data-smart-element="divider"]'),
    sigs: document.querySelectorAll('#smartDocumentContent .smart-doc-signature').length
  }));
  check('19) Multiple signatures insert without conflict', iso.sigs === 4, 'sigs=' + iso.sigs);
  check('20) Existing text/table/divider remain intact',
    iso.text && iso.table && iso.divider, JSON.stringify(iso));

  // PART 14 image coexists with signatures.
  const imgInput2 = await page.$('#smartAddImageInput');
  await imgInput2.uploadFile(pngPath); await sleep(400);
  const iso2 = await page.evaluate(() => ({
    img: !!document.querySelector('#smartDocumentContent .smart-doc-image-wrap'),
    sigs: document.querySelectorAll('#smartDocumentContent .smart-doc-signature').length
  }));
  check('21) PART 14 image system untouched by signatures',
    iso2.img && iso2.sigs === 4, JSON.stringify(iso2));

  // Selection of a signature works; Escape deselects.
  await page.evaluate(() => document.querySelector('#smartDocumentContent .smart-doc-signature').click());
  await sleep(100);
  const sel1 = await page.evaluate(() => window.__smartSignature.selected());
  await page.keyboard.press('Escape');
  await sleep(120);
  const sel2 = await page.evaluate(() => window.__smartSignature.selected());
  check('22) Signature selectable + Escape deselects', sel1 && !sel2);

  // PART 16 design preset still applies with signatures in the doc.
  await page.evaluate(() => window.__smartPageDesign.apply('simple'));
  const designOk = await page.evaluate(() =>
    !!document.querySelector('#smartBlankCanvasHolder .smart-blank-canvas.smart-page-design-simple'));
  check('23) PART 16 page design still applies with signatures', designOk);

  check('24) No JS errors so far', errs.length === 0, errs.join(' | ').slice(0, 200));
  check('25) No alert() used', await page.evaluate(() => window.__dialogs.alert === 0));

  // ============================================================
  // Safety: Back reset / reopen cleanliness / Cancel / outside click
  // ============================================================
  await pickMethod(page, 'type');
  await page.type('#signatureNameInput', 'stale');
  await page.evaluate(() => { document.getElementById('smartBlankBack').click(); });
  await sleep(300);
  await openBlank(page, 'en');
  const stale = await page.evaluate(() => ({
    menu: window.__smartSignature.isOpen(),
    panel: window.__smartSignature.isPanelOpen(),
    nameVal: (document.getElementById('signatureNameInput') || {}).value || ''
  }));
  check('26) Reopening the editor leaves no stale signature UI/state',
    !stale.menu && !stale.panel && stale.nameVal === '', JSON.stringify(stale));

  // Cancel button closes without inserting.
  await pickMethod(page, 'draw');
  await page.evaluate(() => document.querySelector('#sigStageDraw .smart-sig-cancel').click());
  await sleep(150);
  check('27) Cancel closes the tool without inserting',
    await page.evaluate(() => !window.__smartSignature.isPanelOpen()));

  // Outside pointerdown closes the menu.
  await clickSigBtn(page); await sleep(150);
  await page.mouse.click(30, 500); await sleep(200);
  check('28) Outside click closes the signature menu',
    await page.evaluate(() => !window.__smartSignature.isOpen()));
  check('29) History/Notes features not opened by the signature flow',
    await page.evaluate(() => !document.querySelector('.notes-view:not([hidden]), .history-view:not([hidden])')));

  await setLang(page, 'ar');
  check('30) Arabic UI is RTL for the whole document', await page.evaluate(() =>
    document.documentElement.getAttribute('dir') === 'rtl'));
  await page.close();
}

// ============================================================
// RTL / LTR across all 7 locales
// ============================================================
{
  const { page } = await newPage({ width: 1280, height: 800 });
  const locales = ['en', 'fr', 'es', 'tr', 'ru', 'de'];
  const expectedLabel = { en: 'Signature', fr: 'Signature', es: 'Firma', tr: 'İmza', ru: 'Подпись', de: 'Unterschrift' };
  let allOk = true; const details = [];
  for (const loc of locales) {
    await openBlank(page, loc);
    await clickSigBtn(page); await sleep(180);
    const v = await page.evaluate(() => {
      const label = document.querySelector('[data-tool="signature"] span[data-i18n]').textContent.trim();
      return {
        dir: document.documentElement.getAttribute('dir'),
        label,
        items: Array.from(document.querySelectorAll('#smartSignatureMenu .smart-sig-item span[data-i18n]')).map((b) => b.textContent.trim())
      };
    });
    const exp = expectedLabel[loc];
    const cond = {
      dirOk: v.dir !== 'rtl',
      labelOk: v.label === exp,
      lenOk: v.items.length === 3,
      nonEmpty: v.items.every((s) => s.length > 0)
    };
    const okL = cond.dirOk && cond.labelOk && cond.lenOk && cond.nonEmpty;
    if (!okL) details.push(loc + ':' + JSON.stringify({ ...cond, v }));
    allOk = allOk && okL;
    await page.evaluate(() => window.__smartSignature.reset());
  }
  check('31) LTR locales (en/fr/es/tr/ru/de) with localized labels', allOk, details.join(' ; '));

  // Arabic — full RTL + Arabic labels, no English leakage.
  await openBlank(page, 'ar');
  await clickSigBtn(page); await sleep(180);
  const ar = await page.evaluate(() => {
    const view = document.getElementById('smartBlankView');
    const r = document.getElementById('smartSignatureMenu').getBoundingClientRect();
    const vr = view.getBoundingClientRect();
    return {
      dir: document.documentElement.getAttribute('dir'),
      viewDir: view.getAttribute('dir'),
      label: document.querySelector('[data-tool="signature"] span[data-i18n]').textContent.trim(),
      items: Array.from(document.querySelectorAll('#smartSignatureMenu .smart-sig-item span[data-i18n]')).map((b) => b.textContent.trim()),
      inView: r.left >= vr.left - 1 && r.right <= vr.right + 1
    };
  });
  check('32) Arabic RTL with localized signature labels (no English leakage)',
    ar.dir === 'rtl' && ar.viewDir === 'rtl' && ar.label === 'توقيع' &&
    ar.items[0] === 'رسم' && ar.items[1] === 'كتابة' && ar.items[2] === 'صورة' && ar.inView,
    JSON.stringify(ar));
  check('33) No horizontal overflow in RTL', await noHOverflow(page));
  await page.close();
}

// ============================================================
// Responsive: 1280 / 768 / 390 / 360
// ============================================================
{
  let respOk = true; const det = [];
  for (const w of [1280, 768, 390, 360]) {
    const { page, errs } = await newPage({ width: w, height: 820 });
    await openBlank(page, 'en');
    await pickMethod(page, 'draw');
    const st = await page.evaluate(() => {
      const c = document.getElementById('signatureCanvas');
      const panel = document.getElementById('smartSignaturePanel');
      const pr = panel.getBoundingClientRect();
      const vr = document.getElementById('smartBlankView').getBoundingClientRect();
      return {
        canvasW: c.offsetWidth,
        inView: pr.left >= vr.left - 1 && pr.right <= vr.right + 1,
        touchAction: getComputedStyle(c).touchAction
      };
    });
    await drawStroke(page);
    const drew = await canvasInk(page) > 0;
    const okW = st.canvasW > 100 && st.canvasW <= w - 40 && st.inView && drew &&
      st.touchAction === 'none' && await noHOverflow(page) && errs.length === 0;
    if (!okW) det.push(`${w}:${JSON.stringify(st)},drew=${drew}`);
    respOk = respOk && okW;
    await page.close();
  }
  check('34) Responsive 1280/768/390/360 — usable draw, clamped UI, zero overflow', respOk, det.join(' ; '));
}

await browser.close();
server.close();
try { fs.unlinkSync(OUT); } catch (e) {}
results.forEach((r) => {
  const line = `${r.ok ? 'PASS' : 'FAIL'}  ${r.name}`;
  console.log(line); fs.appendFileSync(OUT, line + '\n');
});
const failed = results.filter((r) => !r.ok);
const summary = `\n========================================\nPART 17: ${results.length - failed.length}/${results.length} checks passed`;
console.log(summary); fs.appendFileSync(OUT, summary + '\n');
if (failed.length) {
  const f = 'FAILED:\n' + failed.map((x) => '  - ' + x.name + (x.detail ? '  -> ' + x.detail : '')).join('\n');
  console.log(f); fs.appendFileSync(OUT, f + '\n');
}
process.exit(failed.length ? 1 : 0);
