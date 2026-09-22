const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
for (const k of ['smart-pdf-overlay-body', 'function smartPdfOverlayBox', 'function smartPdfAddItem', 'parserFileInput' ]) {
  console.log('---', k, s.indexOf(k));
}
const i = s.indexOf('function smartPdfOverlayBox');
console.log(JSON.stringify(s.slice(i, i + 700)));