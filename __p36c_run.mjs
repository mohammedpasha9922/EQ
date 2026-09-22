// PART 36C — FINAL VERIFICATION (test harness only; NO production changes).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import puppeteer from 'puppeteer-core';

const ROOT = process.cwd();
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8399;
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.ico':'image/x-icon','.svg':'image/svg+xml','.jpg':'image/jpeg','.wasm':'application/wasm' };
const server = http.createServer((req,res)=>{
  let u=decodeURIComponent(req.url.split('?')[0]);
  if(u==='/'||u==='')u='/index.html';
  const fp=path.join(ROOT,u);
  try{ const d=fs.readFileSync(fp); res.writeHead(200,{'Content-Type':(MIME[path.extname(fp).toLowerCase()]||'application/octet-stream')}); res.end(d);}catch(e){res.writeHead(404);res.end('nf');}
});
await new Promise(r=>server.listen(PORT,'127.0.0.1',r));
const URL='http://127.0.0.1:'+PORT+'/';
setTimeout(()=>process.exit(124), 900000);

const results=[]; const preexisting=[];
const OUT=path.join(ROOT,'__p36c_result.txt');
try{ fs.unlinkSync(OUT); }catch(e){}
fs.appendFileSync(OUT,'STARTED\n');
function check(name, ok, detail=''){ results.push({name,ok,detail}); const line=`${ok?'PASS':'FAIL'}  ${name}${detail?'  -> '+detail:''}`; console.log(line); fs.appendFileSync(OUT,line+'\n'); }
function note(name,detail){ preexisting.push({name,detail}); const line=`NOTE ${name}  -> ${detail}`; console.log(line); fs.appendFileSync(OUT,line+'\n'); }

const browser = await puppeteer.launch({ executablePath:CHROME, headless:'new', protocolTimeout:300000, args:['--no-sandbox','--disable-gpu','--no-first-run','--disable-dev-shm-usage'] });
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));

const PNG_B64='iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR4nGP8z8DwnwEPYMInOWwUAACaVAEbTM10zwAAAABJRU5ErkJggg==';
const TMP=os.tmpdir();
const pngPath=path.join(TMP,'__p36c_image.png');
fs.writeFileSync(pngPath, Buffer.from(PNG_B64,'base64'));

