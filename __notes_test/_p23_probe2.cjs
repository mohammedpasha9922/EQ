const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
for (const k of ['smartPdfAddText', 'smartPdfTextColor', 'smartPdfAddTable', 'smartPdfTextColor:']) {
  console.log(k, s.split(k).length - 1);
}