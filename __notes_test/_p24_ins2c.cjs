const block = `// ===== PART 24 — menu open/close + item wiring (reuses PART 22 Add-menu pattern) =====
const smartPdfMarkBtn = document.getElementById('smartPdfMarkBtn');
const smartPdfMarkMenu = document.getElementById('smartPdfMarkMenu');
if (smartPdfMarkBtn && smartPdfMarkMenu) {
  smartPdfMarkBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const expanded = smartPdfMarkMenu.hasAttribute('hidden');
    if (expanded) {
      smartPdfMarkMenu.removeAttribute('hidden');
      smartPdfMarkBtn.setAttribute('aria-expanded', 'true');
    } else {
      smartPdfMarkMenu.setAttribute('hidden', '');
      smartPdfMarkBtn.setAttribute('aria-expanded', 'false');
    }
  });
  smartPdfMarkMenu.addEventListener('click', (ev) => {
    const it = ev.target && ev.target.closest ? ev.target.closest('.smart-pdf-mark-item') : null;
    if (!it) return;
    ev.preventDefault(); ev.stopPropagation();
    const type = it.getAttribute('data-mark') || '';
    smartPdfMarkMenu.setAttribute('hidden', '');
    smartPdfMarkBtn.setAttribute('aria-expanded', 'false');
    try { smartPdfMarkApply(type); } catch (e) {}
  });
  smartPdfMarkMenu.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') { smartPdfMarkMenu.setAttribute('hidden', ''); smartPdfMarkBtn.setAttribute('aria-expanded', 'false'); smartPdfMarkBtn.focus(); }
  });
  document.addEventListener('click', (ev) => {
    if (!smartPdfMarkMenu.contains(ev.target) && ev.target !== smartPdfMarkBtn) {
      smartPdfMarkMenu.setAttribute('hidden', '');
      smartPdfMarkBtn.setAttribute('aria-expanded', 'false');
    }
  });
}
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
const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/app.js';
let s = fs.readFileSync(p, 'utf8');
const anchor = "// scoped to Smart Documents. No rich-text editing yet (PART 7+).";
const idx = s.indexOf(anchor);
if (idx < 0) { console.log('ANCHOR NOT FOUND'); process.exit(1); }
s = s.slice(0, idx) + block + s.slice(idx);
fs.writeFileSync(p, s);
console.log('part2c inserted. bytes:', s.length);
console.log('MarkApply:', s.split('function smartPdfMarkApply').length-1, 'MarkDone:', s.split('function smartPdfMarkDone').length-1, 'ShowComment:', s.split('function smartPdfMarkShowComment').length-1, 'MarkMenu wiring:', s.split('smartPdfMarkMenu.addEventListener').length-1);