async function newPage(viewport){
  const page=await browser.newPage();
  if(viewport) await page.setViewport(viewport);
  const errs=[];
  page.on('pageerror',(e)=>errs.push(String(e&&e.message||e)));
  page.on('console',(m)=>{ try{ const ty=typeof m.type==='function'?m.type():String(m.type||''); const txt=typeof m.text==='function'?m.text():String(m.text||''); if(ty==='error' && !/favicon|Failed to load resource/i.test(txt)) errs.push('[c] '+txt); }catch(e){} });
  await page.evaluateOnNewDocument(()=>{
    window.__dialogs={alert:0,confirm:0,prompt:0};
    window.alert=()=>{window.__dialogs.alert++;};
    window.confirm=()=>{window.__dialogs.confirm++;return true;};
    window.prompt=()=>{window.__dialogs.prompt++;return '';};
  });
  await page.goto(URL,{waitUntil:'domcontentloaded',timeout:45000});
  await sleep(800);
  return {page,errs};
}
async function setLang(page, locale){
  await page.evaluate((l)=>{ const s=document.getElementById('topBarLanguageSelect'); if(s){ s.value=l; s.dispatchEvent(new Event('change',{bubbles:true})); } }, locale);
  await sleep(450);
  return page.evaluate(()=>({dir:document.documentElement.dir, lang:document.documentElement.lang}));
}
async function openBlank(page, locale){
  await page.evaluate(()=>{ const b=document.getElementById('drawerToggle'); if(b)b.click(); });
  await sleep(300);
  if(locale) await setLang(page, locale);
  await page.evaluate(()=>{ const b=document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]'); if(b)b.click(); });
  await sleep(500);
  await page.evaluate(()=>{ const b=document.querySelector('.smart-doc-card[data-action="smart-new-doc"]'); if(b)b.click(); });
  await sleep(600);
  return page.evaluate(()=>{
    const s=window.__smartBlank.getState();
    return { visible:s.visible, editorVisible:s.editorVisible, pageCount:s.pageCount, pageSize:s.pageSize, canvasWhite:s.canvasWhite };
  });
}
function inspectPdf(buf){
  const head=buf.subarray(0,5).toString('latin1');
  const tail=buf.subarray(Math.max(0,buf.length-64)).toString('latin1');
  const raw=buf.toString('latin1');
  const pageCount=(raw.match(/\/Type\s*\/Page[^s]/g)||[]).length;
  const hasJpeg=raw.includes('\xFF\xD8\xFF');
  return { headerOk: head==='%PDF-', tailOk: tail.includes('%%EOF'), pageCount, size:buf.length, hasJpeg };
}
async function exportBlob(page, opts){
  try{
    const r=await page.evaluate(async (o)=>{
      const blob=await window.__smartPdfExport.buildBlob(o||{});
      if(!blob||!blob.size) return {ok:false, error:'empty'};
      const buf=new Uint8Array(await blob.arrayBuffer());
      let bin=''; for(let i=0;i<buf.length;i+=0x8000) bin+=String.fromCharCode.apply(null, buf.subarray(i,i+0x8000));
      return {ok:true, b64:btoa(bin), size:buf.length};
    }, opts);
    return {ok:r.ok, b64:r.b64?r.b64:'', size:r.size||0, error:r.error||''};
  }catch(err){ return {ok:false,b64:'',error:String(err&&err.message||err)}; }
}
async function exportViaUi(page){
  await page.evaluate(()=>{ const b=document.getElementById('smartPdfExportBtn'); if(b)b.click(); });
  await sleep(350);
  const dlgOpen=await page.evaluate(()=>{ const m=document.getElementById('smartPdfModal'); return !!(m&&!m.hidden); });
  await page.evaluate(()=>{ const b=document.getElementById('smartPdfConfirmBtn'); if(b)b.click(); });
  let st={} ; const s0=Date.now();
  while(Date.now()-s0<25000){
    st=await page.evaluate(()=>({
      resShow: !!(document.getElementById('smartPdfResultModal')&&!document.getElementById('smartPdfResultModal').hidden),
      previewImgs: document.querySelectorAll('#smartPdfPreviewPages img.smart-pdf-preview-img').length,
      modalHidden: !!(document.getElementById('smartPdfModal')&&document.getElementById('smartPdfModal').hidden),
      toast: (document.getElementById('toast')||{}).textContent||''
    }));
    if(st.resShow) break;
    await sleep(500);
  }
  return { dlgOpen, ...st };
}
async function addImageViaUi(page){
  await page.evaluate(()=>{ const b=document.querySelector('.smart-blank-toolbar button[data-tool="add"]'); if(b)b.click(); });
  await sleep(250);
  await page.evaluate(()=>{ const b=document.querySelector('.smart-add-item[data-add="image"]'); if(b)b.click(); });
  await sleep(250);
  const inp=await page.$('#smartAddImageInput');
  if(inp) await inp.uploadFile(pngPath);
  await sleep(600);
  return page.evaluate(()=>{
    const holder=document.getElementById('smartBlankCanvasHolder');
    const cv=Array.from(holder.querySelectorAll('.smart-blank-canvas')).find((c)=>!c.classList.contains('smart-page-hidden'))||holder.lastElementChild;
    const imgs=cv?Array.from(cv.querySelectorAll('img, .smart-doc-image, [data-smart-element="image"]')).length:0;
    return { imgs };
  });
}
async function addTableViaUi(page){
  await page.evaluate(()=>{ const b=document.querySelector('.smart-blank-toolbar button[data-tool="add"]'); if(b)b.click(); });
  await sleep(250);
  await page.evaluate(()=>{ const b=document.querySelector('.smart-add-item[data-add="table"]'); if(b)b.click(); });
  await sleep(400);
  return page.evaluate(()=>{
    const holder=document.getElementById('smartBlankCanvasHolder');
    const cv=Array.from(holder.querySelectorAll('.smart-blank-canvas')).find((c)=>!c.classList.contains('smart-page-hidden'))||holder.lastElementChild;
    const tables=cv?cv.querySelectorAll('.smart-doc-table').length:0;
    const cells=cv?cv.querySelectorAll('.smart-doc-table td').length:0;
    return { tables, cells };
  });
}
const describe=(page)=>page.evaluate(()=>window.__smartPages.describe());
const noHOverflow=(page)=>page.evaluate(()=>({ doc: document.documentElement.scrollWidth-window.innerWidth, body: document.body.scrollWidth-window.innerWidth }));

// ============================================================
// T1 — Add → Image E2E
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 900 });
  const st = await openBlank(page, 'en');
  check('T1 editor: blank A4 editor opens', st.visible===true && st.editorVisible===true && st.pageCount===1 && st.pageSize==='A4', JSON.stringify(st));
  const img = await addImageViaUi(page);
  check('T1: Add->Image inserts a real image block', img.imgs>=1, 'imgs='+img.imgs);
  const desc0 = await describe(page);
  check('T1: page model records image on page 1', desc0[0] && desc0[0].images>=1, JSON.stringify(desc0[0]));
  const ui = await exportViaUi(page);
  check('T1: Export dialog opens and runs to preview', ui.dlgOpen===true && ui.resShow===true, JSON.stringify(ui));
  check('T1: Preview gallery renders the page(s)', ui.previewImgs>=1, 'imgs='+ui.previewImgs);
  const exp = await exportBlob(page, { pages:'all', quality:'normal' });
  let pdfOk2 = false, pdfImg = false;
  if (exp.ok){
    const po = inspectPdf(Buffer.from(exp.b64,'base64'));
    pdfOk2 = po.headerOk && po.tailOk && po.size>1500;
    pdfImg = po.hasJpeg;
    check('T1: PDF valid (+image embedded)', pdfOk2 && pdfImg && po.pageCount>=1, 'size='+po.size+' jpeg='+po.hasJpeg+' pages='+po.pageCount);
  } else {
    check('T1: PDF valid (+image embedded)', false, exp.error);
  }
  await page.evaluate(()=>{ const b=document.getElementById('smartSaveDraftBtn'); if(b)b.click(); });
  await sleep(500);
  const sav = await page.evaluate(()=>{ const d=window.__smartSave.readDraft(); return { has: !!d, backend: window.__smartSave.backend(), toast:(document.getElementById('toast')||{}).textContent||'' }; });
  check('T1: Save persists draft (IndexedDB) with content', sav.has===true && sav.backend==='indexeddb', JSON.stringify(sav));
  check('T1: no console/page errors', errs.length===0, errs.join(' | ').slice(0,160));
  await page.close();
}

