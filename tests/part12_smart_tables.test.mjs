// PART 12 — SMART DOCUMENTS: Table Tool (أداة الجدول ▦)
// Behavioral test in a real Chrome browser via Puppeteer.
// Covers: Rows × Columns creation, independent editable cells,
// add/delete row, add/delete column, per-cell alignment, safety,
// RTL/LTR (Arabic / English), and responsive 1280/768/390/360.
// Run:  node tests/part12_smart_tables.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8224;
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
// Open the Rows × Columns launcher via the ▦ toolbar button (behavioral).
async function openTableLauncher(page) {
  await page.evaluate(() =>
    document.querySelector('[data-toolbar="blank-doc"] button[data-tool="table"]').click());
  await sleep(250);
}
async function createTable(page, rows, cols) {
  await openTableLauncher(page);
  await page.evaluate(([r, c]) => {
    const ri = document.getElementById('smartTableRows');
    const ci = document.getElementById('smartTableCols');
    ri.value = String(r);
    ci.value = String(c);
    ri.dispatchEvent(new Event('input', { bubbles: true }));
    ci.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('[data-table-create="confirm"]').click();
  }, [rows, cols]);
  await sleep(300);
}
async function tableCmd(page, cmd) {
  await page.evaluate((c) =>
    document.querySelector(`#smartTableToolbar [data-tablecmd="${c}"]`).click(), cmd);
  await sleep(180);
}
async function tableAlign(page, align) {
  await page.evaluate((a) =>
    document.querySelector(`#smartTableToolbar [data-tablealign="${a}"]`).click(), align);
  await sleep(180);
}
// Type real text into a cell through the focused editing surface.
async function typeInCell(page, r, c, text) {
  await page.evaluate(([r2, c2]) => {
    const t = document.querySelector('.smart-doc-table[data-smart-element="table"]');
    const td = t.rows[r2].cells[c2];
    td.focus();
    const sel = window.getSelection(); const rg = document.createRange();
    rg.selectNodeContents(td); sel.removeAllRanges(); sel.addRange(rg);
    document.execCommand('delete');
  }, [r, c]);
  await page.keyboard.type(text);
  await sleep(60);
}
const st = (page) => page.evaluate(() => window.__smartTable.getState());
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

