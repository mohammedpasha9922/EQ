import fs from 'fs';
const s = fs.readFileSync('d:/Programs EQ7/EQ/styles.css', 'utf8');
for (const sel of ['.scan-review-grid', '.scan-review-col', '.scan-review-text', '.smart-scan-stage', '.smart-scan-view']) {
  let i = s.indexOf(sel + ' {');
  while (i !== -1) {
    const start = s.indexOf('{', i);
    let depth = 0, end = start;
    for (let k = start; k < s.length; k++) { const c = s[k]; if (c === '{') depth++; if (c === '}') { depth--; if (depth === 0) { end = k + 1; break; } } }
    console.log('--- ' + sel + ' @line ' + s.slice(0, i).split('\n').length);
    console.log(s.substring(i, end));
    i = s.indexOf(sel + ' {', end);
  }
}

const start = s.indexOf('{', i);
let depth = 0, end = start;
for (let k = start; k < s.length; k++) {
  const c = s[k];
  if (c === '{') depth++;
  if (c === '}') { depth--; if (depth === 0) { end = k + 1; break; } }
}
console.log('LINE=' + s.slice(0, i).split('\n').length);
console.log(s.substring(i, end));
