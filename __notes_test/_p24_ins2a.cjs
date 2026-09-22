const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/app.js';
let s = fs.readFileSync(p, 'utf8');
const anchor = "// scoped to Smart Documents. No rich-text editing yet (PART 7+).";
const idx = s.indexOf(anchor);
if (idx < 0) { console.log('ANCHOR NOT FOUND'); process.exit(1); }
const block = `let smartPdfMarkDrawState = null;
function smartPdfMarkStartDraw() {
  const t = smartPdfOverlayTarget();
  if (!t || !t.wrap) { showToast(smartPdfMarkT('smartPdfMarkOnPage', 'Select a page first'), 2000); return; }
  t.wrap.classList.add('smart-pdf-mark-draw');
  let hint = t.wrap.querySelector('.smart-pdf-mark-draw-hint');
  if (!hint) { hint = document.createElement('div'); hint.className = 'smart-pdf-mark-draw-hint'; hint.innerHTML = smartPdfMarkT('smartPdfMarkDrawing', 'Drawing…') + ' <button type="button" data-mkdone aria-label="Done">✓</button>'; hint.style.display = ''; t.wrap.appendChild(hint); }
  hint.style.display = '';
  const doneBtn = hint.querySelector('[data-mkdone]');
  if (doneBtn) doneBtn.onclick = () => smartPdfMarkDone();
  smartPdfMarkDrawState = { active: true, page: smartImportCurrentPage, strokes: [], started: false };
  const onDown = (ev) => {
    if (!smartPdfMarkDrawState || !smartPdfMarkDrawState.active || smartPdfMarkDrawState.started) return;
    const t2 = smartPdfOverlayTarget();
    if (!t2 || !t2.wrap) return;
    smartPdfMarkDrawState.started = true;
    smartPdfMarkDrawState.cur = { points: [], color: (window.smartPdfMarkColor) || '#1d4ed8' };
    smartPdfMarkDrawState.strokes = [smartPdfMarkDrawState.cur];
    smartPdfMarkDrawState.cur.points.push([ev.clientX, ev.clientY]);
  };
  const onMove = (ev) => {
    if (!smartPdfMarkDrawState || !smartPdfMarkDrawState.active || !smartPdfMarkDrawState.cur) return;
    smartPdfMarkDrawState.cur.points.push([ev.clientX, ev.clientY]);
  };
  const onUp = () => {
    if (!smartPdfMarkDrawState || !smartPdfMarkDrawState.active) return;
    const st = smartPdfMarkDrawState.cur;
    if (st && st.points && st.points.length >= 2) {
      const o = { type: 'draw', id: smartPdfMarkNextId(), page: smartPdfMarkDrawState.page, w: 200, strokes: [st], color: st.color || '#1d4ed8', borderWidth: 2 };
      smartPdfOverlayStore(o.page, o);
      smartPdfRenderOverlays();
    }
    smartPdfMarkDrawState.cur = null;
    smartPdfMarkDrawState.started = false;
  };
  smartPdfMarkDrawState._handlers = { onDown, onMove, onUp };
  t.wrap.addEventListener('pointerdown', onDown);
  t.wrap.addEventListener('pointermove', onMove);
  t.wrap.addEventListener('pointerup', onUp);
}
`;
s = s.slice(0, idx) + block + s.slice(idx);
fs.writeFileSync(p, s);
console.log('part2a inserted. file bytes:', s.length);
