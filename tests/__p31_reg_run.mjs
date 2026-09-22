// PART 31 regression runner (test-only): runs the PDF-editor regression
// suite sequentially and records NODEEXIT per test. Does not touch app code.
import fs from 'fs';
import cp from 'child_process';
import path from 'path';
import url from 'url';

const __dirname2 = path.dirname(url.fileURLToPath(import.meta.url));
const tests = [
  'part28_i18n.test.mjs',
  'part29_language_consistency.test.mjs',
  'part27_pdf_signature.test.mjs',
  'part27_smart_pdf_sharing.test.mjs',
  'part26_pdf_logo.test.mjs',
  'part26_smart_pdf_export.test.mjs',
  'part25_pdf_pages.test.mjs',
  'part25_smart_review.test.mjs',
  'part24_document_name.test.mjs',
  'part23_local_storage_architecture.test.mjs',
  'part22_online_architecture.test.mjs',
  'part30_rtl_ltr.test.mjs',
  'part31_preview.test.mjs',
  'part31_responsive_design.test.mjs'
];
const out = [];
const statusFile = path.join(__dirname2, '..', '__p31rg_status.txt');
fs.writeFileSync(statusFile, 'STARTED\n');
for (const t of tests) {
  const base = '__p31rg_' + t.replace('.test.mjs', '');
  const stdoutFile = path.join(__dirname2, '..', base + '.stdout.txt');
  const stderrFile = path.join(__dirname2, '..', base + '.stderr.txt');
  let r;
  try {
    r = cp.spawnSync(process.execPath, [t], { cwd: __dirname2, timeout: 20 * 60 * 1000 });
  } catch (e) {
    out.push(t + ' SPAWNSYNC_THROW=' + (e && e.message));
    fs.writeFileSync(statusFile, out.join('\n') + '\n');
    continue;
  }
  fs.writeFileSync(stdoutFile, r.stdout || '');
  fs.writeFileSync(stderrFile, r.stderr || '');
  const summary = String(r.stdout || '').split('\n').filter((l) => /SUMMARY|TOTAL|SUM/i.test(l)).join(' | ').slice(-300);
  out.push(t + ' NODEEXIT=' + r.status + (r.error ? ' SPAWNERROR=' + r.error.code : '') + ' :: ' + summary);
  fs.writeFileSync(statusFile, out.join('\n') + '\n');
}
fs.writeFileSync(statusFile, out.join('\n') + '\nALLDONE\n');
console.log(out.join('\n'));

