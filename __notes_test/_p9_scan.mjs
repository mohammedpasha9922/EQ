import fs from 'node:fs';
import { execSync } from 'node:child_process';
const t = fs.readFileSync('d:/Programs EQ7/EQ/__notes_test/_p9_syntax.mjs', 'utf8').split('\n');
const ok = [];
for (let ln = 11805; ln <= 12110; ln++) {
  fs.writeFileSync('d:/Programs EQ7/EQ/__notes_test/_p9x.mjs', t.slice(0, ln).join('\n') + '\n');
  try { execSync('node --check d:/Programs EQ7/EQ/__notes_test/_p9x.mjs', { stdio: 'pipe' }); ok.push(ln); } catch (e) {}
}
console.log('OK_LINES', ok.join(','));