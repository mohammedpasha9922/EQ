import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = path.join(root, '__notes_test', '__closers_tmp.mjs');
const s = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
for (let k = 0; k < 10; k++) {
  fs.writeFileSync(tmp, s + '\n' + '}'.repeat(k) + '\n');
  const r = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
  const ok = r.status === 0;
  const err = (r.stderr || '').split('\n')[1] || '';
  console.log(k, ok ? 'OK' : 'ERR: ' + err.slice(0, 80));
  if (ok) break;
}
try { fs.unlinkSync(tmp); } catch (e) {}