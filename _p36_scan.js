const fs = require('fs');
function grab(src, name) {
  const m = src.indexOf(name);
  if (m < 0) return null;
  const start = src.indexOf('{', m);
  let i = start, depth = 0, end = -1;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    else if (src[i] === '"' || src[i] === "'" || src[i] === '`') {
      const q = src[i]; i++;
      while (i < src.length) { if (src[i] === '\\') i++; else if (src[i] === q) break; i++; }
    }
  }
  try { return eval('(' + src.slice(start, end + 1) + ')'); } catch (e) { return null; }
}
const files = process.argv.slice(2);
for (const f of files) {
  try {
    const src = fs.readFileSync(f, 'utf8');
    const en = grab(src, 'const translations = {');
    if (!en) { console.log(f, 'NO EN'); continue; }
    console.log(f, 'enKeys=' + Object.keys(en).length, 'hasSmartPdfAdd=' + ('smartPdfAdd' in en), 'hasUntitled=' + ('untitled' in en), 'hasPdfPgLast=' + ('pdfPgLast' in en));
  } catch (e) { console.log(f, 'ERR', e.message); }
}
