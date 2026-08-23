// PART 18 — SMART DOCUMENTS: Signature protection (حماية التوقيع)
// Behavioral test in real Chrome via Puppeteer. EQ Signature Status (session-only):
// baseline captured on insert; UI-only changes never invalidate; substantive
// changes invalidate while the old signature stays visible; Re-sign reuses PART 17
// and rebuilds a baseline; isolation (Back/reopen/Escape); Calculator/History/Notes
// unaffected; RTL/LTR in the 7 locales; responsive 1280/768/390/360 zero overflow;
// no alert()/confirm()/prompt(); no JS errors; PART 17 still works. NOT a legal sig.
// Run:  node tests/part18_smart_signature_protection.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8262;
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
setTimeout(() => process.exit(124), 900000);

const results = [];
const OUT = path.join(ROOT, '__p18_result.txt');
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

const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR4nGP8z8DwnwEPYMInOWwUAACaVAEbTM10zwAAAABJRU5ErkJggg==';
const pngPath = path.join(os.tmpdir(), 'part18_image.png');
fs.writeFileSync(pngPath, Buffer.from(PNG_B64, 'base64'));

async function newPage(viewport) {
  const page = await browser.newPage();
  if (viewport) await page.setViewport(viewport);
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await page.evaluateOnNewDocument(() => {
    window.__dialogs = { alert: 0, confirm: 0, prompt: 0 };
    window.alert = () => { window.__dialogs.alert++; };
    window.confirm = () => { window.__dialogs.confirm++; return true; };
    window.prompt = () => { window.__dialogs.prompt++; return ''; };
  });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(600);
  return { page, errs };
}
const dialogs = (page) => page.evaluate(() => window.__dialogs);
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
const noHOverflow = (page) => page.evaluate(() =>
  document.documentElement.scrollWidth <= window.innerWidth + 1);
// Sign via the existing PART 17 draw flow (real pointer ink -> Insert).
async function signDraw(page) {
  await pickMethod(page, 'draw');
  await drawStroke(page);
  await page.evaluate(() => document.querySelector('#sigStageDraw .smart-sig-insert').click());
  await sleep(300);
}
const protState = (page) => page.evaluate(() => ({
  status: window.__smartSignatureProtection.status(),
  baseline: window.__smartSignatureProtection.baseline(),
  text: window.__smartSignatureProtection.statusText(),
  inv: window.__smartSignatureProtection.invalidated(),
  cnt: window.__smartSignatureProtection.signedCount(),
  resign: window.__smartSignatureProtection.resignShown(),
  fp: window.__smartSignatureProtection.fingerprint()
}));

// ============================================================
// A) Signature baseline
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');
  check('1) Smart Documents editor opens', await page.evaluate(() => window.__smartBlank.getState().editorVisible));
  let s0 = await protState(page);
  check('2) Unsigned doc: status none, no signature yet',
    s0.status === 'none' && s0.cnt === 0, JSON.stringify(s0));
  await page.evaluate(() => window.__smartBlank.insertElement('text'));
  await sleep(250);
  await signDraw(page);
  let a = await protState(page);
  check('3) After inserting a signature the status becomes signed', a.status === 'signed', JSON.stringify(a));
  check('4) Signed status label is shown (localized)',
    a.text.indexOf('Signed') !== -1 && a.resign === false, 'text=' + a.text);
  check('5) A content baseline was created',
    typeof a.baseline === 'string' && a.baseline.length > 0 && a.fp === a.baseline, 'bl=' + a.baseline);
  check('6) Signature exists inside the document', a.cnt >= 1);
  await page.evaluate(() => document.querySelector('.smart-doc-signature').click());
  await sleep(700);
  let s = await protState(page);
  check('7) Selecting the signature does NOT invalidate', s.status === 'signed' && s.inv === 0, JSON.stringify(s));
  check('8) No horizontal overflow', await noHOverflow(page));
  check('9) No JS errors so far', errs.length === 0, errs.join(' | ').slice(0, 200));
  await page.close();
}

