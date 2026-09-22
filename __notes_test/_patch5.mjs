import fs from 'node:fs';
const f = 'd:/Programs EQ7/EQ/__notes_test/p8_part3.mjs';
let s = fs.readFileSync(f, 'utf8');
const OLD = `await page.evaluate(() => {
  const c = document.getElementById('notePdfPreviewClose');
  if (c) c.click();
  document.getElementById('openNewNoteButton').click();
});
await sleep(600);`;
const NEW = `await page.evaluate(() => { const c = document.getElementById('notePdfPreviewClose'); if (c) c.click(); });
await sleep(400);
// Close the editor, open the Notes manager, then create the new note
// (openNewNoteButton lives inside the notes manager modal).
await page.evaluate(() => document.getElementById('closeFullScreenNote')?.click());
await sleep(400);
await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 8000 });
await page.evaluate(() => document.getElementById('openNewNoteButton').click());
await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 8000 });
await sleep(200);`;
const i = s.indexOf(OLD);
if (i === -1) { console.log('MARKER NOT FOUND'); process.exit(1); }
s = s.slice(0, i) + NEW + s.slice(i + OLD.length);
fs.writeFileSync(f, s);
console.log('PATCH5 OK');