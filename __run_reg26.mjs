import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
const ROOT = 'D:/Programs EQ7/EQ';
const tests = [
  'part18_smart_signature_protection',
  'part19_smart_pages',
  'part20_smart_save',
  'part21_offline',
  'part23_local_storage_architecture',
  'part24_document_name',
  'part25_smart_review'
];
const results = [];
for (const t of tests) {
  const file = path.join(ROOT, 'tests', t + '.test.mjs');
  const r = spawnSync(process.execPath, [file], { cwd: ROOT, timeout: 180000, encoding: 'utf8' });
  const log = (r.stdout || '') + '\n' + (r.stderr || '');
  const lines = log.split('\n').filter((l) => /SUMMARY|pass \d+|\bFAIL\b/.test(l));
  const summary = lines.join(' | ') || '(no summary / timeout?)';
  const fails = log.split('\n').filter((l) => /^FAIL/.test(l)).slice(0, 20).join('\n       ');
  results.push(`${r.status === 0 ? 'PASS' : 'FAIL'}  ${t} (exit=${r.status})  ${summary}\n       ${fails}`.trim());
  // Write incrementally so a slow test never hides earlier results.
  fs.writeFileSync(path.join(ROOT, '__p26_regression_result.txt'),
    results.join('\n'), 'utf8');
  console.log(`done ${t} exit=${r.status}`);
}