// ============================================================
// B) Non-substantive UI changes must never invalidate
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');
  await page.evaluate(() => window.__smartBlank.insertElement('text'));
  await sleep(300);
  await signDraw(page);
  const before = await protState(page);
  // Open / interact with the toolbar without inserting content.
  await page.evaluate(() => document.querySelector('[data-toolbar="blank-doc"] button[data-tool="more"]').click());
  await sleep(150);
  // Open / close the Add menu.
  await page.evaluate(() => document.querySelector('[data-toolbar="blank-doc"] button[data-tool="add"]').click());
  await sleep(250);
  await page.keyboard.press('Escape'); await sleep(150);
  // Select an element (focus a text block toggles active classes).
  await page.evaluate(() => document.querySelector('.smart-doc-text-block').focus());
  await sleep(700);
  // Open and close the Signature UI.
  await clickSigBtn(page); await sleep(200);
  const opened = await page.evaluate(() => window.__smartSignature.isOpen() || window.__smartSignature.isPanelOpen());
  await page.evaluate(() => window.__smartSignature.reset()); await sleep(250);
  const closed = await page.evaluate(() => !window.__smartSignature.isOpen() && !window.__smartSignature.isPanelOpen());
  await sleep(700);
  const after = await protState(page);
  check('10) Opening/interacting with the toolbar does not invalidate', after.status === 'signed', JSON.stringify(after));
  check('11) Opening the Add menu does not invalidate', after.status === 'signed');
  check('12) Selecting an element does not invalidate', after.status === 'signed');
  check('13) Opening/closing the Signature UI does not invalidate',
    after.status === 'signed' && opened && closed, 'opened=' + opened + ' closed=' + closed);
  check('14) Baseline unchanged after UI-only activity',
    after.baseline !== null && after.baseline === before.baseline && after.fp === before.fp,
    'bl=' + after.baseline + ' fp=' + after.fp);
  check('15) No JS errors during UI-only activity', errs.length === 0, errs.join(' | ').slice(0, 160));
  await page.close();
}

// ============================================================
// C) Substantive changes invalidate (keep the old signature)
// ============================================================
{
  // Modify text -> status modified, message shown, Re-sign appears, old sig invalid yet visible.
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');
  await page.evaluate(() => window.__smartBlank.insertElement('text'));
  await sleep(250);
  await signDraw(page);
  await page.evaluate(() => { const b = document.querySelector('.smart-doc-text-block'); if (b) b.textContent = 'edited text'; });
  await sleep(650);
  let st = await protState(page);
  check('16) Editing text after signing invalidates', st.status === 'modified', JSON.stringify(st));
  check('17) Modified message is shown + Re-sign button appears',
    st.text.indexOf('was changed after signing') !== -1 && st.resign === true, 'text=' + st.text);
  check('18) Previous signature stays visible but is invalid inside EQ',
    st.cnt >= 1 && st.inv >= 1, 'cnt=' + st.cnt + ' inv=' + st.inv);
  check('19) No JS errors after invalidation', errs.length === 0, errs.join(' | ').slice(0, 160));
  await page.close();
}

async function assertSub(name, seedFn, mutateFn) {
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');
  if (seedFn) await seedFn(page);
  await signDraw(page);
  await sleep(650);
  const pre = await protState(page);
  await mutateFn(page);
  await sleep(800);
  const after = await protState(page);
  const overflowing = await noHOverflow(page);
  const ok = pre.status === 'signed' && after.status === 'modified' &&
    after.inv >= 1 && after.cnt >= 1 && overflowing && errs.length === 0;
  check(name, ok, JSON.stringify({ pre: pre.status, after: after.status, inv: after.inv, cnt: after.cnt, overflow: overflowing, errs: errs.length }));
  await page.close();
}
const seedText = async (page) => { await page.evaluate(() => window.__smartBlank.insertElement('text')); await sleep(250); };
const seedTextTable = async (page) => {
  await page.evaluate(() => window.__smartBlank.insertElement('text')); await sleep(200);
  await page.evaluate(() => window.__smartBlank.insertElement('table')); await sleep(300);
};
const seedImage = async (page) => { const inp = await page.$('#smartAddImageInput'); if (inp) await inp.uploadFile(pngPath); await sleep(500); };
const seedLogo = async (page) => { const inp = await page.$('#smartAddLogoInput'); if (inp) await inp.uploadFile(pngPath); await sleep(500); };

