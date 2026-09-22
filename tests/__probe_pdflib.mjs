const fs = require('fs');
const lib = require('D:/Programs EQ7/EQ/__pdfdiag/vendor/pdf-lib.min.js');
async function main() {
  console.log('PDFDocument', typeof lib.PDFDocument);
  const { PDFDocument, StandardFonts, rgb, PDFName, PDFString } = lib;

  // Create a real PDF fixture: genuine selectable Helvetica text.
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595.28, 841.89]);
  const mk = (str, y, size, x) => {
    page.drawText(str, { x: x, y: y, size, font, color: rgb(0, 0, 0) });
  };
  mk('Quarterly Business Report', 770, 20, 72);
  mk('The quick brown fox jumps over the lazy dog', 700, 12, 72);
  mk('Second line of PDF text lives here now', 680, 12, 72);
  mk('Third line of PDF text ends the report', 660, 12, 72);
  const bytes = await doc.save({ useObjectStreams: false });
  fs.writeFileSync('__fixture_probe.pdf', Buffer.from(bytes));
  console.log('fixture bytes', bytes.length);

  // Re-open it.
  const doc2 = await PDFDocument.load(bytes);
  const p2 = doc2.getPage(0);
  console.log('page size', p2.getWidth(), p2.getHeight());

  // Inspect page for content stream access.
  console.log('page own props:', Object.getOwnPropertyNames(p2).join(','));
  console.log('page has node:', 'node' in p2);
  console.log('page methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(p2)).join(','));
}
main().then(() => { console.log('DONE'); process.exit(0); }).catch((e) => { console.error('ERR', e && e.message || e); process.exit(1); });