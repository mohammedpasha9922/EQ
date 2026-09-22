const fs = require('fs');
const a = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
let i = a.indexOf('LANGUAGE_KEY');
while (i >= 0) { console.log('LK@' + a.slice(0, i).split('\n').length + ': ' + a.slice(i, i + 80).replace(/[\r\n]+/g, ' ')); i = a.indexOf('LANGUAGE_KEY', i + 1); }
const j = a.indexOf('function setLanguage');
console.log('SETLANG=' + JSON.stringify(j >= 0 ? a.slice(j, j + 200) : 'none'));
const k = a.indexOf("localStorage.setItem('language'");
console.log('LS_LANG=' + k);
const m = a.search(/localStorage\.setItem\([^)]*(lang|Lang)[^)]*\)/);
console.log('LS_ANY=' + (m >= 0 ? a.slice(m, m + 70) : 'none'));
console.log('ADD_BTN=' + (h.split('id="smartPdfAddBtn"').length - 1));
console.log('ADD_ITEMS=' + (h.match(/smart-pdf-add-item/g) || []).length);
console.log('ADD_TYPES=' + ['text', 'image', 'logo', 'signature', 'stamp', 'date', 'table'].map(function (t) { return h.indexOf('data-add="' + t + '"') >= 0; }).join(','));
console.log('CSS_OVERLAY=' + (c.indexOf('.smart-pdf-overlay ') >= 0) + ' CSS_MENU=' + (c.indexOf('.smart-pdf-add-menu') >= 0));
console.log('I18N_EN=' + (a.indexOf("smartPdfAdd: 'Add'") >= 0));
console.log('I18N_AR=' + (a.indexOf('\u0625\u0636\u0627\u0641\u0629') >= 0));
console.log('OVERLAY_DRAW=' + (a.indexOf('ovByPage') >= 0) + ' WIRE=' + (a.indexOf('smartPdfAddClose') >= 0) + ' SEAM=' + (a.indexOf('__smartImport.addItem') >= 0));