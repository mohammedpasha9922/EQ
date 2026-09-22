const fs = require('fs');
const src = fs.readFileSync('app.js', 'utf8');
function endOfBlock(s, loc) {
  const m = s.indexOf('  ' + loc + ': {');
  if (m < 0) throw new Error('no block ' + loc);
  let i = s.indexOf('{', m), depth = 0, end = -1;
  for (; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    else if (s[i] === '"' || s[i] === "'" || s[i] === '`') {
      const q = s[i]; i++;
      while (i < s.length) { if (s[i] === '\\') i++; else if (s[i] === q) break; i++; }
    }
  }
  return end;
}
const T = require('./_p36_t.js');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let out = src;
for (const loc of ['es', 'fr', 'ru', 'de', 'tr']) {
  const end = endOfBlock(out, loc);
  // ensure the previous entry ends with a comma before inserting new keys
  let cut = end;
  while (cut > 0 && /\s/.test(out[cut - 1])) cut--;
  let prefix = '';
  if (out[cut - 1] !== ',' && out[cut - 1] !== '{') { prefix = ','; }
  const ins = prefix + ' ' + T[loc] + eol;
  out = out.slice(0, end) + ins + out.slice(end);
}
fs.writeFileSync('app.js', out);
console.log('OK inserted for', Object.keys(T).join(','));
