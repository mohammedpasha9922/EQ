// CSS audit: which smart-* selectors are now UNREFERENCED (candidates) vs still used
const fs = require('fs');
const css = fs.readFileSync('styles.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const src = html + '\n' + app;

// Collect class names declared in styles.css that start with smart
const declared = new Set();
const re = /\.([a-zA-Z][\w-]*)/g;
let m;
while ((m = re.exec(css))) { if (m[1].toLowerCase().startsWith('smart')) declared.add(m[1]); }

const used = [], unused = [];
declared.forEach((c) => {
  // referenced in HTML or JS (class attribute, classList, querySelector, string literal)
  if (src.indexOf(c) !== -1) used.push(c); else unused.push(c);
});

const out = [];
out.push('smart-* classes DECLARED in styles.css : ' + declared.size);
out.push('  still referenced in html/app.js      : ' + used.length);
out.push('  now unreferenced (old-UI candidates) : ' + unused.length);
out.push('');
out.push('--- UNREFERENCED (old Smart Documents UI candidates) ---');
unused.sort().forEach((c) => out.push('  .' + c));
out.push('');
out.push('--- STILL REFERENCED (keep) ---');
used.sort().forEach((c) => out.push('  .' + c));
fs.writeFileSync('_CLOSE3_out.txt', out.join('\r\n'), 'utf8');
process.stdout.write(out.slice(0, 30).join('\n'));
