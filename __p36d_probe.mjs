/* probe language/RTL application mechanism */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const ROOT = process.cwd();
const CHROME='C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT=8419;
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const server=http.createServer((req,res)=>{let u=decodeURIComponent(req.url.split('?')[0]);if(u===''||u==='/')u='/index.html';try{const d=fs.readFileSync(path.join(ROOT,u));res.writeHead(200,{'Content-Type':(MIME[path.extname(u).toLowerCase()]||'application/octet-stream')});res.end(d);}catch(e){res.writeHead(404);res.end('nf');}});
await new Promise(r=>server.listen(PORT,'127.0.0.1',r));
const browser=await puppeteer.launch({executablePath:CHROME,headless:'new',protocolTimeout:120000,args:['--no-sandbox','--disable-gpu','--no-first-run']});
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const page=await browser.newPage();
await page.setViewport({width:390,height:844});
const errs=[]; page.on('pageerror',e=>errs.push(String(e&&e.message||e)));
await page.goto('http://127.0.0.1:'+PORT+'/',{waitUntil:'domcontentloaded',timeout:45000});
await sleep(1400);
const snap=(tag)=>page.evaluate((t)=>{
  const sel=document.getElementById('topBarLanguageSelect');
  return {tag:t, htmlDir:document.documentElement.getAttribute('dir'), htmlLang:document.documentElement.getAttribute('lang'),
    bodyLang:document.body.getAttribute('data-language'), selVal:sel?sel.value:null,
    selOptions:sel?Array.from(sel.options).map(o=>o.value).join(','):null,
    typeofSet:typeof window.setLanguage, stateLocale:(typeof state!=='undefined'&&state&&state.locale)?state.locale:('undef'),
    selPresent:!!sel };
},tag);
console.log('INIT '+JSON.stringify(await snap('init')));
// try select method
await page.evaluate(()=>{ const s=document.getElementById('topBarLanguageSelect'); if(s){ s.value='ar'; s.dispatchEvent(new Event('change',{bubbles:true})); } });
await sleep(500);
console.log('SELECT_METHOD '+JSON.stringify(await snap('select')));
// try direct setLanguage
try { await page.evaluate(()=>{ window.setLanguage('ar'); }); console.log('DIRECT_CALL ok'); } catch(e){ console.log('DIRECT_CALL threw '+String(e)); }
await sleep(500);
console.log('DIRECT '+JSON.stringify(await snap('direct')));
console.log('ERRS '+JSON.stringify(errs.slice(0,5)));
await browser.close(); server.close(); process.exit(0);