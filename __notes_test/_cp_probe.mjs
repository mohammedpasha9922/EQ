import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8377;
const server = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!p || p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    res.writeHead(200, { 'Content-Type': path.extname(f) === '.js' ? 'text/javascript' : 'text/html' });
    res.end(fs.readFileSync(f));
  } catch (e) { if (!res.headersSent) { res.writeHead(404); res.end('nf'); } }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
await sleep(600);
const out = {};
try {
  out.servedHas = await page.evaluate(() => { try { return document.documentElement.outerHTML.length > 0; } catch (e) { return String(e); } });
  // open notes
  await page.waitForSelector('.drawer-menu-item[data-action="open-notes"]', { timeout: 8000 });
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 8000 });
  await sleep(300);
  // open company profile directly (bypass note-open; the header button is global)
  await page.evaluate(() => { const b = document.querySelector('[data-company-profile]'); });
  // Try the modal open via the header button if present in DOM
  out.hasOpenBtn = await page.evaluate(() => !!document.getElementById('openCompanyProfileBtn'));
  if (out.hasOpenBtn) {
    await page.evaluate(() => document.getElementById('openCompanyProfileBtn').click());
    await sleep(300);
    out.modalShown = await page.evaluate(() => !!document.getElementById('companyProfileModal').classList.contains('show'));
    await page.evaluate(() => { document.getElementById('cpCompanyName').value = 'Probe Co'; });
    await page.evaluate(() => document.getElementById('companyProfileSave').click());
    await sleep(400);
    out.afterSave = await page.evaluate(() => ({ hist: localStorage.getItem('eq-history-company-name'), prof: (localStorage.getItem('eq-note-company-profile') || '').slice(0, 80) }));
  }
} catch (e) { out.err = String(e); }
console.log('PROBE2=' + JSON.stringify(out));
try { fs.writeFileSync(path.join(HERE, '_cp_probe2_out.txt'), 'PROBE2=' + JSON.stringify(out) + '\n', 'utf8'); } catch (e) {}
try { await browser.close(); } catch (e) {}
try { server.close(); } catch (e) {}
process.exit(0);
try { server.close(); } catch (e) {}
process.exit(0);