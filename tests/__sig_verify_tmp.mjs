// VERIFY ONLY tmp file
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import pc from 'puppeteer-core';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'..');
const CHROME=process.env.CHROME_PATH||'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT=8377;
const srv=http.createServer((q,s)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/'||p==='')p='/index.html';try{const d=fs.readFileSync(path.join(ROOT,p));const e=path.extname(p).toLowerCase();s.writeHead(200,{'Content-Type':e==='.html'?'text/html':e==='.js'?'text/javascript':e==='.css'?'text/css':'application/octet-stream'});s.end(d);}catch(e){s.writeHead(404);s.end('nf');}});
await new Promise(r=>srv.listen(PORT,'127.0.0.1',r));
const URL='http://127.0.0.1:'+PORT+'/';
setTimeout(()=>{console.log('TIMEOUT');process.exit(124);},170000);
const R=[];const ck=(n,ok,d='')=>{R.push({n,ok});console.log((ok?'PASS':'FAIL')+' '+n+(d?' -> '+d:''));};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pdfB64='JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwvVHlwZS9DYXRhbG9nL1BhZ2VzIDIgMCBSPj4KZW5kb2JqCjIgMCBvYmoKPDwvVHlwZS9QYWdlcy9LaWRzWzMgMCBSXS9Db3VudCAxPj4KZW5kb2JqCjMgMCBvYmoKPDwvVHlwZS9QYWdlL01lZGlhQm94WzAgMCA2MTIgNzkyXS9QYXJlbnQgMiAwIFIvUmVzb3VyY2VzPDw+Pj4+CmVuZG9iagp0cmFpbGVyCjw8L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKMTQ3CiUlRU9G';
const tp=path.join(HERE,'__sv_tmp.pdf');fs.writeFileSync(tp,Buffer.from(pdfB64,'base64'));
function c32(b){const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c;}let r=0xffffffff;for(let i=0;i<b.length;i++)r=t[(r^b[i])&0xff]^(r>>>8);return(r^0xffffffff)>>>0;}
function ch(ty,d){const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(ty),d]);const c=Buffer.alloc(4);c.writeUInt32BE(c32(td));return Buffer.concat([l,td,c]);}
function mk(W,H,fn){const h=Buffer.alloc(13);h.writeUInt32BE(W,0);h.writeUInt32BE(H,4);h[8]=8;h[9]=6;const raw=Buffer.alloc(H*(1+W*4));for(let y=0;y<H;y++){const o=y*(1+W*4);for(let x=0;x<W;x++){const p=o+1+x*4;const cc=fn(x,y,W,H);raw[p]=cc[0];raw[p+1]=cc[1];raw[p+2]=cc[2];raw[p+3]=cc[3];}}return Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0d,0x0a,0x1a,0x0a]),ch('IHDR',h),ch('IDAT',zlib.deflateSync(raw)),ch('IEND',Buffer.alloc(0))]);}
const ts=path.join(HERE,'__sv_sig.png');fs.writeFileSync(ts,mk(300,100,(x,y,W,H)=>(x<W*0.7&&y>H*0.2&&y<H*0.8?[15,23,42,255]:[0,0,0,0])));
const tt=path.join(HERE,'__sv_st.png');fs.writeFileSync(tt,mk(300,100,()=>[217,56,56,255]));
const browser=await pc.launch({executablePath:CHROME,headless:'new',args:['--no-sandbox','--disable-gpu','--no-first-run','--disable-dev-shm-usage']});
const page=await browser.newPage();
await page.setViewport({width:1280,height:900,hasTouch:true,isMobile:false});
const errs=[];page.on('pageerror',e=>errs.push('pageerror:'+String((e&&e.message)||e)));page.on('console',m=>{if(m.type()==='error')errs.push('console:'+m.text());});
const httpErrs=[];page.on('response',r=>{try{if(r.status()>=400)httpErrs.push(r.status()+':'+r.url());}catch(e){}});
await page.goto(URL,{waitUntil:'domcontentloaded',timeout:45000});await sleep(900);
const info=()=>page.evaluate(()=>{const L=document.getElementById('pdfV1Layer');const lr=L.getBoundingClientRect();return Array.from(document.querySelectorAll('#pdfV1Layer .pdfv1-item')).map(el=>{const r=el.getBoundingClientRect();const im=el.querySelector('img');const cs=getComputedStyle(el);const del=el.querySelector('.pdfv1-sig-del');return{pid:el.dataset.pid,sig:el.classList.contains('is-signature'),sel:el.classList.contains('pdfv1-selected'),bd:cs.borderColor,sh:cs.boxShadow,z:(cs.zIndex==='auto'?0:Number(cs.zIndex)),x:(r.left-lr.left)/lr.width,y:(r.top-lr.top)/lr.height,w:r.width/lr.width,h:r.height/lr.height,rt:r.width/Math.max(1,r.height),cx:r.left+r.width/2,cy:r.top+r.height/2,op:im?(im.style.opacity||''):null,has:!!im,del:del?(getComputedStyle(del).display!=='none'):false,hd:Array.from(el.querySelectorAll('.pdfv1-handle')).map(h=>({p:h.dataset.handle,v:getComputedStyle(h).display!=='none'&&getComputedStyle(h).opacity!=='0'}))};});});
await page.evaluate(()=>{(document.querySelector('#featureNavBar [data-action="open-smart-docs"]')||document.querySelector('[data-action="open-smart-docs"]')).click();});
await sleep(400);
ck('1 SmartDocs opens',await page.evaluate(()=>document.getElementById('pdfReportsWorkspace').classList.contains('show')));
await(await page.$('#pdfV1FileInput')).uploadFile(tp);await sleep(800);
ck('2 PDF viewer+tools',await page.evaluate(()=>!document.getElementById('pdfV1ViewerWrap').hidden&&!document.getElementById('pdfV1Tools').hidden));
await(await page.$('#pdfV1SigFileInput')).uploadFile(ts);await sleep(700);
let it=await info();
ck('3 sig added',it.length===1&&it[0].has&&it[0].sig);
ck('4 auto-selected',it[0]&&it[0].sel===true);
ck('5 bbox',it[0]&&it[0].sh!=='none',it[0].bd+'/'+it[0].sh);
ck('6 X visible',it[0]&&it[0].del===true);
ck('7 4 handles',it[0]&&it[0].hd.length===4&&it[0].hd.every(h=>h.v),JSON.stringify(it[0].hd));
ck('7b sig pop 100%',await page.evaluate(()=>{const p=document.getElementById('pdfV1SigOptions');return!!p&&p.hidden===false&&document.getElementById('pdfV1SigOpacityVal').textContent==='100%';}));
//__PARTB__
for(const pos of['nw','ne','sw','se']){
  const hit=await page.evaluate(pp=>{const h=document.querySelector('#pdfV1Layer .pdfv1-item .pdfv1-handle[data-handle="'+pp+'"]');const r=h.getBoundingClientRect();const el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return!!(el&&el.closest&&el.closest('.pdfv1-handle'));},pos);
  ck('7c hit '+pos,hit);
}
ck('7d hit X',await page.evaluate(()=>{const x=document.querySelector('#pdfV1Layer .pdfv1-item .pdfv1-sig-del');const r=x.getBoundingClientRect();const el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return!!(el&&el.closest&&el.closest('.pdfv1-sig-del'));}));
const r0=(await info())[0].rt;
for(const pos of['nw','ne','sw','se']){const hb=await page.evaluate(pp=>{const h=document.querySelector('#pdfV1Layer .pdfv1-item .pdfv1-handle[data-handle="'+pp+'"]');const r=h.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};},pos);const bf=(await info())[0];await page.mouse.move(hb.x,hb.y);await page.mouse.down();const dx=pos.includes('e')?60:-60,dy=pos.includes('s')?40:-40;await page.mouse.move(hb.x+dx,hb.y+dy,{steps:8});await page.mouse.up();await sleep(250);const af=(await info())[0];const chg=Math.abs(af.w-bf.w)>0.005||Math.abs(af.h-bf.h)>0.005;const asp=Math.abs(af.rt-r0)/r0<0.06;ck('8 resize '+pos,chg&&asp,'r='+af.rt.toFixed(2)+' dw='+(af.w-bf.w).toFixed(3));}
const hb2=await page.evaluate(()=>{const h=document.querySelector('#pdfV1Layer .pdfv1-item .pdfv1-handle[data-handle="se"]');const r=h.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};});
await page.mouse.move(hb2.x,hb2.y);await page.mouse.down();await page.mouse.move(hb2.x-400,hb2.y-300,{steps:10});await page.mouse.up();await sleep(250);
it=await info();ck('8b min size',it[0].w>0.03&&it[0].h>0.02,JSON.stringify({w:it[0].w,h:it[0].h}));
const cc=(await info())[0];await page.mouse.move(cc.cx,cc.cy);await page.mouse.down();await page.mouse.move(cc.cx+120,cc.cy+90,{steps:10});await page.mouse.up();await sleep(250);
const mv=(await info())[0];ck('10 drag moves',Math.abs(mv.x-cc.x)>0.01||Math.abs(mv.y-cc.y)>0.01);
const LB=await page.evaluate(()=>{const L=document.getElementById('pdfV1Layer');const r=L.getBoundingClientRect();return{l:r.left,t:r.top};});
await page.mouse.move(mv.cx,mv.cy);await page.mouse.down();await page.mouse.move(LB.l-300,LB.t-300,{steps:10});await page.mouse.up();await sleep(250);
const cl=(await info())[0];ck('11 inside page',cl.x>=-0.01&&cl.y>=-0.01&&cl.x+cl.w<=1.01&&cl.y+cl.h<=1.01,JSON.stringify({x:cl.x.toFixed(2),y:cl.y.toFixed(2),w:cl.w.toFixed(2),h:cl.h.toFixed(2)}));
await page.evaluate(()=>{const s=document.getElementById('pdfV1SigOpacity');s.value='50';s.dispatchEvent(new Event('input',{bubbles:true}));});
await sleep(250);
let op=await page.evaluate(()=>({img:document.querySelector('#pdfV1Layer .pdfv1-item.is-signature img').style.opacity,val:document.getElementById('pdfV1SigOpacityVal').textContent}));
ck('12 opacity 50 sig only',op.img==='0.5'&&op.val==='50%',JSON.stringify(op));
await page.evaluate(()=>{const s=document.getElementById('pdfV1SigOpacity');s.value='0';s.dispatchEvent(new Event('input',{bubbles:true}));});
await sleep(250);
op=await page.evaluate(()=>({img:document.querySelector('#pdfV1Layer .pdfv1-item.is-signature img').style.opacity}));
ck('12b opacity 0',op.img==='0');
await page.evaluate(()=>{const s=document.getElementById('pdfV1SigOpacity');s.value='100';s.dispatchEvent(new Event('input',{bubbles:true}));});
await sleep(250);
//__PARTC__
await(await page.$('#pdfV1StampInput')).uploadFile(tt);await sleep(700);
it=await info();ck('14 stamp added',it.length===2,'n='+it.length);
let st=it.find(i=>!i.sig),sg=it.find(i=>i.sig);
await page.mouse.click(sg.cx,sg.cy);await sleep(200);
sg=(await info()).find(i=>i.sig);st=(await info()).find(i=>!i.sig);
await page.mouse.move(sg.cx,sg.cy);await page.mouse.down();await page.mouse.move(st.cx,st.cy,{steps:12});await page.mouse.up();await sleep(300);
await page.evaluate(()=>{const s=document.getElementById('pdfV1SigOpacity');s.value='50';s.dispatchEvent(new Event('input',{bubbles:true}));});
await sleep(250);
const ov=await page.evaluate(()=>{const els=Array.from(document.querySelectorAll('#pdfV1Layer .pdfv1-item'));const se=els.find(e=>e.classList.contains('is-signature'));const te=els.find(e=>!e.classList.contains('is-signature'));const sr=se.getBoundingClientRect(),tr=te.getBoundingClientRect();const ix=Math.max(0,Math.min(sr.right,tr.right)-Math.max(sr.left,tr.left));const iy=Math.max(0,Math.min(sr.bottom,tr.bottom)-Math.max(sr.top,tr.top));const sz=getComputedStyle(se).zIndex,tz=getComputedStyle(te).zIndex;return{sz,tz,szn:sz==='auto'?0:Number(sz),tzn:tz==='auto'?0:Number(tz),so:se.querySelector('img').style.opacity,to:te.querySelector('img').style.opacity,ov:ix>10&&iy>10};});
ck('15 sig above stamp overlap',ov.szn>=ov.tzn&&ov.ov,JSON.stringify({sz:ov.sz,tz:ov.tz,ov:ov.ov}));
ck('16-17 sig 50 stamp opaque',ov.so==='0.5'&&(ov.to===''||ov.to==='1'),JSON.stringify({so:ov.so,to:ov.to}));
await page.evaluate(()=>{const L=document.getElementById('pdfV1Layer');const r=L.getBoundingClientRect();L.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:r.left+4,clientY:r.top+4}));});
await sleep(250);
let ds=(await info()).find(i=>i.sig);
ck('18 deselect hides UI',ds.sel===false&&ds.del===false&&ds.hd.every(h=>!h.v)&&await page.evaluate(()=>document.getElementById('pdfV1SigOptions').hidden));
ck('18b img remains',ds.has===true);
const rs2=(await info()).find(i=>i.sig);await page.mouse.click(rs2.cx,rs2.cy);await sleep(250);
const re=(await info()).find(i=>i.sig);ck('19 reselect',re.sel===true&&re.del===true&&re.hd.length===4);
const nb=(await info()).length;
await page.evaluate(()=>document.querySelector('#pdfV1Layer .pdfv1-item.is-signature .pdfv1-sig-del').click());
await sleep(400);
const ad=await info();ck('20 X deletes sig only',ad.length===nb-1&&ad.every(i=>!i.sig),'n='+ad.length);
await(await page.$('#pdfV1SigFileInput')).uploadFile(ts);await sleep(600);
await page.keyboard.press('Delete');await sleep(300);
let nd=await page.evaluate(()=>document.querySelectorAll('#pdfV1Layer .pdfv1-item').length);
if(nd===2){await page.evaluate(()=>{const el=document.querySelector('#pdfV1Layer .pdfv1-item.is-signature');if(el)el.focus();});await page.keyboard.press('Backspace');await sleep(300);nd=await page.evaluate(()=>document.querySelectorAll('#pdfV1Layer .pdfv1-item').length);}
ck('21 Del/Backspace',nd===1,'n='+nd);
//__PARTD__
// Mobile/touch: fresh page with a mobile viewport (more realistic than re-emulating mid-session)
const mob=await browser.newPage();
await mob.setViewport({width:390,height:844,hasTouch:true,isMobile:true});
const merrs=[];mob.on('pageerror',e=>merrs.push(String(e&&e.message||e)));
await mob.goto(URL,{waitUntil:'domcontentloaded',timeout:45000});await sleep(900);
await mob.evaluate(()=>{(document.querySelector('#featureNavBar [data-action="open-smart-docs"]')||document.querySelector('[data-action="open-smart-docs"]')).click();});
await sleep(400);
ck('22a mobile opens',await mob.evaluate(()=>document.getElementById('pdfReportsWorkspace').classList.contains('show')));
await(await mob.$('#pdfV1FileInput')).uploadFile(tp);await sleep(800);
await(await mob.$('#pdfV1SigFileInput')).uploadFile(ts);await sleep(900);
const minfo=()=>mob.evaluate(()=>{const L=document.getElementById('pdfV1Layer');const lr=L.getBoundingClientRect();return Array.from(document.querySelectorAll('#pdfV1Layer .pdfv1-item')).map(el=>{const r=el.getBoundingClientRect();return{sig:el.classList.contains('is-signature'),sel:el.classList.contains('pdfv1-selected'),cx:r.left+r.width/2,cy:r.top+r.height/2};});});
let mi=await minfo();
if(!mi.find(i=>i.sig)){console.log('MOBILE DBG: '+JSON.stringify(await mob.evaluate(()=>({items:document.querySelectorAll('#pdfV1Layer .pdfv1-item').length,toolsHidden:document.getElementById('pdfV1Tools').hidden,ws:document.getElementById('pdfReportsWorkspace').classList.contains('show')}))));}
const ms=mi.find(i=>i.sig);
if(ms){await mob.touchscreen.tap(ms.cx,ms.cy);await sleep(300);}
const msel=(await minfo()).find(i=>i.sig);
ck('22 touch tap selects',!!ms&&msel&&msel.sel===true,JSON.stringify({added:!!ms,sel:msel?msel.sel:null}));
// tap outside to deselect (touch path) — tap the tools panel (real parent element;
// empty-area taps over the PDF iframe are swallowed by the iframe, pre-existing)
if(msel){
  const dim=await mob.evaluate(()=>{
    const t=document.getElementById('pdfV1Tools');
    const cands=[];
    if(t){const r=t.getBoundingClientRect();cands.push({x:r.left+8,y:r.top+8},{x:r.right-8,y:r.top+8},{x:r.left+8,y:r.bottom-8},{x:r.right-8,y:r.bottom-8});}
    cands.push({x:6,y:6});
    for(const c of cands){const el=document.elementFromPoint(c.x,c.y);const inSig=el&&el.closest&&el.closest('.pdfv1-item');const inPop=el&&el.closest&&el.closest('#pdfV1SigOptions');const danger=el&&el.closest&&el.closest('button,input,select,textarea');if(el&&!inSig&&!inPop&&!danger)return{px:Math.round(c.x),py:Math.round(c.y),hit:el.id||el.tagName};}
    return{px:6,py:6,hit:'fallback'};
  });
  console.log('22b DBG '+JSON.stringify(dim));
  await mob.touchscreen.tap(dim.px,dim.py);await sleep(350);
  ck('22b tap outside deselects',(await minfo()).find(i=>i.sig).sel===false);
}
ck('22c mobile no new JS errors',merrs.length===0,merrs.slice(0,2).join('|'));
await mob.close();
// re-add a signature for the RTL/LTR visibility checks (step 21 deleted the previous one)
await(await page.$('#pdfV1SigFileInput')).uploadFile(ts);await sleep(700);
await page.evaluate(()=>{document.documentElement.setAttribute('lang','ar');document.documentElement.setAttribute('dir','rtl');});await sleep(250);
ck('23 RTL',await page.evaluate(()=>{const el=document.querySelector('#pdfV1Layer .pdfv1-item.is-signature');return!!el&&getComputedStyle(el.querySelector('.pdfv1-sig-del')).display!=='none';}));
await page.evaluate(()=>{document.documentElement.setAttribute('lang','en');document.documentElement.setAttribute('dir','ltr');});await sleep(250);
ck('24 LTR',await page.evaluate(()=>{const el=document.querySelector('#pdfV1Layer .pdfv1-item.is-signature');return!!el&&getComputedStyle(el.querySelector('.pdfv1-sig-del')).display!=='none';}));
ck('26 stamp 4 handles',await page.evaluate(()=>{const els=Array.from(document.querySelectorAll('#pdfV1Layer .pdfv1-item'));const s=els.find(e=>!e.classList.contains('is-signature'));return!!s&&s.querySelectorAll('.pdfv1-handle').length===4;}));
await page.evaluate(()=>{const b=document.getElementById('pdfV1CloseBtn');if(b)b.click();});await sleep(300);
ck('27 close',await page.evaluate(()=>!document.getElementById('pdfReportsWorkspace').classList.contains('show')));
await page.evaluate(()=>{(document.querySelector('#featureNavBar [data-action="open-smart-docs"]')||document.querySelector('[data-action="open-smart-docs"]')).click();});await sleep(400);
ck('27b reopen',await page.evaluate(()=>document.getElementById('pdfReportsWorkspace').classList.contains('show')));
const se2=errs.filter(e=>/sig|Sig|pdfV1/i.test(e));ck('25 no new sig JS errors',se2.length===0,se2.slice(0,3).join('|')+' (all:'+errs.length+')');
if(errs.length)console.log('CONSOLE ERRORS: '+errs.slice(0,4).join(' || '));
if(httpErrs.length)console.log('HTTP>=400: '+httpErrs.slice(0,6).join(' | '));
const fl=R.filter(r=>!r.ok);console.log('----');console.log(fl.length===0?'PASS':'FAILURES:'+fl.length);fl.forEach(f=>console.log('FAIL '+f.n));
try{fs.unlinkSync(tp);fs.unlinkSync(ts);fs.unlinkSync(tt);}catch(e){}
await browser.close();srv.close();process.exit(fl.length?1:0);



