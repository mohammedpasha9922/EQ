const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/app.js';
let s = fs.readFileSync(p, 'utf8');
const a = s.indexOf('// Comment markers: clicking');
const seg = s.slice(a - 120, a + 40);
console.log('BEFORE:', JSON.stringify(seg));
// Look for the triple-brace pattern: "}\n  });\n}\n}\n// Comment markers"
// We expect the menu wiring closes with "  });\n}" then my stray "}".
const stray = s.indexOf('\n}\n// Comment markers: clicking', a - 200);
if (stray < 0) { console.log('No stray brace pattern found'); process.exit(1); }
s = s.slice(0, stray + 1) + s.slice(stray + 2); // remove the duplicate '\n}' -> keep one
fs.writeFileSync(p, s);
console.log('Fixed stray brace');
const a2 = s.indexOf('// Comment markers: clicking');
console.log('AFTER:', JSON.stringify(s.slice(a2 - 80, a2 + 30)));