// Probe why getComputedStyle(textAlign/unicodeBidi) returns '' for the PDF surface
// injected into the live app document, and confirm the declarations exist/apply.
const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const ROOT = 'D:/Programs EQ7/EQ';
const PORT = 8497;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (!p || p === '/') p = '/index.html';
  try {
    let data = fs.readFileSync(f);
    if (p === '/app.js') {
      data = Buffer.from(data.toString() + '\nwindow.__notesPdfNativeTest = { tryNativePrintNote, buildNotePdfHtml, buildNotePdfBodyHTML, buildNotePdfBlobUncached, performNotePdfExport };\n', 'utf8');
    }
    const ext = path.extname(p).toLowerCase();
    res.writeHead(200, { 'Content-Type': (MIME[ext] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(data);
  } catch (e) { if (!res.headersSent) { res.writeHead(404); res.end('nf'); } }
});
(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new', args: ['--no-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 900));
  await page.waitForFunction(() => !!window.__notesPdfNativeTest, { timeout: 20000 });
  const out = await page.evaluate((ports) => {
    const note = {
      title: 'ملاحظة اختبار التوجيه',
      bodyBlocks: [{ type: 'text', body: 'هذا نص عربي لاختبار تصدير PDF.\nالسطر الثاني.', formatting: [] }]
    };
    const html = window.__notesPdfNativeTest.buildNotePdfHtml(note);
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;';
    host.innerHTML = html;
    document.body.appendChild(host);
    const styleEls = host.querySelectorAll('style');
    let ruleCount = -1, cssErr = null;
    try { ruleCount = styleEls.length ? styleEls[0].sheet.rules.length : -1; } catch (e) { cssErr = String(e); }
    // Find the .eq-pdf-text-block rule text inside the generated CSS
    const m = /\.eq-pdf-text-block\s*\{([^}]*)\}/.exec(html);
    const p = host.querySelector('.eq-pdf-text-block');
    const cs = p ? getComputedStyle(p) : null;
    const res = {
      styleEls: styleEls.length,
      ruleCount,
      cssErr,
      blockRule: m ? m[1].trim() : null,
      textBlockRuleCountInHtml: (html.match(/\.eq-pdf-text-block/g) || []).length,
      hasPlaintextDecl: /unicode-bidi:\s*plaintext/.test(html),
      hasStartDecl: /text-align:\s*start/.test(html),
      listLogicalPad: /padding-inline-start/.test(html),
      pExists: !!p,
      direction: cs ? cs.direction : null,
      textAlign: cs ? cs.textAlign : null,
      unicodeBidi: cs ? cs.unicodeBidi : null,
      // same via explicit getPropertyValue
      gPV_textAlign: cs ? cs.getPropertyValue('text-align') : null,
      gPV_bidi: cs ? cs.getPropertyValue('unicode-bidi') : null,
      // is the block rendered (has a box)?
      rectW: p ? p.getBoundingClientRect().width : null
    };
    host.remove();
    return res;
  });
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
  await server.close();
})();