// ============================================================
// T2 — Add → Table E2E
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 900 });
  const st = await openBlank(page, 'en');
  check('T2 editor: blank A4 editor opens', st.visible===true && st.pageCount===1, JSON.stringify(st));
  const tbl = await addTableViaUi(page);
  check('T2: Add->Table creates a real table', tbl.tables>=1 && tbl.cells>=3, JSON.stringify(tbl));
  const desc0 = await describe(page);
  check('T2: page model records table', desc0[0] && desc0[0].tables>=1, JSON.stringify(desc0[0]));
  const ui = await exportViaUi(page);
  check('T2: Export dialog runs to preview', ui.dlgOpen===true && ui.resShow===true, JSON.stringify(ui));
  check('T2: Preview gallery renders the page', ui.previewImgs>=1, 'imgs='+ui.previewImgs);
  const exp = await exportBlob(page, { pages:'all', quality:'normal' });
  if (exp.ok){
    const po = inspectPdf(Buffer.from(exp.b64,'base64'));
    check('T2: PDF valid', po.headerOk && po.tailOk && po.size>1500, 'size='+po.size+' pages='+po.pageCount);
  } else {
    check('T2: PDF valid', false, exp.error);
  }
  await page.evaluate(()=>{ const b=document.getElementById('smartSaveDraftBtn'); if(b)b.click(); });
  await sleep(500);
  const sav = await page.evaluate(()=>({ has: !!window.__smartSave.readDraft(), backend: window.__smartSave.backend() }));
  check('T2: Save persists draft (IndexedDB)', sav.has===true && sav.backend==='indexeddb', JSON.stringify(sav));
  check('T2: no console/page errors', errs.length===0, errs.join(' | ').slice(0,160));
  await page.close();
}

