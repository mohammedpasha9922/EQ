// PART 1 — SMART DOCUMENTS ENTRY POINT — behavioral test in a real Chrome browser.
// Run:  node tests/part1_smart_docs.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8299;
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
setTimeout(() => process.exit(124), 120000); // hard watchdog

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

async function newPage() {
  const page = await browser.newPage();
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

try {
  // ---- 1) Button exists + no boot errors
  {
    const { page, errs } = await newPage();
    const btn = await page.evaluate(() => {
      const b = document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]');
      return b ? { text: b.textContent.trim(), hasIcon: b.textContent.includes('📄') } : null;
    });
    check('Drawer item open-smart-docs exists', !!btn, btn ? btn.text : 'missing');
    check('Drawer item label contains emoji', !!(btn && btn.hasIcon), '');
    check('No JS errors on boot', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ---- 2. label changes per language ----
  {
    const { page } = await newPage();
    const expectations = {
      ar: 'المستندات الذكية', en: 'Smart Documents', fr: 'Documents intelligents',
      es: 'Documentos inteligentes', tr: 'Akıllı Belgeler', ru: 'Умные документы'
    };
    let allOk = true;
    let detail = '';
    for (const [locale, frag] of Object.entries(expectations)) {
      await setLang(page, locale);
      const { label, htmlLang, drawerHist } = await page.evaluate(() => ({
        label: document.querySelector('.drawer-menu-item[data-action="open-smart-docs"] span[data-i18n="smartDocsTitle"]')?.textContent.trim(),
        htmlLang: document.documentElement.lang,
        drawerHist: document.querySelector('.drawer-menu-item[data-action="open-history"] span[data-i18n="drawerHistory"]')?.textContent.trim()
      }));
      const ok = label.includes('📄') && label.includes(frag) && htmlLang === locale;
      if (!ok) allOk = false;
      detail += `${locale}:html=${htmlLang}|hist=${drawerHist}|sd="${label}" `;
    }
    check('Smart Docs label translates across locales', allOk, detail);
    await page.close();
  }

// ---- 3. click opens ONLY the Smart Docs page ----
  {
    const { page, errs } = await newPage();
    await openDrawer(page);
    await clickSmartDocs(page);
    const smartShown = await page.evaluate(() => document.getElementById('smartDocsModal').classList.contains('show'));
    const othersOpen = await page.evaluate(() => {
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
    const drawerClosed = await page.evaluate(() => !document.getElementById('drawerOverlay').classList.contains('open'));
    check('Clicking Smart Docs opens its home page', smartShown);
    check('No other editor/tool opened', othersOpen.length === 0, othersOpen.join(','));
    check('Drawer closed after selecting item', drawerClosed);
    check('No JS errors during open', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ---- 4. close works (back button) ----
  {
    const { page } = await newPage();
    await openDrawer(page);
    await clickSmartDocs(page);
    await page.evaluate(() => document.getElementById('closeSmartDocs').click());
    await sleep(250);
    const afterBack = await page.evaluate(() => !document.getElementById('smartDocsModal').classList.contains('show'));
    check('Back button closes Smart Docs home', afterBack);
    await page.close();
  }

  // ---- 5. Calculator / History / Notes still work ----
  {
    const { page, errs } = await newPage();
    await page.evaluate(() => {
      const b = document.querySelector('.keypad-btn[data-value="7"]');
      if (b) b.click();
    });
    const display = await page.evaluate(() => document.getElementById('primaryDisplay').textContent);
    check('Calculator still functional (pressed 7)', display.includes('7'), 'display=' + display);

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
    check('No JS errors after Calculator/History/Notes', errs.length === 0, errs.join(' | '));
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