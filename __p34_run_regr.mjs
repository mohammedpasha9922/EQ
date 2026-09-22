// PART 34 — regression runner (reuses the EXISTING suites, no new test copies).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const tests = [
  'tests/part20_smart_save.test.mjs',
  'tests/part23_local_storage_architecture.test.mjs',
  'tests/part25_smart_review.test.mjs',
  'tests/part26_smart_pdf_export.test.mjs',
  'tests/part27_smart_pdf_sharing.test.mjs',
  'tests/part32_smart_drafts.test.mjs',
  'tests/part33_new_document_unsaved.test.mjs',
  'tests/part28_i18n.test.mjs',
  'tests/part29_language_consistency.test.mjs',
  'tests/part30_rtl_ltr.test.mjs',
  'tests/part31_responsive_design.test.mjs'
];
const OUT = '__p34_regr_summary.txt';
fs.writeFileSync(OUT, 'REGR STARTED\n');
let failed = 0;
for (const t of tests) {
  fs.appendFileSync(OUT, 'RUN ' + t + '\n');
  const r = spawnSync('node', [t], { encoding: 'utf8', timeout: 900000 });
  const ok = r.status === 0;
  if (!ok) failed++;
  fs.appendFileSync(OUT, (ok ? 'PASS ' : 'FAIL ') + t + ' (exit=' + r.status + ')\n');
}
fs.appendFileSync(OUT, 'REGR DONE failed_suites=' + failed + '/' + tests.length + '\n');
process.exit(failed ? 1 : 0);
