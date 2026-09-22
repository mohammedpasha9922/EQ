const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/__notes_test/_p24_block2.txt';
const chunk = `
// Re-render mark overlays whenever the editor re-renders (store is authoritative).
const _p24OrigRender = (typeof smartPdfRenderOverlays === 'function') ? smartPdfRenderOverlays : null;
if (_p24OrigRender) {
  window.smartPdfRenderOverlaysP24 = function () {
    _p24OrigRender.call(this);
    if (typeof document === 'undefined' || !smartImportOverlays) return;
    const pages = Object.keys(smartImportOverlays);
    for (const pk of pages) {
      const page = parseInt(pk, 10);
      if (!isFinite(page)) continue;
      const prev = smartImportCurrentPage; smartImportCurrentPage = page;
      const list = (smartImportOverlays[pk] || []).filter((o) => o && /^(highlight|underline|draw|comment)$/.test(o.type));
      list.forEach((o) => { try { smartPdfMarkRenderOverlay(page, o); } catch (e) {} });
      smartImportCurrentPage = prev;
    }
  };
  smartPdfRenderOverlays = window.smartPdfRenderOverlaysP24;
}
// Hand the mark API to tests + persist into the edit model (reuses smartPdfOverlayStore).
if (typeof window !== 'undefined') {
  window.smartPdfMarkApply = smartPdfMarkApply;
  window.smartPdfMarkStartDraw = smartPdfMarkStartDraw;
  window.smartPdfMarkDone = smartPdfMarkDone;
  window.smartPdfMarkClose = smartPdfMarkClose;
  window.smartPdfMarkShowComment = smartPdfMarkShowComment;
  if (window.__smartImport) {
    window.__smartImport.markApply = smartPdfMarkApply;
    window.__smartImport.markStartDraw = smartPdfMarkStartDraw;
    window.__smartImport.markDone = smartPdfMarkDone;
    window.__smartImport.marks = () => {
      const out = [];
      const ov = (smartImportOverlays || {});
      for (const pk in ov) (ov[pk] || []).forEach((o) => { if (o && /^(highlight|underline|draw|comment)$/.test(o.type)) out.push(o); });
      return out;
    };
  }
}
`;
fs.appendFileSync(p, chunk);
console.log('appended render-hook + seam chunk. total bytes:', fs.readFileSync(p, 'utf8').length);