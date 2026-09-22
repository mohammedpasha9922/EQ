// FINAL SCOPE AUDIT — Smart Documents Clean Reset (read-only, writes _F_audit_out.txt)
const fs = require('fs');
const out = [];
const p = (s) => out.push(s);

function read(f) { try { return fs.readFileSync(f, 'utf8'); } catch (e) { return null; } }
function lines(f) { const t = read(f); return t === null ? [] : t.split(/\r?\n/); }
function countIn(f, re) { const t = read(f); if (t === null) return 'FILE_MISSING'; const m = t.match(re); return m ? m.length : 0; }
function show(f, re, label, limit) {
  const L = lines(f);
  const hits = [];
  L.forEach((l, i) => { if (re.test(l)) hits.push((i + 1) + ': ' + l.trim().slice(0, 170)); });
  p('--- ' + label + ' [' + f + '] hits=' + hits.length + (limit ? ' (first ' + limit + ')' : '') + ' ---');
  hits.slice(0, limit || 40).forEach(h => p(h));
}

p('================ 1) SMALL DOCS ENTRY POINT ================');
p('index.html  open-smart-docs      : ' + countIn('index.html', /open-smart-docs/g));
p('index.html  smartDocsModal       : ' + countIn('index.html', /id="smartDocsModal"/g));
p('index.html  closeSmartDocs       : ' + countIn('index.html', /id="closeSmartDocs"/g));
p('app.js      openSmartDocs        : ' + countIn('app.js', /function openSmartDocs/g));
p('app.js      closeSmartDocs       : ' + countIn('app.js', /function closeSmartDocs/g));
show('index.html', /open-smart-docs/, 'entry buttons', 10);

p('');
p('================ 2) WORKSPACE PLACEHOLDER CONTENT ================');
{
  const t = read('index.html') || '';
  const s = t.indexOf('id="smartDocsModal"');
  const e = t.indexOf('id="drawerOverlay"');
  p('modal html slice length: ' + (e - s));
  p(t.slice(s, e > s ? e : s + 1200).split('\n').map(l => '   |' + l.trim()).join('\n'));
  p('workspace placeholder text nodes: ' + ((t.slice(s, e).match(/>[^<>\s][^<>]*</g)) || []).join(' ~~ '));
}

p('');
p('================ 3) OLD SMART DOCUMENTS UI/GLOBAL SEAMS ================');
[
  [/__smartImport/g, 'window.__smartImport'],
  [/__smartAssistant/g, 'window.__smartAssistant'],
  [/__smartLogo/g, 'window.__smartLogo'],
  [/__smartSigProtect/g, 'window.__smartSigProtect'],
  [/__smartBlank/g, 'window.__smartBlank'],
  [/__smartDocTemplates/g, 'window.__smartDocTemplates'],
  [/__smartDrafts/g, 'window.__smartDrafts'],
  [/smartBlankCanvasHolder/g, 'smartBlankCanvasHolder'],
  [/smartDocumentContent/g, 'smartDocumentContent'],
  [/smartBlankCanvas\b/g, 'smartBlankCanvas'],
  [/data-toolbar="blank-doc"/g, 'data-toolbar="blank-doc"'],
  [/smart-tool-btn/g, 'smart-tool-btn'],
  [/smart-doc-toolbar/g, 'smart-doc-toolbar'],
  [/smart-doc-card/g, 'smart-doc-card'],
  [/smart-doc-text-block/g, 'smart-doc-text-block'],
  [/smart-doc-table/g, 'smart-doc-table'],
  [/smart-doc-signature/g, 'smart-doc-signature'],
  [/smart-doc-logo/g, 'smart-doc-logo'],
  [/smart-doc-image/g, 'smart-doc-image'],
  [/smart-add-item/g, 'smart-add-item'],
  [/smartAddMenu|smartAddIsOpen/g, 'add-menu logic'],
  [/smartPagesRender|smartPageAdd|smartPageDelete/g, 'page-management logic'],
  [/smartTemplates/g, 'templates logic'],
  [/smartDraft[A-Za-z]*/g, 'draft logic'],
  [/smartExport[A-Za-z]*/g, 'export logic'],
].forEach(([re, label]) => {
  p(String(label).padEnd(30) + ' app.js=' + countIn('app.js', re) + '  index.html=' + countIn('index.html', re) + '  styles.css=' + countIn('styles.css', re));
});

p('');
p('================ 4) SIBLING FEATURES (must be untouched) ================');
[
  [/id="notesManagerModal"/g, 'notesManagerModal'],
  [/id="generalCalculatorPanel"/g, 'calculator panel'],
  [/id="currencyConverterModal"/g, 'currency modal'],
  [/id="pdfReportsWorkspace"/g, 'pdfReportsWorkspace'],
  [/id="notePdfPreviewModal"/g, 'notePdfPreviewModal'],
  [/data-action="open-smart-docs"/g, 'smart docs nav action'],
  [/id="drawer"/g, 'drawer'],
  [/id="drawerOverlay"/g, 'drawerOverlay'],
  [/ad-placeholder|adBar|ad-bar/g, 'ad bar'],
].forEach(([re, label]) => {
  p(String(label).padEnd(28) + ' index.html=' + countIn('index.html', re) + '  styles.css=' + countIn('styles.css', re) + '  app.js=' + countIn('app.js', re));
});

p('');
p('================ 5) drawerToggle REALITY CHECK ================');
['index.html', '_F_head_index.html', '_pristine/index.html', 'index.html.pdfclear.bak', '_myhead_index.html', 'app.js', 'styles.css'].forEach(f => {
  p('drawerToggle in ' + f.padEnd(28) + ' = ' + countIn(f, /drawerToggle|drawer-toggle/g));
});
show('index.html', /drawer|menu-btn|hamburger|navToggle/i, 'current index.html drawer-ish lines', 30);
show('app.js', /drawerToggle/, 'app.js drawerToggle lines', 30);

p('');
p('================ 6) SMART DOCS LOCALE KEYS IN USE ================');
p('app.js data-i18n key lookups still referencing removed smart UI:');
['smartDocsCardScanTitle', 'smartDocsCardImportTitle', 'smartDocsHeading', 'smartToolbar', 'smartDocsStep1'].forEach(k => {
  p('   ' + k.padEnd(26) + ' app.js=' + countIn('app.js', new RegExp(k, 'g')) + '  index.html=' + countIn('index.html', new RegExp(k, 'g')));
});

p('');
p('================ 7) SYNTAX / ARROW FUNCTION GUARDS ================');
p('app.js lines: ' + lines('app.js').length);
p('index.html lines: ' + lines('index.html').length);

fs.writeFileSync('_F_audit_out.txt', out.join('\n'), 'utf8');
console.log('AUDIT_WRITTEN');
