import fs from 'fs';
const s = fs.readFileSync('app.js', 'utf8');
const lines = s.split(/\r?\n/);
const out = [];
const ctx = (a, b) => { for (let i = a - 1; i < b; i++) out.push((i + 1) + ': ' + lines[i]); };
ctx(9296, 9312);
ctx(9912, 9930);
ctx(11414, 11428);
ctx(8186, 8196);
// find usages of isArabic declared at 5300 within next 80 lines
for (let i = 5299; i < 5420; i++) if (/isArabic/.test(lines[i])) out.push('USE ' + (i + 1) + ': ' + lines[i].trim());
// index.html static dir/data-language
const h = fs.readFileSync('index.html', 'utf8');
h.split(/\r?\n/).forEach((l, i) => { if (/data-language|dir=|dir=/.test(l)) out.push('HTML ' + (i + 1) + ': ' + l.trim().slice(0, 160)); });
fs.writeFileSync('__phase37b/audit5.txt', out.join('\n'), 'utf8');
console.log('ok');