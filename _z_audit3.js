// Follow-up 3: residual smart-doc-* references in app.js + Age Calculator real name.
const fs = require('fs');
const path = require('path');
const out = [];
const say = (s) => out.push(s);

const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

say('=== A) smart-doc-heading / smart-doc-text-block in app.js ===');
app.split(/\r?\n/).forEach((l, i) => {
  if (/smart-doc-heading|smart-doc-text-block/.test(l)) {
    const from = Math.max(0, i - 12);
    const block = app.split(/\r?\n/).slice(from, i + 6);
    say(`--- around app.js:${i + 1} ---`);
    block.forEach((b, k) => say(`  ${from + k + 1}: ${b.slice(0, 170)}`));
  }
});

say('=== B) Smart Documents references left in app.js (all) ===');
const jsHits = [];
app.split(/\r?\n/).forEach((l, i) => {
  if (/smart/i.test(l)) jsHits.push(`${i + 1}: ${l.trim().slice(0, 150)}`);
});
say(`  total lines mentioning "smart" = ${jsHits.length}`);
jsHits.forEach((h) => say('    ' + h));

fs.writeFileSync(path.join(__dirname, '_z_audit3.txt'), out.join('\n'), 'utf8');
