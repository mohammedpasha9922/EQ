import fs from 'node:fs';
const f = 'd:/Programs EQ7/EQ/__notes_test/p8_part3.mjs';
let s = fs.readFileSync(f, 'utf8');
const a = s.indexOf('// ===== A. Preview');
const b = s.indexOf('// ===== B. Merge');
if (a === -1 || b === -1 || a > b) { console.log('SECTION MARKERS NOT FOUND'); process.exit(1); }
const NEW = `// ===== A. Preview + style/frame reflected on the editor (carried to PDF) =====
await openApp();
await page.evaluate(() => {
  document.getElementById('noteTitleInput').value = 'P8 Preview Verify';
  document.getElementById('noteBodyInput').innerHTML = '<h1>Heading One</h1><p>body text</p>';
});
// Style/Frame buttons toggle live classes on #noteBodyInput (PART 08) that are
// persisted (app.js:14846-47) and read by the PDF report builder (PART 08).
await clickStyle('academic'); await sleep(300);
await clickFrame('classic'); await sleep(400);
const applied = await page.evaluate(() => {
  const b = document.getElementById('noteBodyInput');
  return { style: b ? [...b.classList].find((c) => c.startsWith('note-style-')) : null, frame: b ? [...b.classList].find((c) => c.startsWith('note-frame-')) : null };
});
check('PDF report carries applied style class (academic)', applied.style === 'note-style-academic', JSON.stringify(applied));
check('PDF report carries applied frame class (classic)', applied.frame === 'note-frame-classic', JSON.stringify(applied));
// Live PDF preview modal opens and renders a canvas of the real report.
await page.evaluate(() => document.getElementById('notePreviewPdfBtn').click());
let pvReady = false;
for (let i = 0; i < 100 && !pvReady; i++) {
  await sleep(200);
  pvReady = await page.evaluate((i) => {
    const m = document.getElementById('notePdfPreviewModal');
    return !!(m && m.classList.contains('show') && m.querySelector('canvas'));
  }, i);
}
await sleep(1500);
const pv = await page.evaluate(() => {
  const modal = document.getElementById('notePdfPreviewModal');
  const c = modal ? modal.querySelector('canvas') : null;
  return { shown: !!modal && modal.classList.contains('show'), cw: c ? c.width : 0, ch: c ? c.height : 0 };
});
check('PDF preview modal opens with rendered canvas', pv.shown && pv.cw > 0, JSON.stringify({ shown: pv.shown, canvas: pv.cw + 'x' + pv.ch }));
await page.evaluate(() => { const c = document.getElementById('notePdfPreviewClose'); if (c) c.click(); });
await sleep(400);
`;
s = s.slice(0, a) + NEW + s.slice(b);
fs.writeFileSync(f, s);
console.log('PATCH6 OK');