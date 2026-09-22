// Temporary audit helper — verify copy1 == baseline block, and inspect boundaries
const fs = require('fs');

const base = fs.readFileSync('_chk_app.mjs', 'utf8').split('\n');
const cur = fs.readFileSync('app.js', 'utf8').split('\n');

function declLine(linesArr, name) {
  const re = new RegExp('^function\\s+' + name + '\\s*\\(');
  for (let i = 0; i < linesArr.length; i++) if (re.test(linesArr[i])) return i + 1;
  return -1;
}
function fnEnd(linesArr, start) {
  for (let i = start; i < linesArr.length; i++) if (linesArr[i] === '}' || linesArr[i] === '}\r') return i + 1;
  return -1;
}

const first = 'normalizeNoteTextColor';
const last = 'escapeNoteCheckText';

const bStart = declLine(base, first);
const bEnd = fnEnd(base, declLine(base, last));
console.log('baseline block: ' + bStart + '..' + bEnd);

const cStart = 7696;
const cEnd = 7931;
const bText = base.slice(bStart - 1, bEnd).join('\n');
const cText = cur.slice(cStart - 1, cEnd).join('\n');
console.log('baseline block === app.js copy1 ?', bText === cText);

if (bText !== cText) {
  const bl = bText.split('\n');
  const cl = cText.split('\n');
  console.log('baseline lines', bl.length, 'copy1 lines', cl.length);
  const n = Math.max(bl.length, cl.length);
  let shown = 0;
  for (let i = 0; i < n && shown < 12; i++) {
    if (bl[i] !== cl[i]) {
      console.log('DIFF@' + (i + 1) + '\n  BASE: ' + JSON.stringify(bl[i]) + '\n  CUR : ' + JSON.stringify(cl[i]));
      shown++;
    }
  }
}

console.log('=== baseline context AFTER block (next 25 lines) ===');
base.slice(bEnd, bEnd + 25).forEach((l, i) => console.log((bEnd + 1 + i) + ': ' + l));
console.log('=== current context AFTER copy3 (8349..8378) ===');
cur.slice(8348, 8378).forEach((l, i) => console.log((8349 + i) + ': ' + l));
