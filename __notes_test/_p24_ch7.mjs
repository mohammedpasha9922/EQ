check('P24-23 exported PDF keeps 2 pages', extracted.pages === 2, extracted.pages);
check('P24-24 comment text is REAL selectable PDF text in export', extracted.t2.indexOf('P24 comment') >= 0, extracted.t2.slice(-120));
check('P24-25 original page content intact (page 1 + page 2)', extracted.t1.length > 0 && extracted.t2.indexOf('Page 2') >= 0, { l1: extracted.t1.length, t2: extracted.t2.slice(0, 40) });
check('P24-26 highlight exported as vector fill on page 1', extracted.fills1 >= 1, extracted.fills1);
check('P24-27 underline/draw exported as vector strokes on page 2', extracted.strokes2 >= 1, extracted.strokes2);
const origHash2 = crypto.createHash('sha256').update(fs.readFileSync(FIXTURE)).digest('hex');
check('P24-28 original source PDF unchanged (sha256)', origHash2 === origHash, '');
check('P24-29 exported PDF is a NEW distinct file', exp.size > 0, exp.size);
// --- regressions: PART 22 Add menu + PART 23 table ---
await page.evaluate(() => document.getElementById('smartPdfAddBtn').click());
await sleep(200);
const menu22 = await page.evaluate(() => {
  const m = document.getElementById('smartPdfAddMenu');
  const items = [...(m ? m.querySelectorAll('.smart-pdf-add-item') : [])];
  return { n: items.length, types: items.map((i) => i.getAttribute('data-add')).sort().join(','), tableCount: items.filter((i) => i.getAttribute('data-add') === 'table').length };
});
check('P24-30 (P22 reg) Add menu still exactly 7 items incl. one Table', menu22.n === 7 && menu22.types === 'date,image,logo,signature,stamp,table,text' && menu22.tableCount === 1, menu22);
await page.evaluate(() => document.body.click());
await addViaMenu('table');
await sleep(400);
const tbl23 = await page.evaluate(() => {
  const b = document.querySelector('#smartPdfEditor .smart-pdf-ov-table');
  const t = b && b.querySelector('table');
  return { rows: t ? t.rows.length : 0, cols: t ? t.rows[0].cells.length : 0, editable: !!(t && t.rows[0] && t.rows[0].cells[0] && t.rows[0].cells[0].isContentEditable), bar: !!(b && b.querySelector('.smart-pdf-tbar')) };
});
check('P24-31 (P23 reg) structured table still created with controls bar', tbl23.rows >= 2 && tbl23.cols >= 2 && tbl23.editable && tbl23.bar, tbl23);
const tblEdit = await page.evaluate(() => {
  const td = document.querySelector('#smartPdfEditor .smart-pdf-ov-table td[data-r="0"][data-c="0"]');
  if (!td) return false;
  td.textContent = 'P24R';
  td.dispatchEvent(new Event('input', { bubbles: true }));
  const ov = (window.__smartImport && window.__smartImport.overlays()) || {};
  return JSON.stringify(ov).indexOf('P24R') >= 0;
});
check('P24-32 (P23 reg) table cell editing still writes into the store', tblEdit, '');
const rowCol = await page.evaluate(() => {
  const bar = document.querySelector('#smartPdfEditor .smart-pdf-tbar');
  if (!bar) return { ok: false };
  const click = (act) => { const b = bar.querySelector('[data-tact="' + act + '"]'); if (b) b.click(); };
  const cnt = () => { const t = document.querySelector('#smartPdfEditor .smart-pdf-ov-table table'); return t ? t.rows.length + 'x' + t.rows[0].cells.length : '?'; };
  const before = cnt();
  click('row+'); click('col+');
  const mid = cnt();
  click('row-'); click('col-');
  const after = cnt();
  return { ok: true, before, mid, after };
});
check('P24-33 (P23 reg) table row/column add+delete still work', rowCol.ok && rowCol.mid !== rowCol.before && rowCol.after === rowCol.before, rowCol);
const marksAfterTbl = await markState();
check('P24-34 all 4 mark kinds coexist with the table after regressions', ['mark-highlight', 'mark-underline', 'mark-draw', 'mark-comment'].every((k) => marksAfterTbl.kinds.indexOf(k) >= 0), marksAfterTbl.kinds);
