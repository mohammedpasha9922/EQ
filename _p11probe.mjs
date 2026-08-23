// PART 11 probe
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const ROOT = 'C:\\Users\\SHCH-HR\\Desktop\\EQ';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  try {
    const data = fs.readFileSync(path.join(ROOT, p));
    res.writeHead(200, { 'Content-Type': (MIME[path.extname(p)] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(data);
  } catch (e) { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(8219, '127.0.0.1', r));
const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('console', (m) => console.log('[console]', m.text()));
await page.goto('http://127.0.0.1:8219/', { waitUntil: 'domcontentloaded' });
await new Promise((r) => setTimeout(r, 1200));
const log = await page.evaluate(async () => {
  const out = [];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  document.getElementById('drawerToggle').click();
  await sleep(300);
  document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click();
  await sleep(400);
  document.querySelector('.smart-doc-card[data-action="smart-new-doc"]').click();
  await sleep(500);
  document.querySelector('[data-toolbar="blank-doc"] button[data-tool="text"]').click();
  await sleep(300);
  const b = document.querySelector('#smartDocumentContent [data-smart-element="text"]');
  b.focus();
  const sel = window.getSelection(); const r = document.createRange();
  r.selectNodeContents(b); sel.removeAllRanges(); sel.addRange(r);
  out.push('active=' + (document.activeElement === b));
  out.push('rangeCount=' + sel.rangeCount + ' text=' + JSON.stringify(sel.toString()));
  let ok;
  try { ok = document.execCommand('bold', false, null); } catch (e) { out.push('throw:' + e.message); }
  out.push('execCommand=' + ok);
  out.push('html=' + b.innerHTML);
  const ok2 = window.__smartText.inline('italic');
  out.push('seam italic=' + ok2);
  out.push('html2=' + b.innerHTML);
  document.querySelector('#smartTextFormatBar [data-textfmt="underline"]').click();
  await sleep(100);
  out.push('html3=' + b.innerHTML);
  return out.join('\n');
});
console.log(log);
await browser.close(); server.close();
