import fs from 'node:fs';
const f = 'd:/Programs EQ7/EQ/__notes_test/p8_part3.mjs';
let s = fs.readFileSync(f, 'utf8');
const START = "await page.evaluate(() => document.getElementById('notePreviewPdfBtn').click());\nawait sleep(4000);";
const END = 'let pvReady = false;';
const i = s.indexOf(START), j = s.indexOf(END);
if (i === -1 || j === -1 || j <= i) { console.log('MARKERS NOT FOUND', i, j); process.exit(1); }
const NEW = `// Force a guaranteed cache miss: create a NEW note (cache key includes note.id),
// apply the same style + frame, then preview it. The generation must run through
// the real buildNotePdfBlobUncached pipeline, exposing the report iframe.
await page.evaluate(() => {
  const c = document.getElementById('notePdfPreviewClose');
  if (c) c.click();
  document.getElementById('openNewNoteButton').click();
});
await sleep(600);
await page.evaluate(() => {
  document.getElementById('noteTitleInput').value = 'P8 Preview Verify Two';
  document.getElementById('noteBodyInput').innerHTML = '<h1>Heading One</h1><p>body text</p>';
});
await clickStyle('academic'); await sleep(300);
await clickFrame('classic'); await sleep(400);
await page.evaluate(() => document.getElementById('notePreviewPdfBtn').click());
`;
s = s.slice(0, i) + NEW + s.slice(j);
// pvReady loop should also wait until the report classes were captured
s = s.replace("if (m && m.classList.contains('show')) return true;", "if (m && m.classList.contains('show') && (window.__p8rep || []).length) return true;");
fs.writeFileSync(f, s);
console.log('PATCH4 OK');