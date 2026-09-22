import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const ROOT = process.cwd();
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8393;
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png' };
const server = http.createServer((req,res)=>{ let u=decodeURIComponent(req.url.split('?')[0]); if(u==='/'||u==='')u='/index.html'; const fp=path.join(ROOT,u); try{ const d=fs.readFileSync(fp); res.writeHead(200,{'Content-Type':(MIME[path.extname(fp).toLowerCase()]||'application/octet-stream')}); res.end(d);}catch(e){res.writeHead(404);res.end('nf');} });
await new Promise(r=>server.listen(PORT,'127.0.0.1',r));
const URL='http://127.0.0.1:'+PORT+'/';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args:['--no-sandbox','--disable-gpu','--no-first-run','--disable-dev-shm-usage'] });
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const page = await browser.newPage();
await page.setViewport({width:1280,height:800});
const errs=[]; page.on('pageerror',e=>errs.push(String(e&&e.message||e)));
await page.goto(URL,{waitUntil:'domcontentloaded',timeout:45000});
await sleep(1200);
await page.evaluate(()=>{ document.getElementById('drawerToggle').click(); });
await sleep(300);
await page.evaluate(()=>{ document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click(); });
await sleep(600);
await page.evaluate(()=>{ document.querySelector('.smart-doc-card[data-action="smart-new-doc"]').click(); });
await sleep(800);
const st = await page.evaluate(()=>{
  const vis=(el)=>{ if(!el) return 'missing'; const cs=getComputedStyle(el); const r=el.getBoundingClientRect(); return (cs.display!=='none'&&r.width>0&&r.height>0)?('vis:'+cs.display):('hid:'+cs.display+':'+Math.round(r.width)+'x'+Math.round(r.height)); };
  const q=(s)=>{ const el=document.querySelector(s); return el?vis(el):'absent'; };
  return {
    blankDisp: q('#smartBlankView'),
    addMenu: q('#smartAddMenu'),
    addMenuItems: [...document.querySelectorAll('#smartAddMenu [data-add], #smartAddMenu button')].map(b=>(b.getAttribute('data-add')||b.textContent.trim()).slice(0,30)+'='),
    toolBtns: [...document.querySelectorAll('.smart-blank-toolbar .smart-tool-btn')].map(b=>b.getAttribute('data-tool')+'='+vis(b)),
    pages: ['smartPageAddBtn','smartPageCopyBtn','smartPageDeleteBtn','smartPageMoveUpBtn','smartPageMoveDownBtn','smartBlankPrevPage','smartBlankNextPage','smartPageCount'].map(id=>id+'='+vis(document.getElementById(id))),
    hdr: ['smartSaveDraftBtn','smartNewDocBtn','smartReviewBtn','smartPdfExportBtn','smartBlankBack','smartBlankDocTitle'].map(id=>id+'='+vis(document.getElementById(id))),
    pagesDesc: (window.__smartPages&&window.__smartPages.describe)?window.__smartPages.describe().length+' pages':'no seam',
    blankState: (window.__smartBlank&&window.__smartBlank.getState)?JSON.stringify(window.__smartBlank.getState()).slice(0,500):'no seam',
    canvas: q('#smartBlankCanvas'), content: q('#smartDocumentContent')
  };
});
console.log('ST='+JSON.stringify(st,null,1));
console.log('ERRS='+JSON.stringify(errs.slice(0,8)));
await browser.close(); server.close();
