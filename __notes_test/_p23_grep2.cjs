const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
// all call sites of smartPdfRenderOverlays / smartPdfOverlayCommit + their enclosing line context
for (const k of ['smartPdfRenderOverlays()', 'smartPdfOverlayCommit', 'focusin', 'focusout']) {
  let i = -1;
  while ((i = s.indexOf(k, i + 1)) > -1) {
    const line = s.slice(0, i).split('\n').length;
    console.log(k, '@' + line, ':', s.slice(i - 120, i + 60).split('\n').slice(-4).join(' | ').trim().slice(0, 200));
  }
  console.log('=====');
}
