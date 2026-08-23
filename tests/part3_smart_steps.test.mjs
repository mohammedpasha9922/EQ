// PART 3 — SMART DOCUMENTS WORKFLOW STEPS — behavioral test in a real Chrome browser.
// Run:  node tests/part3_smart_steps.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8301;
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

// Read the current workflow state from the real DOM + app state.
async function stepsState(page) {
  return page.evaluate(() => ({
    stateStep: (window.__smartDocsWorkflow && window.__smartDocsWorkflow.getStep()) ?? null,
    trackStep: document.querySelector('[data-widget="smart-steps"] .smart-steps-track')?.getAttribute('data-step') || null,
    steps: Array.from(document.querySelectorAll('[data-widget="smart-steps"] .smart-step')).map((el) => ({
      n: el.getAttribute('data-step'),
      active: el.classList.contains('is-active'),
      current: el.classList.contains('is-current'),
      label: el.querySelector('.smart-step-label')?.textContent.trim() || ''
    }))
  }));
}
const setStep = (n) => `window.__smartDocsWorkflow.setStep(${n})`;

const EXP_NAMES = {
  ar: ['البدء', 'التحرير', 'المراجعة', 'التصدير'],
  en: ['Start', 'Edit', 'Review', 'Export'],
  fr: ['Démarrer', 'Modifier', 'Révision', 'Exportation'],
  es: ['Inicio', 'Edición', 'Revisión', 'Exportación'],
  tr: ['Başlangıç', 'Düzenleme', 'İnceleme', 'Dışa Aktarma'],
  ru: ['Начало', 'Редактирование', 'Проверка', 'Экспорт'],
  de: ['Start', 'Bearbeiten', 'Überprüfung', 'Export']
};

