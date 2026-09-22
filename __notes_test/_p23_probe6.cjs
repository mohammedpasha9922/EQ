const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
for (const fn of ['function smartPdfOverlayTableHtmlP23', 'function smartPdfAttachTableBarP23', 'function smartPdfOverlayReadTable', 'function smartPdfCellObj', 'function smartPdfTableNormalize']) {
  const p = s.indexOf(fn);
  console.log('===', fn, 'at', p, '===');
  if (p > -1) console.log(s.slice(p, p + 7000).slice(0, 7000));
}