try {
// ===== Creation (1-7) =====
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    await openTableLauncher(page);
    const lap = await page.evaluate(() => ({
      open: document.getElementById('smartTableCreate').classList.contains('open'),
      hidden: document.getElementById('smartTableCreate').getAttribute('aria-hidden')
    }));
    check('1) ▦ toolbar button opens the Rows × Columns launcher', lap.open === true && lap.hidden === 'false', JSON.stringify(lap));
    const preview = await page.evaluate(() => document.getElementById('smartTableCreateSize').textContent.trim());
    check('2) Size preview shows default 4 × 4', preview === '4 × 4', preview);
    await page.evaluate(() => document.querySelector('[data-table-create="confirm"]').click());
    await sleep(300);
    const s = await st(page);
    check('3) Confirm creates a 4 × 4 table', s.rows === 4 && s.cols === 4, `rows=${s.rows} cols=${s.cols}`);
    check('4) Table lives inside #smartDocumentContent', s.inContent === true);
    check('5) Table tools (contextual toolbar) appear after creation', s.toolsVisible === true);
    check('6) Launcher closes after confirming', s.launcherOpen === false);
    const ov = await overflow(page);
    check('7) No page-level horizontal overflow on creation', ov <= 0, 'overflow=' + ov);
    check('Table creation: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ===== Independent editable cells (8-13) =====
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    await createTable(page, 4, 4);
    await typeInCell(page, 0, 0, 'Alpha');
    await typeInCell(page, 0, 1, 'Beta');
    await typeInCell(page, 1, 0, 'Gamma');
    await typeInCell(page, 2, 2, 'Delta');
    const c0 = await page.evaluate(() => window.__smartTable.cellText(0, 0));
    const c1 = await page.evaluate(() => window.__smartTable.cellText(0, 1));
    const c2 = await page.evaluate(() => window.__smartTable.cellText(1, 0));
    const c3 = await page.evaluate(() => window.__smartTable.cellText(2, 2));
    check('8) Cell [0][0] keeps its own text', c0 === 'Alpha', String(c0));
    check('9) Cell [0][1] keeps its own text', c1 === 'Beta', String(c1));
    check('10) Cell [1][0] keeps its own text', c2 === 'Gamma', String(c2));
    check('11) Cell [2][2] keeps its own text', c3 === 'Delta', String(c3));
    check('12) Cells are independent (no cross-talk)', c0 === 'Alpha' && c1 === 'Beta' && c2 === 'Gamma' && c3 === 'Delta');
    // Editing one cell must not disturb another.
    await typeInCell(page, 0, 0, 'Alpha2');
    const c0b = await page.evaluate(() => window.__smartTable.cellText(0, 0));
    const c1b = await page.evaluate(() => window.__smartTable.cellText(0, 1));
    check('13) Re-editing one cell leaves the others unchanged', c0b === 'Alpha2' && c1b === 'Beta');
    const ov = await overflow(page);
    check('Cells: no JS errors + no overflow', errs.length === 0 && ov <= 0, errs.join(' | '));
    await page.close();
  }
// ===== Rows (14-20) =====
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    await createTable(page, 4, 4);
    await typeInCell(page, 0, 0, 'keep0');
    await typeInCell(page, 1, 1, 'keep1');
    const before = await st(page);
    await tableCmd(page, 'add-row');
    const afterAdd = await st(page);
    check('14) Add row increases row count by 1', afterAdd.rows === before.rows + 1, `rows ${before.rows}->${afterAdd.rows}`);
    check('15) Add row keeps every existing column count', afterAdd.cols === before.cols, `cols=${afterAdd.cols}`);
    const kept0 = await page.evaluate(() => window.__smartTable.cellText(0, 0));
    const kept1 = await page.evaluate(() => window.__smartTable.cellText(1, 1));
    check('16) Data preserved after Add row', kept0 === 'keep0' && kept1 === 'keep1', `${kept0} / ${kept1}`);
    const newCellEditable = await page.evaluate(() => {
      const t = document.querySelector('.smart-doc-table[data-smart-element="table"]');
      return t.rows[t.rows.length - 1].cells[0].isContentEditable;
    });
    check('17) New row cells are editable', newCellEditable === true);
    await tableCmd(page, 'del-row');
    const afterDel = await st(page);
    check('18) Delete row decreases row count by 1', afterDel.rows === afterAdd.rows - 1, `rows ${afterAdd.rows}->${afterDel.rows}`);
    const keptAfter = await page.evaluate(() => window.__smartTable.cellText(0, 0));
    check('19) Data preserved after Delete row', keptAfter === 'keep0', String(keptAfter));
    // Prevent deleting the last row: shrink to 1 then try again.
    await page.evaluate(() => {
      const t = document.querySelector('.smart-doc-table[data-smart-element="table"]');
      t.rows[0].cells[0].focus();
    });
    for (let i = 0; i < 10; i++) {
      const s = await st(page);
      if (s.rows <= 1) break;
      await tableCmd(page, 'del-row');
    }
    const atOne = await st(page);
    await tableCmd(page, 'del-row');
    const afterGuard = await st(page);
    check('20) Cannot delete the last row', atOne.rows === 1 && afterGuard.rows === 1, `rows=${afterGuard.rows}`);
    check('Rows: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ===== Columns (21-26) =====
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    await createTable(page, 4, 4);
    await typeInCell(page, 0, 0, 'A0');
    await typeInCell(page, 1, 1, 'B1');
    const before = await st(page);
    await tableCmd(page, 'add-col');
    const afterAdd = await st(page);
    check('21) Add column increases column count by 1', afterAdd.cols === before.cols + 1, `cols ${before.cols}->${afterAdd.cols}`);
    check('22) Add column keeps all rows intact', afterAdd.rows === before.rows, `rows=${afterAdd.rows}`);
    const kept0c = await page.evaluate(() => window.__smartTable.cellText(0, 0));
    const kept1c = await page.evaluate(() => window.__smartTable.cellText(1, 1));
    check('23) Data preserved after Add column', kept0c === 'A0' && kept1c === 'B1', `${kept0c} / ${kept1c}`);
    await tableCmd(page, 'del-col');
    const afterDel = await st(page);
    check('24) Delete column decreases column count by 1', afterDel.cols === afterAdd.cols - 1, `cols ${afterAdd.cols}->${afterDel.cols}`);
    const keptAfterc = await page.evaluate(() => window.__smartTable.cellText(0, 0));
    check('25) Data preserved after Delete column', keptAfterc === 'A0', String(keptAfterc));
    // Prevent deleting the last column.
    await page.evaluate(() => {
      const t = document.querySelector('.smart-doc-table[data-smart-element="table"]');
      t.rows[0].cells[0].focus();
    });
    for (let i = 0; i < 10; i++) {
      const s = await st(page);
      if (s.cols <= 1) break;
      await tableCmd(page, 'del-col');
    }
    const atOneCol = await st(page);
    await tableCmd(page, 'del-col');
    const afterColGuard = await st(page);
    check('26) Cannot delete the last column', atOneCol.cols === 1 && afterColGuard.cols === 1, `cols=${afterColGuard.cols}`);
    check('Columns: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }
// ===== Per-cell alignment (27-31) =====
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    await createTable(page, 4, 4);
    await typeInCell(page, 0, 0, 'Cell A');
    await typeInCell(page, 1, 0, 'Cell B');
    await page.evaluate(() => window.__smartTable.focusCell(0, 0));
    await tableAlign(page, 'left');
    const left = await page.evaluate(() => window.__smartTable.cellStyle(0, 0));
    check('27) Alignment applies left to the selected cell', left.textAlign === 'left', left.textAlign);
    await tableAlign(page, 'center');
    const center = await page.evaluate(() => window.__smartTable.cellStyle(0, 0));
    check('28) Alignment applies center to the selected cell', center.textAlign === 'center', center.textAlign);
    await tableAlign(page, 'right');
    const right = await page.evaluate(() => window.__smartTable.cellStyle(0, 0));
    check('29) Alignment applies right to the selected cell', right.textAlign === 'right', right.textAlign);
    const neighbor = await page.evaluate(() => window.__smartTable.cellStyle(1, 0));
    check('30) Alignment is per-cell (neighbor cell untouched)', neighbor.textAlign !== 'right', neighbor.textAlign);
    const docAligned = await page.evaluate(() => getComputedStyle(document.getElementById('smartDocumentContent')).textAlign);
    check('31) Alignment does not change whole-document alignment', ['start', 'left', 'right'].includes(docAligned), 'scoped=' + docAligned);
    check('Alignment: no JS errors', errs.length === 0, errs.join(' | '));
    await page.close();
  }

  // ===== Safety (32-37) =====
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    await createTable(page, 4, 4);
    await page.evaluate(() => window.__smartTable.focusCell(0, 0));
    await tableAlign(page, 'center');
    await tableCmd(page, 'add-row');
    await tableCmd(page, 'add-col');
    const alerts = await page.evaluate(() => window.__dialogs.alert);
    check('32) No alert() used by the table flow', alerts === 0, 'alert=' + alerts);
    check('33) No JS errors', errs.length === 0, errs.join(' | '));
    const modals = await page.evaluate(() => document.querySelectorAll('.modal.show').length);
    check('34) No superfluous modal opened', modals === 0, 'modals=' + modals);
    const ov = await overflow(page);
    check('35) No page-level horizontal overflow', ov <= 0, 'overflow=' + ov);
    const toolsRect = await page.evaluate(() => {
      const r = document.getElementById('smartTableToolbar').getBoundingClientRect();
      return { left: Math.round(r.left), right: Math.round(r.right), vw: window.innerWidth };
    });
    check('36) Table tools stay inside the viewport', toolsRect.left >= -1 && toolsRect.right <= toolsRect.vw + 1, JSON.stringify(toolsRect));
    const toolList = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-toolbar="blank-doc"] button.smart-tool-btn')).map((b) => b.getAttribute('data-tool')));
    check('37) Main toolbar unchanged (▦ is still the entry point)',
      toolList.join(',') === 'undo,redo,add,text,table,signature,image,logo,divider,border,page,page-number,page-settings,more',
      toolList.join(','));
    await page.close();
  }