const activePattern = (s) => s.steps.map((x) => (x.active ? '●' : '○')).join(' ');
try {
  // ================= 1) STARTS AT STEP 1 =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await clickSmartDocs(page);
    const s = await stepsState(page);
    check('Open starts at state smartDocsStep = 1', s.stateStep === 1, 'state=' + s.stateStep);
    check('Track data-step = 1', s.trackStep === '1', 'track=' + s.trackStep);
    check('Indicator starts  ● ○ ○ ○', activePattern(s) === '● ○ ○ ○', activePattern(s));
    check('Step 1 is current & active', s.steps[0].active && s.steps[0].current);
    check('Future steps (2-4) inactive', !s.steps[1].active && !s.steps[2].active && !s.steps[3].active);
    check('No JS errors (step 1)', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 2) STEP ADVANCE 2 => ● ● ○ ○ =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await clickSmartDocs(page);
    const ret = await page.evaluate(() => window.__smartDocsWorkflow.setStep(2));
    const s = await stepsState(page);
    check('window.__smartDocsWorkflow.setStep(2) returns 2', ret === 2, 'ret=' + ret);
    check('Indicator at step 2  ● ● ○ ○', activePattern(s) === '● ● ○ ○', activePattern(s));
    check('State updated to 2', s.stateStep === 2 && s.trackStep === '2');
    check('Step 2 is current', s.steps[1].current === true);
    check('No JS errors (step 2)', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 3) STEP ADVANCE 3 => ● ● ● ○ =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await clickSmartDocs(page);
    await page.evaluate(() => window.__smartDocsWorkflow.setStep(3));
    const s = await stepsState(page);
    check('Indicator at step 3  ● ● ● ○', activePattern(s) === '● ● ● ○', activePattern(s));
    check('State updated to 3', s.stateStep === 3 && s.trackStep === '3');
    check('No JS errors (step 3)', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 4) STEP ADVANCE 4 => ● ● ● ● =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await clickSmartDocs(page);
    await page.evaluate(() => window.__smartDocsWorkflow.setStep(4));
    const s = await stepsState(page);
    check('Indicator at step 4  ● ● ● ●', activePattern(s) === '● ● ● ●', activePattern(s));
    check('State updated to 4', s.stateStep === 4 && s.trackStep === '4');
    check('Step 4 is current', s.steps[3].current === true);
    check('No JS errors (step 4)', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 5) OUT OF RANGE CLAMPS =================
  {
    const { page } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await clickSmartDocs(page);
    const low = await page.evaluate(() => window.__smartDocsWorkflow.setStep(0));
    const lowS = await stepsState(page);
    const hi = await page.evaluate(() => window.__smartDocsWorkflow.setStep(99));
    const hiS = await stepsState(page);
    check('Step clamped to min 1', low === 1 && lowS.stateStep === 1 && activePattern(lowS) === '● ○ ○ ○');
    check('Step clamped to max 4', hi === 4 && hiS.stateStep === 4 && activePattern(hiS) === '● ● ● ●');
    await page.close();
  }
// ================= 6) STEP NAMES + ALL LOCALES =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await clickSmartDocs(page);
    let allNamesOk = true;
    let detail = '';
    for (const [locale, names] of Object.entries(EXP_NAMES)) {
      await setLang(page, locale);
      const s = await stepsState(page);
      const got = s.steps.map((x) => x.label);
      const ok = names.every((name, i) => got[i] === name);
      if (!ok) allNamesOk = false;
      detail += `${locale}: ${got.join('/')} `;
    }
    check('Step names correct across 7 locales', allNamesOk, detail);
    check('No JS errors (i18n cycle)', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 7) ARABIC RTL =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await setLang(page, 'ar');
    await openDrawer(page);
    await clickSmartDocs(page);
    const rtl = await page.evaluate(() => document.documentElement.dir === 'rtl');
    check('Arabic sets dir=rtl', rtl);
    const labels = await stepsState(page);
    check('Arabic step names correct (RTL)', labels.steps[0].label === 'البدء' && labels.steps[3].label === 'التصدير',
      labels.steps.map((x) => x.label).join('/'));
    const ov = await page.evaluate(() => {
      const el = document.querySelector('[data-widget="smart-steps"]');
      return { doc: document.documentElement.scrollWidth - window.innerWidth, el: el.scrollWidth - el.clientWidth };
    });
    check('RTL: no horizontal overflow', ov.doc <= 2 && ov.el <= 2, JSON.stringify(ov));
    check('No JS errors (RTL)', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 8) ENGLISH LTR =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await setLang(page, 'en');
    await openDrawer(page);
    await clickSmartDocs(page);
    const ltr = await page.evaluate(() => document.documentElement.dir === 'ltr');
    check('English sets dir=ltr', ltr);
    const labels = await stepsState(page);
    check('English step names correct (LTR)', labels.steps[0].label === 'Start' && labels.steps[3].label === 'Export',
      labels.steps.map((x) => x.label).join('/'));
    check('No JS errors (LTR)', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 9) MOBILE — NO HORIZONTAL OVERFLOW =================
  {
    const { page, errs } = await newPage({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await setLang(page, 'ar');
    await openDrawer(page);
    await clickSmartDocs(page);
    const ov = await page.evaluate(() => {
      const el = document.querySelector('[data-widget="smart-steps"]');
      const track = document.querySelector('[data-widget="smart-steps"] .smart-steps-track');
      return {
        doc: document.documentElement.scrollWidth - window.innerWidth,
        el: (el ? el.scrollWidth - el.clientWidth : 99),
        track: (track ? track.scrollWidth - track.clientWidth : 99)
      };
    });
    check('Mobile: no document horizontal overflow (RTL)', ov.doc <= 2, 'doc=' + ov.doc);
    check('Mobile: stepper no horizontal overflow', ov.el <= 2 && ov.track <= 2, JSON.stringify(ov));
    await page.evaluate(() => window.__smartDocsWorkflow.setStep(2));
    const ov2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check('Mobile: step 2 (● ● ○ ○) no overflow', ov2 <= 2, 'doc=' + ov2);
    check('Mobile: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 10) BACK + REOPEN RESETS TO STEP 1 =================
  {
    const { page } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await clickSmartDocs(page);
    await page.evaluate(() => window.__smartDocsWorkflow.setStep(3));
    const before = (await stepsState(page)).stateStep;
    await page.evaluate(() => document.getElementById('closeSmartDocs').click());
    await sleep(250);
    await openDrawer(page);
    await clickSmartDocs(page);
    const after = await stepsState(page);
    check('Reopen after Back resets to Step 1', before === 3 && after.stateStep === 1 && after.trackStep === '1',
      'before=' + before + ' after=' + after.stateStep);
    check('Reopen indicator  ● ○ ○ ○', activePattern(after) === '● ○ ○ ○', activePattern(after));
    await page.close();
  }
// ================= 11) PART 1 REGRESSION =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    const btn = await page.evaluate(() => {
      const b = document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]');
      return b ? { text: b.textContent.trim(), hasIcon: b.textContent.includes('📄') } : null;
    });
    check('PART1: Drawer item exists', !!btn);
    check('PART1: Drawer item has emoji', !!(btn && btn.hasIcon));
    check('PART1: No JS errors on boot', errs.length === 0, errs.join(' | '));
    await openDrawer(page);
    await clickSmartDocs(page);
    const smartShown = await page.evaluate(() => document.getElementById('smartDocsModal').classList.contains('show'));
    check('PART1: Smart Docs opens', smartShown);
    await page.evaluate(() => document.getElementById('closeSmartDocs').click());
    await sleep(250);
    const closedBack = await page.evaluate(() => !document.getElementById('smartDocsModal').classList.contains('show'));
    check('PART1: Back button closes', closedBack);
    await page.close();
  }

  // ================= 12) PART 2 REGRESSION =================
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

  // ================= 13) CALCULATOR / HISTORY / NOTES =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await page.evaluate(() => {
      const b = document.querySelector('.keypad-btn[data-value="7"]');
      if (b) b.click();
    });
    const display = await page.evaluate(() => document.getElementById('primaryDisplay').textContent);
    check('Calculator still works (pressed 7)', display.includes('7'), 'display=' + display);

    await openDrawer(page);
    await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-history"]').click());
    await sleep(400);
    const histOpen = await page.evaluate(() => document.getElementById('historyPanel').classList.contains('open'));
    check('History still opens', histOpen);
    await page.evaluate(() => document.getElementById('historyBackButton')?.click());
    await sleep(250);

    await openDrawer(page);
    await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
    await sleep(400);
    const notesOpen = await page.evaluate(() => document.getElementById('notesManagerModal').classList.contains('show'));
    check('Notes manager still opens', notesOpen);
    check('No JS errors (Calculator/History/Notes)', errs.length === 0, errs.join(' | '));
    await page.close();
  }
} catch (err) {
  console.log('ERROR', err);
  results.push({ name: 'test harness', ok: false, detail: String(err && err.stack || err) });
} finally {
  await browser.close();
  server.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${failed.length === 0 ? 'ALL PASS' : failed.length + ' FAILED'}  (${results.length} checks)`);
process.exit(failed.length === 0 ? 0 : 1);