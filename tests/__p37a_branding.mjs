// PHASE 37A — EQ7 branding runtime verification (real Chrome via puppeteer-core).
// Follows the existing phase06 harness conventions (local http server, same Chrome).
// Run: node tests/__p37a_branding.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8377;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.txt': 'text/plain'
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
  } catch (e) { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 300000);

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
}
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(width, height, isMobile) {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await page.setViewport({ width, height, isMobile, hasTouch: isMobile });
  return { page, errs };
}
async function goto(page, lang) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  if (lang) {
    await page.evaluate((l) => { try { localStorage.setItem('eq-language', l); } catch (e) {} }, lang);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  }
  await sleep(900);
}
const brandInfo = () => {
  const hdr = Array.from(document.querySelectorAll('header .app-logo'));
  const drw = Array.from(document.querySelectorAll('.drawer-header .app-logo'));
  const spans = (el) => ({
    e: el.querySelectorAll('.logo-e').length,
    q: el.querySelectorAll('.logo-q').length,
    seven: el.querySelectorAll('.logo-7').length,
    text: el.textContent.trim()
  });
  return {
    hdrCount: hdr.length, hdr: hdr[0] ? spans(hdr[0]) : null,
    drwCount: drw.length, drw: drw[0] ? spans(drw[0]) : null,
    title: document.title,
    appName: document.querySelector('meta[name="application-name"]')?.content || '',
    desc: document.querySelector('meta[name="description"]')?.content || '',
    drawerAria: document.getElementById('drawer')?.getAttribute('aria-label') || '',
    toggleAria: document.getElementById('drawerToggle')?.getAttribute('aria-label') || '',
    overflowX: document.documentElement.scrollWidth - window.innerWidth
  };
};


