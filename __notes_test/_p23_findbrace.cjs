const fs = require('fs');
const L = fs.readFileSync('d:/Programs EQ7/EQ/styles.css', 'utf8').split('\n');
let d = 0;
const opens = []; // candidate unclosed-brace opens
let lastZero = -1;
for (let i = 0; i < L.length; i++) {
  const line = L[i];
  let o = (line.match(/{/g) || []).length, c = (line.match(/}/g) || []).length;
  const before = d;
  d += o - c;
  if (d === 0) lastZero = i + 1;
  // record a line that RAISES depth from 0 to 1 (candidate open)
  if (before === 0 && o >= 1) opens.push({ line: i + 1, text: line.trim().slice(0, 80) });
  if (opens.length && d <= 0 && opens[opens.length - 1].line !== i + 1 && before > 0) {
    // closed
  }
}
console.log('final depth', d, 'last line where depth hit 0:', lastZero);
console.log('--- candidates that raised depth 0->1 in the latter half ---');
for (const k of opens) { if (k.line > 7500) console.log(k.line + ': ' + k.text); }
// Show the last N around where depth entered positive and never returned