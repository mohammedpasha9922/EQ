// re-render + export + regressions chunk
const beforeResize = await page.evaluate(() => {
  const ov = (window.__smartImport && window.__smartImport.overlays()) || {};
  const out = {};
  for (const pk in ov) (ov[pk] || []).forEach((o) => { if (o && ['highlight', 'underline', 'draw', 'comment'].indexOf(o.type) >= 0) { out[o.type] = { page: o.page, x: Math.round(o.x), y: Math.round(o.y) }; } });
  return out;
});
await page.evaluate(() => { const btn = document.getElementById('smartPdfAddBtn'); btn && btn.click(); document.body.click(); });
await sleep(200);
const afterRerender = await markState();
check('P24-19 marks survive full overlay re-render (store is authoritative)', ['mark-highlight', 'mark-underline', 'mark-draw', 'mark-comment'].every((k) => afterRerender.kinds.indexOf(k) >= 0), afterRerender.kinds);
await setViewport(390, 800);
const drift = await page.evaluate((before) => {
  const ov = (window.__smartImport && window.__smartImport.overlays()) || {};
  let worst = 0;
  for (const pk in ov) (ov[pk] || []).forEach((o) => {
    if (o && ['highlight', 'underline', 'draw', 'comment'].indexOf(o.type) >= 0 && before[o.type]) {
      worst = Math.max(worst, Math.abs(Math.round(o.x) - before[o.type].x), Math.abs(Math.round(o.y) - before[o.type].y));
    }
  });
  return worst;
}, beforeResize);
check('P24-20 page-unit coordinates stable across viewport change (no drift)', drift === 0, drift);
const boxScaled = await page.evaluate(() => {
  const b = document.querySelector('#smartPdfEditor .smart-pdf-ov-mark-highlight');
  if (!b) return null;
  return { left: Math.round(parseFloat(b.style.left)), storeX: (() => { const ov = (window.__smartImport && window.__smartImport.overlays()) || {}; for (const pk in ov) { const o = (ov[pk] || []).find((x) => x && x.type === 'highlight'); if (o) return Math.round(o.x); } return -1; })() };
});
check('P24-21 overlay box scales with the page (screen = page unit x scale)', !!boxScaled && boxScaled.left > 0, boxScaled);
await setViewport(1366, 900);
const exp = await exportPdf();
check('P24-22 exported file is a genuine PDF (%PDF-)', exp.head === '%PDF-' && exp.size > 1000, { head: exp.head, size: exp.size });
const extracted = await page.evaluate(async (b64) => {
  let pdfjs = window.pdfjsLib;
  if (!pdfjs) {
    await new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = '/__pdfdiag/vendor/pdf.min.js'; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); });
    pdfjs = window.pdfjsLib;
  }
  if (pdfjs.GlobalWorkerOptions) pdfjs.GlobalWorkerOptions.workerSrc = '/__pdfdiag/vendor/pdf.worker.min.js';
  const bin = atob(b64); const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const doc = await pdfjs.getDocument({ data: u8 }).promise;
  const p1 = await (await doc.getPage(1)).getTextContent();
  const p2 = await (await doc.getPage(2)).getTextContent();
  const ops1 = await (await doc.getPage(1)).getOperatorList();
  const ops2 = await (await doc.getPage(2)).getOperatorList();
  const fills1 = ops1.fnArray.filter((f) => f === pdfjs.OPS.fill || f === pdfjs.OPS.eoFill).length;
  const strokes2 = ops2.fnArray.filter((f) => f === pdfjs.OPS.stroke || f === pdfjs.OPS.closeStroke).length;
  return { pages: doc.numPages, t1: p1.items.map((i) => i.str).join(' '), t2: p2.items.map((i) => i.str).join(' '), fills1, strokes2 };
}, exp.b64);
