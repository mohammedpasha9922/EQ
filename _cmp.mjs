import { execSync } from 'node:child_process';
import fs from 'node:fs';

function lines(cmd) {
  let out = '';
  try { out = execSync(cmd, { encoding: 'utf8', maxBuffer: 1e9, stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { out = String((e && e.stdout) || '') + '\n' + String((e && e.stderr) || ''); }
  return out.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^(PASS|FAIL)\s/.test(l));
}

const FILES = 'tests/clipboardToast.test.mjs tests/currencyRoundTrip.test.mjs tests/currencyService.test.mjs tests/formatNumber.test.mjs tests/largeNumberExpression.test.mjs tests/localeSync.test.mjs tests/notesDataModel.test.mjs tests/notesMobileUx.test.mjs tests/notesPdfDocuments.test.mjs tests/notesPdfExport.test.mjs tests/notesSend.test.mjs tests/notesUi.test.mjs tests/numberToWords.test.mjs tests/scientificMath.test.mjs';
const PFILES = FILES.split(' ').map((f) => '_pristine/' + f).join(' ');
const cur = lines('node --test ' + FILES);
const pri = lines('node --test ' + PFILES);
const curF = cur.filter((l) => l.startsWith('FAIL')).map((l) => l.split('  ->  ')[0]);
const priF = pri.filter((l) => l.startsWith('FAIL')).map((l) => l.split('  ->  ')[0]);

fs.writeFileSync('_cmp_result.txt', [
  'CURRENT  : total=' + cur.length + ' fail=' + curF.length,
  'PRISTINE : total=' + pri.length + ' fail=' + priF.length,
  '',
  'NEW FAILURES introduced by this change (' + curF.filter((l) => !priF.includes(l)).length + '):',
  ...curF.filter((l) => !priF.includes(l)),
  '',
  'FAILURES fixed / no longer present (' + priF.filter((l) => !curF.includes(l)).length + '):',
  ...priF.filter((l) => !curF.includes(l)),
  '',
  'All CURRENT failures:',
  ...curF
].join('\n'), 'utf8');
console.log('comparison written');