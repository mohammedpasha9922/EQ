import fs from 'fs';
const s = fs.readFileSync('app.js', 'utf8');
const lines = s.split(/\r?\n/);
// all 'ar' string comparisons (language branch decisions)
lines.forEach((l, i) => {
  if (/===\s*'ar'|'ar'\s*===|isRTL|dir\s*=\s*['"]rtl|setAttribute\('dir'/.test(l)) {
    console.log((i + 1) + ': ' + l.trim().slice(0, 220));
  }
});
console.log('--- CSS ---');
const css = fs.readFileSync('styles.css', 'utf8');
const cssLines = css.split(/\r?\n/);
cssLines.forEach((l, i) => {
  if (/dir|rtl|data-language|:lang\(/.test(l) && /[[]|rtl/.test(l)) console.log('CSS ' + (i + 1) + ': ' + l.trim().slice(0, 160));
});
console.log('--- index.html scripts ---');
const h = fs.readFileSync('index.html', 'utf8');
h.split(/\r?\n/).forEach((l, i) => { if (/<script/.test(l)) console.log((i + 1) + ': ' + l.trim().slice(0, 160)); });
console.log('--- package.json ---');
try { console.log(fs.readFileSync('package.json', 'utf8').slice(0, 800)); } catch (e) { console.log('no package.json'); }
console.log('--- node_modules puppeteer ---');
try { console.log(fs.existsSync('node_modules/puppeteer') ? 'puppeteer present' : 'NO puppeteer'); } catch (e) { console.log('err'); }
console.log('--- storage key ---');
lines.forEach((l, i) => { if (/LANGUAGE_KEY\s*=/.test(l)) console.log((i + 1) + ': ' + l.trim()); });