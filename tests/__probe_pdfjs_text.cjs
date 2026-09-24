// TEMP diagnostic: how does the vendored pdf.js draw text?
const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/__pdfdiag/vendor/pdf.min.js';
const s = fs.readFileSync(p, 'utf8');
const out = [];
for (const pat of ['fillText', 'letterSpacing', 'wordSpacing', 'charSpacing', 'useSystemFonts', 'fetchStandardFontData']) {
  const count = s.split(pat).length - 1;
  out.push('=== ' + pat + ' occurrences=' + count);
  let idx = -1, n = 0;
  while ((idx = s.indexOf(pat, idx + 1)) >= 0 && n < 4) {
    out.push('--- @' + idx + ' ---');
    out.push(s.slice(Math.max(0, idx - 400), idx + 300).replace(/\r?\n/g, ' '));
    n++;
  }
}
fs.writeFileSync('d:/Programs EQ7/EQ/__t_pdfjs.txt', out.join('\n'), 'utf8');
console.log('written');