await assertSub('20) Adding text after signing invalidates', seedText, async (page) => {
  await page.evaluate(() => window.__smartBlank.insertElement('text')); await sleep(300);
});
await assertSub('21) Deleting text after signing invalidates', seedText, async (page) => {
  await page.evaluate(() => { const b = document.querySelector('.smart-doc-text-block'); if (b) b.remove(); });
});
await assertSub('22) Editing a table cell after signing invalidates', seedTextTable, async (page) => {
  await page.evaluate(() => { const td = document.querySelector('.smart-doc-table td'); if (td) td.textContent = 'edited'; });
});
await assertSub('23) Adding/removing a table row or column invalidates', seedTextTable, async (page) => {
  await page.evaluate(() => { const t = document.querySelector('.smart-doc-table'); if (t && t.rows.length > 1) t.deleteRow(t.rows.length - 1); });
});
await assertSub('24) Adding an image after signing invalidates', seedText, async (page) => {
  const inp = await page.$('#smartAddImageInput'); if (inp) await inp.uploadFile(pngPath); await sleep(600);
});
await assertSub('25) Deleting an image after signing invalidates', seedImage, async (page) => {
  await page.evaluate(() => { const w = document.querySelector('.smart-doc-image-wrap'); if (w) w.remove(); });
});
await assertSub('26) Changing an image after signing invalidates', seedImage, async (page) => {
  await page.evaluate(() => {
    const img = document.querySelector('.smart-doc-image-wrap img.smart-doc-image');
    if (img) img.setAttribute('src', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==');
  });
});
await assertSub('27) Adding a logo after signing invalidates', seedText, async (page) => {
  const inp = await page.$('#smartAddLogoInput'); if (inp) await inp.uploadFile(pngPath); await sleep(600);
});
await assertSub('28) Moving a logo after signing invalidates', seedLogo, async (page) => {
  await page.evaluate(() => { const b = document.querySelector('#smartLogoBar button[data-logo-pos="center"]'); if (b) b.click(); });
  await sleep(300);
});
await assertSub('29) Changing the page design after signing invalidates', seedText, async (page) => {
  await page.evaluate(() => window.__smartPageDesign.apply('classic')); await sleep(300);
});
// ============================================================
// D) Re-sign: reuses PART 17 and rebuilds a fresh baseline
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');
  await page.evaluate(() => window.__smartBlank.insertElement('text'));
  await sleep(250);
  await signDraw(page);
  const bl1 = (await protState(page)).baseline;
  await page.evaluate(() => { const b = document.querySelector('.smart-doc-text-block'); if (b) b.textContent = 'edit'; });
  await sleep(800);
  const m = await protState(page);
  check('30) Re-sign button is only shown when the previous signature is invalid',
    m.status === 'modified' && m.resign === true, JSON.stringify(m));
  check('31) Previous signature still present before re-sign (not deleted)',
    m.cnt >= 1 && m.inv >= 1, 'cnt=' + m.cnt + ' inv=' + m.inv);
  await page.evaluate(() => document.getElementById('smartSigResignBtn').click());
  await sleep(300);
  const resigOpened = await page.evaluate(() => window.__smartSignature.isOpen());
  check('32) Re-sign opens the existing PART 17 signature tool', resigOpened === true, 'open=' + resigOpened);
  await signDraw(page);
  const r = await protState(page);
  check('33) Inserting a new signature returns status to signed',
    r.status === 'signed' && r.inv === 0, JSON.stringify(r));
  check('34) A NEW baseline is rebuilt after re-sign',
    r.baseline !== null && r.baseline !== bl1, 'old=' + bl1 + ' new=' + r.baseline);
  await page.evaluate(() => { const b = document.querySelector('.smart-doc-text-block'); if (b) b.textContent = 'edit again'; });
  await sleep(800);
  const e2 = await protState(page);
  check('35) Editing after re-sign invalidates the new signature',
    e2.status === 'modified' && e2.inv >= 1, JSON.stringify(e2));
  check('36) No JS errors through the re-sign flow', errs.length === 0, errs.join(' | ').slice(0, 160));
  await page.close();
}

