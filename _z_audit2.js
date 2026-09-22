// Follow-up audit: smartTableCreate hit, Age Calculator real marker, CSS dead-class scan.
const fs = require('fs');
const path = require('path');
const out = [];
const say = (s) => out.push(s);

const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');

// A) Where does smartTableCreate appear?
say('=== A) smartTableCreate occurrences ===');
app.split(/\r?\n/).forEach((l, i) => {
  if (l.includes('smartTableCreate')) say(`  app.js:${i + 1}: ${l.trim().slice(0, 160)}`);
});
html.split(/\r?\n/).forEach((l, i) => {
  if (l.includes('smartTableCreate')) say(`  index.html:${i + 1}: ${l.trim().slice(0, 160)}`);
});

// B) Age Calculator real markers
say('=== B) Age Calculator markers ===');
const ageWords = ['ageCalculator', 'age-calc', 'ageCalc', 'Age Calculator', 'ageCalcModal', 'calculateAge'];
for (const w of ageWords) {
  say(`  ${w}: html=${html.includes(w)} js=${app.includes(w)}`);
}
const ageIdx = html.split(/\r?\n/).map((l, i) => [i + 1, l]).filter(([, l]) => /age/i.test(l) && /id=/.test(l));
ageIdx.slice(0, 12).forEach(([n, l]) => say(`  html:${n}: ${l.trim().slice(0, 130)}`));

// C) Service worker registration
say('=== C) Service worker ===');
app.split(/\r?\n/).forEach((l, i) => {
  if (/serviceWorker\.register/.test(l)) say(`  app.js:${i + 1}: ${l.trim().slice(0, 140)}`);
});

// D) CSS dead-class scan for smart-* selectors
say('=== D) CSS smart-* class usage ===');
const cssClasses = new Set();
css.split(/\r?\n/).forEach((l) => {
  const m = l.match(/\.([a-zA-Z][\w-]*)/g);
  if (m) m.forEach((x) => { const c = x.slice(1); if (/^smart-/.test(c)) cssClasses.add(c); });
});
const live = [];
const dead = [];
[...cssClasses].sort().forEach((c) => {
  const inHtml = html.includes(c);
  const inApp = app.includes(c);
  (inHtml || inApp ? live : dead).push(`${c}  (html=${inHtml} js=${inApp})`);
});
say(`  LIVE classes (still referenced) = ${live.length}`);
live.forEach((l) => say('    ' + l));
say(`  DEAD classes (no reference anywhere) = ${dead.length}`);
dead.forEach((l) => say('    ' + l));

fs.writeFileSync(path.join(__dirname, '_z_audit2.txt'), out.join('\n'), 'utf8');
