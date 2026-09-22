// A2: draw handlers (appended after A1)
const fs = require('fs');
const P = 'd:/Programs EQ7/EQ/app.js';
let s = fs.readFileSync(P, 'utf8');
const fail = (m) => { console.error('ABORT: ' + m); process.exit(1); };
const anchorA2 = 'onAdd: (txt) => { o.text = txt; smartPdfOverlayStore(page, o); smartPdfRenderOverlays(); }\n    });\n  }';
if (s.split(anchorA2).length - 1 !== 1) fail('A2 anchor');
const blockA2 = anchorA2 + `
  function smartPdfMarkOnDown(ev) {
    if (!smartPdfMarkDrawMode) return;
    if (ev.target && ev.target.closest && ev.target.closest('.smart-pdf-mark-draw-hint')) return;
    ev.preventDefault();
    const p = smartPdfMarkClientToPage(smartPdfMarkDrawPage, ev.clientX, ev.clientY);
    smartPdfMarkDrawCurrent = { color: '#1d4ed8', width: 2, pts: [[p.x, p.y]] };
    const wrap = smartPdfMarkPageWrap(smartPdfMarkDrawPage);
    const scl = smartPdfOverlayScale() || 1;
    const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    sv.setAttribute('class', 'smart-pdf-mark-live');
    sv.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:45');
    const pl = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    pl.setAttribute('fill', 'none'); pl.setAttribute('stroke', smartPdfMarkDrawCurrent.color);
    pl.setAttribute('stroke-width', String(smartPdfMarkDrawCurrent.width * scl));
    pl.setAttribute('stroke-linecap', 'round'); pl.setAttribute('stroke-linejoin', 'round');
    pl.setAttribute('points', (p.x * scl) + ',' + (p.y * scl));
    sv.appendChild(pl); wrap.appendChild(sv);
    smartPdfMarkLiveSvg = sv; smartPdfMarkLivePt = pl;
  }
  function smartPdfMarkOnMove(ev) {
    if (!smartPdfMarkDrawMode || !smartPdfMarkDrawCurrent) return;
    const p = smartPdfMarkClientToPage(smartPdfMarkDrawPage, ev.clientX, ev.clientY);
    smartPdfMarkDrawCurrent.pts.push([p.x, p.y]);
    const scl = smartPdfOverlayScale() || 1;
    try { smartPdfMarkLivePt.setAttribute('points', smartPdfMarkDrawCurrent.pts.map((pt) => (pt[0] * scl) + ',' + (pt[1] * scl)).join(' ')); } catch (e) {}
  }
  function smartPdfMarkOnUp() {
    if (!smartPdfMarkDrawMode || !smartPdfMarkDrawCurrent) return;
    const st = smartPdfMarkDrawCurrent; smartPdfMarkDrawCurrent = null;
    if (smartPdfMarkLiveSvg) { try { smartPdfMarkLiveSvg.remove(); } catch (e) {} smartPdfMarkLiveSvg = null; smartPdfMarkLivePt = null; }
    if (!st.pts || st.pts.length < 2) return;
    const xs = st.pts.map((p) => p[0]), ys = st.pts.map((p) => p[1]);
    const x = Math.min.apply(null, xs) - 4, y = Math.min.apply(null, ys) - 4;
    const w = Math.max.apply(null, xs) - x + 8, h = Math.max.apply(null, ys) - y + 8;
    const pts = st.pts.map((p) => [p[0] - x, p[1] - y]);
    smartPdfAddMarkAnnotation('draw', { x: x, y: y, w: Math.max(8, w), h: Math.max(8, h), strokes: [{ points: pts, color: st.color, width: st.width }] });
  }`;
s = s.replace(anchorA2, blockA2);
fs.writeFileSync(P, s);
console.log('A2 inserted, len', s.length);
