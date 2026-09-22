const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/__notes_test/_p24_block2.txt';
const chunk = `
function smartPdfMarkAdd(o) { smartPdfOverlayStore(o.page, o); smartPdfRenderOverlays(); }
function smartPdfMarkApply(type) {
  const t = smartPdfOverlayTarget();
  if (!t || !t.wrap) { showToast(smartPdfMarkT('smartPdfMarkOnPage', 'Select a page first'), 2000); return; }
  const page = smartImportCurrentPage;
  const info = smartPdfMarkTextRangeInfo();
  if (type === 'highlight' || type === 'underline') {
    let x, y, w, h;
    if (info) { x = info.x; y = info.y; w = info.w; h = info.h; } else { x = 40; y = 40; w = 120; h = 14; }
    const o = { type: type, id: smartPdfMarkNextId(), page: page, x: x, y: y, w: w, h: Math.max(14, h), color: (type === 'highlight') ? (window.smartPdfMarkColor || '#fde047') : (window.smartPdfMarkColor || '#2563eb') };
    smartPdfMarkAdd(o);
    if (info) try { window.getSelection().removeAllRanges(); } catch (e) {}
    return;
  }
  if (type === 'comment') {
    const info2 = smartPdfMarkTextRangeInfo();
    let x = 40, y = 40;
    if (info2) { x = info2.x; y = info2.y; }
    const o = { type: 'comment', id: smartPdfMarkNextId(), page: page, x: x, y: y, w: 14, h: 14, text: '', color: '#f59e0b' };
    smartPdfMarkAdd(o);
    smartPdfMarkShowComment(o);
    return;
  }
  if (type === 'draw') { smartPdfMarkStartDraw(); return; }
}
`;
fs.appendFileSync(p, chunk);
console.log('appended apply chunk');