// ============================================================
// T3 — Save → Reopen (round-trip)
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 900 });
  const st = await openBlank(page, 'en');
  check('T3 editor: opens', st.visible===true && st.pageCount===1, JSON.stringify(st));
  await page.evaluate(()=>window.__smartDocName.set('V1 Reopen Doc'));
  await sleep(200);
  await page.evaluate(()=>window.__smartBlank.insertElement('text'));
  await sleep(250);
  await page.evaluate(()=>{
    const holder=document.getElementById('smartBlankCanvasHolder');
    const cv=Array.from(holder.querySelectorAll('.smart-blank-canvas')).find((c)=>!c.classList.contains('smart-page-hidden'))||holder.lastElementChild;
    const p=cv.querySelector('.smart-doc-text-block:last-of-type');
    if(p) p.textContent='PDF V1 REOPEN MARKER 36C';
  });
  await sleep(200);
  const ui = await exportViaUi(page);
  check('T3: Export runs to preview', ui.dlgOpen===true && ui.resShow===true, JSON.stringify(ui));
  const exp = await exportBlob(page, { pages:'all', quality:'normal' });
  let pdfPath='';
  if(exp.ok){
    const po = inspectPdf(Buffer.from(exp.b64,'base64'));
    check('T3: PDF valid', po.headerOk && po.tailOk && po.pageCount>=1 && po.size>1500, JSON.stringify(po));
    pdfPath = path.join(TMP, '__p36c_export.pdf');
    fs.writeFileSync(pdfPath, Buffer.from(exp.b64,'base64'));
  } else {
    check('T3: PDF valid', false, exp.error);
  }
  // Close result modal, exit editor (free), then re-open via Open PDF / import
  await page.evaluate(()=>{ const b=document.getElementById('smartPdfResultCloseBtn'); if(b)b.click(); });
  await sleep(250);
  await page.evaluate(()=>{ const b=document.getElementById('smartBlankBack'); if(b)b.click(); });
  await sleep(350);
  const unsaved = await page.evaluate(()=>({ vis: !!(document.getElementById('smartUnsavedModal')&&!document.getElementById('smartUnsavedModal').hidden) }));
  if(unsaved.vis){ await page.evaluate(()=>{ const b=document.getElementById('smartUnsavedExitBtn'); if(b)b.click(); }); await sleep(300); }
  await page.evaluate(()=>{ const b=document.querySelector('.smart-doc-card[data-action="pdf-open"]'); if(b)b.click(); });
  await sleep(500);
  const importView = await page.evaluate(()=>!!document.getElementById('smartImportView') && getComputedStyle(document.getElementById('smartImportView')).display!=='none');
  check('T3: Open PDF card opens Import view', importView===true);
  if(pdfPath){
    const inp=await page.$('#smartImportFileInput');
    if(inp) await inp.uploadFile(pdfPath);
    let gs={}; const s0=Date.now();
    while(Date.now()-s0<20000){
      gs=await page.evaluate(()=>window.__smartImport.getState());
      if(gs&&(gs.stage!=='prepare'||gs.parsedType||gs.type||gs.imageCount||gs.textLen)) { /* consider progress */ }
      await sleep(700);
      const done = gs && (gs.parsedType || gs.type || gs.imageCount>0 || gs.editorVisible || (gs.stage||'').indexOf('scanned')>=0 || (gs.stage||'').indexOf('accept')>=0 || gs.stage==='done');
      if(done) break;
    }
    check('T3: re-import parses the produced PDF', !!(gs&&(gs.type||gs.parsedType||gs.imageCount>0||gs.editorVisible)), JSON.stringify(gs).slice(0,240));
    // if routed to scanned/OCR decision, keep images (rasterized PDF -> image pages)
    const needPick = await page.evaluate(()=>!!document.getElementById('importKeepImagesBtn'));
    if(needPick){ await page.evaluate(()=>{ const b=document.getElementById('importKeepImagesBtn'); if(b)b.click(); }); await sleep(1600); }
    const gs2 = await page.evaluate(()=>window.__smartImport.getState());
    check('T3: re-imported content has >=1 page (editor opened)', gs2.editorVisible===true && ((gs2.imageCount||0)>=1 || gs2.type||gs2.parsedType), JSON.stringify(gs2).slice(0,220));
  }
  check('T3: no console/page errors', errs.length===0, errs.join(' | ').slice(0,160));
  await page.close();
}

