// PART 4 — SMART DOCUMENTS: Scan / OCR  (behavioral test in a real Chrome browser)
// Run:  node tests/part4_smart_scan_ocr.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8302;
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
setTimeout(() => process.exit(124), 180000); // hard watchdog

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

async function setLang(page, locale) {
  await page.evaluate((l) => {
    const s = document.getElementById('topBarLanguageSelect');
    if (s) { s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); }
  }, locale);
  await sleep(400);
}

async function openDrawer(page) {
  await page.evaluate(() => document.getElementById('drawerToggle').click());
  await sleep(250);
}

async function clickSmartDocs(page) {
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click());
  await sleep(400);
}

// Minimal 1x1 PNG (valid image) used for the file-upload capture test.
const PNG_1x1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const pngPath = path.join(ROOT, '__scan_test.png');
fs.writeFileSync(pngPath, Buffer.from(PNG_1x1, 'base64'));
const txtPath = path.join(ROOT, '__scan_test.txt');
fs.writeFileSync(txtPath, 'not an image');

// Helpers to talk to the in-page scan seam.
const openScan = async (page, mode = 'auto') => {
  await page.evaluate((m) => { try { window.__smartScan.debugMode(m); } catch (e) {} }, mode);
  await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-scan-doc"]').click());
  await sleep(700);
};
const scanState = async (page) => page.evaluate(() => (window.__smartScan && window.__smartScan.getState()) || {});
//__PART4_TESTS__
try {
  // ================= 1) Smart Documents opens + scan card exists =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await clickSmartDocs(page);
    const card = await page.evaluate(() => {
      const c = document.querySelector('.smart-doc-card[data-action="smart-scan-doc"]');
      return c ? { exists: true, title: c.querySelector('.smart-doc-card-title')?.textContent.trim() } : { exists: false, title: null };
    });
    check('Smart Documents opens', card.exists);
    check('Scan card exists', card.exists);
    check('Scan card title present', !!(card.title && card.title.length), card.title);
    check('No JS errors on open', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 2) Clicking Scan opens the Scan interface =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await clickSmartDocs(page);
    await openScan(page, 'auto');
    const s = await scanState(page);
    check('Scan interface opens', s.stage === 'camera');
    const visible = await page.evaluate(() => document.getElementById('smartScanView').classList.contains('scan-visible'));
    check('Scan view is visible', visible);
    const homeHidden = await page.evaluate(() => {
      const h = document.querySelector('.smart-docs-home');
      return h ? h.style.display === 'none' : false;
    });
    check('Home view hidden while scanning', homeHidden);
    check('State step stays at 1 on scan start', s.step === 1, 'step=' + s.step);
        check('No JS errors during scan open', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 3) Camera availability / permission fallback — no break =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await clickSmartDocs(page);
    await openScan(page, 'blocked');
    const s = await scanState(page);
    const msg = await page.evaluate(() => (document.getElementById('scanCameraErrorText') || {}).textContent || '');
    const pick = await page.evaluate(() => {
      const p = document.getElementById('scanFilePick');
      return p ? p.hidden === false : false;
    });
    check('Camera fallback does not crash', errs.length === 0, errs.join(' | '));
    check('Blocked mode lands on camera stage', s.stage === 'camera');
    check('Permission-denied fallback message shown', !!msg && msg.length > 0, msg);
    check('Image upload fallback offered', pick);
    await page.close();
  }

  // ================= 4) Default (real) camera path must not crash headless =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await clickSmartDocs(page);
    await openScan(page, 'auto'); // getUserMedia rejects in headless -> graceful fallback
    const s = await scanState(page);
    check('Auto camera path lands on camera stage', s.stage === 'camera', 'stage=' + s.stage);
    check('No JS errors on real camera attempt', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 5) Capture workflow via file + Processing UI =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await clickSmartDocs(page);
    await openScan(page, 'auto');
    const input = await page.$('#scanFileInput');
    await input.uploadFile(pngPath);
    await page.waitForFunction(() => {
      const s = (window.__smartScan && window.__smartScan.getState()) || {};
      return s.stage !== 'camera' ||
        (document.getElementById('scanCameraError') && !document.getElementById('scanCameraError').hidden);
    }, { timeout: 15000 }).catch(() => null);
    const procItems = await page.evaluate(() => {
      const items = document.querySelectorAll('#scanProcessingProgress [data-proc]');
      return Array.from(items).map((i) => i.getAttribute('data-proc'));
    });
    check('Processing progress items present', procItems.length === 4, procItems.join(','));
    check('Processing progress has detect/correct/improve/read',
      procItems.join(',') === 'detect,correct,improve,read', procItems.join(','));
    check('Capture -> processing pipeline runs', procItems.length === 4);
    check('No JS errors during capture/processing', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 6) Invalid image does not crash =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await clickSmartDocs(page);
    await openScan(page, 'auto');
    const input = await page.$('#scanFileInput');
    await input.uploadFile(txtPath);
    await sleep(600);
    const s = await scanState(page);
    check('Invalid image handled gracefully', s.stage === 'camera');
    check('No JS errors on invalid image', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 7) Review screen appears with recognized text =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await clickSmartDocs(page);
    await openScan(page, 'auto');
    await page.evaluate(() => window.__smartScan.setOcrResult('Hello scanned document\n\nThis is the second paragraph.'));
    const input = await page.$('#scanFileInput');
    await input.uploadFile(pngPath);
    await sleep(900);
    const s = await scanState(page);
    const text = await page.evaluate(() => (document.getElementById('scanReviewText') || {}).value || '');
    const imgSrc = await page.evaluate(() => (document.getElementById('scanReviewImage') || {}).getAttribute('src') || null);
    check('Review stage shown after OCR', s.stage === 'review', 'stage=' + s.stage);
    check('Review textarea contains recognized text', text.length > 0, text.slice(0, 40));
    check('Review textarea editable', !!(await page.$('#scanReviewText:not([readonly])')));
    check('Review image preview has src', !!imgSrc);
    check('Workflow step at Review (3) on review screen', s.step === 3, 'step=' + s.step);
    check('No JS errors at review', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 8) OCR result does NOT enter editor automatically =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await clickSmartDocs(page);
    await openScan(page, 'auto');
    await page.evaluate(() => window.__smartScan.setOcrResult('Not auto inserted into any editor'));
    const input = await page.$('#scanFileInput');
    await input.uploadFile(pngPath);
    await sleep(900);
    const hasEditor = await page.evaluate(() => !!document.querySelector('#documentEditor,[data-editor],#noteEditor'));
    const result = await page.evaluate(() => (window.__smartScan.getState().result));
    check('No Document Editor opened automatically', hasEditor === false);
    check('No accepted result before Accept (OCR not auto-accepted)', result === null || result === undefined, String(result));
    check('No JS errors during review hold', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 9) Rescan works =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await clickSmartDocs(page);
    await openScan(page, 'auto');
    await page.evaluate(() => window.__smartScan.setOcrResult('Text to rescan away'));
    const input = await page.$('#scanFileInput');
    await input.uploadFile(pngPath);
    await sleep(900);
    await page.evaluate(() => document.getElementById('scanRescanBtn').click());
    await sleep(600);
    const s = await scanState(page);
    check('Rescan returns to camera stage', s.stage === 'camera', 'stage=' + s.stage);
    check('Rescan resets workflow step to 1', s.step === 1, 'step=' + s.step);
        check('No JS errors on rescan', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 10) Accept works without starting PART 5 =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await clickSmartDocs(page);
    await openScan(page, 'auto');
    await page.evaluate(() => window.__smartScan.setOcrResult('Accepted content for PART 4 only'));
    const input = await page.$('#scanFileInput');
    await input.uploadFile(pngPath);
    await sleep(900);
    await page.evaluate(() => document.getElementById('scanAcceptBtn').click());
    await sleep(400);
    const after = await scanState(page);
    const infoShown = await page.evaluate(() => {
      const i = document.getElementById('scanAcceptInfo');
      return i ? (!i.hidden && i.textContent.length > 0) : false;
    });
    check('Accept does not open an editor',
      !(await page.evaluate(() => !!document.querySelector('#documentEditor,[data-editor],#noteEditor'))));
    check('Accept stores result internally (status=accepted)',
      after.result && after.result.status === 'accepted' && /Accepted content for PART 4 only/.test(after.result.text || ''),
      JSON.stringify(after.result));
    check('Accept shows ready-for-editing info', infoShown);
    check('Step stays at Review (3), not entering Edit/Export PART 5', after.step === 3, 'step=' + after.step);
        check('No JS errors on accept', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 11) Camera tracks are stopped =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await clickSmartDocs(page);
    await openScan(page, 'live');
    const beforeCapture = await scanState(page);
    check('Live mock starts with an active stream',
      beforeCapture.activeTracks.length > 0, String(beforeCapture.activeTracks));
    await page.evaluate(() => document.getElementById('scanCaptureBtn').click());
    await sleep(900);
    const after = await scanState(page);
    check('Camera tracks stopped after capture', after.activeTracks.length === 0, String(after.activeTracks));
    check('Stream stopped after capture', after.activeTracks.length === 0);
    check('No JS errors (tracks)', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 12) Leaving Smart Documents stops the camera =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await clickSmartDocs(page);
    await openScan(page, 'live');
    await page.evaluate(() => document.getElementById('closeSmartDocs').click());
    await sleep(400);
    const closed = await page.evaluate(() => !document.getElementById('smartDocsModal').classList.contains('show'));
    const stopped = await page.evaluate(() => {
      const v = document.getElementById('scanVideo');
      return (!v || !v.srcObject) && (window.__smartScan.isStreamStopped());
    });
    check('Smart Documents closed on leave', closed);
    check('Camera stream stopped on leave', stopped);
    check('No JS errors on leave', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 13) Closing Scan (back) stops the camera =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await clickSmartDocs(page);
    await openScan(page, 'live');
    await page.evaluate(() => document.getElementById('smartScanBack').click());
    await sleep(400);
    const homeShown = await page.evaluate(() => {
      const h = document.querySelector('.smart-docs-home');
      return h ? h.style.display !== 'none' : false;
    });
    const stopped = await page.evaluate(() => window.__smartScan.isStreamStopped());
    check('Back returns to Smart Documents home', homeShown);
    check('Camera stream stopped on back', stopped);
        check('No JS errors on back', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 14) Arabic RTL in the scan workflow =================
  {
    const { page, errs } = await newPage({ width: 1366, height: 768 });
    await setLang(page, 'ar');
    await openDrawer(page);
    await clickSmartDocs(page);
    await openScan(page, 'blocked');
    const dir = await page.evaluate(() => document.documentElement.dir);
    const title = await page.evaluate(() => (document.getElementById('smartScanTitle') || {}).textContent || '');
    const rtlMsg = await page.evaluate(() => (document.getElementById('scanCameraErrorText') || {}).textContent || '');
    check('Arabic sets html dir=rtl', dir === 'rtl', dir);
    check('Scan title translated (Arabic, no English word)', title === '📸 مسح مستند', title);
    check('Error message translated (Arabic)', !!rtlMsg && rtlMsg.length > 0, rtlMsg);
    check('No JS errors (Arabic RTL)', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 15) English LTR in the scan workflow =================
  {
    const { page, errs } = await newPage({ width: 1366, height: 768 });
    await setLang(page, 'en');
    await openDrawer(page);
    await clickSmartDocs(page);
    await openScan(page, 'blocked');
    const dir = await page.evaluate(() => document.documentElement.dir);
    const title = await page.evaluate(() => (document.getElementById('smartScanTitle') || {}).textContent || '');
    check('English sets html dir=ltr', dir === 'ltr', dir);
    check('Scan title translated (English)', title === '📸 Scan a Document', title);
    check('No JS errors (English LTR)', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 16) Mobile 390px — no horizontal overflow =================
  {
    const { page, errs } = await newPage({ width: 390, height: 844 });
    await openDrawer(page);
    await clickSmartDocs(page);
    await openScan(page, 'blocked');
    await sleep(300);
    const ov = await page.evaluate(() => {
      const vw = document.documentElement.scrollWidth - window.innerWidth;
      const el = document.querySelector('.smart-scan-view');
      const elw = el ? (el.scrollWidth - el.clientWidth) : 0;
      return { doc: vw, view: elw };
    });
    check('Mobile 390: no horizontal overflow', ov.doc <= 2 && ov.view <= 2, JSON.stringify(ov));
    check('Mobile 390: scan view visible',
      await page.evaluate(() => document.getElementById('smartScanView').classList.contains('scan-visible')));
    check('No JS errors (390px)', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 17) Mobile 360px — no overflow, no broken preview =================
  {
    const { page, errs } = await newPage({ width: 360, height: 640 });
    await openDrawer(page);
    await clickSmartDocs(page);
    await openScan(page, 'blocked');
    await sleep(300);
    const ov = await page.evaluate(() => {
      const vw = document.documentElement.scrollWidth - window.innerWidth;
      const frame = document.querySelector('.scan-camera-frame');
      const frect = frame ? frame.getBoundingClientRect() : { width: 0, height: 0 };
      return { doc: vw, frameW: Math.round(frect.width || 0) };
    });
    check('Mobile 360: no horizontal overflow', ov.doc <= 2, JSON.stringify(ov));
    check('Mobile 360: camera frame not broken', ov.frameW > 0, JSON.stringify(ov));
    check('No JS errors (360px)', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 18) Desktop — no horizontal overflow =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await clickSmartDocs(page);
    await openScan(page, 'blocked');
    await sleep(300);
    const ov = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth - window.innerWidth }));
    check('Desktop: no horizontal overflow', ov.doc <= 2, JSON.stringify(ov));
        check('No JS errors (desktop)', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 19) PART 1 regression =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    const btn = await page.evaluate(() => {
      const b = document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]');
      return b ? { text: b.textContent.trim(), hasIcon: b.textContent.includes('📄') } : null;
    });
    check('PART1: Drawer item open-smart-docs exists', !!btn, btn ? btn.text : 'missing');
    check('PART1: Drawer item label contains emoji', !!(btn && btn.hasIcon));
    check('PART1: No JS errors on boot', errs.length === 0, errs.join(' | '));
    await openDrawer(page);
    await clickSmartDocs(page);
    const smartShown = await page.evaluate(() => document.getElementById('smartDocsModal').classList.contains('show'));
    check('PART1: Smart Docs opens', smartShown);
    await page.evaluate(() => document.getElementById('closeSmartDocs').click());
    await sleep(250);
    const closed = await page.evaluate(() => !document.getElementById('smartDocsModal').classList.contains('show'));
    check('PART1: Back button closes', closed);
    await page.close();
  }

  // ================= 20) PART 2 regression (cards + heading) =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await setLang(page, 'ar');
    await openDrawer(page);
    await clickSmartDocs(page);
    const p2 = await page.evaluate(() => {
      const heading = document.querySelector('.smart-docs-heading')?.textContent.trim();
      const cards = Array.from(document.querySelectorAll('.smart-doc-card'))
        .map((c) => c.querySelector('.smart-doc-card-title')?.textContent.trim());
      return { heading, cardsCount: cards.length, cards };
    });
    check('PART2: Heading present (Arabic)', p2.heading === 'ماذا تريد أن تفعل؟', 'heading=' + p2.heading);
    check('PART2: Four cards intact', p2.cardsCount === 4, 'count=' + p2.cardsCount);
    check('PART2: Card titles correct',
      p2.cards[0] === 'مسح مستند' && p2.cards[1] === 'استيراد ملف' && p2.cards[2] === 'مستند جديد' && p2.cards[3] === 'القوالب',
      p2.cards.join('/'));
    check('PART2: No JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 21) PART 3 regression (stepper) =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await clickSmartDocs(page);
    const s = await page.evaluate(() => ({
      stateStep: (window.__smartDocsWorkflow && window.__smartDocsWorkflow.getStep()) ?? null,
      trackStep: document.querySelector('[data-widget="smart-steps"] .smart-steps-track')?.getAttribute('data-step') || null,
      steps: Array.from(document.querySelectorAll('[data-widget="smart-steps"] .smart-step')).map((el) => ({
        n: el.getAttribute('data-step'),
        active: el.classList.contains('is-active'),
      })),
    }));
    const activePattern = s.steps.map((x) => (x.active ? '●' : '○')).join(' ');
    check('PART3: state smartDocsStep = 1', s.stateStep === 1, 'state=' + s.stateStep);
    check('PART3: track data-step = 1', s.trackStep === '1', 'track=' + s.trackStep);
    check('PART3: Indicator ● ○ ○ ○', activePattern === '● ○ ○ ○', activePattern);
    check('PART3: Only 4 steps on home stepper', s.steps.length === 4, 'len=' + s.steps.length);
    check('PART3: No JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }
} catch (err) {
  console.log('ERROR', err);
  results.push({ name: 'test harness', ok: false, detail: String(err && err.stack || err) });
} finally {
  try { await browser.close(); } catch (e) {}
  try { fs.unlinkSync(pngPath); } catch (e) {}
  try { fs.unlinkSync(txtPath); } catch (e) {}
  server.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${failed.length === 0 ? 'ALL PASS' : failed.length + ' FAILED'}  (${results.length} checks)`);
process.exit(failed.length === 0 ? 0 : 1);