// ===== RTL / LTR (38-49) =====
  {
    const cases = [
      { locale: 'ar', wantDir: 'rtl', labels: ['الصفوف', 'الأعمدة', 'إنشاء الجدول'], cmdLabels: ['إضافة صف', 'حذف صف', 'إضافة عمود', 'حذف عمود', 'محاذاة لليسار', 'وسط', 'محاذاة لليمين'] },
      { locale: 'en', wantDir: 'ltr', labels: ['Rows', 'Columns', 'Create table'], cmdLabels: ['Add row', 'Delete row', 'Add column', 'Delete column', 'Align left', 'Center', 'Align right'] }
    ];
    let n = 38;
    for (const c of cases) {
      const { page, errs } = await newPage({ width: 1280, height: 800 });
      await openBlank(page, c.locale);
      await openTableLauncher(page);
      const ui = await page.evaluate(() => {
        const panel = document.getElementById('smartTableCreate');
        return {
          dirAttr: panel.getAttribute('dir'),
          dirComputed: getComputedStyle(panel).direction,
          labels: Array.from(panel.querySelectorAll('[data-i18n]')).map((el) => el.textContent.trim())
        };
      });
      check(`${n}) ${c.locale}: table launcher is ${c.wantDir} (dir attr + computed)`,
        ui.dirAttr === c.wantDir && ui.dirComputed === c.wantDir, JSON.stringify(ui));
      check(`${n}.b) ${c.locale}: launcher labels fully localized (no English leakage)`,
        ui.labels.every((lb) => c.labels.includes(lb)), ui.labels.join(', '));
      await page.evaluate(() => {
        const ri = document.getElementById('smartTableRows');
        const ci = document.getElementById('smartTableCols');
        ri.value = '3'; ci.value = '3';
        document.querySelector('[data-table-create="confirm"]').click();
      });
      await sleep(300);
      const tbl = await page.evaluate(() => {
        const tl = document.querySelector('.smart-doc-table[data-smart-element="table"]');
        const td = tl.rows[0].cells[0];
        const tools = document.getElementById('smartTableToolbar');
        return {
          tableDir: tl.getAttribute('dir'),
          cellDir: td.getAttribute('dir'),
          cellDirection: getComputedStyle(td).direction,
          defaultAlign: getComputedStyle(td).textAlign,
          toolsDir: tools.getAttribute('dir'),
          toolLabels: Array.from(tools.querySelectorAll('button')).map((b) => b.textContent.trim())
        };
      });
      check(`${n}.c) ${c.locale}: table + cells follow ${c.wantDir}`,
        tbl.tableDir === c.wantDir && tbl.cellDir === c.wantDir && tbl.cellDirection === c.wantDir, JSON.stringify(tbl));
      check(`${n}.d) ${c.locale}: cell default alignment respects direction`,
        tbl.defaultAlign === (c.wantDir === 'rtl' ? 'right' : 'left'), tbl.defaultAlign);
      check(`${n}.e) ${c.locale}: table tools is ${c.wantDir}`, tbl.toolsDir === c.wantDir, tbl.toolsDir);
      check(`${n}.f) ${c.locale}: toolbar button labels localized`, tbl.toolLabels.every((lb) => c.cmdLabels.includes(lb)), tbl.toolLabels.join(', '));
      if (errs.length) check(`${n}.g) ${c.locale}: no JS errors`, false, errs.join(' | '));
      await page.close();
      n++;
    }
  }

  // ===== Responsive (50-57) =====
  {
    const vps = [
      { name: 'Desktop 1280', width: 1280, height: 800 },
      { name: 'Tablet 768', width: 768, height: 1024 },
      { name: 'iPhone 390', width: 390, height: 844 },
      { name: 'Android 360', width: 360, height: 800 }
    ];
    let n = 50;
    for (const vp of vps) {
      const { page, errs } = await newPage({ width: vp.width, height: vp.height });
      await openBlank(page, 'en');
      await createTable(page, 8, 6);
      const s = await st(page);
      check(`${n}) ${vp.name}: 8×6 table created`, s.rows === 8 && s.cols === 6, `rows=${s.rows} cols=${s.cols}`);
      const ov = await overflow(page);
      check(`${n}.b) ${vp.name}: no page-level horizontal overflow`, ov <= 0, 'overflow=' + ov);
      const wrap = await page.evaluate(() => {
        const w = document.querySelector('.smart-table-scroll');
        return w ? (w.scrollWidth - w.clientWidth) : -1;
      });
      check(`${n}.c) ${vp.name}: wide table handled inside Smart Documents (internal scroll)`, wrap >= 0, 'scrollable=' + wrap);
      const toolsRect = await page.evaluate(() => {
        const r = document.getElementById('smartTableToolbar').getBoundingClientRect();
        return { open: document.getElementById('smartTableToolbar').classList.contains('open'), left: Math.round(r.left), right: Math.round(r.right), vw: window.innerWidth };
      });
      check(`${n}.d) ${vp.name}: table tools visible and inside viewport`, toolsRect.open === true && toolsRect.left >= -1 && toolsRect.right <= toolsRect.vw + 1, JSON.stringify(toolsRect));
      if (errs.length) check(`${n}.e) ${vp.name}: no JS errors`, false, errs.join(' | '));
      await page.close();
      n++;
    }
  }

} finally {
  await browser.close();
  server.close();
}

const fails = results.filter((r) => !r.ok);
console.log(`\nPART 12: ${results.length - fails.length}/${results.length} checks passed`);
if (fails.length) {
  console.log('FAILED:');
  fails.forEach((f) => console.log(' - ' + f.name));
  process.exitCode = 1;
} else {
  console.log('FINAL: ALL PASS');
}