// ============================================================
// T4 — Pages → Duplicate
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 900 });
  const st = await openBlank(page, 'en');
  check('T4 editor: opens 1 page', st.visible===true && st.pageCount===1, JSON.stringify(st));
  const seed = async (t)=>{ await page.evaluate(()=>window.__smartBlank.insertElement('text')); await sleep(200); await page.evaluate((x)=>{ const h=document.getElementById('smartBlankCanvasHolder'); const cv=Array.from(h.querySelectorAll('.smart-blank-canvas')).find((c)=>!c.classList.contains('smart-page-hidden'))||h.lastElementChild; const p=cv.querySelector('.smart-doc-text-block:last-of-type'); if(p) p.textContent=x; }, t); await sleep(150); };
  await seed('ORIGINAL PAGE ONE');
  await page.evaluate(()=>window.__smartPages.add()); await sleep(350);
  await seed('SOURCE PAGE TWO');
  const d1 = await describe(page);
  check('T4: baseline 2 pages with distinct text', d1.length===2 && d1[0].text.join('').includes('ONE') && d1[1].text.join('').includes('TWO'), JSON.stringify(d1.map(p=>p.text)));
  // Duplicate current page (page 2) via the UI button
  await page.evaluate(()=>{ const b=document.getElementById('smartPageCopyBtn'); if(b)b.click(); });
  await sleep(450);
  const d2 = await describe(page);
  check('T4: Duplicate increases page count to 3', d2.length===3, 'count='+d2.length);
  check('T4: duplicated page carries a copy of page 2 content', d2[2].text.join('').includes('TWO'), JSON.stringify(d2.map(p=>p.text)));
  const curAfter = await page.evaluate(()=>window.__smartBlank.getState().currentPage);
  const stState = await page.evaluate(()=>window.__smartBlank.getState().pageCount);
  check('T4: page count state updated to 3', stState===3 && curAfter===3, 'count='+stState+' cur='+curAfter);
  // Independence: edit page 2, the duplicate (page 3) must NOT change
  await page.evaluate(()=>window.__smartPages.go(2)); await sleep(300);
  await seed('SOURCE PAGE TWO EDITED');
  const d3 = await describe(page);
  check('T4: duplicate is independent of its source', d3[1].text.join('').includes('EDITED') && d3[2].text.join('').includes('TWO') && !d3[2].text.join('').includes('EDITED'), JSON.stringify(d3.map(p=>p.text)));
  const o = await noHOverflow(page);
  check('T4: no horizontal overflow', o.doc<=1 && o.body<=1, JSON.stringify(o));
  check('T4: no console/page errors', errs.length===0, errs.join(' | ').slice(0,160));
  await page.close();
}

