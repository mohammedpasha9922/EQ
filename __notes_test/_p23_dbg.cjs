const fs = require('fs');
let s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
const block = fs.readFileSync('d:/Programs EQ7/EQ/__notes_test/_p23_block.txt', 'utf8');
console.log('A1 count', s.split('// PART 5 — test / configuration seam for the Smart Import workflow.').length - 1);
const i = s.indexOf('// PART 5 — test / configuration seam for the Smart Import workflow.');
s = s.slice(0, i) + block + '\n' + '// PART 5 — test / configuration seam for the Smart Import workflow.' + s.slice(i + ('// PART 5 — test / configuration seam for the Smart Import workflow.').length);
for (const k of ['box.appendChild(body);', 'body.appendChild(body);', 'smartPdfOverlayTableHtml(o.rows || [[\'\', \'\'], [\'\', \'\']])']) {
  console.log('after A1:', JSON.stringify(k), s.split(k).length - 1);
}
console.log('block has box.appendChild?', block.split('box.appendChild(body);').length - 1);
console.log('block length', block.length);
console.log('block head', JSON.stringify(block.slice(0, 40)));
console.log('block tail', JSON.stringify(block.slice(-40)));