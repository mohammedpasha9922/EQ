const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/app.js';
let s = fs.readFileSync(p, 'utf8');
const a = "const fnt = await pickFont23(cell);\n                    const col23 = smartPdfPdfColorP23(cell.color || '#000000');\n                    pageObj.drawText(ct, { x: tx, y: yy - rh + size * 0.35, size: size, font: fnt, color: pdfLib.rgb(col23.r, col23.g, col23.b) });";
const b = "const fnt = await pickFont23(cell);\n                    const col23 = smartPdfPdfColorP23(cell.color || '#000000');\n                    // Standard fonts are WinAnsi-only: sanitize non-encodable glyphs\n                    // (e.g. Arabic) so export can never throw on them.\n                    const safeTxt = ct.replace(/[^\\u0000-\\u00ff]/g, '?');\n                    try { pageObj.drawText(safeTxt, { x: tx, y: yy - rh + size * 0.35, size: size, font: fnt, color: pdfLib.rgb(col23.r, col23.g, col23.b) }); } catch (e7) {}";
if (s.split(a).length - 1 !== 1) { console.log('ANCHOR COUNT', s.split(a).length - 1); process.exit(1); }
fs.writeFileSync(p, s.split(a).join(b));
console.log('PATCH OK');
