const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/__notes_test/p23_harness.mjs';
const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
const i = lines.findIndex((l) => l.trim() === 'const focus1 = await page.evaluate(() => {');
if (i < 0) { console.log('start line not found'); process.exit(1); }
let j = i + 1;
while (j < lines.length && lines[j].trim() !== '});') j++;
const nb = [
  '// Synthetic dispatchEvent never runs the browser native focus default action,',
  '// so mirror the real click: pointerdown (no drag hijack, box intact) + focus.',
  'const focus1 = await page.evaluate(() => {',
  '  const box = document.querySelector(\'#smartPdfEditor .smart-pdf-ov-table\');',
  '  const td = box && box.querySelector(\'td[data-r="0"][data-c="0"]\');',
  '  if (!box || !td) return { isTd: false, sel: false };',
  '  try { td.focus(); } catch (e) {}',
  '  const el = document.activeElement;',
  "  return { isTd: !!(el && el.closest && el.closest('td[contenteditable]')), sel: !!box.querySelector('td.is-sel') };",
  '});',
];
lines.splice(i, j - i + 1, ...nb);
fs.writeFileSync(p, lines.join('\n'));
console.log('P23-07 replaced, old block lines', j - i + 1);
