const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/__notes_test/_p24_block2.txt';
const chunk = `
// ===== PART 24 — menu open/close + item wiring (reuses PART 22 Add-menu pattern) =====
const smartPdfMarkBtn = document.getElementById('smartPdfMarkBtn');
const smartPdfMarkMenu = document.getElementById('smartPdfMarkMenu');
if (smartPdfMarkBtn && smartPdfMarkMenu) {
  smartPdfMarkBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const expanded = smartPdfMarkMenu.hasAttribute('hidden');
    if (expanded) {
      smartPdfMarkMenu.removeAttribute('hidden');
      smartPdfMarkBtn.setAttribute('aria-expanded', 'true');
    } else {
      smartPdfMarkMenu.setAttribute('hidden', '');
      smartPdfMarkBtn.setAttribute('aria-expanded', 'false');
    }
  });
  smartPdfMarkMenu.addEventListener('click', (ev) => {
    const it = ev.target && ev.target.closest ? ev.target.closest('.smart-pdf-mark-item') : null;
    if (!it) return;
    ev.preventDefault(); ev.stopPropagation();
    const type = it.getAttribute('data-mark') || '';
    smartPdfMarkMenu.setAttribute('hidden', '');
    smartPdfMarkBtn.setAttribute('aria-expanded', 'false');
    try { smartPdfMarkApply(type); } catch (e) {}
  });
  smartPdfMarkMenu.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') { smartPdfMarkMenu.setAttribute('hidden', ''); smartPdfMarkBtn.setAttribute('aria-expanded', 'false'); smartPdfMarkBtn.focus(); }
  });
  document.addEventListener('click', (ev) => {
    if (!smartPdfMarkMenu.contains(ev.target) && ev.target !== smartPdfMarkBtn) {
      smartPdfMarkMenu.setAttribute('hidden', '');
      smartPdfMarkBtn.setAttribute('aria-expanded', 'false');
    }
  });
}
`;
fs.appendFileSync(p, chunk);
console.log('appended wiring chunk');