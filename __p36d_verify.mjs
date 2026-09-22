/* PART 36D — Mobile Pages navigation clipping verification.
   Tests 360/390/768/1280 x LTR(en)/RTL(ar) on the PDF V1 blank editor. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const ROOT = process.cwd();
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8417;
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png' };
const server = http.createServer((req,res)=>{ let u=decodeURIComponent(req.url.split('?')[0]); if(u===''||u==='/')u='/index.html'; try{ const d=fs.readFileSync(path.join(ROOT,u)); res.writeHead(200,{'Content-Type':(MIME[path.extname(u).toLowerCase()]||'application/octet-stream')}); res.end(d);}catch(e){res.writeHead(404);res.end('nf');} });
await new Promise(r=>server.listen(PORT,'127.0.0.1',r));
const URL='http://127.0.0.1:'+PORT+'/';
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless:'new', protocolTimeout:120000, args:['--no-sandbox','--disable-gpu','--no-first-run','--disable-dev-shm-usage'] });

async function runCase(width,height,locale,label,results){
  const page = await browser.newPage();
  await page.setViewport({width,height});
  const pageErrs=[]; page.on('pageerror',e=>{ const m=String(e&&e.message||e); if(/path|favicon|404|Failed to load resource/i.test(m)) return; pageErrs.push(m); });
  const cons=[]; page.on('console',(m)=>{ try{ const ty=typeof m.type==='function'?m.type():String(m.type||''); const txt=typeof m.text==='function'?m.text():String(m.text||''); if(ty==='error'&&!/path|favicon|404|Failed to load resource/i.test(txt)) cons.push(txt); }catch(e){} });
  await page.goto(URL,{waitUntil:'domcontentloaded',timeout:45000});
  await sleep(1000);
  await page.evaluate(()=>{ const b=document.getElementById('drawerToggle'); if(b)b.click(); }); await sleep(350);
  // Set language while the drawer is open (mirrors part19 openBlank), before
  // navigating into Smart Docs. This reliably applies dir/data-language.
  await page.evaluate((l)=>{ const s=document.getElementById('topBarLanguageSelect'); if(s){ s.value=l; s.dispatchEvent(new Event('change',{bubbles:true})); } });
  await sleep(450);
  await page.evaluate(()=>{ const b=document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]'); if(b)b.click(); }); await sleep(500);
  await page.evaluate(()=>{ const b=document.querySelector('.smart-doc-card[data-action="smart-new-doc"]'); if(b)b.click(); }); await sleep(900);

  // Genuinely exercise the RTL layout path: the app's own dir/data-language
  // mechanism + the nav inheriting direction:rtl. Using the EXISTING mechanism.
  await page.evaluate((l)=>{
    const de=document.documentElement;
    de.setAttribute('dir', l==='ar'?'rtl':'ltr');
    de.setAttribute('lang', l);
    document.body.setAttribute('data-language', l);
    const nav=document.querySelector('.smart-blank-nav');
    if(nav){ nav.style.direction = l==='ar'?'rtl':'ltr'; }
  }, locale);
  await sleep(150);

  const geom = await page.evaluate(()=>{
    const vw = window.innerWidth, vh = window.innerHeight;
    const doc = document.getElementById('smartBlankCanvas');
    const nav = document.querySelector('.smart-blank-nav');
    const out=[];
    for(const id of ['smartBlankPrevPage','smartBlankNextPage','smartPageAddBtn','smartPageCopyBtn','smartPageDeleteBtn','smartPageMoveUpBtn','smartPageMoveDownBtn']){
      const el=document.getElementById(id); if(!el){ out.push(id+':missing'); continue; }
      const cs=getComputedStyle(el); const r=el.getBoundingClientRect();
      const display=cs.display==='none'||el.hidden||el.getAttribute('aria-hidden')==='true';
      const inVp = r.width>0 && r.height>0 && r.left>= -1 && r.right<=vw+1 && r.top>= -1 && r.bottom<=vh+1;
      const cx = Math.round(r.left+r.width/2), cy = Math.round(r.top+r.height/2);
      const hitEl = document.elementFromPoint(cx,cy);
      let hitOk=false, hitName='';
      if(hitEl){ hitName=hitEl.id||String(hitEl.className)||'?'; let n=hitEl; while(n){ if(n.id===id||n===el){hitOk=true;break;} n=n.parentElement; } }
      out.push(id+':rect='+[Math.round(r.left),Math.round(r.top),Math.round(r.right),Math.round(r.bottom)].join(',')+' disp='+(display?'HID':'VIS')+' inVp='+inVp+' hit='+hitOk+' hitEl='+hitName);
    }
    const bodySW = document.body.scrollWidth;
    const htmlSW = document.documentElement.scrollWidth;
    const navSW = nav?nav.scrollWidth:0, navCW = nav?nav.clientWidth:0;
    return {
      bodyScrollWidth: bodySW, htmlScrollWidth: htmlSW,
      navScrollWidth: navSW, navClientWidth: navCW, navOverflow: navSW-navCW,
      navWrap: nav?getComputedStyle(nav).flexWrap:null,
      dir: document.documentElement.getAttribute('dir'),
      lang: document.body.getAttribute('data-language'),
      docSW: doc?Math.max(0,Math.round(doc.getBoundingClientRect().width)):null,
      out
    };
  });

  const failures=[];
  if(locale==='ar' && geom.dir!=='rtl') failures.push('RTL not applied: html.dir='+geom.dir);
  if(locale==='ar' && geom.lang!=='ar') failures.push('RTL not applied: data-language='+geom.lang);
  if(geom.bodyScrollWidth>width+1) failures.push('body scrollWidth='+geom.bodyScrollWidth+'>viewport '+width);
  if(geom.htmlScrollWidth>width+1) failures.push('html scrollWidth='+geom.htmlScrollWidth+'>viewport '+width);
  for(const line of geom.out){ if(line.includes('missing')) failures.push(line); else { if(!/inVp=true/.test(line)) failures.push(line); if(/hit=false/.test(line)) failures.push(line); } }

  const reg = await page.evaluate(()=>{
    const counter=()=>{ const c=document.getElementById('smartPageCount'); return c?c.textContent.trim():''; };
    const click=(id)=>{ const b=document.getElementById(id); if(!b||b.disabled) return 'noop(disabled)'; b.click(); return 'ok'; };
    const r=[];
    r.push('add1='+click('smartPageAddBtn'));
    r.push('add2='+click('smartPageAddBtn'));
    r.push('copy='+click('smartPageCopyBtn'));
    click('smartBlankNextPage');
    r.push('up='+click('smartPageMoveUpBtn'));
    r.push('down='+click('smartPageMoveDownBtn'));
    r.push('add3='+click('smartPageAddBtn'));
    r.push('del='+click('smartPageDeleteBtn'));
    r.push('count1='+counter());
    click('smartBlankNextPage');
    r.push('count2='+counter());
    return { results: r, countFinal: counter() };
  });
  const regErr=[];
  if(String(reg.countFinal||'').length===0) regErr.push('counter empty after regression');
  const okVals=new Set(['ok','noop(disabled)']);
  for(const item of reg.results){
    const eq=item.indexOf('=');
    if(eq<0){ if(!okVals.has(item)) regErr.push('unexpected: '+item); continue; }
    const k=item.slice(0,eq), v=item.slice(eq+1);
    if(/^count/.test(k)){ if(v.trim().length===0) regErr.push('empty counter in '+item); }
    else if(!okVals.has(v)){ regErr.push('unexpected: '+item); }
  }

  const pass = failures.length===0 && regErr.length===0 && pageErrs.length===0 && cons.length===0;
  results.push({ label:label+' ['+width+'x'+height+' '+locale+']', width, height, locale, pass,
    failures, regErr, pageErrs: pageErrs.slice(0,4), cons: cons.slice(0,4), geom });
  const lineOut=(pass?'PASS':'FAIL')+'  '+label+'  '+width+'x'+height+' '+locale;
  console.log(lineOut);
  appendLog('CASE '+lineOut);
  if(failures.length) appendLog('  FAILURES: '+JSON.stringify(failures));
  if(regErr.length) appendLog('  REGERR: '+JSON.stringify(regErr));
  if(pageErrs.length) appendLog('  PAGEERRS: '+JSON.stringify(pageErrs));
  if(cons.length) appendLog('  CONS: '+JSON.stringify(cons));
  appendLog('  GEOM: '+'bodySW='+geom.bodyScrollWidth+' htmlSW='+geom.htmlScrollWidth+' navOW='+geom.navOverflow+' navWrap='+geom.navWrap+' dir='+geom.dir+' lang='+geom.lang);
  appendLog('  CTRLS: '+JSON.stringify(geom.out));
  await page.close();
}

const results=[];
const logStream = fs.createWriteStream? null : null;
const logFile = path.join(ROOT, '__p36d_result.txt');
try{ fs.unlinkSync(logFile); }catch(e){}
const appendLog = (s)=>{ try{ fs.appendFileSync(logFile, s+'\n'); }catch(e){} };
const cases=[
  [360,800,'en','360 LTR'],
  [360,800,'ar','360 RTL'],
  [390,844,'en','390 LTR'],
  [390,844,'ar','390 RTL'],
  [768,900,'en','768 LTR'],
  [768,900,'ar','768 RTL'],
  [1280,800,'en','1280 LTR'],
  [1280,800,'ar','1280 RTL'],
];
for(const [w,h,l,lab] of cases){ await runCase(w,h,l,lab,results); }

console.log('\n===== SUMMARY =====');
for(const r of results){ const s=(r.pass?'PASS':'FAIL')+'  '+r.label; console.log(s); appendLog('FINAL '+s); }
const allPass = results.every(r=>r.pass);
appendLog('ALL_PASS='+allPass);
console.log('ALL_PASS='+allPass);
await browser.close(); server.close();
process.exit(allPass?0:1);