// ============ Desktop / English / LTR ============
{
  const { page, errs } = await newPage(1280, 800, false);
  await goto(page, null);
  const b = await page.evaluate(brandInfo);
  check('EN desktop: <title> is EQ7', b.title === 'EQ7', b.title);
  check('EN desktop: application-name meta is EQ7', b.appName === 'EQ7', b.appName);
  check('EN desktop: description meta brands EQ7 Calculator', b.desc.includes('EQ7 Calculator') && !/\bEQ\b(?!7)/.test(b.desc), b.desc.slice(0, 60));
  check('EN desktop: header logo EQ7 (E,Q,7 exactly once, no dup)', b.hdrCount === 1 && b.hdr.text === 'EQ7' && b.hdr.e === 1 && b.hdr.q === 1 && b.hdr.seven === 1, JSON.stringify(b.hdr));
  check('EN desktop: drawerToggle aria-label is Open EQ7 Tools', b.toggleAria === 'Open EQ7 Tools', b.toggleAria);
  check('EN desktop: drawer aria-label is EQ7 tools drawer', b.drawerAria === 'EQ7 tools drawer', b.drawerAria);
  check('EN desktop: drawer logo EQ7 (E,Q,7 exactly once)', b.drwCount === 1 && b.drw.text === 'EQ7' && b.drw.e === 1 && b.drw.q === 1 && b.drw.seven === 1, JSON.stringify(b.drw));

  // Help branding (open the modal element the app itself drives).
  await page.evaluate(() => { const el = document.getElementById('helpModal'); if (el) el.classList.add('show'); });
  await sleep(200);
  const help = await page.evaluate(() => {
    const m = document.getElementById('helpModal');
    return {
      sub: m?.querySelector('[data-i18n="helpSubtitle"]')?.textContent || '',
      about: m?.querySelector('[data-i18n="helpAboutDesc"]')?.textContent || '',
      why: m?.querySelector('[data-i18n="helpWhyTitle"]')?.textContent || ''
    };
  });
  check('EN help: subtitle brands EQ7', help.sub.includes('EQ7') && !/\bEQ\b(?!7)/.test(help.sub), help.sub);
  check('EN help: about brands EQ7', help.about.startsWith('EQ7 '), help.about.slice(0, 50));
  check('EN help: why-title brands EQ7', help.why.includes('EQ7'), help.why);

  // Calculator still works (real keypad taps).
  await page.evaluate(() => {
    for (const sel of ['.keypad-btn.number[data-value="3"]', '.keypad-btn.operator[data-value="+"]',
      '.keypad-btn.number[data-value="4"]', '.keypad-btn.equals']) {
      const el = document.querySelector(sel); if (el) el.click();
    }
  });
  await sleep(300);
  const disp = await page.evaluate(() => (document.getElementById('primaryDisplay') || {}).textContent?.trim());
  check('EN desktop: calculator 3+4=7 unchanged', disp === '7', 'display=' + disp);

  // Notes opens without errors.
  await page.evaluate(() => { const el = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (el) el.click(); });
  await sleep(600);
  const notesVisible = await page.evaluate(() =>
    !!document.querySelector('.notes-manager, .notes-screen, #notesManager, #notesScreen, .notes-app'));
  check('EN desktop: Notes view opens', notesVisible);

  // PDF Workspace opens without errors.
  await page.evaluate(() => { const d = document.getElementById('drawerToggle'); if (d) d.click(); });
  await sleep(300);
  await page.evaluate(() => { const el = document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]'); if (el) el.click(); });
  await sleep(700);
  const pdfOpen = await page.evaluate(() => {
    const m = document.getElementById('pdfReportsModal');
    return !!m && !m.hidden;
  });
  check('EN desktop: PDF Workspace opens', pdfOpen);

  // Manifest branding.
  const man = await page.evaluate(async () => { const r = await fetch('./manifest.json'); return await r.json(); });
  check('EN desktop: manifest name is EQ7 Smart Calculator', man.name === 'EQ7 Smart Calculator', man.name);
  check('EN desktop: manifest short_name is EQ7 Calc', man.short_name === 'EQ7 Calc', man.short_name);

  // PWA icon assets must STILL be missing (reported, not replaced).
  const iconStatus = await page.evaluate(async () => {
    const out = {};
    for (const f of ['favicon.ico', 'apple-touch-icon.png', 'icon-192.png']) {
      try { const r = await fetch('./' + f, { method: 'GET' }); out[f] = r.status; }
      catch (e) { out[f] = 'ERR'; }
    }
    return out;
  });
  check('PWA icons still MISSING (favicon.ico 404)', iconStatus['favicon.ico'] === 404, JSON.stringify(iconStatus));
  check('PWA icons still MISSING (apple-touch-icon.png 404)', iconStatus['apple-touch-icon.png'] === 404, JSON.stringify(iconStatus));
  check('PWA icons still MISSING (icon-192.png 404)', iconStatus['icon-192.png'] === 404, JSON.stringify(iconStatus));

  check('EN desktop: no horizontal overflow', b.overflowX <= 2, 'dx=' + b.overflowX);
  check('EN desktop: no JS page errors', errs.length === 0, errs.join(' | ') || 'clean');
  await page.close();
}

// ============ Arabic / RTL / Mobile(390) ============
{
  const { page, errs } = await newPage(390, 844, true);
  await goto(page, 'ar');
  const b = await page.evaluate(brandInfo);
  const dir = await page.evaluate(() => getComputedStyle(document.body).direction);
  check('AR mobile: document direction is rtl', dir === 'rtl', dir);
  check('AR mobile: <title> is EQ7', b.title === 'EQ7', b.title);
  check('AR mobile: header logo EQ7 single mark (dir=ltr preserved)', b.hdrCount === 1 && b.hdr.text === 'EQ7' && b.hdr.seven === 1, JSON.stringify(b.hdr));
  check('AR mobile: drawer logo EQ7', b.drwCount === 1 && b.drw.text === 'EQ7' && b.drw.seven === 1, JSON.stringify(b.drw));
  const arHelp = await page.evaluate(() => {
    const el = document.getElementById('helpModal'); if (el) el.classList.add('show');
    return document.querySelector('#helpModal [data-i18n="helpSubtitle"]')?.textContent || '';
  });
  check('AR mobile: Arabic help subtitle brands EQ7', arHelp.includes('EQ7') && !/\bEQ\b(?!7)/.test(arHelp), arHelp);
  await page.evaluate(() => {
    for (const sel of ['.keypad-btn.number[data-value="2"]', '.keypad-btn.operator[data-value="*"]',
      '.keypad-btn.number[data-value="5"]', '.keypad-btn.equals']) {
      const el = document.querySelector(sel); if (el) el.click();
    }
  });
  await sleep(300);
  const disp2 = await page.evaluate(() => (document.getElementById('primaryDisplay') || {}).textContent?.trim());
  check('AR mobile: calculator 2*5=10 unchanged', disp2 === '10', 'display=' + disp2);
  check('AR mobile: no horizontal overflow', b.overflowX <= 2, 'dx=' + b.overflowX);
  check('AR mobile: no JS page errors', errs.length === 0, errs.join(' | ') || 'clean');
  await page.close();
}

// ============ English / LTR / Mobile(390) ============
{
  const { page, errs } = await newPage(390, 844, true);
  await goto(page, 'en');
  const b = await page.evaluate(brandInfo);
  const dir = await page.evaluate(() => getComputedStyle(document.body).direction);
  check('EN mobile: document direction is ltr', dir === 'ltr', dir);
  check('EN mobile: header logo EQ7', b.hdrCount === 1 && b.hdr.text === 'EQ7' && b.hdr.seven === 1, JSON.stringify(b.hdr));
  check('EN mobile: no horizontal overflow', b.overflowX <= 2, 'dx=' + b.overflowX);
  check('EN mobile: no JS page errors', errs.length === 0, errs.join(' | ') || 'clean');
  await page.close();
}

const failed = results.filter((r) => !r.ok);
console.log('\n=== PHASE 37A BRANDING RESULTS: ' + (results.length - failed.length) + '/' + results.length + ' PASSED ===');
failed.forEach((f) => console.log(' - ' + f.name));
try { await browser.close(); } catch (e) {}
try { server.close(); } catch (e) {}
process.exit(failed.length ? 1 : 0);
