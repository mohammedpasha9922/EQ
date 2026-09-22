// main flow chunk 1: open + menu structure + highlight + underline
console.log('=== PART 24 - PDF Mark (Highlight/Underline/Draw/Comment) ===');
await setViewport(1366, 900);
await gotoApp();
const origHash = crypto.createHash('sha256').update(fs.readFileSync(FIXTURE)).digest('hex');
const notesBefore = await page.evaluate(() => localStorage.getItem('eq-notes-data') || localStorage.getItem('notesData') || '');
const opened = await openPdfEditor();
check('P24-01 fixture accepted + PDF Editor opens (PART 19 editor)', opened.inj.ok === true && !!opened.ed, opened.ed);
const markBtn = await page.evaluate(() => document.querySelectorAll('#smartPdfMarkBtn').length);
check('P24-02 Mark button exists exactly once in the PDF editor toolbar', markBtn === 1, markBtn);
await page.evaluate(() => document.getElementById('smartPdfMarkBtn').click());
await sleep(200);
const markMenu = await page.evaluate(() => {
  const m = document.getElementById('smartPdfMarkMenu');
  const items = [...(m ? m.querySelectorAll('.smart-pdf-mark-item') : [])];
  return { open: !!(m && !m.hasAttribute('hidden')), n: items.length, types: items.map((i) => i.getAttribute('data-mark')).join(','), named: items.every((i) => (i.textContent || '').trim().length > 0) };
});
check('P24-03 Mark menu opens with exactly 4 items', markMenu.open && markMenu.n === 4, markMenu.n);
check('P24-04 Mark contains exactly Highlight/Underline/Draw/Comment (no extras)', markMenu.types === 'highlight,underline,draw,comment', markMenu.types);
check('P24-05 all Mark items have accessible text names', markMenu.named, '');
await page.evaluate(() => document.body.click());
const sel1 = await selectPageText(0);
check('P24-06 page text is selectable in the text layer', sel1.ok === true, sel1);
await markViaMenu('highlight');
await sleep(350);
let st = await markState();
check('P24-07 Mark > Highlight creates a structured highlight overlay on page 1', st.kinds.indexOf('mark-highlight') >= 0, st.kinds);
const hlModel = await page.evaluate(() => {
  const ov = (window.__smartImport && window.__smartImport.overlays()) || {};
  for (const pk in ov) { const o = (ov[pk] || []).find((x) => x && x.type === 'highlight'); if (o) return { page: o.page, hasXYWH: [o.x, o.y, o.w, o.h].every(Number.isFinite), color: o.color }; }
  return null;
});
check('P24-08 highlight model is structured {page,x,y,w,h,color} (not an image)', !!hlModel && hlModel.page === 0 && hlModel.hasXYWH, hlModel);
await page.evaluate(() => {
  const wrap = document.querySelector('#smartPdfEditor .smart-pdf-page[data-page="1"]');
  wrap.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }));
});
await sleep(200);
