const s = require('fs').readFileSync('d:/Programs EQ7/EQ/app.js','utf8');
console.log('escAttr_def=' + s.includes('function smartPdfEscAttr(s)'));
console.log('escAttr_used=' + s.includes('smartPdfEscAttr(o.dataUrl'));
console.log('badDate_still=' + s.includes("d.getDate().padStart"));
console.log('goodDate=' + s.includes('String(d.getDate()).padStart(2, \'0\')'));
console.log('invIf_fixed=' + s.includes('if (!input) {'));
console.log('smartPdfPickImage_ok=' + s.includes('smartPdfPickImage'));