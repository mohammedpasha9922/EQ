// PART 7 — SMART DOCUMENTS TEMPLATES (categories + template items)
// Behavioral test in a real Chrome browser via Puppeteer.
// Run:  node tests/part7_smart_templates.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8518;
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

async function setLang(page, locale) {
  await page.evaluate((l) => {
    const s = document.getElementById('topBarLanguageSelect');
    if (s) { s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); }
  }, locale);
  await sleep(400);
}

async function clickSmartDocs(page) {
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click());
  await sleep(400);
}

// Click the "Templates / القوالب" card.
async function clickTemplates(page) {
  await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-templates"]').click());
  await sleep(400);
}

async function openTemplates(page, locale) {
  await openDrawer(page);
  if (locale) await setLang(page, locale);
  await clickSmartDocs(page);
  await clickTemplates(page);
}

const templatesState = (page) => page.evaluate(() => window.__smartTemplates.getState());

const viewInfo = (page) => page.evaluate(() => {
  const tv = document.getElementById('smartTemplatesView');
  return {
    homeShown: document.querySelector('.smart-docs-home')?.style.display !== 'none',
    templatesVisible: tv ? tv.classList.contains('templates-visible') : false,
    templatesDisplay: tv ? getComputedStyle(tv).display : null,
    modalShow: document.getElementById('smartDocsModal').classList.contains('show'),
    dir: document.documentElement.dir,
    langAttr: document.body.getAttribute('data-language'),
    step: (window.__smartDocsWorkflow && window.__smartDocsWorkflow.getStep()) ?? null
  };
});

const overflowInfo = (page) => page.evaluate(() => {
  const doc = document.documentElement;
  const tv = document.getElementById('smartTemplatesView');
  return {
    docOverflow: doc.scrollWidth - window.innerWidth,
    viewOverflow: tv ? (tv.scrollWidth - tv.clientWidth) : 0,
    innerW: window.innerWidth
  };
});

const allItems = (page) => page.evaluate(() =>
  Array.from(document.querySelectorAll('.smart-template-item')).map((el) => ({
    id: el.getAttribute('data-template-id'),
    group: el.getAttribute('data-template-group'),
    name: el.querySelector('.smart-template-item-name')?.textContent.trim() || '',
    selected: el.classList.contains('is-selected')
  }))
);

const GROUP_EXP = {
  ar: { business: 'الأعمال', personal: 'الشخصية', custom: 'مخصصة' },
  en: { business: 'Business', personal: 'Personal', custom: 'Custom' }
};

// Unique template ids expected in V1 (business + personal + custom).
const EXPECTED_IDS = [
  'invoice', 'quote', 'payment-agreement', 'service-contract', 'simple-agreement',
  'payment-receipt', 'rental-agreement', 'my-templates'
];

const TEMPLATE_NAME_EXP = {
  ar: {
    invoice: 'فاتورة', quote: 'عرض سعر', 'payment-agreement': 'اتفاقية دفع',
    'service-contract': 'عقد خدمات', 'simple-agreement': 'اتفاقية بسيطة',
    'payment-receipt': 'إيصال دفع', 'rental-agreement': 'اتفاقية إيجار',
    'my-templates': 'قوالبي'
  },
  en: {
    invoice: 'Invoice', quote: 'Quote', 'payment-agreement': 'Payment Agreement',
    'service-contract': 'Service Contract', 'simple-agreement': 'Simple Agreement',
    'payment-receipt': 'Payment Receipt', 'rental-agreement': 'Rental Agreement',
    'my-templates': 'My Templates'
  }
};

