const fs = require('fs');
const s = fs.readFileSync('app.js','utf8');
const lines = s.split('\n');
const trLine = lines.findIndex(l => /^\s{2,4}tr:\s*\{/.test(l));
console.log('tr starts line', trLine+1);
let depth = 0, inString = false, strCh = '';
for (let i = trLine; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const c = line[j];
    if (inString) {
      if (c === '\\') j++;
      else if (c === strCh) inString = false;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inString = true; strCh = c; continue; }
    if (c === '{') depth++;
    if (c === '}') depth--;
  }
  if (depth === 0 && i > trLine) {
    console.log('tr CLOSES at line', i+1, '->', JSON.stringify(line.trim()));
    const tail = lines.slice(i+1, Math.min(i+6, lines.length)).map((x,n) => (i+2+n) + ':' + x.trim());
    console.log('tail after close:');
    tail.forEach(t => console.log('  ', t));
    break;
  }
}