// TEMP diagnostic 3: where does pdf.js create the "InvalidPDFjsFont" fallback?
const fs = require('fs');
const out = [];
for (const f of ['pdf.min.js', 'pdf.worker.min.js']) {
  const s = fs.readFileSync('d:/Programs EQ7/EQ/__pdfdiag/vendor/' + f, 'utf8');
  const pat = 'InvalidPDFjsFont';
  const count = s.split(pat).length - 1;
  out.push('=== ' + f + ' ' + pat + ' occurrences=' + count);
  let idx = -1, n = 0;
  while ((idx = s.indexOf(pat, idx + 1)) >= 0 && n < 4) {
    out.push('--- @' + idx + ' ---');
    out.push(s.slice(Math.max(0, idx - 700), idx + 500).replace(/\r?\n/g, ' '));
    n++;
  }
}
fs.writeFileSync('d:/Programs EQ7/EQ/__t_pw4.txt', out.join('\n'), 'utf8');
console.log('written');
