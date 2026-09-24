// TEMP diagnostic: pdf.js font-loading behaviour inside the worker.
const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/__pdfdiag/vendor/pdf.worker.min.js';
const s = fs.readFileSync(p, 'utf8');
const out = [];
for (const pat of ['useSystemFonts', 'systemFontInfo', 'isInvalidPDFjsFont', 'missingFile', 'fetchStandardFontData']) {
  const count = s.split(pat).length - 1;
  out.push('=== ' + pat + ' occurrences=' + count);
  let idx = -1, n = 0;
  while ((idx = s.indexOf(pat, idx + 1)) >= 0 && n < 3) {
    out.push('--- @' + idx + ' ---');
    out.push(s.slice(Math.max(0, idx - 500), idx + 500).replace(/\r?\n/g, ' '));
    n++;
  }
}
fs.writeFileSync('d:/Programs EQ7/EQ/__t_pdfworker.txt', out.join('\n'), 'utf8');
console.log('written');
