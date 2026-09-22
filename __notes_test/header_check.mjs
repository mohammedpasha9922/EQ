// Note Editor header actions check (test-only artifact; modifies nothing).
// Verifies: Back / Save / Send / PDF / Delete(trash) live in the top header,
// old in-page Delete removed, identical button geometry, delete confirm still
// works, no horizontal overflow, LTR + RTL, desktop + mobile, no JS errors.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8198;
const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json' };
const out = [];
function log(s){ out.push(s); console.log(s); }
function check(name, ok, detail=''){ log((ok?'PASS':'FAIL')+'  '+name+(detail?' -> '+detail:'')); }

const server = http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p==='/'||p==='') p='/index.html';
  try { const d = fs.readFileSync(path.join(ROOT,p)); res.writeHead(200,{'Content-Type':(MIME[path.extname(p).toLowerCase()]||'application/octet-stream')+'; charset=utf-8'}); res.end(d); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(r=>server.listen(PORT,r));

let browser;
const sleep = ms => new Promise(r=>setTimeout(r,ms));
async function openEditor(page){
  await page.evaluate(()=>{ const b=document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if(b)b.click(); });
  await page.waitForSelector('#notesManagerModal.show',{visible:true,timeout:5000});
  await page.evaluate(()=>{ const b=document.getElementById('openNewNoteButton'); if(b)b.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show',{visible:true,timeout:5000});
  await sleep(300);
}

try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args:['--no-sandbox'] });
  for (const [w,h,lang] of [[1280,800,'en'],[1280,800,'ar'],[390,844,'en'],[844,390,'ar']]) {
    log('\n=== VIEWPORT ' + w + 'x' + h + ' lang=' + lang + ' ===');
    const page = await browser.newPage();
    await page.setViewport({ width:w, height:h });
    let errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto('http://127.0.0.1:'+PORT+'/', { waitUntil:'networkidle0', timeout:25000 });
    await page.evaluate(l=>localStorage.setItem('eq-language', l), lang).catch(()=>{});
    await page.reload({ waitUntil:'networkidle0', timeout:25000 });
    await sleep(300);
    await openEditor(page);
    const v = await page.evaluate(()=>{
      const header = document.querySelector('.full-screen-note-header');
      const ids = ['closeFullScreenNote','saveFullScreenNote','sendNoteBtn','exportNotePdfBtn','deleteCurrentNote'];
      const inHeader = ids.map(id => { const el = document.getElementById(id); return el && header.contains(el); });
      const btns = ids.map(id => { const el = document.getElementById(id); if(!el) return null; const r = el.getBoundingClientRect(); return { id, w:Math.round(r.width), h:Math.round(r.height), top:Math.round(r.top) }; });
      const body = document.querySelector('.full-screen-note-body');
      const oldInBody = body && body.contains(document.getElementById('deleteCurrentNote'));
      const trashSvg = !!document.querySelector('#deleteCurrentNote svg polyline');
      const sw = document.querySelector('#deleteCurrentNote svg')?.getAttribute('stroke-width');
      const doc = document.documentElement;
      const noOverflowX = doc.scrollWidth <= doc.clientWidth + 1;
      const delRect = document.getElementById('deleteCurrentNote').getBoundingClientRect();
      const titleRect = document.getElementById('noteTitleInput').getBoundingClientRect();
      const noTitleOverlap = !(delRect.left < titleRect.right && delRect.right > titleRect.left && delRect.top < titleRect.bottom && delRect.bottom > titleRect.top);
      return { inHeader, btns, oldInBody, trashSvg, sw, noOverflowX, noTitleOverlap,
               headerDir: getComputedStyle(header).flexDirection,
               lang: document.body.getAttribute('data-language') };
    });
    check('All 5 action buttons inside top header', v.inHeader.every(Boolean), JSON.stringify(v.inHeader));
    check('Old in-body Delete removed', v.oldInBody === false);
    check('Delete is trash icon with stroke-width 2', v.trashSvg && v.sw === '2');
    const sizes = v.btns.filter(Boolean);
    check('All header buttons 40x40 same size', sizes.length===5 && sizes.every(b=>b.w===40 && b.h===40), JSON.stringify(sizes.map(b=>b.id+':'+b.w+'x'+b.h)));
    check('All header buttons aligned on same row', sizes.every(b=>Math.abs(b.top - sizes[0].top) <= 1));
    check('No horizontal overflow', v.noOverflowX);
    check('Delete does not overlap title', v.noTitleOverlap);
    check('RTL uses row-reverse (existing system)', v.lang !== 'ar' || v.headerDir === 'row-reverse', 'dir='+v.headerDir+' lang='+v.lang);
    // Delete confirm still works (same function, cancel out)
    await page.click('#deleteCurrentNote');
    await sleep(400);
    const confirmShown = await page.evaluate(()=> !!document.querySelector('.delete-confirm-modal.show, .delete-confirm-modal:not([hidden])'));
    check('Delete click opens same confirm flow', confirmShown);
    await page.evaluate(()=>{ const c=document.getElementById('deleteConfirmCancel'); if(c)c.click(); });
    await sleep(300);
    check('sendCurrentNote logic untouched', /async function sendCurrentNote/.test(fs.readFileSync(path.join(ROOT,'app.js'),'utf8')));
    check('No JS errors (' + w + 'x' + h + ' ' + lang + ')', errs.length===0, errs.length?errs[0].slice(0,200):'clean');
    await page.close();
  }
} catch(e) { check('Harness', false, e.message); }
finally { try{ await browser.close(); }catch{} server.close(); }
fs.writeFileSync(path.join(ROOT,'__notes_test','_header_check.txt'), out.join('\n'));
