import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const lines = app.split('\n');
const tmp = path.join(root, '__notes_test', '__insert_tmp.mjs');
// Find the line index of "// --- Cell Background Color ---"
let idx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('// --- Cell Background Color ---')) { idx = i; break; }
}
console.log('cell-bg idx =', idx + 1);
function check(src) {
  fs.writeFileSync(tmp, src);
  const r = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
  return r.status === 0;
}
// variant A: add } right before (after previous line)
let a = lines.slice(); a.splice(idx, 0, '}');
console.log('insert before cellbg ->', check(a.join('\n')) ? 'PARSE OK' : 'FAIL');
// variant B: try a few candidate insert points: after each of idx-3..idx+1
for (let d = -3; d <= 1; d++) {
  const at = idx + d;
  const b = lines.slice(); b.splice(at, 0, '}');
  const ok = check(b.join('\n'));
  console.log('insert after line', at, '->', ok ? 'PARSE OK' : 'FAIL');
}
try { fs.unlinkSync(tmp); } catch (e) {}