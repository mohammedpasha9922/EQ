import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.resolve('d:/Programs EQ7/EQ/__notes_test');
const suites = [
  { name: 'N02 Home',     file: 'n02_home_check.mjs',     out: 'n02_out.txt' },
  { name: 'N03 Create',    file: 'n03_create_check.mjs',   out: 'n03_out.txt' },
  { name: 'PART 04 Editor',file: 'n04_editor_check.mjs',   out: 'n04_out.txt' },
  { name: 'PART 05 Format',file: 'n05_formatting_check.mjs', out: 'n05_out.txt' },
  { name: 'PART 06 Tables',file: 'n06_table_check.mjs',    out: 'n06_out.txt' },
  { name: 'PART 09 Images',file: 'p9_images.mjs',          out: 'p9_out.txt' },
  { name: 'PART 08 Styles',file: 'p8_full_verify.mjs',     out: 'p8_out.txt' },
  { name: 'PART 10 Org',   file: 'p10_org.mjs',            out: 'p10_out.txt' },
];

const agg = { pass: 0, fail: 0, notVerified: 0, preexisting: 0 };
const lines = [];

for (const s of suites) {
  const sf = path.join(HERE, s.file);
  if (!fs.existsSync(sf)) {
    lines.push(`SKIPPED ${s.name}: missing file ${s.file}`);
    continue;
  }
  let out = '';
  try {
    execSync(`node ${s.file}`, { cwd: HERE, timeout: 240000, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] });
    out = '(no stdout captured via execSync)';
  } catch (e) {
    out = (Buffer.isBuffer(e.stdout) ? e.stdout.toString('utf8') : (e.stdout||'')) + '\n' + (Buffer.isBuffer(e.stderr) ? e.stderr.toString('utf8') : (e.stderr||''));
  }
  // Read the dedicated results file if the harness wrote one
  const rf = path.join(HERE, s.out.replace('_out.txt','_results.txt'));
  let content = fs.existsSync(rf) ? fs.readFileSync(rf,'utf8') : out;
  // Also try the .txt the harness may write
  if (!content) {
    for (const cand of [s.out, s.out.replace('_out.txt','_run.txt')]) {
      const candPath = path.join(HERE, cand);
      if (fs.existsSync(candPath)) { content = fs.readFileSync(candPath,'utf8'); break; }
    }
  }
  const resultsLine = /RESULTS_JSON=\{[^}]+\}/.exec(content);
  if (resultsLine) {
    try {
      const j = JSON.parse(resultsLine[0].split('RESULTS_JSON=')[1]);
      agg.pass += j.pass || 0; agg.fail += j.fail || 0; agg.not_verified += j.not_verified || 0; agg.preexisting += j.preexisting || 0;
      lines.push(`${s.name}: PASS=${j.pass} FAIL=${j.fail} NOT_VERIFIED=${j.not_verified} PREEXISTING=${j.preexisting}`);
    } catch (e) { lines.push(`${s.name}: parse error ${e.message}`); }
  } else {
    // fallback: count PASS/FAIL tokens in content
    const p = (content.match(/PASS/g)||[]).length;
    const f = (content.match(/FAIL/g)||[]).length;
    agg.pass += p; agg.fail += f;
    lines.push(`${s.name}: (no RESULTS_JSON) counted PASS~${p} FAIL~${f}`);
  }
}
lines.push('---');
lines.push(`TOTAL: PASS=${agg.pass} FAIL=${agg.fail} NOT_VERIFIED=${agg.notVerified} PREEXISTING=${agg.preexisting}`);
const txt = lines.join('\n');
fs.writeFileSync(path.join(HERE,'_p11_regress_summary.txt'), txt, 'utf8');
console.log(txt);
process.exit(agg.fail > 0 ? 1 : 0);
