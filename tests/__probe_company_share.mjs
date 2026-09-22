// Behavioral verifier for the Company Name button + direct Share.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mjs': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/' || p === '') p = '/index.html';
  try { const d = fs.readFileSync(path.join(ROOT, p)); res.writeHead(200, { 'Content-Type': (MIME[path.extname(p).toLowerCase()] || 'application/octet-stream') + '; charset=utf-8' }); res.end(d); }
  catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
setTimeout(() => process.exit(124), 180000);
const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const failures = [];
const check = (name, ok) => { console.log((ok ? 'PASS' : 'FAIL') + '  ' + name); if (!ok) failures.push(name); };
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });
  const LABELS = { ar: 'اسم الشركة', en: 'Company Name', es: 'Nombre de la empresa', fr: "Nom de l'entreprise", ru: 'Название компании', de: 'Firmenname', tr: 'Şirket Adı' };
  for (const [loc, label] of Object.entries(LABELS)) {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 40000 });
    await page.evaluate((l) => { try { localStorage.setItem('eq-language', l); } catch (e) {} }, loc);
    await page.reload({ waitUntil: 'load', timeout: 40000 });
    await sleep(1200);
    for (let i = 0; i < 20 && !(await page.evaluate(() => !!document.getElementById('historyCompanyNameBtn'))); i++) await sleep(400);
    const t = await page.evaluate(() => document.getElementById('historyCompanyNameBtn').textContent.trim());
    check(loc + ': Company Name button label', t === label);
  }
  // --- English behavioral flow ---
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 40000 });
  await page.evaluate(() => { try { localStorage.setItem('eq-language', 'en'); } catch (e) {} });
  await page.reload({ waitUntil: 'load', timeout: 40000 });
  await sleep(1500);

  await page.evaluate(() => { try { localStorage.removeItem('eq-history-company-name'); } catch (e) {} });
  await page.evaluate(() => { const b = document.getElementById('historyCompanyNameBtn'); if (b) b.click(); });
  let barOpen = false;
  for (let i = 0; i < 12; i++) {
    await sleep(300);
    barOpen = await page.evaluate(() => { const ins = [...document.querySelectorAll('input[type=text]')]; return ins.some(x => (x.getAttribute('aria-label') || '') === 'Company Name'); });
    if (barOpen) break;
  }
  check('company: button opens the name input', barOpen);
  await page.evaluate(() => { const ins = [...document.querySelectorAll('input[type=text]')]; const i = ins.find(x => (x.getAttribute('aria-label') || '') === 'Company Name'); if (i) { i.value = 'Al Baraka Wholesale'; i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); } });
  await sleep(400);
  const saved = await page.evaluate(() => { try { return localStorage.getItem('eq-history-company-name'); } catch (e) { return null; } });
  check('company: name saved', saved === 'Al Baraka Wholesale');

  // Press Share PDF — DIRECT: no input appears, saved name is used in the PDF.
  await page.evaluate(() => { if (navigator.share) { navigator.share = async () => {}; } });
  await page.evaluate(() => { const b = document.getElementById('exportHistory'); if (b) b.click(); });
  await sleep(400);
  const inputAfterShare = await page.evaluate(() => { const ins = [...document.querySelectorAll('input[type=text]')]; return ins.some(i => (i.getAttribute('aria-label') || '') === 'Company Name'); });
  check('share: does NOT open name input (direct share)', !inputAfterShare);
  const html = await page.evaluate(async () => {
    let captured = null;
    const origRemove = document.body.removeChild.bind(document.body);
    document.body.removeChild = function (el) { try { if (el && el.tagName === 'IFRAME' && el.contentDocument && el.contentDocument.getElementById('report')) captured = el.contentDocument.documentElement.outerHTML; } catch (e) {} return origRemove(el); };
    const entries = [ { expression: '2 + 3', result: '5', note: 'n' } ];
    await window.__historyPdfBlob(entries, window.localStorage.getItem('eq-history-company-name') || '');
    document.body.removeChild = origRemove;
    return captured;
  });
  check('share: saved company name used in PDF header', html && html.includes('<h1>Al Baraka Wholesale</h1>'));

  // No saved name -> default title, still direct.
  await page.evaluate(() => { try { localStorage.removeItem('eq-history-company-name'); } catch (e) {} });
  await page.evaluate(() => { const b = document.getElementById('exportHistory'); if (b) b.click(); });
  await sleep(400);
  const inputNoName = await page.evaluate(() => { const ins = [...document.querySelectorAll('input[type=text]')]; return ins.some(i => (i.getAttribute('aria-label') || '') === 'Company Name'); });
  check('share: direct even with no saved name (no input)', !inputNoName);
  const html2 = await page.evaluate(async () => {
    let captured = null;
    const origRemove = document.body.removeChild.bind(document.body);
    document.body.removeChild = function (el) { try { if (el && el.tagName === 'IFRAME' && el.contentDocument && el.contentDocument.getElementById('report')) captured = el.contentDocument.documentElement.outerHTML; } catch (e) {} return origRemove(el); };
    const entries = [ { expression: '2 + 3', result: '5', note: 'n' } ];
    await window.__historyPdfBlob(entries, '');
    document.body.removeChild = origRemove;
    return captured;
  });
  check('share: default title used when no saved name', html2 && html2.includes('<h1>EQ7 Calculator</h1>'));

  console.log(failures.length === 0 ? 'ALL PASS: company name button + direct share verified' : 'FAILURES: ' + failures.join('; '));
  process.exitCode = failures.length === 0 ? 0 : 1;
} catch (e) { console.log('ERROR: ' + (e && e.stack || e)); process.exitCode = 2; }
finally { await browser.close().catch(() => {}); server.close(); }