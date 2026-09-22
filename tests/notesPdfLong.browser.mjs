// Real Chrome regression for the Notes PDF raster pipeline. No PDF mocks.
// Run: node tests/notesPdfLong.browser.mjs [--baseline]
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const root = path.resolve(import.meta.dirname, '..');
const baseline = process.argv.includes('--baseline');
const verdictFile = (process.argv.find(a => a.startsWith('--verdict=')) || '').slice(10) || null;
const bundle = await (await fetch('https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js')).text();
const server = http.createServer((req, res) => {
  try {
    const name = decodeURIComponent(req.url.split('?')[0]);
    let data = name === '/real-pdf.js' ? bundle : fs.readFileSync(path.join(root, name === '/' ? 'index.html' : name));
    if (name === '/app.js') {
      const source = data.toString();
      const start = source.indexOf('async function buildNotePdfBlobUncached(note)');
      const end = source.indexOf('// Build a safe, readable .pdf filename', start);
      let legacy = source.slice(start, end).replace('buildNotePdfBlobUncached(note)', 'buildNotePdfLegacyTest(note)');
      const chunkStart = legacy.indexOf('      renderWorker.toContainer()');
      const chunkEnd = legacy.indexOf('        .then((blob)', chunkStart);
      if (chunkStart !== -1) legacy = legacy.slice(0, chunkStart) + "      renderWorker.toPdf().output('blob')\n" + legacy.slice(chunkEnd);
      data = source + '\n' + legacy + '\nwindow.__notesPdfTest = { buildNotePdfBlobUncached, buildNotePdfHtml, buildNotePdfLegacyTest };';
    }
    res.setHeader('Content-Type', name === '/' || name.endsWith('.html') ? 'text/html' : name.endsWith('.css') ? 'text/css' : 'text/javascript');
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    headless: true, args: ['--no-sandbox'], protocolTimeout: 600000
  });
  console.log('Chrome:', await browser.version());
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'domcontentloaded' });
  await page.addScriptTag({ url: '/real-pdf.js' });
  await page.addScriptTag({ url: '/__pdfdiag/vendor/pdf.min.js' });
  await page.waitForFunction(() => window.__notesPdfTest);
  const selected = process.argv.find(arg => arg.startsWith('--pages='));
  for (const count of selected ? selected.slice(8).split(',').map(Number) : baseline ? [1, 5, 81] : [1, 5, 20, 50, 81]) {
    const result = await page.evaluate(async count => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/__pdfdiag/vendor/pdf.worker.min.js';
      const api = window.__notesPdfTest;
      const note = { title: 'Notes canvas regression', bodyBlocks: [{ type: 'text', body: Array.from({ length: Math.max(1, Math.floor(count * 51.8 - 15)) }, (_, i) => `ROW ${String(i + 1).padStart(5, '0')} Notes export content.`).join('\n'), formatting: [] }] };
      const RealDate = Date;
      window.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : ['2026-09-18T12:00:00Z'])); } static now() { return RealDate.now(); } };
      const marker = document.createElement('canvas'); marker.width = 32; marker.height = 16;
      marker.getContext('2d').fillStyle = '#ff0000'; marker.getContext('2d').fillRect(0, 0, 32, 16);
      note.bodyBlocks.push({ type: 'image', src: marker.toDataURL(), width: 80, align: 'left' },
        { type: 'table', rows: [[{ text: 'FINAL TABLE CELL', backgroundColor: '#00ff00' }, { text: 'END OF NOTE' }]] });
      marker.width = marker.height = 0;
      const proto = html2pdf.Worker.prototype;
      const toCanvas = proto.toCanvas;
      const toContainer = proto.toContainer;
      const captures = [], layouts = [], canvases = [];
      let legacyPages = null;
      proto.toContainer = function () {
        return toContainer.call(this).then(function () {
          const rect = this.prop.container.getBoundingClientRect();
          layouts.push({ width: rect.width, height: rect.height, pageHeight: Math.floor(Math.ceil(rect.width) * 2 * this.prop.pageSize.inner.ratio), expected: Math.ceil(Math.ceil(rect.height) * 2 / Math.floor(Math.ceil(rect.width) * 2 * this.prop.pageSize.inner.ratio)) });
        });
      };
      proto.toCanvas = function () {
        if (canvases.some(c => c.width || c.height)) throw new Error('Previous canvas not released');
        return toCanvas.call(this).then(function () {
          const c = this.prop.canvas;
          captures.push({ page: captures.length, width: c.width, height: c.height, y: this.opt.html2canvas.y || 0,
            innerWidth: this.prop.pageSize.inner.width, innerHeight: this.prop.pageSize.inner.height });
          canvases.push(c);
        });
      };
      const instrumentCanvas = proto.toCanvas, instrumentContainer = proto.toContainer;
      async function inspect(blob) {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        const pages = [];
        for (let n = 1; n <= pdf.numPages; n++) {
          const p = await pdf.getPage(n), viewport = p.getViewport({ scale: 0.5 });
          const c = document.createElement('canvas');
          c.width = viewport.width; c.height = viewport.height;
          await p.render({ canvasContext: c.getContext('2d'), viewport }).promise;
          const pixels = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
          let ink = 0, red = 0, green = 0, hash = 2166136261;
          for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i] > 180 && pixels[i + 1] < 90 && pixels[i + 2] < 90) red++;
            if (pixels[i + 1] > 180 && pixels[i] < 90 && pixels[i + 2] < 90) green++;
            if (pixels[i] < 220 || pixels[i + 1] < 220 || pixels[i + 2] < 220) ink++;
            hash = Math.imul(hash ^ pixels[i], 16777619);
          }
          pages.push({ ink, red, green, hash }); c.width = c.height = 0; p.cleanup();
        }
        await pdf.destroy();
        return pages;
      }
      try {
        if (count <= 5) {
          proto.toCanvas = toCanvas; proto.toContainer = toContainer;
          legacyPages = await inspect(await api.buildNotePdfLegacyTest(note));
          proto.toCanvas = instrumentCanvas; proto.toContainer = instrumentContainer;
        }
        const blob = await api.buildNotePdfBlobUncached(note);
        const pages = await inspect(blob);
        return { count, bytes: blob.size, layouts, captures, pages, legacyPages,
          released: canvases.every(c => !c.width && !c.height) };
      } catch (e) { return { count, layouts, captures, error: e.message }; }
      finally { proto.toCanvas = toCanvas; proto.toContainer = toContainer; window.Date = RealDate; }
    }, count);
    console.log(JSON.stringify(result));
    let caseOk = true, caseDetail = [];
    if (!baseline && result.error) {
      if (verdictFile) fs.appendFileSync(verdictFile, `case=${count} FAIL: ${result.error}\n`);
      assert.fail(result.error);
    }
    if (!baseline) {
      const asserts = [
        [!result.error, result.error || 'Export completed'],
        [result.pages.length === result.layouts[0].expected, `page count ${result.pages.length} != layout ${result.layouts[0].expected}`],
        [result.pages.every(p => p.ink > 20), 'Unexpected blank page'],
        [new Set(result.pages.map(p => p.hash)).size === result.pages.length, 'Duplicate page'],
        [result.captures.every(c => c.height <= result.layouts[0].pageHeight), 'Unbounded canvas'],
        [result.released, 'Canvas retained after export'],
        [result.captures.every((c, i) => c.y * 2 === i * result.layouts[0].pageHeight), 'Missing/reordered slice'],
        [result.pages.some(p => p.red > 20), 'Image missing'],
        [result.pages.some(p => p.green > 20), 'Table missing']
      ];
      for (const [ok, msg] of asserts) { if (!ok) caseOk = false; if (!ok || msg.includes('page count')) caseDetail.push((ok ? 'ok: ' : 'FAIL: ') + msg); }
      if (result.legacyPages) {
        caseDetail.push('legacy pages=' + result.legacyPages.length);
        if (result.pages.length !== result.legacyPages.length) { caseOk = false; caseDetail.push('FAIL: short page count differs from original pipeline'); }
        result.pages.forEach((p, i) => {
          const l = result.legacyPages[i];
          const inkOk = Math.abs(p.ink - l.ink) <= Math.max(40, l.ink * 0.02);
          const colOk = Math.abs(p.red - l.red) <= 40 && Math.abs(p.green - l.green) <= Math.max(20, l.green * 0.1);
          if (!inkOk || !colOk) { caseOk = false; caseDetail.push(`FAIL: page ${i + 1} differs from original pipeline (ink ${p.ink}/${l.ink})`); }
        });
      }
    }
    if (verdictFile) {
      fs.appendFileSync(verdictFile, `${new Date().toISOString()} case=${count} ${caseOk ? 'PASS' : 'FAIL'}` + (caseDetail.length ? ' | ' + caseDetail.join('; ') : '') + '\n');
    }
    assert.ok(caseOk, `case ${count}: ` + caseDetail.join('; '));
  }
  console.log('Runtime errors:', JSON.stringify(errors));
  console.log('ALL_CASES_DONE pass=' + (baseline ? 'baseline' : 'true') + ' fail=' + '0');
  if (verdictFile) fs.appendFileSync(verdictFile, `${new Date().toISOString()} SUITE DONE\n`);
} finally {
  if (browser) await browser.close();
  // Destroy sockets so Node's event loop drains and the process exits
  // deterministically (server.close() alone waits on keep-alive sockets).
  server.closeAllConnections?.();
  server.close();
}
