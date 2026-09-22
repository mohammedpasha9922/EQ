// Consolidated post-reset audit: which pre-reset top-level definitions are now
// missing from app.js while still being called (runtime-break risk = regression).
const fs = require('fs');
const { execSync } = require('child_process');

let ref = '';
try {
  ref = execSync('git show HEAD:app.js', { maxBuffer: 1024 * 1024 * 300 }).toString('utf8');
} catch (e) {
  console.log('git show failed: ' + e.message);
}
if (ref) fs.writeFileSync('_ref_head.js', ref, 'utf8');
const cur = fs.readFileSync('app.js', 'utf8');

function decls(src) {
  const out = new Set();
  const reFn = /^(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/gm;
  const reArrow = /^(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\(?[A-Za-z0-9_$,\s]*\)?\s*=>/gm;
  const reFnExpr = /^(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s+)?function\b/gm;
  let m;
  while ((m = reFn.exec(src))) out.add(m[1]);
  while ((m = reArrow.exec(src))) out.add(m[1]);
  while ((m = reFnExpr.exec(src))) out.add(m[1]);
  return out;
}

const refDecls = decls(ref);
const curDecls = decls(cur);
const missing = [...refDecls].filter((n) => !curDecls.has(n));

const lines = [];
lines.push('HEAD_BYTES=' + ref.length + '  CUR_BYTES=' + cur.length);
lines.push('HEAD_DECLS=' + refDecls.size + '  CUR_DECLS=' + curDecls.size + '  MISSING=' + missing.length);
lines.push('');

const stillCalled = [];
const safeGone = [];
for (const name of missing) {
  const callRe = new RegExp('\\b' + name.replace(/\$/g, '\\$') + '\\s*\\(', 'g');
  const hits = (cur.match(callRe) || []).length;
  // also check bare identifier references (e.g. passing as callback)
  const idRe = new RegExp('\\b' + name.replace(/\$/g, '\\$') + '\\b', 'g');
  const idHits = (cur.match(idRe) || []).length;
  if (hits > 0) stillCalled.push({ name, hits, idHits });
  else safeGone.push({ name, idHits });
}

lines.push('=== MISSING BUT STILL CALLED (REGRESSION RISK) ===');
stillCalled.sort((a, b) => b.hits - a.hits).forEach((x) => lines.push('  ' + x.name + '  calls=' + x.hits + ' refs=' + x.idHits));
lines.push('');
lines.push('=== MISSING, NOT CALLED (safe removals) count=' + safeGone.length + ' ===');
safeGone.forEach((x) => lines.push('  ' + x.name + '  refs=' + x.idHits));

// Duplicate declarations in current file
const dupMap = new Map();
const reAll = /^(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/gm;
let mm;
while ((mm = reAll.exec(cur))) dupMap.set(mm[1], (dupMap.get(mm[1]) || 0) + 1);
const dups = [...dupMap.entries()].filter(([, c]) => c > 1);
lines.push('');
lines.push('=== DUPLICATE function DECLARATIONS IN CURRENT === count=' + dups.length);
dups.forEach(([n, c]) => lines.push('  ' + n + ' x' + c));

fs.writeFileSync('_r1_out.txt', lines.join('\n'), 'utf8');
console.log('done');
