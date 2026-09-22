const fs = require('fs');
const cp = require('child_process');
const out = [];
function log(s) { out.push(s); }

const now = fs.readFileSync('index.html', 'utf8');
const head = cp.execSync('git show HEAD:index.html', { maxBuffer: 1 << 28 }).toString('utf8');

function count(str, re) { const m = str.match(re); return m ? m.length : 0; }

log('=== A. KEY MARKERS (now vs HEAD) ===');
const markers = [
  ['drawerToggle', /drawerToggle/g],
  ['drawerOverlay', /drawerOverlay/g],
  ['data-action="open-smart-docs"', /data-action="open-smart-docs"/g],
  ['open-smart-docs (any)', /open-smart-docs/g],
  ['id="smartDocsModal"', /id="smartDocsModal"/g],
  ['id="closeSmartDocs"', /id="closeSmartDocs"/g],
  ['smartDocsTitle', /smartDocsTitle/g],
  ['notesManagerModal', /notesManagerModal/g],
  ['ad-placeholder', /ad-placeholder/g],
  ['serviceWorker', /serviceWorker/g],
  ['calculatorPanel|primaryDisplay', /primaryDisplay/g]
];
for (const [name, re] of markers) {
  log(name.padEnd(34) + ' now=' + count(now, re) + '  HEAD=' + count(head, re));
}

log('');
log('=== B. DRAWER TOGGLE CONTEXT ===');
function ctx(src, re, label) {
  const lines = src.split('\n');
  let n = 0;
  log('--- ' + label);
  lines.forEach((l, i) => {
    if (re.test(l)) { log('  ' + (i + 1) + ': ' + l.trim().slice(0, 150)); n++; }
  });
  log('  total=' + n);
}
ctx(now, /drawerToggle|drawer-toggle|menu-btn|navToggle/i, 'NOW');
ctx(head, /drawerToggle|drawer-toggle|menu-btn|navToggle/i, 'HEAD');

log('');
log('=== C. INDEX.HTML DIFF HUNKS (categorized) ===');
const d = cp.execSync('git diff -U0 -- index.html', { maxBuffer: 1 << 28 }).toString('utf8');
const lines = d.split('\n');
let cur = null;
const hunks = [];
for (const l of lines) {
  if (/^@@/.test(l)) { cur = { header: l, added: [], removed: [] }; hunks.push(cur); }
  else if (cur) {
    if (l.startsWith('+') && !l.startsWith('+++')) cur.added.push(l.slice(1));
    else if (l.startsWith('-') && !l.startsWith('---')) cur.removed.push(l.slice(1));
  }
}
const smartRe = /\bsmart\b|Smart|open-smart-docs/;
let smartHunks = 0, otherHunks = 0;
for (const h of hunks) {
  const all = h.added.concat(h.removed);
  const isSmart = all.every(x => smartRe.test(x)) && all.length > 0;
  if (isSmart) { smartHunks++; continue; }
  otherHunks++;
  const head0 = h.added.slice(0, 1).concat(h.removed.slice(0, 1)).map(s => s.trim().slice(0, 90));
  log('OTHER ' + h.header + '  A=' + h.added.length + ' R=' + h.removed.length);
  head0.forEach(s => log('    | ' + s));
}
log('');
log('TOTAL hunks=' + hunks.length + ' smart-only=' + smartHunks + ' other=' + otherHunks);

fs.writeFileSync('_aud_out.txt', out.join('\n'), 'utf8');
console.log('WROTE _aud_out.txt lines=' + out.length);
