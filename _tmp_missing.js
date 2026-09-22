// Recover Notes functions accidentally removed with the Smart mega-block.
const fs = require('fs');
const NAMES = ['addFolder', 'renameFolder', 'deleteFolder', 'extractNoteBodyAndFormatting', 'escapeNoteText', 'normalizeNoteTextColor', 'readExplicitCellBackgroundColor', 'buildNoteBodyHTML'];

function extract(txt, name) {
  const re = new RegExp('^function ' + name + '\\(', 'm');
  const m = txt.match(re);
  if (!m) return null;
  const start = m.index;
  let i = txt.indexOf('{', start), depth = 0, j = i;
  for (; j < txt.length; j++) {
    const c = txt[j];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { j++; break; } }
    else if (c === '"' || c === "'" || c === '`') {
      const q = c; j++;
      while (j < txt.length && txt[j] !== q) { if (txt[j] === '\\') j++; j++; }
    } else if (c === '/' && txt[j + 1] === '/') { while (j < txt.length && txt[j] !== '\n') j++; }
  }
  return txt.slice(start, j);
}

const a = fs.readFileSync('_adbar_base/app.js', 'utf8');
const b = fs.readFileSync('_chk_app.mjs', 'utf8');
const parts = [];
let mismatch = [];
for (const n of NAMES) {
  const fa = extract(a, n), fb = extract(b, n);
  if (!fa) { mismatch.push(n + ': not found in _adbar_base'); continue; }
  if (fb && fa !== fb) mismatch.push(n + ': differs between copies');
  parts.push(fa);
}
if (mismatch.length) { console.error('MISMATCH:\n' + mismatch.join('\n')); process.exit(1); }

const cur = fs.readFileSync('app.js', 'utf8');
const lines = cur.split('\n');
let idx = -1;
for (let i = 0; i < lines.length; i++) {
  if (/^\/\/ NOTE HEADINGS \+ LISTS \(PHASE 03\)/.test(lines[i])) { idx = i; break; }
}
if (idx < 0) { console.error('NOTE HEADINGS banner not found'); process.exit(1); }
// banner is preceded by "// ===..." line and a blank; insert before the banner block start
let ins = idx;
while (ins > 0 && lines[ins - 1].startsWith('// =')) ins--;
if (ins > 0 && lines[ins - 1].trim() === '') ins--;
const block = parts.join('\n\n');
lines.splice(ins, 0, block);
fs.writeFileSync('app.js', lines.join('\n'));
console.log('Inserted', NAMES.length, 'functions at line', ins + 1);

