// Temporary audit helper — locate duplicated notes block boundaries
const fs = require('fs');
const src = fs.readFileSync('app.js', 'utf8');
const lines = src.split('\n');

function findOccurrences(needle) {
  const out = [];
  let idx = src.indexOf(needle);
  while (idx !== -1) {
    out.push(src.slice(0, idx).split('\n').length);
    idx = src.indexOf(needle, idx + 1);
  }
  return out;
}

// Boundary probe: start at each duplicate decl of the first function
const probe = 'function normalizeNoteTextColor(raw) {';
console.log('normalizeNoteTextColor occurrences at lines:', findOccurrences(probe).join(', '));

// Find end-of-function (first line that is exactly "}" at col 0) for given start line
function fnEnd(startLine) {
  for (let i = startLine; i < lines.length; i++) {
    if (lines[i] === '}' || lines[i] === '}\r') return i + 1;
  }
  return -1;
}

// Report each copy: start decl line, end line, length, first/last non-empty line hashes
const starts = findOccurrences(probe);
starts.forEach((ln, i) => {
  const end = fnEnd(ln);
  console.log('copy ' + (i + 1) + ': decl@' + ln + ' ends@' + end);
});

// Extract block from decl of normalizeNoteTextColor through the end of
// escapeNoteCheckText for each copy and compare equality.
const esc = 'function escapeNoteCheckText(text) {';
const escLines = findOccurrences(esc);
console.log('escapeNoteCheckText occurrences at lines:', escLines.join(', '));
escLines.forEach((ln, i) => {
  console.log('escapeNoteCheckText copy ' + (i + 1) + ': decl@' + ln + ' ends@' + fnEnd(ln));
});
