// PART 25 implementation patch — app.js integration (line-anchored, verified).
const fs = require('fs');
const P = 'd:/Programs EQ7/EQ/app.js';
let s = fs.readFileSync(P, 'utf8');
const fail = (m) => { throw new Error('ANCHOR FAIL: ' + m); };
function rep1(anchor, replacement, label) {
  anchor = anchor.split('\n').join('\r\n');
  replacement = replacement.split('\n').join('\r\n');
  const n = s.split(anchor).length - 1;
  if (n !== 1) fail(label + ' (count=' + n + ')');
  s = s.replace(anchor, replacement);
}

// 1) smartPdfPageDims -> model-aware VIEW width
rep1(
`function smartPdfPageDims(i) {
  const pages = (smartImportParsed && smartImportParsed.pages) || [];
  const m = pages[i]; return (m && m.dims && m.dims.width) ? m.dims.width : 0;
}`,
`function smartPdfPageDims(i) {
  // PART 25 — resolve through the page model (view dims after rotation/blank).
  const en = (typeof smartPdfModelEntry === 'function') ? smartPdfModelEntry(i) : null;
  if (en && en.blank) return en.blank.w;
  const pages = (smartImportParsed && smartImportParsed.pages) || [];
  const m = en && !en.blank ? pages[en.src] : pages[i];
  if (!m || !m.dims || !m.dims.width) return 0;
  return (en && (en.rot === 90 || en.rot === 270)) ? m.dims.height : m.dims.width;
}`, 'smartPdfPageDims');

// 2) smartPdfRenderPage rotation param
rep1('function smartPdfRenderPage(pdfPage, canvas, scale) {',
     'function smartPdfRenderPage(pdfPage, canvas, scale, rotP25) {', 'renderPage sig');
rep1('  const cssViewport = pdfPage.getViewport({ scale: scale });                 // visual size',
     '  const rotTotalP25 = (pdfPage.rotate || 0) + (rotP25 || 0);\n  const cssViewport = pdfPage.getViewport({ scale: scale, rotation: rotTotalP25 });                 // visual size', 'renderPage cssVp');
rep1('  const renderViewport = pdfPage.getViewport({ scale: scale * outputScale }); // backing store',
     '  const renderViewport = pdfPage.getViewport({ scale: scale * outputScale, rotation: rotTotalP25 }); // backing store', 'renderPage rndVp');

// 3) editor build: model iteration
rep1(`  const pages = smartImportParsed.pages || [];
  if (!pages.length) { holder.innerHTML = ''; return; }`,
`  const pages = smartImportParsed.pages || [];
  const modelP25 = smartPdfModelList();
  if (!pages.length || !modelP25.length) { holder.innerHTML = ''; return; }`, 'build model');

rep1(`  for (let i = 0; i < pages.length; i++) {
    const meta = pages[i] || {};
    const dims = meta.dims || { width: 794, height: 1123 };`,
`  for (let i = 0; i < modelP25.length; i++) {
    const enP25 = modelP25[i];
    const meta = enP25.blank ? {} : (pages[enP25.src] || {});
    const dimsRawP25 = enP25.blank ? { width: enP25.blank.w, height: enP25.blank.h } : (meta.dims || { width: 794, height: 1123 });
    const rotP25 = enP25.rot || 0;
    const dims = (rotP25 === 90 || rotP25 === 270) ? { width: dimsRawP25.height, height: dimsRawP25.width } : dimsRawP25;`, 'build loop');

rep1('    try { pdfPage = await smartImportParsed.pdfDoc.getPage(i + 1); } catch (e) { pdfPage = null; }',
     '    if (!enP25.blank) { try { pdfPage = await smartImportParsed.pdfDoc.getPage(enP25.src + 1); } catch (e) { pdfPage = null; } }', 'build pdfPage');

rep1(`    if (pdfPage) {
      try { viewport = await smartPdfRenderPage(pdfPage, canvas, scale); rendered = true; } catch (e) { rendered = false; }
    }`,
`    if (enP25.blank) {
      // PART 25 — real blank PDF page preview (white page box, no screenshot)
      try {
        canvas.width = Math.max(1, Math.round(scale * dims.width));
        canvas.height = Math.max(1, Math.round(scale * dims.height));
        canvas.style.width = Math.max(1, Math.round(scale * dims.width)) + 'px';
        canvas.style.height = Math.max(1, Math.round(scale * dims.height)) + 'px';
        const cx25 = canvas.getContext('2d');
        if (cx25) { cx25.fillStyle = '#ffffff'; cx25.fillRect(0, 0, canvas.width, canvas.height); }
        viewport = { width: scale * dims.width, height: scale * dims.height }; rendered = true;
      } catch (e) { rendered = false; }
    } else if (pdfPage) {
      try { viewport = await smartPdfRenderPage(pdfPage, canvas, scale, rotP25); rendered = true; } catch (e) { rendered = false; }
    }`, 'build render');

// 4) export branch
rep1(`  const pdfLib = await smartImportLoadPdfLib();
  const pako = await smartImportLoadPako();
  const outBytes = await smartImportTrueEditBytes(pdfLib, pako, new Uint8Array(parsed.bytes.slice(0)), edits, parsed.pages, colors, smartImportOverlays);
  return new Blob([outBytes], { type: 'application/pdf' });`,
`  const pdfLib = await smartImportLoadPdfLib();
  const pako = await smartImportLoadPako();
  const modelP25 = smartPdfModelList();
  if (smartPdfModelIsIdentityP25(modelP25, parsed.pages.length)) {
    const outBytes = await smartImportTrueEditBytes(pdfLib, pako, new Uint8Array(parsed.bytes.slice(0)), edits, parsed.pages, colors, smartImportOverlays);
    return new Blob([outBytes], { type: 'application/pdf' });
  }
  // PART 25 — page ops: pass 1 = existing true-edit on the ORIGINAL layout
  // (text edits + colors only); pass 2 = pdf-lib builds the FINAL page sequence
  // (add/delete/reorder/duplicate/rotate) and draws overlays on it (rot-aware).
  const remP25 = smartPdfRemapEditsForSrcP25(modelP25, edits, colors);
  const pass1P25 = await smartImportTrueEditBytes(pdfLib, pako, new Uint8Array(parsed.bytes.slice(0)), remP25.edits, parsed.pages, remP25.colors, {});
  return await smartPdfBuildPagedDocP25(pdfLib, pass1P25, modelP25, parsed, smartImportOverlays);`, 'export branch');

// 5) hasEdits must include page ops
rep1(`    (function () { const ov = smartImportOverlays || {}; return Object.keys(ov).some((p) => { return (ov[p] || []).length > 0; }); });`,
`    (function () { const ov = smartImportOverlays || {}; return Object.keys(ov).some((p) => { return (ov[p] || []).length > 0; }); }) ||
    !smartPdfModelIsIdentityP25(smartPdfModelList(), (parsed.pages || []).length);`, 'hasEdits');

fs.writeFileSync(P, s);
console.log('app.js integration OK, new length', s.length);
