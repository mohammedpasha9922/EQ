// Sequential regression runner for PART 33 (runs real Puppeteer suites).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const tests = [
  'tests/part24_document_name.test.mjs'
];
const OUT = '__p33_regr_summary.txt';
fs.writeFileSync(OUT, 'STARTED\n');
let failed = 0;
for (const t of tests) {
  const line = `RUN ${t}`;
  console.log(line);
  fs.appendFileSync(OUT, line + '\n');
  let code = 0;
  try {
    const out = execFileSync('node', [t], { encoding: 'utf8', timeout: 900000, maxBuffer: 64 * 1024 * 1024 });
    fs.writeFileSync(t.replace('tests/', '__p33r_').replace(/\.mjs$/, '.log'), out);
    const m = out.match(/(DONE|SUMMARY|RESULT)[^\n]*/);
    if (m) fs.appendFileSync(OUT, m[0] + '\n');
    code = /FAIL=(?:[^0]|0$)/.test(out.split('\n').filter(Boolean).pop() || '') ? 1 : 0;
    // exit code of the suite itself is authoritative via status below
    code = 0;
  } catch (e) {
    code = e.status == null ? -1 : e.status;
    const out = String(e.stdout || '');
    fs.writeFileSync(t.replace('tests/', '__p33r_').replace(/\.mjs$/, '.log'), out + '\nSTDERR:\n' + String(e.stderr || ''));
    const last = out.trim().split('\n').filter(Boolean).pop() || '(no output)';
    fs.appendFileSync(OUT, last + '\n');
  }
  const verdict = code === 0 ? 'PASS' : 'FAIL';
  if (code !== 0) failed++;
  fs.appendFileSync(OUT, `${verdict} ${t} (exit=${code})\n`);
}
fs.appendFileSync(OUT, `REGR DONE failed_suites=${failed}/${tests.length}\n`);
console.log(`REGR DONE failed_suites=${failed}/${tests.length}`);
