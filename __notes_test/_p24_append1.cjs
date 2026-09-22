const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/__notes_test/_p24_block2.txt';
const chunk = `
function smartPdfMarkDone() {
  if (!smartPdfMarkDrawState || !smartPdfMarkDrawState.active) { smartPdfMarkClose(); return; }
  const t = smartPdfOverlayTarget();
  if (t && t.wrap) {
    t.wrap.classList.remove('smart-pdf-mark-draw');
    const hint = t.wrap.querySelector('.smart-pdf-mark-draw-hint');
    if (hint) hint.remove();
    if (smartPdfMarkDrawState._handlers) {
      const { onDown, onMove, onUp } = smartPdfMarkDrawState._handlers;
      t.wrap.removeEventListener('pointerdown', onDown);
      t.wrap.removeEventListener('pointermove', onMove);
      t.wrap.removeEventListener('pointerup', onUp);
    }
  }
  smartPdfMarkDrawState = null;
  smartPdfRenderOverlays();
  smartPdfMarkClose();
}
function smartPdfMarkClose() {
  const m = document.getElementById('smartPdfMarkMenu');
  if (m) m.setAttribute('hidden', '');
  const btn = document.getElementById('smartPdfMarkBtn');
  if (btn) btn.setAttribute('aria-expanded', 'false');
  smartPdfMarkCloseComment();
}
function smartPdfMarkCloseComment() {
  const pop = document.getElementById('smartPdfMarkCommentPop');
  if (pop) pop.remove();
}
function smartPdfMarkShowComment(o) {
  smartPdfMarkCloseComment();
  const t = smartPdfOverlayTarget();
  if (!t || !t.wrap) return;
  const box = t.wrap.querySelector('.smart-pdf-ov-comment[data-id="' + o.id + '"]');
  if (!box) return;
  const br = box.getBoundingClientRect();
  const pop = document.createElement('div');
  pop.id = 'smartPdfMarkCommentPop';
  pop.className = 'smart-pdf-mkpop';
  const ta = document.createElement('textarea');
  ta.id = 'smartPdfMkCommentText';
  ta.setAttribute('aria-label', smartPdfMarkT('smartPdfMarkCommentText', 'Comment text'));
  ta.rows = 3;
  ta.value = o.text || '';
  ta.style.width = '200px';
  ta.style.maxWidth = '80%';
  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.textContent = smartPdfMarkT('smartPdfMarkSave', 'Add');
  saveBtn.setAttribute('data-mkadd', '1');
  saveBtn.style.marginLeft = '6px';
  saveBtn.onclick = () => { o.text = ta.value; smartPdfOverlayStore(o.page, o); smartPdfRenderOverlays(); smartPdfMarkCloseComment(); };
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = smartPdfMarkT('smartPdfMarkCancel', 'Cancel');
  cancelBtn.setAttribute('data-mkcancel', '1');
  cancelBtn.onclick = () => smartPdfMarkCloseComment();
  pop.appendChild(ta);
  pop.appendChild(saveBtn);
  pop.appendChild(cancelBtn);
  t.wrap.appendChild(pop);
  const pr = pop.getBoundingClientRect();
  let left = br.left, top = br.top - pr.height - 4;
  if (left + pr.width > window.innerWidth) left = Math.max(4, window.innerWidth - pr.width - 4);
  if (top < 4) { top = br.bottom + 4; if (top + pr.height > window.innerHeight) top = br.top - pr.height - 2; }
  pop.style.position = 'fixed';
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
  ta.focus();
}
`;
fs.appendFileSync(p, chunk);
console.log('appended done/close/comment chunk');