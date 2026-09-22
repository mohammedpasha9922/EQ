import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const ROOT = process.cwd();
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8403;
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json' };
const server = http.createServer((req,res)=>{ let u=decodeURIComponent(req.url.split('?')[0]); if(u===''||u==='/')u='/index.html'; try{ const d=fs.readFileSync(path.join(ROOT,u)); res.writeHead(200,{'Content-Type':(MIME[path.extname(u).toLowerCase()]||'application/octet-stream')}); res.end(d);}catch(e){res.writeHead(404);res.end('nf');} });
await new Promise(r=>server.listen(PORT,'127.0.0.1',r));
const URL='http://127.0.0.1:'+PORT+'/';
setTimeout(()=>process.exit(124), 120000);
const OUT=path.join(ROOT,'__p36c_t7b.txt');
try{ fs.unlinkSync(OUT); }catch(e){}
const check=(name,ok,detail='')=>{ const line=`${ok?'PASS':'FAIL'}  ${name}${detail?'  -> '+detail:''}`; console.log(line); fs.appendFileSync(OUT,line+'\n'); };
const browser = await puppeteer.launch({ executablePath:CHROME, headless:'new', protocolTimeout:120000, args:['--no-sandbox','--disable-gpu','--no-first-run','--disable-dev-shm-usage'] });
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const page = await browser.newPage();
await page.setViewport({width:1280,height:900});
let consErr=[]; page.on('console',(m)=>{ try{ const ty=typeof m.type==='function'?m.type():String(m.type||''); const txt=typeof m.text==='function'?m.text():String(m.text||''); if(ty==='error'&&!txt.includes('path')&&!/favicon/i.test(txt)) consErr.push(txt); }catch(e){} });
await page.goto(URL,{waitUntil:'domcontentloaded',timeout:45000});
await sleep(900);
// open blank editor (V1 editor)
await page.evaluate(()=>{ const b=document.getElementById('drawerToggle'); if(b)b.click(); }); await sleep(300);
await page.evaluate(()=>{ const b=document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]'); if(b)b.click(); }); await sleep(500);
await page.evaluate(()=>{ const b=document.querySelector('.smart-doc-card[data-action="smart-new-doc"]'); if(b)b.click(); }); await sleep(700);
// open the Add menu so its items are measurable
await page.evaluate(()=>{ const b=document.querySelector('.smart-blank-toolbar button[data-tool="add"]'); if(b)b.click(); }); await sleep(350);
check('T7 editor: data-pdf-v1 gate active', await page.evaluate(()=>document.body.getAttribute('data-pdf-v1')==='1'));
const v = await page.evaluate(()=>{
  const vis=(sel)=>{ const el=document.querySelector(sel); if(!el) return 'missing'; const cs=getComputedStyle(el); const r=el.getBoundingClientRect(); return (r.width>0&&r.height>0&&cs.display!=='none')?'VIS':'HID'; };
  const tool=(t)=>vis('.smart-blank-toolbar button[data-tool="'+t+'"]');
  const addItem=(a)=>vis('.smart-add-item[data-add="'+a+'"]');
  return {
    gate: document.body.getAttribute('data-pdf-v1'),
    add: tool('add'), text: tool('text'), table: tool('table'), image: tool('image'),
    signature: tool('signature'), logo: tool('logo'), divider: tool('divider'), border: tool('border'),
    pagenum: tool('page-number'), pageset: tool('page-settings'),
    aiText: addItem('text'), aiImage: addItem('image'), aiTable: addItem('table'), aiLogo: addItem('logo'), aiSig: addItem('signature'),
    pgAdd: vis('#smartPageAddBtn'), pgCopy: vis('#smartPageCopyBtn'), pgDel: vis('#smartPageDeleteBtn'), pgUp: vis('#smartPageMoveUpBtn'), pgDown: vis('#smartPageMoveDownBtn'),
    logoBar: vis('#smartLogoBar'), sigBar: vis('#smartBlankSigBar'), sigPanel: vis('#smartPdfSigPanel'),
    style: vis('#smartPdfStyleWrap'), mark: vis('#smartPdfMarkWrap'),
    drafts: vis('#smartDraftsSection'), resume: vis('#smartDraftResumeBtn'),
    shareBtn: vis('#smartBlankShareBtn')
  };
});
check('T7 visible: toolbar Add tool', v.add==='VIS', v.add);
check('T7 visible: toolbar Text tool', v.text==='VIS', v.text);
check('T7 visible: toolbar Table tool', v.table==='VIS', v.table);
check('T7 visible: toolbar Image tool', v.image==='VIS', v.image);
check('T7 hidden: toolbar Signature', v.signature==='HID', v.signature);
check('T7 hidden: toolbar Logo', v.logo==='HID', v.logo);
check('T7 hidden: toolbar Divider', v.divider==='HID', v.divider);
check('T7 hidden: toolbar Border', v.border==='HID', v.border);
check('T7 hidden: toolbar Page-number', v.pagenum==='HID', v.pagenum);
check('T7 hidden: toolbar Page-settings', v.pageset==='HID', v.pageset);
check('T7 visible: Add menu Text/Image/Table', v.aiText==='VIS'&&v.aiImage==='VIS'&&v.aiTable==='VIS', [v.aiText,v.aiImage,v.aiTable].join(','));
check('T7 hidden: Add menu Logo/Signature', v.aiLogo==='HID'&&v.aiSig==='HID', v.aiLogo+','+v.aiSig);
check('T7 visible: Pages Add/Delete/Duplicate/Reorder', v.pgAdd==='VIS'&&v.pgCopy==='VIS'&&v.pgDel==='VIS'&&v.pgUp==='VIS'&&v.pgDown==='VIS', [v.pgAdd,v.pgCopy,v.pgDel,v.pgUp,v.pgDown].join(','));
check('T7 hidden: Logo bar', v.logoBar==='HID'||v.logoBar==='missing', v.logoBar);
check('T7 hidden: Signature bar', v.sigBar==='HID'||v.sigBar==='missing', v.sigBar);
check('T7 hidden: Signature panel', v.sigPanel==='HID'||v.sigPanel==='missing', v.sigPanel);
check('T7 hidden: Styles (advanced)', v.style==='HID'||v.style==='missing', v.style);
check('T7 hidden: Mark', v.mark==='HID'||v.mark==='missing', v.mark);
check('T7 hidden: Drafts/Resume', v.drafts==='HID'&&v.resume==='HID', v.drafts+','+v.resume);
check('T7 hidden: Share', v.shareBtn==='HID'||v.shareBtn==='missing', v.shareBtn);
check('T7: no non-SVG console/page errors', consErr.length===0, consErr.join(' | ').slice(0,160));
await browser.close(); server.close();
let s=''; try{ s=fs.readFileSync(OUT,'utf8'); }catch(e){}
console.log('TOTAL_LINES='+s.split('\n').length);
process.exit(0);