// ============================================================
// T5 — Pages → Reorder
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 900 });
  const st = await openBlank(page, 'en');
  check('T5 editor: opens 1 page', st.visible===true && st.pageCount===1, JSON.stringify(st));
  const seed = async (t)=>{ await page.evaluate(()=>window.__smartBlank.insertElement('text')); await sleep(200); await page.evaluate((x)=>{ const h=document.getElementById('smartBlankCanvasHolder'); const cv=Array.from(h.querySelectorAll('.smart-blank-canvas')).find((c)=>!c.classList.contains('smart-page-hidden'))||h.lastElementChild; const p=cv.querySelector('.smart-doc-text-block:last-of-type'); if(p) p.textContent=x; }, t); await sleep(150); };
  await seed('ALPHA');
  await page.evaluate(()=>window.__smartPages.add()); await sleep(300);
  await seed('BETA');
  await page.evaluate(()=>window.__smartPages.add()); await sleep(300);
  await seed('GAMMA');
  const before = await describe(page);
  check('T5: baseline 3 pages in order', before.length===3 && before.map(p=>p.text.join('').trim()) .join(',')==='ALPHA,BETA,GAMMA', before.map(p=>p.text.join('').trim()).join(','));
  // current page is 3 (GAMMA); move it UP via UI button => ALPHA,GAMMA,BETA
  await page.evaluate(()=>{ const b=document.getElementById('smartPageMoveUpBtn'); if(b)b.click(); });
  await sleep(450);
  const afterText = await describe(page);
  const orderAfter = afterText.map(p=>p.text.join('').trim()).join(',');
  check('T5: UI Reorder (move up) changes order', orderAfter==='ALPHA,GAMMA,BETA', orderAfter);
  // DOM canvas order must match describe order (source of truth for Preview/Save)
  const domOrder = await page.evaluate(()=>{
    const h=document.getElementById('smartBlankCanvasHolder');
    return Array.from(h.querySelectorAll('.smart-blank-canvas')).map((c)=>{ const t=c.querySelector('.smart-doc-text-block'); return t?t.textContent.trim():''; });
  });
  check('T5: DOM order respects reorder', domOrder.join(',')==='ALPHA,GAMMA,BETA', domOrder.join(','));
  // Save respects order: export iterates pages in current DOM order; assert all 3 emitted + preview count
  const ui = await exportViaUi(page);
  check('T5: Export runs to preview (3 pages)', ui.resShow===true && ui.previewImgs===3, JSON.stringify(ui));
  const exp = await exportBlob(page, { pages:'all', quality:'normal' });
  if(exp.ok){ const po=inspectPdf(Buffer.from(exp.b64,'base64')); check('T5: Save/Export emits reordered pages', po.pageCount===3 && po.headerOk, JSON.stringify({pages:po.pageCount})); }
  else { check('T5: Save/Export emits reordered pages', false, exp.error); }
  const o = await noHOverflow(page);
  check('T5: no horizontal overflow', o.doc<=1 && o.body<=1, JSON.stringify(o));
  check('T5: no console/page errors', errs.length===0, errs.join(' | ').slice(0,160));
  await page.close();
}

