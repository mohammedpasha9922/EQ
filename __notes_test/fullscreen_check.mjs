// FULL-SCREEN Notes UX verification (test-only artifact; modifies nothing).
// Drives real Chrome via puppeteer-core, measures DOM geometry of the Notes
// Manager + Note Editor across desktop/tablet/mobile viewports, and checks
// open/close + create/edit/auto-save still work, with console error capture.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const STORAGE_KEY = 'eq-note-manager-notes';
const FOLDERS_KEY = 'eq-note-folders';
const PORT = 8197;
const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.ico':'image/x-icon','.svg':'image/svg+xml' };
const out = [];
function log(s){ out.push(s); console.log(s); }
function check(name, ok, detail=''){ log((ok?'PASS':'FAIL')+'  '+name+(detail?' -> '+detail:'')); }

const server = http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p==='/'||p==='') p='/index.html';
  const fp = path.join(ROOT, p);
  try { const d = fs.readFileSync(fp); res.writeHead(200,{'Content-Type':(MIME[path.extname(fp).toLowerCase()]||'application/octet-stream')+'; charset=utf-8'}); res.end(d); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(r=>server.listen(PORT,r));

let browser;
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const fmt = n => n==null?'null':(Math.round(n*10)/10);
async function openNotes(page){
  await page.evaluate(()=>{ const b=document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if(b)b.click(); });
  await page.waitForSelector('#notesManagerModal.show',{visible:true,timeout:5000});
}
async function measure(page, sel){
  return await page.evaluate((sel)=>{
    const el = document.querySelector(sel);
    if(!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const vp = { w: innerWidth, h: innerHeight };
    return { x:r.x, y:r.y, w:r.width, h:r.height, radius:cs.borderRadius,
             clw:cs.width, clh:cs.height, transform:cs.transform,
             baseTransform:(getComputedStyle(el).transform) };
  }, sel);
}
async function measureSettled(page, sel, vw, vh){
  const start = Date.now();
  let last = null;
  while (Date.now() - start < 4500){
    last = await measure(page, sel);
    // settled when the entrance ease has reached the visible viewport (sub-pixel tail ignored)
    if (last && Math.abs(last.w - vw) < 2 && Math.abs(last.h - vh) < 2 && last.x > -1 && last.y > -1){
      return { settled:true, ...last };
    }
    await sleep(150);
  }
  return { settled:false, ...last };
}
function arrayHas(arr, title){ return Array.isArray(arr) && arr.some(n=>n.title===title); }

async function runViewport(width, height){
  log('\n=== VIEWPORT ' + width + 'x' + height + ' ===');
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  let pageErr = [];
  page.on('pageerror', e => pageErr.push(e.message));
  page.on('response', r => { if (r.status() >= 400) log('HTTP ' + r.status() + ' ' + r.url().slice(0,80)); });
  page.on('requestfailed', r => log('REQFAIL ' + r.url().slice(0,80) + ' :: ' + (r.failure() ? r.failure().errorText : '')));
  await page.goto('http://127.0.0.1:'+PORT+'/', { waitUntil:'networkidle0', timeout:25000 });
  log('after goto url=' + await page.evaluate(()=>location.href).catch(()=>'ERR'));
  await sleep(400);
  try {
    await page.evaluate((a,b)=>{ localStorage.removeItem(a); localStorage.removeItem(b); }, STORAGE_KEY, FOLDERS_KEY);
    await page.reload({ waitUntil:'networkidle0', timeout:25000 });
    await sleep(400);
  } catch (e) {
    const info = await page.evaluate(() => ({ url: location.href, hasLS: (()=>{ try { localStorage.getItem('x'); return true; } catch { return false; } })() })).catch(()=>({url:'ERR',hasLS:false}));
    log('WARN localStorage clear skipped on ' + JSON.stringify(info) + ': ' + e.message);
  }

  await openNotes(page);
  let m = await measureSettled(page, '.notes-manager', width, height);
  check('Manager covers full viewport (w/h/x/y)', m.settled && Math.abs(m.w-width)<2 && Math.abs(m.h-height)<2 && Math.abs(m.x)<1 && Math.abs(m.y)<1 && m.clw===(width+'px') && m.clh===(height+'px'),
    m?`box=${fmt(m.x)},${fmt(m.y)} ${fmt(m.w)}x${fmt(m.h)} vp=${width}x${height} cssW=${m.clw} cssH=${m.clh} tr=${m.transform} settled=${m.settled}`:'hidden');
  check('Manager has no rounded window corners', !!m && (m.radius==='0px'||m.radius==='0px 0px 0px 0px'), m?('radius='+m.radius):'n/a');

  await page.evaluate(()=>{ const b=document.getElementById('openNewNoteButton'); if(b)b.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show',{visible:true,timeout:5000});
  let e = await measureSettled(page, '.full-screen-note', width, height);
  check('Editor covers full viewport', e.settled && Math.abs(e.w-width)<2 && Math.abs(e.h-height)<2 && Math.abs(e.x)<1 && Math.abs(e.y)<1 && e.clw===(width+'px') && e.clh===(height+'px'),
    e?`box=${fmt(e.x)},${fmt(e.y)} ${fmt(e.w)}x${fmt(e.h)} cssW=${e.clw} cssH=${e.clh} tr=${e.transform} settled=${e.settled}`:'hidden');
  check('Editor has no rounded window corners', !!e && (e.radius==='0px'||e.radius==='0px 0px 0px 0px'), e?('radius='+e.radius):'n/a');

  const title = 'FS_'+width+'x'+height;
  await page.click('#noteTitleInput');
  await page.type('#noteTitleInput', title);
  await page.click('#noteBodyInput');
  await page.type('#noteBodyInput', 'body text');
  await sleep(900);
  const stored = await page.evaluate(k => { try { return JSON.parse(localStorage.getItem(k)||'[]'); } catch { return []; } }, STORAGE_KEY);
  check('CREATE+auto-save works (stored note)', arrayHas(stored, title));

  await page.click('#closeFullScreenNote').catch(()=>{});
  await sleep(200);
  const editorGone = await page.evaluate(()=> !document.querySelector('#fullScreenNoteModal.show'));
  await page.click('#closeNotesManager').catch(()=>{});
  await sleep(200);
  const managerGone = await page.evaluate(()=> !document.querySelector('#notesManagerModal.show'));
  check('Close editor returns to Manager', editorGone);
  check('Close Manager returns to previous screen', managerGone);

  check('No uncaught page errors (full-screen flow)', pageErr.length===0, pageErr.length?pageErr[0].slice(0,200):'clean');
  await page.close();
  return stored;
}


try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless:'new', args:['--no-sandbox','--disable-gpu'] });
  const desk = await runViewport(1440, 900);
  const tab  = await runViewport(820, 1180);
  const mob  = await runViewport(390, 844);

  // EDIT preserved across the CSS-only change (reopen existing note, change, autosaves)
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://127.0.0.1:'+PORT+'/', { waitUntil:'networkidle0', timeout:25000 });
  await openNotes(page);
  await page.click('#notesList .note-item');
  await page.waitForSelector('#fullScreenNoteModal.show',{visible:true,timeout:5000});
  const titleBefore = await page.evaluate(()=>document.getElementById('noteTitleInput').value);
  await page.evaluate(()=>{ const el=document.getElementById('noteTitleInput'); el.value=el.value+' EDITED'; el.dispatchEvent(new Event('input',{bubbles:true})); });
  await sleep(800);
  const storedAfter = await page.evaluate(k=>{ try{return JSON.parse(localStorage.getItem(k)||'[]');}catch{return[];} }, STORAGE_KEY);
  const matched = storedAfter.find(n=>n.title===titleBefore+' EDITED');
  check('EDIT persists after reopening existing note (id/auto-save)', !!matched && !!matched.id && matched.title===titleBefore+' EDITED',
    matched?('id='+matched.id):'missing');
  check('Notes from all three viewports persisted (no data loss)',
    arrayHas(desk,'FS_1440x900') && arrayHas(tab,'FS_820x1180') && arrayHas(mob,'FS_390x844'),
    'desk='+arrayHas(desk,'FS_1440x900')+' tab='+arrayHas(tab,'FS_820x1180')+' mob='+arrayHas(mob,'FS_390x844'));
  await page.close();
} catch (err) {
  log('HARNESS ERROR: ' + err.message);
} finally {
  if (browser) await browser.close();
  server.close();
}
const pass = out.filter(l=>l.startsWith('PASS')).length;
const fail = out.filter(l=>l.startsWith('FAIL')).length;
log('\n==== RESULT: ' + pass + ' passed, ' + fail + ' failed, ' + (pass+fail) + ' total ====');
fs.writeFileSync(path.join('c:\\Users\\SHCH-HR\\Desktop\\EQ\\__notes_test','fullscreen_out.txt'), out.join('\n'), 'utf8');
process.exit(fail?1:0);
