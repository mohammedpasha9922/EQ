const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/styles.css', 'utf8');
let depth = 0, line = 1, min = [], errors = [];
for (let i = 0; i < s.length; i++) {
  const ch = s[i];
  if (ch === '\n') line++;
  if (ch === '{') depth++;
  if (ch === '}') { depth--; if (depth < 0) { errors.push('extra } at line ' + line); depth = 0; } }
}
console.log('final depth:', depth, 'errors:', errors.slice(0, 5));
// find the layer rule and verify selector context
const i = s.indexOf('.smart-pdf-overlay-layer');
console.log(JSON.stringify(s.slice(i - 60, i + 130)));
