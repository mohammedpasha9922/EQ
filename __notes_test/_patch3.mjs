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
fs.writeFileSync(f, s);
console.log('PATCHED2 OK');
let s = fs.readFileSync(f, 'utf8');
const START = '// Behavioral capture: the report is rendered inside a hidden iframe by';
const END = "// Toggle the preview modal's watermark option";
const i = s.indexOf(START), j = s.indexOf(END);
if (i === -1 || j === -1 || j <= i) { console.log('MARKERS NOT FOUND', i, j); process.exit(1); }
const NEW = `// Behavioral capture: buildNotePdfBlobUncached writes the report HTML into a
// hidden iframe appended to document.body. Watch for that iframe and sample
// its #note-report element's classes while it exists.
await page.evaluate(() => {
  window.__p8rep = [];
  window.__p8frames = [];
  const mo = new MutationObserver((muts) => {
    for (const mu of muts) mu.addedNodes.forEach((n) => {
      if (n.tagName === 'IFRAME' && (n.getAttribute('style') || '').indexOf('-10000px') !== -1) window.__p8frames.push(n);
    });
  });
  mo.observe(document.body, { childList: true });
  window.__p8sampler = setInterval(() => {
    for (const fr of window.__p8frames) {
      try {
        const el = fr.contentDocument && fr.contentDocument.getElementById('note-report');
        if (el && el.className && window.__p8rep.indexOf(String(el.className)) === -1) window.__p8rep.push(String(el.className));
      } catch {}
    }
  }, 100);
});
await page.evaluate(() => document.getElementById('notePreviewPdfBtn').click());
await sleep(4000);
`;
s = s.slice(0, i) + NEW + s.slice(j);
// stop the sampler inside the pv read
s = s.replace('const pv = await page.evaluate(() => {', 'await page.evaluate(() => clearInterval(window.__p8sampler));\nconst pv = await page.evaluate(() => {');
fs.writeFileSync(f, s);
console.log('PATCHED OK');