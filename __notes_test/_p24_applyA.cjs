// A: insert PART24 core funcs (b1+b2+b3) after smartPdfMarkClearDraw, EOL-agnostic
const fs = require('fs');
const P = 'd:/Programs EQ7/EQ/app.js';
let s = fs.readFileSync(P, 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';
const anchor = 'smartPdfMarkDrawCurrent = null; smartPdfMarkDrawPage = -1;';
if (s.split(anchor).length - 1 !== 1) { console.error('ABORT: A anchor count ' + (s.split(anchor).length - 1)); process.exit(1); }
if (s.split('function smartPdfMarkSvgHtml').length - 1 !== 0) { console.log('A already applied, skip'); process.exit(0); }
let block = '';
for (const f of ['_p24_b1.txt', '_p24_b2.txt', '_p24_b3.txt']) {
  const t = fs.readFileSync('d:/Programs EQ7/EQ/__notes_test/' + f, 'utf8').replace(/\r?\n/g, '\n').trim();
  block += (block ? '\n' : '') + t;
}
block = block.replace(/\n/g, eol);
const i = s.indexOf(anchor);
const j = s.indexOf(eol, i) + eol.length;
s = s.slice(0, j) + block + s.slice(j);
fs.writeFileSync(P, s);
console.log('A inserted, len', s.length);