// ============================================================
// E) Isolation: Back / reopen / Escape / other features
// ============================================================
{
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    await page.evaluate(() => window.__smartBlank.insertElement('text')); await sleep(250);
    await signDraw(page);
    let s = await protState(page);
    check('37) Signed status on the first document', s.status === 'signed');
    // Back must clear PART 18 session state.
    await page.evaluate(() => document.getElementById('smartBlankBack').click());
    await sleep(350);
    await openBlank(page, 'en');
    s = await protState(page);
    check('38) Back cleans PART 18 (reopen leaves no stale state)',
      s.status === 'none' && s.baseline === null && s.cnt === 0, JSON.stringify(s));
    check('39) No JS errors after Back/reopen', errs.length === 0, errs.join(' | ').slice(0, 120));
    await page.close();
  }
  // More than one sequential document must keep isolated state.
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');
  await page.evaluate(() => window.__smartBlank.insertElement('text')); await sleep(250);
  await signDraw(page);
  const d1 = await protState(page);
  await page.evaluate(() => document.getElementById('smartBlankBack').click()); await sleep(300);
  await openBlank(page, 'en');
  await signDraw(page);
  const d2 = await protState(page);
  check('40) Multiple sequential docs keep isolated signed state', d1.status === 'signed' && d2.status === 'signed');
  // Escape must not corrupt PART 18 state.
  await page.keyboard.press('Escape'); await sleep(300);
  const esc = await protState(page);
  check('41) Escape does not corrupt PART 18 state', esc.status === 'signed', JSON.stringify(esc));
  // Leave Smart Documents and confirm Calculator works again.
  await page.evaluate(() => document.getElementById('smartBlankBack').click()); await sleep(350);
  const calcOk = await page.evaluate(() => ({
    editorHidden: !window.__smartBlank.getState().editorVisible,
    card: !!document.querySelector('main.calculator-card')
  }));
  check('42) Calculator still works after leaving Smart Documents',
    calcOk.editorHidden && calcOk.card, JSON.stringify(calcOk));
  // History and Notes still open and work.
  await openDrawer(page);
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-history"]').click());
  await sleep(350);
  const histOk = await page.evaluate(() => !!document.querySelector('#historyView, #historyPanel, [data-history-open="true"]'));
  check('43) History still works', histOk);
  await page.evaluate(() => { const c = document.getElementById('drawerCloseButton'); if (c) c.click(); });
  await sleep(200);
  await openDrawer(page);
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
  await sleep(350);
  const notesOk = await page.evaluate(() => !!(document.getElementById('notesManagerModal') && document.getElementById('notesManagerModal').classList.contains('show')));
  check('44) Notes still work', notesOk);
  check('45) No JS errors in isolation', errs.length === 0, errs.join(' | ').slice(0, 120));
  await page.close();
}
// ============================================================
// F) RTL / LTR across the 7 locales (no hardcoded English)
// ============================================================
{
  const expected = {
    en: 'Signed', ar: 'تم التوقيع', fr: 'Signé', es: 'Firmado',
    tr: 'İmzalı', ru: 'Подписано', de: 'Unterschrieben'
  };
  let allLocOk = true; const details = [];
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  for (const loc of ['en', 'fr', 'es', 'tr', 'ru', 'de']) {
    await openBlank(page, loc);
    await page.evaluate(() => window.__smartBlank.insertElement('text')); await sleep(250);
    await signDraw(page);
        const st = await protState(page);
    const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'));
    const ok = st.status === 'signed' && st.text.indexOf(expected[loc]) !== -1 &&
      dir !== 'rtl' && st.text.length > 0;
    if (!ok) details.push(loc + ':' + JSON.stringify({ st: st.text, dir }));
    allLocOk = allLocOk && ok;
    await page.evaluate(() => window.__smartSignatureProtection.reset());
  }
  check('46) LTR locales (en/fr/es/tr/ru/de) show localized status + LTR',
    allLocOk, details.join(' ; '));

  await openBlank(page, 'ar');
  await page.evaluate(() => window.__smartBlank.insertElement('text')); await sleep(250);
  await signDraw(page);
  const arSigned = await protState(page);
  await page.evaluate(() => { const b = document.querySelector('.smart-doc-text-block'); if (b) b.textContent = 'تعديل'; });
  await sleep(800);
  const arMod = await protState(page);
  const viewDir = await page.evaluate(() => document.getElementById('smartBlankView').getAttribute('dir'));
  check('47) Arabic is RTL (document)',
    (await page.evaluate(() => document.documentElement.getAttribute('dir'))) === 'rtl');
  check('48) Arabic signed status shows Arabic (no English leakage)',
    arMod.status === 'modified' && arMod.text.indexOf('تم تعديل المستند بعد التوقيع') !== -1 &&
    arMod.text.indexOf('Signed') === -1 && arMod.text.indexOf('was changed') === -1,
    'text=' + arMod.text);
  check('49) Arabic Re-sign button is localized',
    await page.evaluate(() => document.getElementById('smartSigResignBtn').textContent.includes('إعادة التوقيع')));
  check('50) Arabic status direction correct', viewDir === 'rtl');
  check('51) No horizontal overflow in Arabic', await noHOverflow(page));
  check('52) No JS errors across locales', errs.length === 0, errs.join(' | ').slice(0, 120));
  await page.close();
}