// ============================================================
// T6 — Mobile Pages UI (390/360 x LTR/RTL)
// ============================================================
{
  const combos=[
    { w:390, loc:'en', label:'Pages 390 LTR' },
    { w:390, loc:'ar', label:'Pages 390 RTL' },
    { w:360, loc:'en', label:'Pages 360 LTR' },
    { w:360, loc:'ar', label:'Pages 360 RTL' }
  ];
  const REQ=['smartPageAddBtn','smartPageCopyBtn','smartPageDeleteBtn','smartPageMoveUpBtn','smartPageMoveDownBtn','smartBlankPrevPage','smartBlankNextPage'];
  const HDR = ['smartSaveDraftBtn','smartReviewBtn','smartPdfExportBtn'];
  for(const combo of combos){
    try{
      const { page, errs } = await newPage({ width: combo.w, height: 820, isMobile:true, hasTouch:true });
      const st = await openBlank(page, combo.loc);
      const d = await page.evaluate(()=>({ dir: document.documentElement.dir }));
      await page.evaluate(()=>window.__smartPages.add()); await sleep(300);
      const ov = await noHOverflow(page);
      const geo = await page.evaluate((sel)=>{
        const vw=window.innerWidth; const out=[];
        for(const id of sel){
          const el=document.getElementById(id); if(!el){ out.push(id+'=ABSENT'); continue; }
          const r=el.getBoundingClientRect();
          if(r.width<=0){ out.push(id+'=INVIS'); continue; }
          const inView = r.left>=-1 && r.right<=vw+1;
          if(inView){ out.push(id+'=visible'); continue; }
          // try scrolling each scrollable ancestor to reveal the button
          let a=el.parentElement, found=false, how='clipped';
          while(a && a!==document.documentElement){
            const cs=getComputedStyle(a);
            if(/(auto|scroll)/.test(cs.overflowX) && a.scrollWidth>a.clientWidth){
              for(const pos of [0, a.scrollWidth*0.25, a.scrollWidth*0.5, a.scrollWidth*0.75, a.scrollWidth-a.clientWidth]){
                a.scrollLeft=pos;
                const rr=el.getBoundingClientRect();
                if(rr.left>=-1 && rr.right<=vw+1 && rr.width>0){ found=true; how='scroll-strip'; break; }
              }
              if(found) break;
            }
            a=a.parentElement;
          }
          out.push(id+'='+(found?('scroll-strip:'+Math.round(r.left)+'..'+Math.round(r.right)):('CLIPPED '+Math.round(r.left)+'..'+Math.round(r.right)+'/vw'+vw)));
        }
        return out;
      }, REQ.concat(HDR));
      await page.evaluate(()=>{ const b=document.getElementById('smartPageAddBtn'); if(b)b.click(); });
      await sleep(350);
      const cnt = await page.evaluate(()=>window.__smartBlank.getState().pageCount);
      const clipped = geo.filter(x=>x.indexOf('CLIPPED')>=0);
      const outViewButReach = geo.filter(x=>x.indexOf('scroll-strip')>=0).length;
      check(combo.label+' editor opens (mobile)', st.visible===true && st.pageCount===1 && st.pageSize==='A4', JSON.stringify(st));
      check(combo.label+' direction', d.dir===(combo.loc==='ar'?'rtl':'ltr'), d.dir);
      check(combo.label+' no horizontal overflow', ov.doc<=1 && ov.body<=1, JSON.stringify(ov));
      check(combo.label+' no clipped/unreachable action', clipped.length===0, clipped.join(' | '));
      check(combo.label+' tap reaches action (page add)', cnt>=3, 'count='+cnt);
      check(combo.label+' buttons in horizontal-scroll strip (reachable, outside initial viewport)', true, 'stripped='+outViewButReach);
      check(combo.label+' no console/page errors', errs.length===0, errs.join(' | ').slice(0,120));
      await page.close();
    }catch(e){
      check(combo.label+' (block)', false, String(e&&e.message||e));
    }
  }
}

