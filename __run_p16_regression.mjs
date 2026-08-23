import { spawn } from 'node:child_process';
import fs from 'node:fs';

const tests = [
  'part15_smart_logo',
  'part14_smart_images',
  'part12_smart_tables',
  'part11_smart_text_tool',
  'part10_smart_add_menu',
  'part9_smart_toolbar_scroll',
  'part8_smart_document_editor'
];

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
  fs.writeFileSync(`__p16regr_${t}.log`, combined, 'utf8');
  const lines = combined.split('\n').filter((l) => /^(PASS|FAIL)/.test(l));
  const failed = lines.filter((l) => l.startsWith('FAIL')).length;
  summary.push(`${t}: exit=${code} pass=${lines.filter((l) => l.startsWith('PASS')).length} fail=${failed}`);
  if (code !== 0 || failed > 0) overallFail++;
}
const report = summary.join('\n');
fs.writeFileSync('__p16_regression_result.txt', report + '\n\nFINAL: ' + (overallFail === 0 ? 'ALL PASS' : overallFail + ' SUITE(S) FAILED') + '\n', 'utf8');
process.exit(overallFail === 0 ? 0 : 1);
