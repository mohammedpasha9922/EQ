const fs = require('fs');
let out = [];
for (const f of ['index.html', 'manifest.json', 'sw.js']) {
  fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach((l, i) => {
    if (/\bEQ\b(?!7)/.test(l)) out.push(f + ':' + (i + 1) + ': ' + l.trim().slice(0, 160));
  });
}
// Also confirm the app.js diff scope: count EQ7 occurrences now
let c = 0;
fs.readFileSync('app.js', 'utf8').split(/\r?\n/).forEach((l) => { c += (l.match(/EQ7/g) || []).length; });
out.push('app.js EQ7 occurrence count: ' + c);
fs.writeFileSync('_p37a_resid.txt', out.join('\r\n') || 'NO RESIDUAL EQ');
console.log('done');


