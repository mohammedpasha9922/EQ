const fs = require('fs');
const P = 'd:/Programs EQ7/EQ/app.js';
let s = fs.readFileSync(P, 'utf8');
const i = s.indexOf("} else if (o.type === 'table') {");
const j = s.indexOf("} else if (o.type === 'image' && o.dataUrl) {", i);
if (i < 0 || j < 0 || j <= i) { console.log('ANCHORS NOT FOUND', i, j); process.exit(1); }
let k = j - 1; while (s[k] === ' ') k--;
const imgIndent = s.slice(k + 1, j);
const old = s.slice(i, j);
const ind = (n) => ' '.repeat(n);
const rows23 = [
  "} else if (o.type === 'table') {",
  ind(14) + "// PART 23 — structured table render: the SAME cell-object model the",
  ind(14) + "// editor uses (text/align/bg/color/bold/italic + border on/off and",
  ind(14) + "// border color), drawn as REAL pdf-lib text + lines (never an image).",
  ind(14) + "const rows = smartPdfTableNormalize(o.rows);",
  ind(14) + "const size = Math.max(6, (o.size || 12) * f);",
  ind(14) + "const W = (o.w || 200) * f;",
  ind(14) + "const cols = (rows[0] || []).length || 1;",
  ind(14) + "const colW = W / cols;",
  ind(14) + "const rowH = (o.rowH ? o.rowH * f : size * 1.55);",
  ind(14) + "const bw = (typeof o.borderWidth === 'number' && o.borderWidth > 0) ? Math.min(4, o.borderWidth * f) : 1;",
  ind(14) + "const bc23 = smartPdfPdfColorP23(o.borderColor || 'rgba(15, 23, 42, 0.45)');",
  ind(14) + "let helvB = null, helvI = null, helvBI = null;",
  ind(14) + "const pickFont23 = async (cell) => {",
  ind(16) + "try {",
  ind(18) + "if (cell.bold && cell.italic) { if (!helvBI) helvBI = await doc.embedFont(pdfLib.StandardFonts.HelveticaBoldOblique); return helvBI; }",
  ind(18) + "if (cell.bold) { if (!helvB) helvB = await doc.embedFont(pdfLib.StandardFonts.HelveticaBold); return helvB; }",
  ind(18) + "if (cell.italic) { if (!helvI) helvI = await doc.embedFont(pdfLib.StandardFonts.HelveticaOblique); return helvI; }",
  ind(16) + "} catch (e5) {}",
  ind(16) + "return helv;",
  ind(14) + "};",
  ind(14) + "const rowHs23 = rows.map((row) => {",
  ind(16) + "if (o.rowH) return rowH;",
  ind(16) + "let lines = 1;",
  ind(16) + "for (const cell of row) {",
  ind(18) + "const ct = String((cell && cell.text) || '');",
  ind(18) + "if (!ct || !helv) continue;",
  ind(18) + "let tw = 0; try { tw = helv.widthOfTextAtSize(ct, size); } catch (e6) { tw = ct.length * size * 0.5; }",
  ind(18) + "const usable = Math.max(10, colW - 6 * f);",
  ind(18) + "lines = Math.max(lines, Math.ceil(tw / usable));",
  ind(16) + "}",
  ind(16) + "return Math.max(rowH, size * 1.3 * lines);",
  ind(14) + "});",
  ind(14) + "let yy = H - yTop;",
  ind(14) + "for (let r = 0; r < rows.length; r++) {",
  ind(16) + "const rh = rowHs23[r];",
  ind(16) + "const row = rows[r];",
  ind(16) + "let xx = x;",
  ind(16) + "for (let c = 0; c < row.length; c++) {",
  ind(18) + "const cell = row[c];",
  ind(18) + "const ct = String((cell && cell.text) || '');",
  ind(18) + "if (cell.bg && cell.bg.toUpperCase() !== '#FFFFFF') {",
  ind(20) + "const fill23 = smartPdfPdfColorP23(cell.bg);",
  ind(20) + "try { pageObj.drawRectangle({ x: xx, y: yy - rh, width: colW, height: rh, color: pdfLib.rgb(fill23.r, fill23.g, fill23.b) }); } catch (e3) {}",
  ind(18) + "}",
  ind(18) + "if (ct && helv) {",
  ind(20) + "let txtW = 0; try { txtW = helv.widthOfTextAtSize(ct, size); } catch (e4) { txtW = ct.length * size * 0.5; }",
  ind(20) + "const pad = 3 * f;",
  ind(20) + "let tx = xx + pad;",
  ind(20) + "if (cell.align === 'center') tx = xx + Math.max(pad, (colW - Math.min(txtW, colW - pad * 2)) / 2);",
  ind(20) + "else if (cell.align === 'right') tx = xx + colW - pad - Math.min(txtW, colW - pad * 2);",
  ind(20) + "const fnt = await pickFont23(cell);",
  ind(20) + "const col23 = smartPdfPdfColorP23(cell.color || '#000000');",
  ind(20) + "pageObj.drawText(ct, { x: tx, y: yy - rh + size * 0.35, size: size, font: fnt, color: pdfLib.rgb(col23.r, col23.g, col23.b) });",
  ind(18) + "}",
  ind(18) + "xx += colW;",
  ind(16) + "}",
  ind(16) + "yy -= rh;",
  ind(14) + "}",
  ind(14) + "if (o.hasBorder !== false) {",
  ind(16) + "const bottom23 = yy + rowHs23.reduce((s5, z) => s5 + z, 0);",
  ind(16) + "for (let r = 0; r <= rows.length; r++) {",
  ind(18) + "let hr5 = yy; for (let z = 0; z < r; z++) hr5 += rowHs23[z];",
  ind(18) + "pageObj.drawLine({ start: { x: x, y: hr5 }, end: { x: x + W, y: hr5 }, thickness: bw, color: pdfLib.rgb(bc23.r, bc23.g, bc23.b) });",
  ind(16) + "}",
  ind(16) + "for (let c = 0; c <= cols; c++) pageObj.drawLine({ start: { x: x + c * colW, y: yy }, end: { x: x + c * colW, y: bottom23 }, thickness: bw, color: pdfLib.rgb(bc23.r, bc23.g, bc23.b) });",
  ind(14) + "}",
  imgIndent
].join('\n');
s = s.slice(0, i) + rows23 + s.slice(j);
fs.writeFileSync(P, s);
console.log('EXPORT TABLE BLOCK REPLACED. old len', old.length, 'new len', rows23.length);