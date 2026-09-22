const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
function probe(name, key) {
  let i = -1; const hits = [];
  while ((i = s.indexOf(key, i + 1)) !== -1) hits.push(i);
  console.log('--- ' + name + ' count=' + hits.length);
  for (const h of hits.slice(0, 3)) {
    const around = s.slice(h, h + 60);
    console.log('  crlf=' + around.includes('\r\n') + ' lf=' + around.includes('\n') + ' :: ' + JSON.stringify(around.slice(0, 50)));
  }
}
probe('box-append-child', 'box.appendChild(body);');
probe('blur-handler', "body.addEventListener('blur', () => { smartPdfRenderOverlays(); });  // normalize after edit");
probe('drag-guard', 'ev.target === delbtn || ev.target === grip) return;');
probe('grip-start', 'grip.addEventListener(');
probe('grip-ow', 'const ow = (o.w || 120), osz = (o.size || 12);');
probe('onup-line', "window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); smartPdfOverlayStore(page, o); };");
probe('addItem-rows', "o.rows = [['', ''], ['', '' ]];");
probe('addItem-w', 'o.w = baseW * 0.5; break;');
probe('helv', 'let helv = null;');
probe('export-tbl', "} else if (o.type === 'table') {");
probe('colors-seam', 'colors: () => smartImportColors');
probe('smartpdf-comment', '// PART 5 — test / configuration seam for the Smart Import workflow.');