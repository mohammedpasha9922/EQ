const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/app.js';
const s = fs.readFileSync(p, 'utf8');
const oldFn = "function smartPdfOverlayReadTable(box) {\n  const tb = box && box.querySelector('table');\n  if (!tb) return [];\n  const rows = [];\n  for (let ri = 0; ri < tb.rows.length; ri++) {\n    const cells = [];\n    for (let ci = 0; ci < tb.rows[ri].cells.length; ci++) {\n      cells.push((tb.rows[ri].cells[ci].textContent || '').trim());\n    }\n    rows.push(cells);\n  }\n  return rows;\n}";
const newFn = "function smartPdfOverlayReadTable(box, prevRows) {\n  const tb = box && box.querySelector('table');\n  if (!tb) return prevRows || [];\n  const rows = [];\n  for (let ri = 0; ri < tb.rows.length; ri++) {\n    const cells = [];\n    const prevRow = (prevRows && prevRows[ri]) || [];\n    for (let ci = 0; ci < tb.rows[ri].cells.length; ci++) {\n      const td = tb.rows[ri].cells[ci];\n      const text = (td.textContent || '').trim();\n      const pc = (prevRow[ci] && typeof prevRow[ci] === 'object') ? prevRow[ci] : {};\n      cells.push({ text: text, align: td.style.textAlign || pc.align || '', bg: td.style.backgroundColor || pc.bg || '', color: td.style.color || pc.color || '', bold: td.style.fontWeight === '700' || !!pc.bold, italic: td.style.fontStyle === 'italic' || !!pc.italic });\n    }\n    rows.push(cells);\n  }\n  return rows;\n}";
const idx = s.indexOf(oldFn);
console.log('oldFn found at', idx, 'len', oldFn.length);
if (idx === -1) { console.log('OLD FN NOT FOUND'); process.exit(1); }
// exact substring match
const sub = s.slice(idx, idx + oldFn.length);
console.log('exact match:', sub === oldFn);
const out = s.slice(0, idx) + newFn + s.slice(idx + oldFn.length);
fs.writeFileSync(p, out);
console.log('written, new size', out.length);
