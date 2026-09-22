const fs = require('fs');
const P = 'd:/Programs EQ7/EQ/__notes_test/p24_harness.mjs';
let s = fs.readFileSync(P, 'utf8');
// The main section was accidentally inserted inside addComment. Close the
// function before the console.log marker.
const marker = "console.log('=== PART 24 - PDF Mark (Highlight/Underline/Draw/Comment) ===');";
if (s.split(marker).length - 1 !== 1) { console.error('marker count'); process.exit(1); }
// find preceding context: it must currently sit right after the 'if (!ta)' line
const bad = "    if (!ta) return { ok: false, why: 'no textarea' };\nconsole.log('=== PART 24";
if (s.split(bad).length - 1 !== 1) { console.error('bad context not found'); process.exit(1); }
// The rest of addComment body (ta.value..., btn.click...) now belongs after the
// marker block; instead, restore the original addComment ending before marker.
const tail = s.indexOf(marker);
// find where the original addComment tail ended: the '  }, text);\n}' right after the marker block? Actually the original tail lines were displaced—locate the next occurrence of "  }, text);" after marker
const afterIdx = s.indexOf('  }, text);', tail);
if (afterIdx < 0) { console.error('tail not found'); process.exit(1); }
const tailEnd = s.indexOf('}', s.indexOf('\n', afterIdx)) + 1;
const displaced = s.slice(tail, tailEnd); // includes marker...},text);}
const markerEnd = displaced.indexOf(marker) + marker.length;
const tailOnly = displaced.slice(markerEnd).replace(/^\r?\n/, '');
const fixed = s.slice(0, tail) + '\n' + tailOnly + '\n' + marker + s.slice(tailEnd);
fs.writeFileSync(P, fixed);
console.log('fixed. verify: bad gone =', fixed.split(bad).length - 1 === 0);