try {
  // ================= 1) Open Smart Documents -> Templates card -> Templates section =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openTemplates(page, 'en');
    const v = await viewInfo(page);
    const s = await templatesState(page);
    check('Templates: section becomes visible', v.templatesVisible === true, 'visible=' + v.templatesVisible);
    check('Templates: home page is hidden', v.homeShown === false, 'homeShown=' + v.homeShown);
    check('Templates: Smart Docs modal stays open', v.modalShow === true, 'modalShow=' + v.modalShow);
    check('Templates: display is flex', v.templatesDisplay === 'flex', 'display=' + v.templatesDisplay);
    check('Templates: workflow step stays at 1', v.step === 1, 'step=' + v.step);
    check('Templates: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 2) Three sections appear (Business / Personal / Custom) =================
  {
    const { page } = await newPage({ width: 1280, height: 800 });
    await openTemplates(page, 'en');
    const groups = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.smart-template-group-title')).map((el) => el.textContent.trim())
    );
    check('Templates: 3 category headings', groups.length === 3, 'groups=' + JSON.stringify(groups));
    check('Templates: Business heading', groups.includes(GROUP_EXP.en.business), groups.join('|'));
    check('Templates: Personal heading', groups.includes(GROUP_EXP.en.personal), groups.join('|'));
    check('Templates: Custom heading', groups.includes(GROUP_EXP.en.custom), groups.join('|'));
    await page.close();
  }

  // ================= 3) Required templates only in V1 (counts) =================
  {
    const { page } = await newPage({ width: 1280, height: 800 });
    await openTemplates(page, 'en');
    const s = await templatesState(page);
    check('Templates: business group has 5 items', s.groups.business === 5, 'business=' + s.groups.business);
    check('Templates: personal group has 3 items', s.groups.personal === 3, 'personal=' + s.groups.personal);
    check('Templates: custom group has 1 item', s.groups.custom === 1, 'custom=' + s.groups.custom);
    check('Templates: total = 9 (V1 only)', s.total === 9, 'total=' + s.total);
    await page.close();
  }

  // ================= 4) No extra templates beyond the V1 set =================
  {
    const { page } = await newPage({ width: 1280, height: 800 });
    await openTemplates(page, 'en');
    const items = await allItems(page);
    const ids = Array.from(new Set(items.map((i) => i.id))).sort();
    const expected = [...EXPECTED_IDS].sort();
    check('Templates: id set matches V1 exactly', JSON.stringify(ids) === JSON.stringify(expected), ids.join(','));
    // Each expected id appears with a localized (non-empty) name.
    const allNamed = items.every((i) => i.name.trim().length > 0);
    check('Templates: every template has a localized name', allNamed);
    await page.close();
  }

  // ================= 5) All templates are selectable =================
  {
    const { page } = await newPage({ width: 1280, height: 800 });
    await openTemplates(page, 'en');
    const count = (await templatesState(page)).total;
    let ok = true, detail = '';
    for (let i = 0; i < count; i++) {
      const sel = await page.evaluate((idx) => {
        const el = document.querySelectorAll('.smart-template-item')[idx];
        el.click();
        return {
          id: el.getAttribute('data-template-id'),
          selected: el.classList.contains('is-selected')
        };
      }, i);
      const st = await templatesState(page);
      if (!sel.selected || !st.selected || st.selected.id !== sel.id) { ok = false; detail = `idx=${i} id=${sel.id}`; break; }
    }
    check('Templates: every template is clickable & selectable', ok, detail);
    const st2 = await templatesState(page);
    check('Templates: selection recorded in state', !!st2.selected, JSON.stringify(st2.selected));
    await page.close();
  }

  // ================= 6) Selecting a template opens NO feature outside Smart Documents =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openTemplates(page, 'en');
    await page.evaluate(() => document.querySelector('.smart-template-item[data-template-id="invoice"]').click());
    await sleep(250);
    const out = await page.evaluate(() => ({
      templatesVisible: document.getElementById('smartTemplatesView').classList.contains('templates-visible'),
      scanVisible: document.getElementById('smartScanView')?.classList.contains('scan-visible'),
      importVisible: document.getElementById('smartImportView')?.classList.contains('import-visible'),
      editorVisible: document.getElementById('smartEditorView')?.classList.contains('editor-visible'),
      blankVisible: document.getElementById('smartBlankView')?.classList.contains('blank-visible'),
      historyOpen: document.getElementById('historyPanel')?.classList.contains('open'),
      notesOpen: document.getElementById('notesManagerModal')?.classList.contains('show'),
      modalShow: document.getElementById('smartDocsModal').classList.contains('show'),
      display: document.getElementById('primaryDisplay')?.textContent || ''
    }));
    check('Templates: stays on templates view', out.templatesVisible === true);
    check('Templates: does NOT open scan', out.scanVisible !== true);
    check('Templates: does NOT open import', out.importVisible !== true);
    check('Templates: does NOT open editor', out.editorVisible !== true);
    check('Templates: does NOT open blank doc', out.blankVisible !== true);
    check('Templates: does NOT open History', out.historyOpen !== true);
    check('Templates: does NOT open Notes', out.notesOpen !== true);
    check('Templates: Smart Docs modal still open (no extra window)', out.modalShow === true);
    check('Templates: calculator display untouched', out.display === '' || out.display.length <= 2, 'display=' + out.display);
    check('Templates: no JS errors on selection', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 7) Back returns to Smart Documents home =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openTemplates(page, 'en');
    await page.evaluate(() => document.getElementById('smartTemplatesBack').click());
    await sleep(250);
    const v = await viewInfo(page);
    const s = await templatesState(page);
    check('Back: Smart Docs home shown again', v.homeShown === true, 'homeShown=' + v.homeShown);
    check('Back: templates view hidden', v.templatesVisible === false, 'visible=' + v.templatesVisible);
    check('Back: Smart Docs modal stays open (calculator not opened)', v.modalShow === true, 'modalShow=' + v.modalShow);
    check('Back: workflow step resets to 1', v.step === 1, 'step=' + v.step);
    check('Back: selection cleared', s.selected === null, JSON.stringify(s.selected));
    check('Back: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 8) RTL Arabic =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openTemplates(page, 'ar');
    const v = await viewInfo(page);
    const groups = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.smart-template-group-title')).map((el) => el.textContent.trim())
    );
    const items = await allItems(page);
    check('RTL: document direction is rtl', v.dir === 'rtl', 'dir=' + v.dir);
    check('RTL: body language marker = ar', v.langAttr === 'ar', 'lang=' + v.langAttr);
    check('RTL: Business heading is Arabic', groups.includes(GROUP_EXP.ar.business), groups.join('|'));
    check('RTL: Personal heading is Arabic', groups.includes(GROUP_EXP.ar.personal), groups.join('|'));
    check('RTL: Custom heading is Arabic', groups.includes(GROUP_EXP.ar.custom), groups.join('|'));
    let namesOk = true, detail = '';
    for (const i of items) {
      if (i.name !== TEMPLATE_NAME_EXP.ar[i.id]) { namesOk = false; detail = `${i.id}->${i.name}`; break; }
    }
    check('RTL: template names are Arabic', namesOk, detail);
    check('RTL: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 9) LTR English =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openTemplates(page, 'en');
    const v = await viewInfo(page);
    const groups = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.smart-template-group-title')).map((el) => el.textContent.trim())
    );
    const items = await allItems(page);
    check('LTR: document direction is ltr', v.dir === 'ltr', 'dir=' + v.dir);
    check('LTR: Business/Personal/Custom in English', groups.includes('Business') && groups.includes('Personal') && groups.includes('Custom'), groups.join('|'));
    let namesOk = true, detail = '';
    for (const i of items) {
      if (i.name !== TEMPLATE_NAME_EXP.en[i.id]) { namesOk = false; detail = `${i.id}->${i.name}`; break; }
    }
    check('LTR: template names are English', namesOk, detail);
    check('LTR: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 10) Responsive: Desktop =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openTemplates(page, 'en');
    const o = await overflowInfo(page);
    const v = await viewInfo(page);
    check('Desktop: no horizontal overflow', o.docOverflow <= 2 && o.viewOverflow <= 2, 'overflow=' + o.docOverflow + '/' + o.viewOverflow);
    check('Desktop: templates visible', v.templatesVisible === true);
    check('Desktop: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 11) Responsive: Tablet =================
  {
    const { page, errs } = await newPage({ width: 768, height: 1024 });
    await openTemplates(page, 'en');
    const o = await overflowInfo(page);
    const v = await viewInfo(page);
    check('Tablet: no horizontal overflow', o.docOverflow <= 2 && o.viewOverflow <= 2, 'overflow=' + o.docOverflow + '/' + o.viewOverflow);
    check('Tablet: templates visible', v.templatesVisible === true);
    check('Tablet: 3 groups present', (await templatesState(page)).total === 9);
    check('Tablet: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 12) Responsive: Mobile 390 =================
  {
    const { page, errs } = await newPage({ width: 390, height: 844 });
    await openTemplates(page, 'en');
    const o = await overflowInfo(page);
    const v = await viewInfo(page);
    check('Mobile 390: no horizontal overflow', o.docOverflow <= 2 && o.viewOverflow <= 2, 'overflow=' + o.docOverflow + '/' + o.viewOverflow);
    check('Mobile 390: templates visible', v.templatesVisible === true);
    check('Mobile 390: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 13) Responsive: Mobile 360 =================
  {
    const { page, errs } = await newPage({ width: 360, height: 740 });
    await openTemplates(page, 'en');
    const o = await overflowInfo(page);
    const v = await viewInfo(page);
    check('Mobile 360: no horizontal overflow', o.docOverflow <= 2 && o.viewOverflow <= 2, 'overflow=' + o.docOverflow + '/' + o.viewOverflow);
    check('Mobile 360: templates visible', v.templatesVisible === true);
    check('Mobile 360: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 14) Reopening Smart Documents lands on home (no stale template state) =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openTemplates(page, 'en');
    await page.evaluate(() => document.querySelector('.smart-template-item[data-template-id="quote"]').click());
    await page.evaluate(() => document.getElementById('closeSmartDocs').click());
    await sleep(300);
    await openDrawer(page);
    await clickSmartDocs(page);
    const v = await viewInfo(page);
    const s = await templatesState(page);
    check('Reopen: home page is shown (no stale template state)', v.homeShown === true, 'homeShown=' + v.homeShown);
    check('Reopen: templates view hidden', v.templatesVisible === false);
    check('Reopen: selection cleared', s.selected === null, JSON.stringify(s.selected));
    check('Reopen: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 15) Regression: Calculator still works =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await page.evaluate(() => {
      const b = document.querySelector('.keypad-btn[data-value="7"]');
      if (b) b.click();
    });
    const display = await page.evaluate(() => document.getElementById('primaryDisplay').textContent);
    check('Regression: Calculator still works (pressed 7)', display.includes('7'), 'display=' + display);
    check('Regression: no JS errors (calculator)', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 16) Regression: History still works =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-history"]').click());
    await sleep(400);
    const histOpen = await page.evaluate(() => document.getElementById('historyPanel').classList.contains('open'));
    check('Regression: History still opens', histOpen);
    check('Regression: no JS errors (history)', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ================= 17) Regression: Notes still works =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openDrawer(page);
    await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
    await sleep(400);
    const notesOpen = await page.evaluate(() => document.getElementById('notesManagerModal').classList.contains('show'));
    check('Regression: Notes manager still opens', notesOpen);
    check('Regression: no JS errors (notes)', errs.length === 0, errs.join(' | '));
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



