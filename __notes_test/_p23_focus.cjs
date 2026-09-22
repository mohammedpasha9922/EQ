const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/app.js';
let s = fs.readFileSync(p, 'utf8');
const old = "   if (kindCls === 'table' && ev.target && ev.target.closest && ev.target.closest('td[contenteditable]')) return;";
const newS = "   if (kindCls === 'table' && ev.target && ev.target.closest && ev.target.closest('td[contenteditable]')) {\n      try { const td = ev.target.closest('td[contenteditable]'); box.querySelectorAll('td.is-sel').forEach((x) => { if (x !== td) x.classList.remove('is-sel'); }); td.classList.add('is-sel'); try { td.focus(); } catch (e) {} } catch (e2) {}\n      return;\n    }";
const n = s.split(old).length - 1;
console.log('old occurrences:', n);
if (n === 1) {
  s = s.replace(old, newS);
  fs.writeFileSync(p, s);
  console.log('written');
}