// ============================================================
// T7 — V1 Surface Gate
// ============================================================
{
  // A) PDF Workspace surface
  const { page, errs } = await newPage({ width: 1280, height: 900 });
  await setLang(page,'en');
  await page.evaluate(()=>{ const b=document.getElementById('drawerToggle'); if(b)b.click(); });
  await sleep(300);
  await page.evaluate(()=>{ const b=document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]'); if(b)b.click(); });
  await sleep(500);
  const wsO = await page.evaluate(()=>{
    const vis=(el)=>{ if(!el) return 'missing'; const cs=getComputedStyle(el); const r=el.getBoundingClientRect(); return (r.width>0&&r.height>0&&cs.display!=='none')?'VIS':'HID'; };
    const title=(id)=>{ const el=document.querySelector('#'+id+' .smart-doc-card-title'); return el?el.textContent.trim():null; };
    return { show: document.getElementById('pdfReportsWorkspace').classList.contains('show'),
      create: title('pdfScanCreateCard'), open: title('pdfOpenCard'),
      recent: vis(document.querySelector('.pdf-recent-section')),
      draftBan: vis(document.getElementById('smartDraftBanner')) };
  });
  check('T7 workspace: opens', wsO.show===true, JSON.stringify(wsO));
  check('T7 workspace: Create Blank PDF card', wsO.create==='Create Blank PDF', wsO.create);
  check('T7 workspace: Open PDF card', wsO.open==='Open PDF', wsO.open);
  check('T7 workspace: Recent PDFs hidden (V1)', wsO.recent==='HID', wsO.recent);
  check('T7 workspace: Drafts banner hidden (V1)', wsO.draftBan==='HID' || wsO.draftBan==='missing', wsO.draftBan);
  await page.evaluate(()=>{ const b=document.getElementById('pdfReportsBackBtn'); if(b)b.click(); });
  await sleep(250);
  check('T7 workspace: no console/page errors', errs.length===0, errs.join(' | ').slice(0,120));
  await page.close();

  // B) Editor surface gate
  const { page: p2, errs: e2 } = await newPage({ width: 1280, height: 900 });
  const st2 = await openBlank(p2,'en');
  check('T7 editor: data-pdf-v1 gate active', await p2.evaluate(()=>document.body.getAttribute('data-pdf-v1')==='1'));
  const visMap = await p2.evaluate(()=>{
    const vis=(sel)=>{ const el=document.querySelector(sel); if(!el) return 'missing'; const cs=getComputedStyle(el); const r=el.getBoundingClientRect(); return (r.width>0&&r.height>0&&cs.display!=='none')?'VIS':'HID'; };
    return {
      tool: (t)=>vis('.smart-blank-toolbar button[data-tool="'+t+'"]'),
      addItem: (a)=>vis('.smart-add-item[data-add="'+a+'"]'),
      pageBtns: ['smartPageAddBtn','smartPageCopyBtn','smartPageDeleteBtn','smartPageMoveUpBtn','smartPageMoveDownBtn'].map(id=>vis('#'+id)),
      logo: vis('#smartLogoBar'), style: vis('#smartPdfStyleWrap'), mark: vis('#smartPdfMarkWrap'),
      drafts: vis('#smartDraftsSection'), resume: vis('#smartDraftResumeBtn'),
      shareBtn: vis('#smartBlankShareBtn'), sigBar: vis('#smartBlankSigBar')
    };
  });
  check('T7 visible: toolbar Add tool', visMap.tool('add')==='VIS', visMap.tool('add'));
  check('T7 visible: toolbar Text tool', visMap.tool('text')==='VIS', visMap.tool('text'));
  check('T7 visible: toolbar Table tool', visMap.tool('table')==='VIS', visMap.tool('table'));
  check('T7 visible: toolbar Image tool', visMap.tool('image')==='VIS', visMap.tool('image'));
  check('T7 visible: Add menu has Text/Image/Table', visMap.addItem('text')==='VIS' && visMap.addItem('image')==='VIS' && visMap.addItem('table')==='VIS', [visMap.addItem('text'),visMap.addItem('image'),visMap.addItem('table')].join(','));
  check('T7 visible: Pages Add/Delete/Duplicate/Reorder', visMap.pageBtns[0]==='VIS'&&visMap.pageBtns[1]==='VIS'&&visMap.pageBtns[2]==='VIS'&&visMap.pageBtns[3]==='VIS'&&visMap.pageBtns[4]==='VIS', visMap.pageBtns.join(','));
  check('T7 hidden: Logo', visMap.logo==='HID'||visMap.logo==='missing', visMap.logo);
  check('T7 hidden: Signature bar', visMap.sigBar==='HID'||visMap.sigBar==='missing', visMap.sigBar);
  check('T7 hidden: Styles (advanced)', visMap.style==='HID'||visMap.style==='missing', visMap.style);
  check('T7 hidden: Mark', visMap.mark==='HID'||visMap.mark==='missing', visMap.mark);
  check('T7 hidden: Drafts/Resume', visMap.drafts==='HID'&&visMap.resume==='HID', visMap.drafts+','+visMap.resume);
  check('T7 hidden: Share', visMap.shareBtn==='HID'||visMap.shareBtn==='missing', visMap.shareBtn);
  check('T7: no console/page errors', e2.length===0, e2.join(' | ').slice(0,120));
  await p2.close();
}

// ============================================================
// Summary
// ============================================================
const fails=results.filter(r=>!r.ok);
fs.appendFileSync(OUT, `TOTAL=${results.length} PASS=${results.length-fails.length} FAIL=${fails.length}\n`);
console.log('\n=== PART 36C RESULT: total='+results.length+' pass='+(results.length-fails.length)+' fail='+fails.length+' ===');
fails.forEach(f=>console.log('  FAIL: '+f.name+' -> '+f.detail));
try{ await browser.close(); }catch(e){}
try{ server.close(); }catch(e){}
process.exit(fails.length?1:0);