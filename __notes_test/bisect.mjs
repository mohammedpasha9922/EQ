import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const lines = app.split('\n');
const tmp = path.join(root, '__notes_test', '__bisect_tmp.mjs');
function needClosers(prefix) {
  for (let k = 0; k < 40; k++) {
    fs.writeFileSync(tmp, prefix + '\n' + '}'.repeat(k) + '\n');
    const r = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
    if (r.status === 0) return k;
  }
  return -1;
}
// Scan windows across 17100-17900 and find where needed closers changes.
let prev = -1;
const interesting = [];
for (let L = 17000; L <= lines.length; L += 25) {
  const prefix = lines.slice(0, L).join('\n');
  const need = needClosers(prefix);
  if (prev === -1) prev = need;
  if (need !== prev) {
    interesting.push([L, need, 'delta from ' + prev]);
    prev = need;
  }
}
console.log('total lines =', lines.length);
console.log(JSON.stringify(interesting));
try { fs.unlinkSync(tmp); } catch (e) {}