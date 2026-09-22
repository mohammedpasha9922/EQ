import fs from 'fs';
const s = fs.readFileSync('app.js', 'utf8');
const lines = s.split(/\r?\n/);
const out = [];
out.push('=== app.js RTL/lang branches ===');
lines.forEach((l, i) => {
  if (/===\s*'ar'|'ar'\s*===|isRTL|setAttribute\('dir'/.test(l)) out.push((i + 1) + ': ' + l.trim().slice(0, 250));
});
out.push('=== line 5050-5060 ===');
for (let i = 5048; i < 5062; i++) out.push((i + 1) + ': ' + lines[i]);
out.push('=== line 5296-5306 ===');
for (let i = 5295; i < 5306; i++) out.push((i + 1) + ': ' + lines[i]);
const css = fs.readFileSync('styles.css', 'utf8');
out.push('=== CSS data-language / dir selectors ===');
css.split(/\r?\n/).forEach((l, i) => {
  if (/data-language|\[dir=/.test(l)) out.push('CSS ' + (i + 1) + ': ' + l.trim().slice(0, 200));
});
out.push('=== css line 6600-6620 ===');
const cl = css.split(/\r?\n/);
for (let i = 6598; i < 6622; i++) out.push('CSS ' + (i + 1) + ': ' + cl[i]);
const t = fs.readFileSync('tests/part21_offline.test.mjs', 'utf8');
out.push('=== test launch ===');
const li = t.indexOf('puppeteer');
out.push(t.slice(Math.max(0, li - 200), li + 600));
fs.writeFileSync('__phase37b/audit3.txt', out.join('\n'), 'utf8');
console.log('done');