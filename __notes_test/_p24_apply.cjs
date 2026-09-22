const fs = require('fs');
const P = 'd:/Programs EQ7/EQ/app.js';
let s = fs.readFileSync(P, 'utf8');
const fail = (m) => { console.error('ABORT: ' + m); process.exit(1); };
const once = (k) => { if (s.split(k).length - 1 !== 1) fail('anchor not unique: ' + k.slice(0, 60)); };

// ---------- A) core funcs + wiring, after smartPdfMarkClearDraw ----------
const anchorA = 'smartPdfMarkDrawCurrent = null; smartPdfMarkDrawPage = -1;\n  }';
once(anchorA);
const blockA1 = anchorA + `
  let smartPdfMarkLiveSvg = null;
  let smartPdfMarkLivePt = null;
  function smartPdfMarkSvgHtml(o) {
    const w = Math.max(1, o.w || 40), h = Math.max(1, o.h || 40);
    let pl = '';
    (Array.isArray(o.strokes) ? o.strokes : []).forEach((st) => {
      const pts = Array.isArray(st && st.points) ? st.points : [];
      if (pts.length < 2) return;
      pl += '<polyline fill="none" stroke="' + smartPdfEscAttr(st.color || '#1d4ed8') + '" stroke-width="' + (st.width || 2) + '" stroke-linecap="round" stroke-linejoin="round" points="' + smartPdfEscAttr(pts.map((p) => p[0] + ',' + p[1]).join(' ')) + '"/>';
    });
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" style="width:100%;height:100%;display:block" aria-hidden="true">' + pl + '</svg>';
  }
  function smartPdfMarkCommentPopover(opts) {
    const ar = !!(state && state.locale === 'ar');
    const pop = document.createElement('div');
    pop.className = 'smart-pdf-mkpop';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', smartPdfMarkT('smartPdfMarkComment', ar ? 'تعليق' : 'Comment'));
    pop.innerHTML = '<label class="smart-pdf-mkpop-label" for="smartPdfMkCommentText">' + smartPdfEscHtml(smartPdfMarkT('smartPdfMarkCommentLabel', ar ? 'نص التعليق' : 'Comment text')) + '</label>' +
      '<textarea id="smartPdfMkCommentText"></textarea>' +
      '<div class="smart-pdf-mkpop-row"><button type="button" class="smart-pdf-tbtn" data-mkcancel>' + smartPdfEscHtml(smartPdfMarkT('smartPdfMarkCancel', ar ? 'إلغاء' : 'Cancel')) + '</button>' +
      '<button type="button" class="smart-pdf-tbtn" data-mkadd>' + smartPdfEscHtml(smartPdfMarkT('smartPdfMarkAddComment', ar ? 'إضافة تعليق' : 'Add Comment')) + '</button></div>';
    document.body.appendChild(pop);
    const r = opts.anchor || { left: Math.max(8, window.innerWidth / 2 - 140), top: 120 };
    pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 300)) + 'px';
    pop.style.top = Math.max(8, r.top) + 'px';
    const ta = pop.querySelector('textarea'); ta.value = opts.initial || '';
    const outside = (e2) => { if (!pop.contains(e2.target)) close(); };
    const close = () => { try { pop.remove(); } catch (e0) {} document.removeEventListener('pointerdown', outside, true); };
    setTimeout(() => { document.addEventListener('pointerdown', outside, true); try { ta.focus(); } catch (e1) {} }, 0);
    pop.addEventListener('keydown', (e2) => { if (e2.key === 'Escape') close(); });
    pop.querySelector('[data-mkcancel]').addEventListener('click', close);
    pop.querySelector('[data-mkadd]').addEventListener('click', () => { const v = (ta.value || '').trim(); if (v) { try { opts.onAdd(v); } catch (e2) {} } close(); });
  }
  function smartPdfMarkComment() {
    const ar = !!(state && state.locale === 'ar');
    if (!smartImportParsed) { smartPdfMarkToast(ar ? 'افتح ملف PDF أولاً' : 'Open a PDF first'); return false; }
    const pages = smartImportParsed.pages || [];
    const pg = Number(smartImportCurrentPage >= 0 ? smartImportCurrentPage : 0);
    const dims = (pages[pg] && pages[pg].dims) || { width: 595, height: 842 };
    smartPdfMarkCommentPopover({
      initial: '',
      onAdd: (txt) => { smartPdfAddMarkAnnotation('comment', { x: Math.round(dims.width * 0.38), y: Math.round(dims.height * 0.3), w: 26, h: 26, text: txt, color: '#f59e0b' }); }
    });
    return true;
  }
  function smartPdfMarkOpenComment(page, id) {
    const o = smartPdfOverlayFind(page, id); if (!o) return;
    const box = document.querySelector('#smartPdfEditor .smart-pdf-overlay[data-page="' + page + '"][data-id="' + id + '"]');
    const r = box ? box.getBoundingClientRect() : null;
    smartPdfMarkCommentPopover({
      initial: o.text || '',
      anchor: r ? { left: r.left, top: Math.max(8, r.bottom + 6) } : null,
      onAdd: (txt) => { o.text = txt; smartPdfOverlayStore(page, o); smartPdfRenderOverlays(); }
    });
  }`;
s = s.replace(anchorA, blockA1);
fs.writeFileSync(P, s);
console.log('A1 inserted, len', s.length);
