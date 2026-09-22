// Minimal probe: verify the static server + real Chrome can actually load the app.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = HERE; // this probe lives in the project root
const log = [];
log.push('HERE=' + HERE);
log.push('ROOT=' + ROOT);
log.push('index exists=' + fs.existsSync(path.join(ROOT, 'index.html')));

const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/' || u === '') u = '/index.html';
  const fsPath = path.join(ROOT, u);
  try {
    const d = fs.readFileSync(fsPath);
    const ext = path.extname(fsPath).toLowerCase();
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime + '; charset=utf-8' });
    res.end(d);
    log.push(`SERVE 200 ${u} -> ${fsPath} (${d.length} bytes)`);
  } catch (e) {
    res.writeHead(404);
    res.end('nf');
    log.push(`SERVE 404 ${u} -> ${fsPath} :: ${e.message}`);
  }
});
const PORT = 8399;
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
log.push('chrome exists=' + fs.existsSync(CHROME));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
const resp = await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
log.push('goto status=' + (resp && resp.status()));
log.push('url=' + page.url());
log.push('title=' + (await page.title()));
log.push('bodyLen=' + await page.evaluate(() => document.body.innerHTML.length));
log.push('hasTopBar=' + await page.evaluate(() => !!document.getElementById('topBarLanguageSelect')));
log.push('scripts=' + JSON.stringify(await page.evaluate(() => Array.from(document.scripts).map((s) => s.src || 'inline').slice(0, 12))));
await new Promise((r) => setTimeout(r, 4000));
log.push('after-wait hasTopBar=' + await page.evaluate(() => !!document.getElementById('topBarLanguageSelect')));
log.push('after-wait display=' + await page.evaluate(() => document.querySelector('#primaryDisplay')?.textContent));
log.push('bodyText=' + JSON.stringify((await page.evaluate(() => document.body.innerText)).slice(0, 300)));
fs.writeFileSync(path.join(ROOT, '_probe.txt'), log.join('\n'), 'utf-8');
await browser.close();
server.close();
console.log('written _probe.txt');