// ============================================================
// G) Responsive: 1280 / 768 / 390 / 360 (zero horizontal overflow)
// ============================================================
{
  let respOk = true; const details = [];
  for (const w of [1280, 768, 390, 360]) {
    const { page, errs } = await newPage({ width: w, height: 820 });
    await openBlank(page, 'en');
    await page.evaluate(() => window.__smartBlank.insertElement('text')); await sleep(250);
    await signDraw(page);
    const st = await protState(page);
    const overflow = await noHOverflow(page);
    const statusVisible = await page.evaluate(() => {
      const s = document.getElementById('smartSigStatus');
      return !!(s && !s.hidden && s.getBoundingClientRect().width > 0);
    });
    const ok = st.status === 'signed' && overflow && statusVisible && errs.length === 0;
    if (!ok) details.push(`${w}:${JSON.stringify({ status: st.status, overflow, statusVisible, errs: errs.length })}`);
    respOk = respOk && ok;
    await page.close();
  }
  check('53) Responsive 1280/768/390/360 — status visible, zero overflow, no errors', respOk, details.join(' ; '));
}

// ============================================================
// H) Safety + PART 17 regression
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');
  await page.evaluate(() => window.__smartBlank.insertElement('text')); await sleep(250);
  await signDraw(page);
  await page.evaluate(() => { const b = document.querySelector('.smart-doc-text-block'); if (b) b.textContent = 'x'; });
  await sleep(800);
  const d = await dialogs(page);
  const leak = await page.evaluate(() => !!(document.querySelector('.notes-view:not([hidden]), .history-view:not([hidden]), .note-editor-fullscreen, #notesManagerModal.show')));
  const pt17isOpen = await page.evaluate(() => window.__smartSignature.isOpen());
  check('54) No alert() / confirm() / prompt() across the flow',
    d.alert === 0 && d.confirm === 0 && d.prompt === 0, JSON.stringify(d));
  check('55) Zero JS errors at the end', errs.length === 0, errs.join(' | ').slice(0, 200));
  check('56) No other EQ feature (Notes/History/Editor) opened by PART 18', !leak);
  await page.close();
}

await browser.close();
server.close();
try { fs.unlinkSync(OUT); } catch (e) {}
results.forEach((r) => {
  const line = `${r.ok ? 'PASS' : 'FAIL'}  ${r.name}`;
  console.log(line); fs.appendFileSync(OUT, line + '\n');
});
const failed = results.filter((r) => !r.ok);
const summary = `\n========================================\nPART 18: ${results.length - failed.length}/${results.length} checks passed`;
console.log(summary); fs.appendFileSync(OUT, summary + '\n');
if (failed.length) {
  const f = 'FAILED:\n' + failed.map((x) => '  - ' + x.name + (x.detail ? '  -> ' + x.detail : '')).join('\n');
  console.log(f); fs.appendFileSync(OUT, f + '\n');
}
process.exit(failed.length ? 1 : 0);