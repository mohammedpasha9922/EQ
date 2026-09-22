// C: export cases in app.js
const fs = require('fs');
const P = 'd:/Programs EQ7/EQ/app.js';
let s = fs.readFileSync(P, 'utf8');
const fail = (m) => { console.error('ABORT: ' + m); process.exit(1); };
const anchorC = "} else if (o.type === 'image' && o.dataUrl) {";
if (s.split(anchorC).length - 1 !== 1) fail('C anchor');
const blockC = `} else if (o.type === 'highlight' || o.type === 'underline') {
              // PART 24 - real vector marks (no image fallback)
              const mc = smartPdfPdfColorP23(o.color || (o.type === 'highlight' ? '#fde047' : '#2563eb'));
              if (o.type === 'highlight') {
                pageObj.drawRectangle({ x: x, y: H - yTop - (o.h || 14) * f, width: Math.max(2, (o.w || 40) * f), height: Math.max(2, (o.h || 14) * f), color: pdfLib.rgb(mc.r, mc.g, mc.b), opacity: 0.45 });
              } else {
                pageObj.drawLine({ start: { x: x, y: H - yTop }, end: { x: x + Math.max(2, (o.w || 40) * f), y: H - yTop }, thickness: Math.max(1, 2 * f), color: pdfLib.rgb(mc.r, mc.g, mc.b) });
              }
            } else if (o.type === 'draw' && Array.isArray(o.strokes)) {
              for (const st24 of o.strokes) {
                const pts24 = Array.isArray(st24 && st24.points) ? st24.points : [];
                const dc24 = smartPdfPdfColorP23((st24 && st24.color) || '#1d4ed8');
                const tw24 = Math.max(0.5, ((st24 && st24.width) || 2) * f);
                for (let pi = 1; pi < pts24.length; pi++) {
                  pageObj.drawLine({ start: { x: x + pts24[pi - 1][0] * f, y: H - yTop - pts24[pi - 1][1] * f }, end: { x: x + pts24[pi][0] * f, y: H - yTop - pts24[pi][1] * f }, thickness: tw24, color: pdfLib.rgb(dc24.r, dc24.g, dc24.b) });
                }
              }
            } else if (o.type === 'comment') {
              const cc24 = smartPdfPdfColorP23(o.color || '#f59e0b');
              pageObj.drawRectangle({ x: x, y: H - yTop - 12 * f, width: 12 * f, height: 12 * f, color: pdfLib.rgb(cc24.r, cc24.g, cc24.b) });
              const ctxt24 = String(o.text || '');
              if (ctxt24 && helv) pageObj.drawText(ctxt24.slice(0, 80), { x: x + 14 * f, y: H - yTop - 10 * f, size: Math.max(6, 9 * f), font: helv, color: pdfLib.rgb(0.1, 0.1, 0.1) });
            ` + anchorC;
s = s.replace(anchorC, blockC);
fs.writeFileSync(P, s);
console.log('C done, len', s.length);
