// temp: run the *stale* smart_pdf_phase_static test against pristine HEAD files
// to prove whether its failures pre-date PHASE 03.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const root = 'd:/Programs EQ7/EQ';
const tmp = path.join(root, 'tests', '__p3_headtree');
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });
for (const f of ['index.html', 'app.js', 'styles.css', 'package.json']) {
  const s = execSync(`git show HEAD:${f}`, { cwd: root, maxBuffer: 1024 * 1024 * 400 }).toString();
  fs.writeFileSync(path.join(tmp, f), s);
}
fs.copyFileSync(path.join(root, 'tests', 'smart_pdf_phase_static.test.mjs'), path.join(tmp, 't.mjs'));
let out = '';
try {
  out = execSync('node t.mjs', { cwd: tmp, maxBuffer: 1024 * 1024 * 40 }).toString();
} catch (e) {
  out = 'EXIT ' + e.status + '\n' + String(e.stdout || '') + String(e.stderr || '');
}
fs.writeFileSync(path.join(root, 'tests', '__p3_headrun_out.txt'), out);
