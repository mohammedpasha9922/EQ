const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
const i = s.indexOf('function smartPdfOverlayScale');
console.log('SCALE FULL:', s.slice(i, i + 700));
const b = s.indexOf('function smartPdfOverlayBox');
console.log('BOX REST:', s.slice(b + 2000, b + 4400));
// page pointerdown that sets current page
const p = s.indexOf("addEventListener('pointerdown'", s.indexOf('smartPdfEditor'));
console.log('POINTER1 @', p, ':', s.slice(p - 300, p + 700));
