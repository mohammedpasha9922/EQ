// Temporary FIX helper — remove the duplicated notes cluster copies (2 and 3)
const fs = require('fs');

const cur = fs.readFileSync('app.js', 'utf8').split('\n');

// 1-based line numbers of the duplicated region (copies 2 + 3 + trailing blank)
const from = 7933;
const to = 8350;

// --- preconditions -------------------------------------------------------
const l = (n) => (cur[n - 1] || '').replace(/\r$/, '');
const assert = (cond, msg) => { if (!cond) { console.error('PRECONDITION FAILED: ' + msg); process.exit(1); } };

assert(l(from) === 'function normalizeNoteTextColor(raw) {', 'line ' + from + ' should start copy2, got: ' + JSON.stringify(l(from)));
assert(l(to) === '', 'line ' + to + ' should be the trailing blank, got: ' + JSON.stringify(l(to)));
assert(l(to + 1).startsWith('function buildChecklistBlockHTML(block) {'), 'line ' + (to + 1) + ' should be buildChecklistBlockHTML, got: ' + JSON.stringify(l(to + 1)));
assert(l(from - 1) === '', 'line ' + (from - 1) + ' should be blank before copy2, got: ' + JSON.stringify(l(from - 1)));
assert(l(from - 2) === '}', 'line ' + (from - 2) + ' should close copy1 escapeNoteCheckText, got: ' + JSON.stringify(l(from - 2)));
assert(l(to - 1) === '}', 'line ' + (to - 1) + ' should close copy3 escapeNoteCheckText, got: ' + JSON.stringify(l(to - 1)));

// safety backup before mutating
fs.writeFileSync('_v_pre_fix_app.js', cur.join('\n'), 'utf8');

const out = cur.slice(0, from - 1).concat(cur.slice(to));
fs.writeFileSync('app.js', out.join('\n'), 'utf8');

console.log('removed lines ' + from + '..' + to + ' (' + (to - from + 1) + ' lines)');
console.log('app.js lines before=' + cur.length + ' after=' + out.length);
