const lib = require('D:/Programs EQ7/EQ/__pdfdiag/vendor/pdf-lib.min.js');
const pako = require('D:/Programs EQ7/EQ/__pdfdiag/vendor/pako.min.js');
const fs = require('fs');

async function createFixture() {
  const { PDFDocument, StandardFonts, rgb } = lib;
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595.28, 841.89]);
  page.drawText('Quarterly Business Report', { x: 72, y: 770, size: 20, font, color: rgb(0,0,0) });
  page.drawText('The quick brown fox jumps over the lazy dog', { x: 72, y: 700, size: 12, font, color: rgb(0,0,0) });
  page.drawText('Second line of PDF text lives here now', { x: 72, y: 680, size: 12, font, color: rgb(0,0,0) });
  page.drawText('Third line of PDF text ends the report', { x: 72, y: 660, size: 12, font, color: rgb(0,0,0) });
  return await doc.save({ useObjectStreams: false });
}

function readContentStreams(doc, page) {
  const { PDFArray } = lib;
  let c = page.node.Contents();
  const items = [];
  if (c instanceof PDFArray) for (let i = 0; i < c.size(); i++) items.push(c.get(i));
  else items.push(c);
  let raw = new Uint8Array(0);
  for (let it of items) {
    it = doc.context.lookup(it);
    const b = it.getContents ? it.getContents() : it.contents;
    const nb = new Uint8Array(raw.length + b.length);
    nb.set(raw, 0); nb.set(b, raw.length);
    raw = nb;
  }
  // inflate (content streams are flate-compressed by pdf-lib)
  try { return Buffer.from(pako.inflate(raw)).toString('latin1'); }
  catch (e) { return Buffer.from(raw).toString('latin1'); }
}

async function editBytes(bytes, pairs) {
  const { PDFDocument, PDFName } = lib;
  const doc = await PDFDocument.load(bytes);
  const page = doc.getPage(0);
  let content = readContentStreams(doc, page);
  console.log('BEFORE has brown:', content.includes('brown'));
  for (const [oldT, newT] of pairs) {
    content = content.replace(oldT, newT);
  }
  const newStream = doc.context.flateStream(Buffer.from(content, 'latin1'));
  page.node.set(PDFName.of('Contents'), newStream);
  return await doc.save({ useObjectStreams: false });
}

(async () => {
  const orig = await createFixture();
  const edited = await editBytes(orig, [['brown', 'QUARK']]);
  const doc = await lib.PDFDocument.load(edited);
  const content = readContentStreams(doc, doc.getPage(0));
  console.log('=== EDITED CONTENT ===');
  console.log(content);
  console.log('has QUARK:', content.includes('QUARK'), 'has brown:', content.includes('brown'));
  fs.writeFileSync('__trueedit_out.pdf', Buffer.from(edited));
  console.log('DONE');
  process.exit(0);
})().catch((e) => { console.error('ERR', e && e.stack || e); process.exit(1); });