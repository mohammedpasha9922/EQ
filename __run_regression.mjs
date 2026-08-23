import { spawn } from 'node:child_process';
import fs from 'node:fs';

const tests = [
  'part1_smart_docs',
  'part3_smart_steps',
  'part4_smart_scan_ocr',
  'part5_smart_import',
  'part6_smart_blank_document',
  'part7_smart_templates',
  'part8_smart_document_editor'
];

// Minimal stdout: only a concise line per test + final summary.
let summary = [];
let overallFail = 0;
for (const t of tests) {
  const file = `tests/${t}.test.mjs`;
  process.stderr.write('. running ' + t + '\n');
  const child = spawn('node', [file], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  let err = '';
  child.stdout.on('data', (d) => { out += d.toString('utf8'); });
  child.stderr.on('data', (d) => { err += d.toString('utf8'); });
  const code = await new Promise((resolve) => child.on('close', resolve));
  const combined = out + (err ? `\n[stderr]\n${err}` : '');
  fs.writeFileSync(`regr_${t}.log`, combined, 'utf8');
  const lines = combined.split('\n').filter((l) => /PASS|FAIL|ALL PASS|FAILED/i.test(l));
  const failed = lines.filter((l) => l.startsWith('FAIL')).length;
  const last = lines.slice(-1)[0] || '';
  summary.push(`${t}: exit=${code} pass=${lines.filter((l) => l.startsWith('PASS')).length} fail=${failed} => ${last}`);
  if (code !== 0 || failed > 0) overallFail++;
  process.stderr.write('. done ' + t + ' exit=' + code + '\n');
}
const report = summary.join('\n');
fs.writeFileSync('__regr_done.txt', report + '\n\nFINAL: ' + (overallFail === 0 ? 'ALL PASS' : overallFail + ' SUITE(S) FAILED') + '\n', 'utf8');
process.stderr.write('FINAL: ' + (overallFail === 0 ? 'ALL PASS' : overallFail + ' SUITE(S) FAILED') + '\n');
process.exit(overallFail === 0 ? 0 : 1);
