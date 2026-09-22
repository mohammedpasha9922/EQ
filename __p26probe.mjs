import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const ROOT = 'D:/Programs EQ7/EQ';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer((q, s) => {
  let p = q.url === '/' ? '/index.html' : q.url;
  try {
    const d = fs.readFileSync(path.join(ROOT, p));
    s.writeHead(200, { 'Content-Type': (MIME[path.extname(p)] || 'text/plain') + '; charset=utf-8' });
    s.end(d);
  } catch (e) { s.writeHead(404); s.end(); }
});
srv.listen(8321, async () => {
  const b = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new', args: ['--no-sandbox']
  });
  console.log = ((orig) => (...a) => { fs.appendFileSync(__p26log, a.join(' ') + '\n'); orig(...a); })(console.log);
  const __p26log = path.join(ROOT, '__p26probe.log');
  try { fs.unlinkSync(__p26log); } catch (e) {}
  const pg = await b.newPage();
  pg.on('pageerror', (e) => console.log('PAGEERR', String(e).slice(0, 300)));
  await pg.goto('http://127.0.0.1:8321/', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 1500));
  console.log('seam:', await pg.evaluate(() => typeof window.__smartPdfExport));
  console.log('btnWired:', await pg.evaluate(() => document.getElementById('smartPdfExportBtn')?.dataset.pdfWired));
  console.log('modalExists:', await pg.evaluate(() => !!document.getElementById('smartPdfModal')));
  // open a doc and click
  await pg.evaluate(() => document.getElementById('drawerToggle').click());
  await new Promise((r) => setTimeout(r, 400));
  await pg.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click());
  await new Promise((r) => setTimeout(r, 500));
  await pg.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-new-doc"]').click());
  await new Promise((r) => setTimeout(r, 600));
  console.log('open():', await pg.evaluate(() => window.__smartPdfExport.open()));
  await new Promise((r) => setTimeout(r, 200));
  console.log('isOpen:', await pg.evaluate(() => !document.getElementById('smartPdfModal').hidden));
  console.log('fnValue:', await pg.evaluate(() => document.getElementById('smartPdfFilenameInput').value));
  // Replicate the exact test sequence: close modal, rename via seam, real click.
  await pg.evaluate(() => window.__smartPdfExport.close());
  const sel = pg.evaluate(() => { const s = document.getElementById('topBarLanguageSelect'); s.value = 'ar'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  await sel; await new Promise((r) => setTimeout(r, 500));
  await pg.evaluate(() => window.__smartDocName.set('عقد إيجار محمد'));
  await new Promise((r) => setTimeout(r, 200));
  try {
    await pg.click('#smartPdfExportBtn');
  } catch (e) { console.log('CLICK ERR', String(e).slice(0, 200)); }
  await new Promise((r) => setTimeout(r, 400));
  console.log('isOpenAfterRealClick:', await pg.evaluate(() => !document.getElementById('smartPdfModal').hidden));
  console.log('elAtPoint:', await pg.evaluate(() => {
    const b = document.getElementById('smartPdfExportBtn').getBoundingClientRect();
    const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
    return el ? el.tagName + '#' + el.id + '.' + el.className : 'none';
  }));

  // Isolate taint source.
  console.log('taintTest:', await pg.evaluate(async () => {
    const cv = Array.from(document.querySelectorAll('#smartBlankCanvasHolder .smart-blank-canvas'))
      .find((c) => !c.classList.contains('smart-page-hidden'));
    function tryRender(el) {
      return new Promise((res) => {
        const wrap = document.createElement('div');
        wrap.appendChild(el.cloneNode(true));
        const xhtml = new XMLSerializer().serializeToString(wrap);
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="794" height="1123"><foreignObject width="100%" height="100%">' + xhtml + '</foreignObject></svg>';
        const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        const im = new Image();
        im.onload = () => {
          const c = document.createElement('canvas'); c.width = 794; c.height = 1123;
          c.getContext('2d').drawImage(im, 0, 0);
          let ok = true;
          try { c.getContext('2d').getImageData(0, 0, 1, 1); } catch (e) { ok = false; }
          URL.revokeObjectURL(url);
          res(ok ? 'OK' : 'TAINTED');
        };
        im.onerror = () => { res('IMGERR'); URL.revokeObjectURL(url); };
        im.src = url;
      });
    }
    const out = {};
    out.full = await tryRender(cv);
    out.emptyRoot = await tryRender(cv.cloneNode(false));
    const noImgs = cv.cloneNode(true);
    noImgs.querySelectorAll('img').forEach((i) => i.remove());
    out.noImgs = await tryRender(noImgs);
    out.imgSrcs = Array.from(cv.querySelectorAll('img')).map((i) => (i.src || '').slice(0, 30));
    return JSON.stringify(out);
  }));

  await b.close(); srv.close(); process.exit(0);
});
