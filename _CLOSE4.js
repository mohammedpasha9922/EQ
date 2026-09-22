// Detect DYNAMIC class construction using smart- prefixes (must not delete those)
const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const out = [];
out.push('=== dynamic smart- class construction (concat / template) in app.js ===');
const pats = [
  /['"`]smart-[\w-]*['"`]\s*\+/g,
  /\+\s*['"`]smart-[\w-]*['"`]/g,
  /`smart-[\w-]*\$\{/g,
  /classList\.(add|remove|toggle)\((['"`])smart-[\w-]*\2/g,
  /querySelector(All)?\((['"`])[^'"`]*smart-[\w-]*[^'"`]*\2/g,
  /closest\((['"`])[^'"`]*smart-[\w-]*[^'"`]*\1/g
];
let found = 0;
pats.forEach((p, i) => {
  const hits = app.match(p) || [];
  if (hits.length) { found += hits.length; out.push('  pat' + i + ' x' + hits.length + ': ' + hits.slice(0, 12).join(' | ')); }
});
out.push('  TOTAL dynamic hits: ' + found);
out.push('');
out.push('=== smart- prefixes appearing inside template/string literals (informational) ===');
const pref = new Set();
(app.match(/smart-[\w-]+/g) || []).forEach((s) => pref.add(s));
out.push('  distinct smart-* tokens in app.js: ' + pref.size);
out.push('  ' + Array.from(pref).sort().join(', '));
out.push('');
out.push('=== distinct smart-* tokens in index.html ===');
const pref2 = new Set();
(html.match(/smart-[\w-]+/g) || []).forEach((s) => pref2.add(s));
out.push('  ' + Array.from(pref2).sort().join(', '));
fs.writeFileSync('_CLOSE4_out.txt', out.join('\r\n'), 'utf8');
process.stdout.write(out.join('\n'));
