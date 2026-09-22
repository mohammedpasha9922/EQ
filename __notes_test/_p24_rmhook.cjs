const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/app.js';
let s = fs.readFileSync(p, 'utf8');
const a = s.indexOf('// Re-render mark overlays whenever the editor re-renders');
const b = s.indexOf('// Hand the mark API to tests');
if (a < 0 || b < 0) { console.log('MARKERS NOT FOUND', a, b); process.exit(1); }
const replacement = `}
// Comment markers: clicking a 💬 dot re-opens its text (view/edit path).
document.addEventListener('click', (ev) => {
  const dot = ev.target && ev.target.closest ? ev.target.closest('.smart-pdf-ov-comment .smart-pdf-mkdot') : null;
  if (!dot) return;
  ev.preventDefault(); ev.stopPropagation();
  const box = dot.closest('.smart-pdf-overlay');
  if (!box) return;
  const page = Number(box.dataset.page); const o = smartPdfOverlayFind(page, Number(box.dataset.id));
  if (o) smartPdfMarkShowComment(o);
});
`;
s = s.slice(0, a) + replacement + s.slice(b);
fs.writeFileSync(p, s);
console.log('render hook removed; dot-click handler added');
console.log('P24 hook gone:', s.split('smartPdfRenderOverlaysP24').length - 1);
console.log('dot handler present:', s.split('.smart-pdf-ov-comment .smart-pdf-mkdot').length - 1);
console.log('smartPdfMarkRenderOverlay:', s.split('smartPdfMarkRenderOverlay').length - 1);