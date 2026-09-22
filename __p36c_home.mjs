import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const ROOT = process.cwd();
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8392;
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png' };
const server = http.createServer((req,res)=>{ let u=decodeURIComponent(req.url.split('?')[0]); if(u==='/'||u==='')u='/index.html'; const fp=path.join(ROOT,u); try{ const d=fs.readFileSync(fp); res.writeHead(200,{'Content-Type':(MIME[path.extname(fp).toLowerCase()]||'application/octet-stream')}); res.end(d);}catch(e){res.writeHead(404);res.end('nf');} });
await new Promise(r=>server.listen(PORT,'127.0.0.1',r));
const URL='http://127.0.0.1:'+PORT+'/';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args:['--no-sandbox','--disable-gpu','--no-first-run','--disable-dev-shm-usage'] });
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const page = await browser.newPage();
await page.setViewport({width:1280,height:800});
await page.goto(URL,{waitUntil:'domcontentloaded',timeout:45000});
await sleep(1200);
// open smart docs home directly
await page.evaluate(()=>{ document.getElementById('drawerToggle').click(); });
await sleep(300);
await page.evaluate(()=>{ document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click(); });
await sleep(600);
const home = await page.evaluate(()=>{
  const cards=[...document.querySelectorAll('.smart-doc-card')].map(c=>({act:c.getAttribute('data-action'), title:c.textContent.trim().slice(0,60)}));
  return { show: document.getElementById('smartDocsModal').classList.contains('show'), cards,
    blankKeys: window.__smartBlank?Object.keys(window.__smartBlank):null,
    pagesKeys: window.__smartPages?Object.keys(window.__smartPages):null };
});
console.log('HOME='+JSON.stringify(home,null,1));
await browser.close(); server.close();
