// Selection snapshot: keep text selection alive when opening the Mark menu
const fs = require('fs');
const P = 'd:/Programs EQ7/EQ/app.js';
let s = fs.readFileSync(P, 'utf8');
const fail = (m) => { console.error('ABORT: ' + m); process.exit(1); };
if (s.split('let smartPdfMarkSelRanges').length - 1 > 0) { console.log('sel patch already applied'); process.exit(0); }
// 1) var decl after LivePt
const a1 = 'let smartPdfMarkLivePt = null;';
if (s.split(a1).length - 1 !== 1) fail('a1');
s = s.replace(a1, a1 + '\n  let smartPdfMarkSelRanges = null;');
// 2) restore in smartPdfMarkSelection (insert after its const sel line)
const fi = s.indexOf('function smartPdfMarkSelection');
if (fi < 0) fail('sel fn');
const a2 = 'const sel = window.getSelection();';
const si = s.indexOf(a2, fi);
if (si < 0) fail('sel line');
const restore = a2 + '\n    if ((!sel || !sel.rangeCount || sel.isCollapsed) && Array.isArray(smartPdfMarkSelRanges) && smartPdfMarkSelRanges.length) { try { sel.removeAllRanges(); smartPdfMarkSelRanges.forEach((r0) => sel.addRange(r0)); } catch (e9) {} }';
s = s.slice(0, si) + restore + s.slice(si + a2.length);
// 3) snapshot on Mark button pointerdown
const a3 = "wrap.dataset.p24wired = '1';";
if (s.split(a3).length - 1 !== 1) fail('a3');
s = s.replace(a3, a3 + `
    btn.addEventListener('pointerdown', () => {
      const s0 = window.getSelection();
      smartPdfMarkSelRanges = (s0 && s0.rangeCount && !s0.isCollapsed) ? Array.from({ length: s0.rangeCount }, (_, i0) => s0.getRangeAt(i0).cloneRange()) : null;
    });`);
fs.writeFileSync(P, s);
console.log('sel patch done, len', s.length);
