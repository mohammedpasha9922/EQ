const fs = require('fs');
const h = fs.readFileSync('d:/Programs EQ7/EQ/index.html', 'utf8');
const c = fs.readFileSync('d:/Programs EQ7/EQ/styles.css', 'utf8');
const a = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
console.log('ADD_BTN=' + (h.split('id="smartPdfAddBtn"').length - 1));
console.log('ADD_ITEMS=' + (h.match(/smart-pdf-add-item/g) || []).length);
console.log('ADD_TYPES=' + ['text', 'image', 'logo', 'signature', 'stamp', 'date', 'table'].map(function (t) { return h.indexOf('data-add="' + t + '"') >= 0; }).join(','));
console.log('CSS_OVERLAY=' + (c.indexOf('.smart-pdf-overlay ') >= 0) + ' CSS_MENU=' + (c.indexOf('.smart-pdf-add-menu') >= 0));
console.log('I18N_EN=' + (a.indexOf("smartPdfAdd: 'Add'") >= 0));
console.log('I18N_AR=' + (a.indexOf('\u0625\u0636\u0627\u0641\u0629') >= 0));
console.log('OVERLAY_DRAW=' + (a.indexOf('ovByPage') >= 0) + ' WIRE=' + (a.indexOf('smartPdfAddClose') >= 0) + ' SEAM=' + (a.indexOf('__smartImport.addItem') >= 0));
const MENU = [
  '          <!-- PART 22 - Add menu: Text/Image/Logo/Signature/Stamp/Date/Table (PDF editor only) -->',
  '          <div class="smart-pdf-add-wrap" id="smartPdfAddWrap">',
  '            <button type="button" class="smart-save-btn smart-add-btn" id="smartPdfAddBtn" aria-haspopup="true" aria-expanded="false" aria-controls="smartPdfAddMenu">',
  '              <span aria-hidden="true">\u2795</span>',
  '              <span data-i18n="smartPdfAdd">Add</span>',
  '            </button>',
  '            <div class="smart-pdf-add-menu" id="smartPdfAddMenu" role="menu" aria-label="Add" hidden>',
  '              <button type="button" class="smart-pdf-add-item" role="menuitem" data-add="text"><span aria-hidden="true">T</span><span data-i18n="smartPdfAddText">Text</span></button>',
  '              <button type="button" class="smart-pdf-add-item" role="menuitem" data-add="image"><span aria-hidden="true">\uD83D\uDDBC</span><span data-i18n="smartPdfAddImage">Image</span></button>',
  '              <button type="button" class="smart-pdf-add-item" role="menuitem" data-add="logo"><span aria-hidden="true">\uD83C\uDFF7</span><span data-i18n="smartPdfAddLogo">Logo</span></button>',
  '              <button type="button" class="smart-pdf-add-item" role="menuitem" data-add="signature"><span aria-hidden="true">\u270D</span><span data-i18n="smartPdfAddSignature">Signature</span></button>',
  '              <button type="button" class="smart-pdf-add-item" role="menuitem" data-add="stamp"><span aria-hidden="true">\uD83D\uDD16</span><span data-i18n="smartPdfAddStamp">Stamp</span></button>',
  '              <button type="button" class="smart-pdf-add-item" role="menuitem" data-add="date"><span aria-hidden="true">\uD83D\uDCC5</span><span data-i18n="smartPdfAddDate">Date</span></button>',
  '              <button type="button" class="smart-pdf-add-item" role="menuitem" data-add="table"><span aria-hidden="true">\u25A6</span><span data-i18n="smartPdfAddTable">Table</span></button>',
  '            </div>',
  '          </div>',
  anchor
].join('\r\n');
h = h.replace(anchor, MENU);
fs.writeFileSync(hPath, h);
let c = fs.readFileSync(cPath, 'utf8');
const CSS = [
  '',
  '/* PART 22 - PDF Add menu + overlay elements (PDF editor only) */',
  '.smart-pdf-add-wrap { position: relative; }',
  '.smart-pdf-add-menu { position: absolute; top: calc(100% + 4px); inset-inline-start: 0; z-index: 40; min-width: 160px; padding: 6px; border-radius: 12px; background: var(--panel, #ffffff); border: 1px solid var(--border, #d7dee8); box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18); display: flex; flex-direction: column; gap: 2px; }',
  '.smart-pdf-add-menu[hidden] { display: none; }',
  '.smart-pdf-add-item { display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 6px 10px; border: 0; border-radius: 8px; background: transparent; color: var(--text, inherit); font: inherit; text-align: start; cursor: pointer; }',
  '.smart-pdf-add-item:hover, .smart-pdf-add-item:focus-visible { background: var(--surface-subtle, #eef2f7); outline: none; }',
  '.smart-pdf-overlay-layer { position: absolute; inset: 0; pointer-events: none; z-index: 5; }',
  '.smart-pdf-overlay { position: absolute; pointer-events: auto; min-width: 44px; min-height: 24px; padding: 2px 4px; border: 1px dashed rgba(37, 99, 235, 0.55); border-radius: 6px; background: rgba(255, 255, 255, 0.88); box-sizing: border-box; touch-action: none; }',
  '.smart-pdf-overlay-body { outline: none; line-height: 1.3; white-space: pre-wrap; word-break: break-word; }',
  '.smart-pdf-ov-image img { display: block; width: 100%; height: auto; }',
  '.smart-pdf-ov-table table { border-collapse: collapse; width: 100%; }',
  '.smart-pdf-ov-table td { border: 1px solid rgba(15, 23, 42, 0.45); padding: 3px 6px; min-width: 34px; font: inherit; }',
  '.smart-pdf-overlay-grip { position: absolute; inset-inline-end: 0; bottom: 0; width: 14px; height: 14px; cursor: nwse-resize; background: linear-gradient(135deg, transparent 45%, rgba(37, 99, 235, 0.8) 46%, rgba(37, 99, 235, 0.8) 54%, transparent 55%); }',
  '.smart-pdf-overlay-del { position: absolute; top: -10px; inset-inline-end: -10px; width: 20px; height: 20px; border-radius: 50%; border: 1px solid var(--border, #d7dee8); background: #ffffff; color: #b91c1c; font-size: 12px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; }',
  ''
].join('\r\n');
fs.writeFileSync(cPath, c + CSS);
console.log('FIXC HTML+CSS OK');