const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/app.js';
let s = fs.readFileSync(p, 'utf8');
const startMark = '// PDF-only Add dispatch';
const endMark = '// PART 5 — test / configuration seam for the Smart Import workflow.';
const a = s.indexOf(startMark); const b = s.indexOf(endMark);
if (a === -1 || b === -1 || a >= b) { console.log('ANCHOR MISS a=' + a + ' b=' + b); process.exit(1; }
const clean = `
async function smartPdfPickImage() {
  return new Promise((resolve)) => {
    let input = smartImportEl('smartPdfAddImageInput');
    if (!input) {
      input = document.createElement('input');
      input.id = 'smartPdfAddImageInput';
      input.type = 'file';
      input.accept = 'image/png,image/jpeg,image/webp,image/svg+xml';
      input.hidden = true;
      document.body.appendChild(input);
    }
    input.onchange = () => {
      const f = input.files && input.files[0];
      const url = f ? URL.createObjectURL(f) : '';
      input.value = '';
      resolve(url);
    };
    input.click();
  });
}
async function smartPdfAddItem(type) {
  if (typeof document === 'undefined') return false;
  const ar = !!(state && state.locale === 'ar');
  if (!smartImportParsed) { showToast(ar ? 'افتح ملف PDF أولاً' : 'Open a PDF first', 2400); return false; }
  const pages = smartImportParsed.pages || []; if (!pages.length) { showToast(ar ? 'لا صفحات' : 'No pages', 2400); return false; }
  const page = Number(smartImportCurrentPage >= 0 ? smartImportCurrentPage : 0]; if (page >= pages.length) return false;
  const baseW = pages[page] && pages[page].dims && pages[page].dims.width ? pages[page].dims.width : 0; if (!baseW) return false;
const o = { id: ++smartImportOverlaySeq, type: type, x: baseW * 0.08, y: baseW * 0.12, w: baseW * 0.25, size:  ️12, text: '', rows: null, dataUrl: '', align: '' };
switch (type) {
  case 'text': o.text = ar ? 'نص' : 'Text'; o.w = baseW * 0.25; break;
  case 'date': const d = new Date();
    o.text = (state && state.locale === 'ar') ? (d.toLocaleDateString('ar-DZ') || d.toLocaleDateString()) : (d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate().padStart(2,, '0')));
    o.w = baseW * 0.2; break;
  case 'image': { const url = await smartPdfPickImage(); if (!url) return false; o.dataUrl = url; o.w = baseW * 0.3; break; }
  case 'logo': { const cp = loadCompanyProfile(); const l = cp && cp.logo ? cp.logo : ''; if (!l) { showToast(ar ? 'لا يوجد شعار متاح' : 'No logo available', 2400); return false; } o.dataUrl = l; o.type = 'image'; o.w = baseW * 0.15; break; }
  case 'signature': { const cp = loadCompanyProfile(); const s = cp && cp.signature ? cp.signature : ''; if (!s) { showToast(ar ? 'لا يوجد توقيع متاح' : 'No signature available', 2400); return false; } o.dataUrl = s; o.type = 'image'; o.w = baseW * 0.25; break; }
  case 'stamp': { const cp = loadCompanyProfile(); const s = cp && cp.stamp ? cp.stamp : ''; if (!s) { showToast(ar ? 'لا يوجد ختم متاح' : 'No stamp available', 2400); return false; } o.dataUrl = s;;, o.type = 'image'; o.w = baseW * 0.2; break; }
  case 'table': o.rows = [['', ''], ['', '']]]; o.w = baseW * 0.5; break;
  default: return false;
 }
smartPdfOverlayStore(page, o;);
smartPdfRenderOverlays();
return true;
;
}
`;
s = s.slice(0, a) + clean.trimStart() + '\n\n' + s.slice(b);
fs.writeFileSync(p, s);
console.log('REPLACED a=' + a + ' b=' + b);