// TEMP diagnostic 4: when does pdf.js create the FakeUnicodeFont fallback?
const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/__pdfdiag/vendor/pdf.worker.min.js', 'utf8');
const out = [];
for (const pat of ['FakeUnicodeFont', 'ArialMT']) {
  out.push('=== ' + pat + ' occurrences=' + (s.split(pat).length - 1));
  let idx = -1, n = 0;
  while ((idx = s.indexOf(pat, idx + 1)) >= 0 && n < 10) {
    out.push('--- @' + idx + ' ---');
    out.push(s.slice(Math.max(0, idx - 800), idx + 400).replace(/\r?\n/g, ' '));
    n++;
  }
}
fs.writeFileSync('d:/Programs EQ7/EQ/__t_pw5.txt', out.join('\n'), 'utf8');
console.log('written');
