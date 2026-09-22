const fs = require('fs');
// 1) add setCell2 helper (edit a cell on table index N) next to tableModel
const hp = 'd:/Programs EQ7/EQ/__notes_test/p23_harness.mjs';
let h = fs.readFileSync(hp, 'utf8');
if (h.split('async function setCell2').length - 1 === 0) {
  const anchor = 'async function selectCell';
  const helper = 'async function setCell2(tblIdx, r, c, text) {\n  return await page.evaluate((ti, rr, cc, tx) => {\n    const box = [...document.querySelectorAll(\'#smartPdfEditor .smart-pdf-ov-table\')][ti];\n    if (!box) return false;\n    const td = box.querySelector(\'td[data-r="\' + rr + \'"][data-c="\' + cc + \'"]\');\n    if (!td) return false;\n    td.textContent = tx;\n    td.dispatchEvent(new Event(\'input\', { bubbles: true }));\n    return true;\n  }, tblIdx, r, c, text);\n}\n';
  const ai = h.indexOf(anchor);
  h = h.slice(0, ai) + helper + h.slice(ai);
  fs.writeFileSync(hp, h);
  console.log('setCell2 added');
} else console.log('setCell2 exists');
// 2) fix part4: LTR check needs a table added after reopen
const p4 = 'd:/Programs EQ7/EQ/__notes_test/_p23_tail4.cjs';
let t4 = fs.readFileSync(p4, 'utf8');
const a4 = "T.push(\"const ltr = await page.evaluate(() => { const bar = document.querySelector('#smartPdfEditor .smart-pdf-tbar'); const btn = bar && bar.querySelector('[data-tact=\\\"row+\\\"]'); return { label: btn ? (btn.getAttribute('title') || '') : '' }; });\");";
if (t4.indexOf("await addViaMenu('table'); await sleep(400);\", 'ltr'") < 0 && t4.split("T.push(\"await openPdfEditor();\")").length - 1 === 2) {
  // insert addViaMenu before the SECOND openPdfEditor's ltr evaluation
  const marker = "T.push(\"const ltr =";
  const k = t4.indexOf(marker);
  const ins = "T.push(\"await addViaMenu('table'); await sleep(400);\");\n";
  t4 = t4.slice(0, k) + ins + t4.slice(k);
  fs.writeFileSync(p4, t4);
  console.log('part4 fixed');
} else console.log('part4 state:', t4.split('openPdfEditor').length - 1, t4.indexOf(marker));
