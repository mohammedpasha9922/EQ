// A3: StartDraw + menu wiring (appended after A2)
const fs = require('fs');
const P = 'd:/Programs EQ7/EQ/app.js';
let s = fs.readFileSync(P, 'utf8');
const fail = (m) => { console.error('ABORT: ' + m); process.exit(1); };
const anchorA3 = "smartPdfAddMarkAnnotation('draw', { x: x, y: y, w: Math.max(8, w), h: Math.max(8, h), strokes: [{ points: pts, color: st.color, width: st.width }] });\n  }";
if (s.split(anchorA3).length - 1 !== 1) fail('A3 anchor');
const blockA3 = anchorA3 + `
  function smartPdfMarkStartDraw() {
    const ar = !!(state && state.locale === 'ar');
    if (!smartImportParsed) { smartPdfMarkToast(ar ? 'افتح ملف PDF أولاً' : 'Open a PDF first'); return false; }
    smartPdfMarkClearDraw();
    const pg = Number(smartImportCurrentPage >= 0 ? smartImportCurrentPage : 0);
    const wrap = smartPdfMarkPageWrap(pg);
    if (!wrap) return false;
    smartPdfMarkDrawMode = true; smartPdfMarkDrawPage = pg;
    wrap.classList.add('smart-pdf-mark-draw');
    const hint = document.createElement('div');
    hint.className = 'smart-pdf-mark-draw-hint';
    hint.innerHTML = '<span>' + smartPdfEscHtml(smartPdfMarkT('smartPdfMarkDrawHint', ar ? 'ارسم على الصفحة' : 'Draw on the page')) + '</span> ' +
      '<button type="button" class="smart-pdf-tbtn" data-mkdone>' + smartPdfEscHtml(smartPdfMarkT('smartPdfMarkDone', ar ? 'تم' : 'Done')) + '</button>';
    wrap.appendChild(hint);
    hint.querySelector('[data-mkdone]').addEventListener('click', (ev) => { ev.stopPropagation(); smartPdfMarkClearDraw(); });
    wrap.addEventListener('pointerdown', smartPdfMarkOnDown);
    wrap.addEventListener('pointermove', smartPdfMarkOnMove);
    wrap.addEventListener('pointerup', smartPdfMarkOnUp);
    wrap.addEventListener('pointercancel', smartPdfMarkOnUp);
    return true;
  }
  function smartPdfMarkMenuInit() {
    const wrap = document.getElementById('smartPdfMarkWrap');
    const btn = document.getElementById('smartPdfMarkBtn');
    const menu = document.getElementById('smartPdfMarkMenu');
    if (!wrap || !btn || !menu || wrap.dataset.p24wired === '1') return;
    wrap.dataset.p24wired = '1';
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const open = menu.hasAttribute('hidden');
      if (open) menu.removeAttribute('hidden'); else menu.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    menu.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { menu.setAttribute('hidden', ''); btn.setAttribute('aria-expanded', 'false'); btn.focus(); } });
    menu.addEventListener('click', (ev) => {
      const it = ev.target && ev.target.closest ? ev.target.closest('.smart-pdf-mark-item') : null;
      if (!it) return;
      ev.stopPropagation();
      const mk = it.getAttribute('data-mark') || '';
      menu.setAttribute('hidden', ''); btn.setAttribute('aria-expanded', 'false');
      try {
        if (mk === 'highlight') smartPdfMarkHighlight();
        else if (mk === 'underline') smartPdfMarkUnderline();
        else if (mk === 'draw') smartPdfMarkStartDraw();
        else if (mk === 'comment') smartPdfMarkComment();
      } catch (e3) {}
    });
    document.addEventListener('click', (ev) => {
      if (!wrap.contains(ev.target)) { menu.setAttribute('hidden', ''); btn.setAttribute('aria-expanded', 'false'); }
      const dot = ev.target && ev.target.closest ? ev.target.closest('.smart-pdf-ov-mark-comment .smart-pdf-mkdot') : null;
      if (dot) {
        ev.preventDefault(); ev.stopPropagation();
        const box = dot.closest('.smart-pdf-overlay');
        if (box) smartPdfMarkOpenComment(Number(box.dataset.page), Number(box.dataset.id));
      }
    });
  }
  smartPdfMarkMenuInit();`;
s = s.replace(anchorA3, blockA3);
fs.writeFileSync(P, s);
console.log('A3 inserted, len', s.length);
