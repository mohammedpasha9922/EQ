const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
const a = s.indexOf('function smartPdfMarkSvgHtml');
const b = s.indexOf('function smartPdfMarkRenderOverlay', a);
console.log('=== SVG ===');
console.log(s.slice(a, b));
const d = s.indexOf('.smart-pdf-ov-mark-comment .smart-pdf-mkdot');
console.log('=== DOT ===');
console.log(JSON.stringify(s.slice(d - 120, d + 400)));