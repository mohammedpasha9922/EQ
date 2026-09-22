const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
for (const k of ['box.appendChild(body);', 'smartPdfTableBar', 'smartPdfOverlayTableHtmlP23', '// PART 5 \u2014 test / configuration seam for the Smart Import workflow.']) {
  console.log('count', JSON.stringify(k), s.split(k).length - 1);
}
console.log('size', s.length);