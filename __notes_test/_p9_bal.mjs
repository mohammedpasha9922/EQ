import fs from 'node:fs';
const src = fs.readFileSync('d:/Programs EQ7/EQ/__notes_test/_p9_orig.mjs', 'utf8');
let depth = 0; let line = 1;
let inStr = null, inLineComment = false, inBlock = false;
const checkpoints = [11790,11820,11845,11870,11900,11940,11980,12020,12070,12110,12640,14290,14325,14335,15599,15600];
const arr = src.split('');
for (let i = 0; i < arr.length; i++) {
  const ch = arr[i], nx = arr[i + 1];
  if (ch === '\n') { line++; if (inLineComment) inLineComment = false; if (line >= 11815 && line <= 12120) console.log('line', line, 'depth', depth); if (checkpoints.includes(line)) console.log('CP', line, depth); continue; }
  if (inLineComment) continue;
  if (inBlock) { if (ch === '*' && nx === '/') { inBlock = false; i++; } continue; }
  if (inStr) { if (ch === '\\') { i++; continue; } if (ch === inStr) inStr = null; continue; }
  if (ch === '/' && nx === '/') { inLineComment = true; i++; continue; }
  if (ch === '/' && nx === '*') { inBlock = true; i++; continue; }
  if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
  if (ch === '{') depth++; else if (ch === '}') depth--;
}
console.log('FINAL', depth);