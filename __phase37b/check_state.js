const fs = require('fs');
const d = '__phase37b';
console.log('--- __phase37b dir contents ---');
if (!fs.existsSync(d)) { console.log('NO __phase37b dir'); process.exit(0); }
const files = fs.readdirSync(d);
files.forEach(f => {
  const p = d + '/' + f;
  const s = fs.statSync(p);
  const type = s.isDirectory() ? '[DIR]  ' : '[FILE] ';
  const mtime = s.mtime.toISOString().slice(0, 16);
  console.log(type + f + '  ' + s.size + 'B  ' + mtime);
});
console.log('--- production files mtime ---');
['app.js','app_fixed.js','index.html','styles.css'].forEach(f => {
  try {
    const s = fs.statSync(f);
    console.log(f + '  ' + s.size + 'B  ' + s.mtime.toISOString().slice(0,16));
  } catch(e) { console.log(f + ' MISSING'); }
});
