const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/__notes_test/p23_harness.mjs';
let s = fs.readFileSync(p, 'utf8');
const a = `const focus1 = await page.evaluate(() => {
  const el = document.activeElement;
  return { isTd: !!(el && el.closest && el.closest('td[contenteditable]')), sel: !!document.querySelector('#smartPdfEditor .smart-pdf-ov-table td.is-sel') };
});`;
const b = `// Synthetic dispatchEvent never runs the browser's native focus default action,
// so mirror the real click: pointerdown (no drag hijack, box intact) + focus.
const focus1 = await page.evaluate(() => {
  const box = document.querySelector('#smartPdfEditor .smart-pdf-ov-table');
  const td = box && box.querySelector('td[data-r="0"][data-c="0"]');
  if (!box || !td) return { isTd: false, sel: false };
  try { td.focus(); } catch (e) {}
  const el = document.activeElement;
  return { isTd: !!(el && el.closest && el.closest('td[contenteditable]')), sel: !!box.querySelector('td.is-sel') };
});`;
if (s.indexOf(a) > -1) { s = s.split(a).join(b); fs.writeFileSync(p, s); console.log('P23-07 updated'); } else console.log('P23-07 anchor miss');

if (s.indexOf(a) > -1) { s = s.split(a).join(b); fs.writeFileSync(p, s); console.log('P23-07 updated'); } else console.log('P23-07 anchor miss');
