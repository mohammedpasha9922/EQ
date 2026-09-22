// Arabic Company-Name SHAPING verifier for the History PDF title.
// Compares the real html2canvas render of the report h1 (exact computed font/dir/
// spacing from the PDF pipeline) against a native single-fillText reference
// (correct HarfBuzz shaping). html2canvas per-character drawing (its non-zero
// letter-spacing mode) breaks Arabic joining -> low correlation with reference.
// A control sample forces the old letter-spacing:.5px to prove detection.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mjs': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  const f = path.join(ROOT, p);
  try { const d = fs.readFileSync(f); res.writeHead(200, { 'Content-Type': (MIME[path.extname(f).toLowerCase()] || 'application/octet-stream') + '; charset=utf-8' }); res.end(d); }
  catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise((r, rej) => { server.once('error', rej); server.listen(0, '127.0.0.1', r); });
const BASE = `http://127.0.0.1:${server.address().port}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
setTimeout(() => process.exit(124), 420000);

const failures = [];
function check(name, ok, detail) {
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail !== undefined ? '  [' + detail + ']' : ''));
  if (!ok) failures.push(name);
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage'] });
const H2C = fs.readFileSync(path.join(ROOT, '__pdfdiag/vendor/h2canvas.js'), 'utf8');
const H2PDF = fs.readFileSync(path.join(ROOT, '__pdfdiag/vendor/h2pdf.js'), 'utf8');

try {
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 1280, height: 1000 });
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => { try { localStorage.setItem('eq-language', 'en'); } catch (e) {} });
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(2500);
  for (let i = 0; i < 40 && !(await page.evaluate(() => typeof window.__historyPdfBlob === 'function')); i++) await sleep(500);
  await page.evaluate((src) => { if (typeof window.html2pdf === 'undefined') { const s = document.createElement('script'); s.textContent = src; document.head.appendChild(s); } }, H2PDF);
  await sleep(600);

  // Capture the REAL report h1 (outerHTML + computed font) for a given title.
  async function captureHeader(titleText) {
    return page.evaluate(async (title, h2cSrc) => {
      if (typeof window.html2canvas === 'undefined') { const s = document.createElement('script'); s.textContent = h2cSrc; document.head.appendChild(s); await new Promise(r => setTimeout(r, 400)); }
      let captured = null, seen = 0;
      const protoRemove = Node.prototype.removeChild;
      Node.prototype.removeChild = function (el) {
        try {
          if (el && el.tagName === 'IFRAME') {
            seen++;
            const doc = el.contentDocument;
            if (doc && doc.getElementById('report')) {
              // Read the computed style NOW — the frame is still live inside
              // this hook (after removal defaultView becomes null).
              const h1 = doc.querySelector('.hdr-title h1');
              const cs = doc.defaultView.getComputedStyle(h1);
              captured = { outer: h1.outerHTML, text: h1.textContent, font: [cs.fontStyle, cs.fontWeight, cs.fontSize, cs.fontFamily].join(' '), ls: cs.letterSpacing, dir: h1.getAttribute('dir') || '', color: cs.color };
            }
          }
        } catch (e) {}
        return protoRemove.call(this, el);
      };
      try {
        const entries = [{ expression: '2 + 3', result: '5', note: 'n' }];
        await window.__historyPdfBlob(entries, title);
      } finally { Node.prototype.removeChild = protoRemove; }
      if (!captured) return { seen };
      return { seen, outer: captured.outer, text: captured.text, font: captured.font, ls: captured.ls, dir: captured.dir, color: captured.color };
    }, titleText, H2C);
  }



  // Column ink profile of the title rendered via html2canvas (the PDF's own path).
  async function profileViaH2C(info, forceOldSpacing) {
    return page.evaluate(async (inf, oldSpacing) => {
      const holder = document.createElement('div');
      holder.style.cssText = 'position:fixed;left:0;top:0;background:#ffffff;padding:36px 40px;width:714px;';
      const h1 = document.createElement('h1');
      h1.textContent = inf.text;
      h1.style.cssText = 'margin:0;font:' + inf.font + ';color:' + inf.color + ';letter-spacing:' + (oldSpacing ? '0.5px' : inf.ls) + ';';
      if (inf.dir) h1.setAttribute('dir', inf.dir);
      holder.appendChild(h1);
      document.body.appendChild(holder);
      try {
        const c = await html2canvas(holder, { backgroundColor: '#ffffff', scale: 2, logging: false });
        const cx = c.getContext('2d', { willReadFrequently: true });
        const d = cx.getImageData(0, 0, c.width, c.height).data;
        const inkCol = (x) => { let n = 0; for (let y = 0; y < c.height; y++) { const i = (y * c.width + x) * 4; if (d[i] < 150 && d[i + 1] < 150 && d[i + 2] < 150) n++; } return n; };
        let x0 = -1, x1 = -1;
        for (let x = 0; x < c.width; x++) { if (inkCol(x) > 0) { if (x0 < 0) x0 = x; x1 = x; } }
        const prof = [];
        if (x0 >= 0) for (let x = x0; x <= x1; x++) prof.push(inkCol(x));
        return { w: x1 - x0 + 1, prof };
      } finally { holder.remove(); }
    }, info, forceOldSpacing);
  }

  // Reference: the same string drawn with ONE native fillText (proper shaping).
  async function profileReference(info) {
    return page.evaluate((inf) => {
      const meas = document.createElement('canvas').getContext('2d');
      meas.font = inf.font;
      const m = meas.measureText(inf.text);
      const pad = 20, W = Math.ceil(m.width) + pad * 2, H = 120;
      const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2;
      const cx = c.getContext('2d', { willReadFrequently: true });
      cx.scale(2, 2);
      cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, W, H);
      cx.fillStyle = '#000000'; cx.font = inf.font; cx.textBaseline = 'middle';
      // Match the real h1's paragraph direction (bidi matters for mixed
      // Arabic+Latin/numbers): RTL base direction anchors the line at the right.
      if (inf.dir === 'rtl') { cx.direction = 'rtl'; cx.fillText(inf.text, W - pad, H / 2); }
      else { cx.fillText(inf.text, pad, H / 2); }
      const d = cx.getImageData(0, 0, c.width, c.height).data;
      const inkCol = (x) => { let n = 0; for (let y = 0; y < c.height; y++) { const i = (y * c.width + x) * 4; if (d[i] < 150 && d[i + 1] < 150 && d[i + 2] < 150) n++; } return n; };
      let x0 = -1, x1 = -1;
      for (let x = 0; x < c.width; x++) { if (inkCol(x) > 0) { if (x0 < 0) x0 = x; x1 = x; } }
      const prof = [];
      if (x0 >= 0) for (let x = x0; x <= x1; x++) prof.push(inkCol(x));
      return { w: x1 - x0 + 1, prof };
    }, info);
  }

  // Pearson correlation of the (resampled) column ink profiles.
  function correlate(a, b) {
    const N = 256;
    const rs = (p) => { if (!p || !p.length) return new Array(N).fill(0); const out = []; for (let i = 0; i < N; i++) { const t = (p.length - 1) * i / (N - 1); const lo = Math.floor(t), hi = Math.min(p.length - 1, lo + 1); out.push(p[lo] + (p[hi] - p[lo]) * (t - lo)); } return out; };
    const x = rs(a), y = rs(b);
    const mx = x.reduce((s, v) => s + v, 0) / N, my = y.reduce((s, v) => s + v, 0) / N;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < N; i++) { const dx = x[i] - mx, dy = y[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
  }


  // ---- Run: 4 Arabic company names + Arabic+Latin + Arabic+numbers -----------
  const NAMES = [
    'شركة البركة للتجارة العامة',
    'محلات البركة للتجارة',
    'شركة EQ7 للحسابات',
    'البركة 12345'
  ];
  for (const name of NAMES) {
    console.log('--- ' + name + ' ---');
    const info = await captureHeader(name);
    if (!info || !info.outer) { check(name + ': report h1 captured', false, 'seen=' + (info && info.seen)); continue; }
    check(name + ': report h1 captured', true, 'seen=' + info.seen);
    check(name + ': h1 has dir=rtl', info.dir === 'rtl', info.dir);
    const lsOk = info.ls === 'normal' || parseFloat(info.ls) === 0; // Chrome reports zero spacing as "normal"
    check(name + ': h1 letter-spacing zeroed (shaping-safe)', lsOk, 'ls=' + info.ls + ' outer=' + String(info.outer).slice(0, 120));
    const fixed = await profileViaH2C(info, false);
    const ref = await profileReference(info);
    const corrFixed = correlate(fixed.prof, ref.prof);
    const broken = await profileViaH2C(info, true); // control: old .5px spacing
    const corrBroken = correlate(broken.prof, ref.prof);
    check(name + ': shaping matches native reference (corr>=0.80)', corrFixed >= 0.80, 'corr=' + corrFixed.toFixed(3));
    check(name + ': detector catches old per-char rendering (control corr lower)', corrBroken < corrFixed, 'control=' + corrBroken.toFixed(3) + ' vs fixed=' + corrFixed.toFixed(3));
  }

  // ---- English/Latin regression: NO inline spacing override, default kept ----
  console.log('--- Latin / default regression ---');
  {
    const lat = await captureHeader('Al Baraka Wholesale Store');
    check('latin: custom Latin title has NO inline letter-spacing override', !lat.outer.includes('letter-spacing'), lat.outer.slice(0, 90));
    check('latin: computed letter-spacing stays 0.5px (unchanged)', parseFloat(lat.ls) === 0.5, 'ls=' + lat.ls);
    check('latin: no dir attr (LTR unchanged)', lat.dir === '', 'dir=' + lat.dir);
    const def = await captureHeader('');
    check('default: default title keeps 0.5px (English rendering untouched)', parseFloat(def.ls) === 0.5, 'ls=' + def.ls);
    check('default: default h1 has no inline override', !def.outer.includes('letter-spacing'), def.outer.slice(0, 90));
  }

  console.log(failures.length === 0 ? 'ALL PASS: Arabic company name shaping verified on the real PDF path' : 'FAILURES: ' + failures.join('; '));
  process.exitCode = failures.length === 0 ? 0 : 1;
} finally {
  await browser.close().catch(() => {});
  server.close();
}

