const fs = require('fs');
const out = [];

const pre = fs.readFileSync('_chk_app.mjs', 'utf8').split(/\r?\n/);
const app = fs.readFileSync('app.js', 'utf8').split(/\r?\n/);

function declSet(lines) {
  const s = new Set();
  lines.forEach(l => {
    let m = l.match(/^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/);
    if (m) s.add(m[1]);
    m = l.match(/^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/);
    if (m) s.add(m[1]);
    m = l.match(/^\s*class\s+([A-Za-z_$][\w$]*)/);
    if (m) s.add(m[1]);
  });
  return s;
}

const preDecl = declSet(pre);
const appDecl = declSet(app);

// functions that exist before the reset but are gone now
const missing = [...preDecl].filter(n => !appDecl.has(n)).sort();
out.push('PRE-DECL COUNT=' + preDecl.size + ' APP-DECL COUNT=' + appDecl.size);
out.push('MISSING DECLARATIONS COUNT=' + missing.length);

// of those, which are still CALLED in current app.js?
const stillCalled = [];
const appText = app.join('\n');
missing.forEach(n => {
  const re = new RegExp('(?<![\\w$.])' + n.replace(/\$/g, '\\$') + '\\s*\\(', 'g');
  const hits = [];
  app.forEach((l, i) => { if (new RegExp('(?<![\\w$.])' + n.replace(/\$/g, '\\$') + '\\s*\\(').test(l)) hits.push(i + 1); });
  if (hits.length) stillCalled.push(n + ' -> lines ' + hits.join(','));
});
out.push('--- MISSING + STILL CALLED (' + stillCalled.length + ') ---');
stillCalled.forEach(x => out.push('  ' + x));

out.push('--- ALL MISSING DECLARATIONS ---');
missing.forEach(n => out.push('  ' + n));

fs.writeFileSync('_zz_check4_out.txt', out.join('\n'), 'utf8');
console.log('WROTE _zz_check4_out.txt lines=' + out.length);
