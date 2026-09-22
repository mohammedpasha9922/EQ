// Robust regression runner — captures child stdout via spawn.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const HERE = 'd:/Programs EQ7/EQ/__notes_test';
const suites = [
  ['N02 Home',     'n02_home_check.mjs'],
  ['N03 Create',   'n03_create_check.mjs'],
  ['PART04 Editor','n04_editor_check.mjs'],
  ['PART05 Format','n05_formatting_check.mjs'],
  ['PART06 Tables','n06_table_check.mjs'],
  ['PART09 Images','p9_images.mjs'],
  ['PART10 Org',   'p10_org.mjs'],
];
const agg = { pass: 0, fail: 0, nv: 0, pre: 0 };
const lines = [];
for (const [name, file] of suites) {
  const fp = path.join(HERE, file);
  if (!fs.existsSync(fp)) { lines.push('SKIP ' + name + ' (missing ' + file + ')'); continue; }
  const out = await new Promise((resolve) => {
    const c = spawn('node', [file], { cwd: HERE });
    let o = ''; let e = '';
    c.stdout.on('data', (d) => { o += d; });
    c.stderr.on('data', (d) => { e += d; });
    const t = setTimeout(() => { c.kill('SIGKILL'); resolve({ o, e, timed: true }); }, 240000);
    c.on('close', (code) => { clearTimeout(t); resolve({ o, e, code }); });
  });
  const m = /RESULTS_JSON=\{([^}\n]+)\}/.exec(out.o);
  if (m) {
    try {
      const j = JSON.parse('{' + m[1] + '}');
      agg.pass += j.pass || 0; agg.fail += j.fail || 0; agg.nv += j.not_verified || 0; agg.pre += j.preexisting || 0;
      lines.push(name + ': RESULTS_JSON ' + JSON.stringify(j));
    } catch (err) { lines.push(name + ': parse fail ' + err.message + ' | ' + out.o.slice(-400)); }
  } else {
    const p = (out.o.match(/\bPASS\b/g) || []).length;
    const f = (out.o.match(/\bFAIL\b/g) || []).length;
    agg.pass += p; agg.fail += f;
    lines.push(name + ': no RESULTS_JSON; counted PASS=' + p + ' FAIL=' + f + (out.timed ? ' (TIMED OUT)' : '') + ' | err=' + (out.e ? out.e.slice(-200) : ''));
  }
}
lines.push('---');
lines.push('TOTAL PASS=' + agg.pass + ' FAIL=' + agg.fail + ' NOT_VERIFIED=' + agg.nv + ' PREEXISTING=' + agg.pre);
const text = lines.join('\n');
fs.writeFileSync(path.join(HERE, '_p11_regress2_summary.txt'), text, 'utf8');
console.log(text);
process.exit(agg.fail > 0 ? 1 : 0);