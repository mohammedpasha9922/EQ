let P = null;
try { P = require('d:/Programs EQ7/EQ/__pdfdiag/vendor/pdf-lib.min.js'); } catch (e) { console.log('REQ_ERR=' + e.message); }
const lib = P && P.PDFDocument ? P : (P && P.default && P.default.PDFDocument ? P.default : (global.PDFLib || null));
console.log('TYPE=' + typeof lib + ' PDFDoc=' + (lib && typeof lib.PDFDocument));
if (lib && lib.PDFDocument) {
  (async () => {
    const doc = await lib.PDFDocument.create();
    const helv = await doc.embedFont(lib.StandardFonts.Helvetica);
    for (let i = 1; i <= 2; i++) {
      const pg = doc.addPage([595, 842]);
      pg.drawText('PART19 Page ' + i + ' sample', { x: 60, y: 760, size: 18, font: helv });
      pg.drawText('Editable line ' + i, { x: 60, y: 700, size: 14, font: helv });
    }
    const bytes = await doc.save();
    require('fs').writeFileSync('d:/Programs EQ7/EQ/__notes_test/_p19_fixture_2p.pdf', Buffer.from(bytes));
    console.log('FIXTURE_OK bytes=' + bytes.length);
  })();
} else { console.log('NO_LIB'); }