// Reproduction probe for "Arabic RTL text overlap in History PDF export".
// Loads the real index.html, sets Arabic locale, injects the local html2pdf
// bundle (no CDN), calls the real buildHistoryPdfBlob() with Arabic+numbers
// entries, then renders the generated PDF page to a PNG for visual inspection.
// Also dumps the exact report HTML that buildHistoryPdfBlob produced.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT = path.join(ROOT, '__notes_test');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 0;
const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.ico':'image/x-icon','.svg':'image/svg+xml','.ttf':'font/ttf','.wasm':'application/wasm' };
const server = http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p==='/'||p==='') p='/index.html';
  const f = path.join(ROOT, p);
  try { const d = fs.readFileSync(f); res.writeHead(200, {'Content-Type':(MIME[path.extname(f).toLowerCase()]||'application/octet-stream')+'; charset=utf-8'}); res.end(d); }
  catch(e){ res.writeHead(404); res.end('nf'); }
});
await new Promise((r,rej)=>{ server.once('error',rej); server.listen(PORT,'127.0.0.1',r); });
const BASE = `http://127.0.0.1:${server.address().port}`;
const sleep = ms => new Promise(r=>setTimeout(r,ms));
setTimeout(()=>process.exit(124), 180000);

const browser = await puppeteer.launch({ executablePath: CHROME, headless:'new', args:['--no-sandbox','--disable-gpu','--no-first-run','--disable-dev-shm-usage'] });
try {
  const page = await browser.newPage();
  page.on('pageerror', e=>console.log('PAGEERROR:', String(e&&e.message||e)));
  await page.goto(`${BASE}/`, { waitUntil:'domcontentloaded', timeout:45000 });
  await page.setViewport({ width:1280, height:900 });
  await sleep(1500);

  // 1) Inject local html2pdf bundle so buildHistoryPdfBlob uses it (no CDN).
  const h2pdf = fs.readFileSync(path.join(ROOT,'__pdfdiag/vendor/h2pdf.js'),'utf8');
  await page.evaluate((src)=>{ const s=document.createElement('script'); s.textContent=src; document.head.appendChild(s); }, h2pdf);
  await sleep(500);

  // 2) Switch locale to Arabic via the app's own language control.
  await page.evaluate(()=>{
    const sel = document.getElementById('topBarLanguageSelect');
    if (sel) { sel.value='ar'; sel.dispatchEvent(new Event('change',{bubbles:true})); }
  });
  await sleep(900);

  // 3) Call the REAL (seam-exposed) buildHistoryPdfBlob with Arabic + numbers.
  const entries = [
    { id:'a1', expression:'250 + 75', result:'325', note:'فاتورة شهر أغسطس 2026' },
    { id:'a2', expression:'1250 x 4', result:'5,000', note:'قيمة المشروع 2026 بالألف' },
    { id:'a3', expression:'500 - 120', result:'380', note:'رصيد المحفظة بعد العملية' },
  ];
  const res = await page.evaluate(async (entries)=>{
    const R = { ok:false, error:null, reportHtml:'', b64:null, pdfSize:0, pages:0, frameCnt:0, hasSeam:false };
    try {
      if (typeof window.__historyPdfBlob !== 'function') { R.error='no seam'; return R; }
      R.hasSeam = true;
      const blob = await window.__historyPdfBlob(entries);
      const buf = new Uint8Array(await blob.arrayBuffer());
      R.pdfSize = buf.byteLength; R.ok = true;
      let bin=''; for (let i=0;i<buf.length;i+=8000) bin += String.fromCharCode.apply(null, buf.subarray(i,i+8000));
      R.b64 = btoa(bin);
      const frames = Array.from(document.querySelectorAll('iframe'));
      R.frameCnt = frames.length;
      if (frames.length) {
        try { const d = frames[0].contentDocument; if (d) R.reportHtml = d.documentElement.outerHTML; } catch(e){}
      }
    } catch (e) { R.error = String(e&&e.message||e); }
    return R;
  }, entries);
  console.log('build result ok=', res.ok, 'error=', res.error, 'pdfSize=', res.pdfSize, 'frames=', res.frameCnt);
  if (res.reportHtml) fs.writeFileSync(path.join(OUT,'_probe_history_report.html'), res.reportHtml, 'utf8');

  if (res.ok && res.b64) {
    // 4) Inject pdf.js and render page 1 to PNG.
    await page.addScriptTag({ url:`${BASE}/__pdfdiag/vendor/pdf.min.js` });
    await sleep(500);
    const png = await page.evaluate(async ({b64, base})=>{
      pdfjsLib.GlobalWorkerOptions.workerSrc = `${base}/__pdfdiag/vendor/pdf.worker.min.js`;
      const bytes = atob(b64).split('').map(c=>c.charCodeAt(0));
      const arr = new Uint8Array(bytes.length); for(let i=0;i<bytes.length;i++) arr[i]=bytes[i];
      const pdf = await pdfjsLib.getDocument({ data: arr }).promise;
      const page = await pdf.getPage(1);
      const vp = page.getViewport({ scale: 1.6 });
      const cv = document.createElement('canvas');
      cv.width = vp.width; cv.height = vp.height;
      await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
      return cv.toDataURL('image/png');
    }, {b64: res.b64, base: BASE});
    const b = png.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(path.join(OUT,'_probe_history_rtl_p1.png'), Buffer.from(b,'base64'));
    console.log('wrote _probe_history_rtl_p1.png');
  } else {
    console.log('NO PDF PRODUCED; report HTML length =', res.reportHtml.length);
  }
} catch (err) {
  console.error('HARNESS ERROR:', err&&err.stack||err);
} finally {
  await browser.close();
  server.close();
}