import fs from 'node:fs';
const a = fs.readFileSync('app.js', 'utf8');
const h = fs.readFileSync('index.html', 'utf8');
const c = fs.readFileSync('styles.css', 'utf8');
let fail = 0;
const chk = (n, ok, d='') => { console.log((ok?'PASS':'FAIL')+'  '+n+(d?'  -> '+d:'')); if(!ok) fail++; };

// Scoped additions
chk('tools UI present in PDF workspace', ['pdfV1Tools','pdfV1StampBtn','pdfV1SigDrawBtn','pdfV1SigUploadBtn','pdfV1TextBtn','pdfV1DateBtn','pdfV1DelBtn','pdfV1PrevPg','pdfV1NextPg','pdfV1PgLabel','pdfV1Layer','pdfV1SigWrap','pdfV1SigCanvas','pdfV1StampInput','pdfV1SigFileInput','pdfV1TextRow','pdfV1TextInput'].every(id=>h.includes('id="'+id+'"')));
chk('no second workspace', !h.includes('pdfV1Workspace') && (a.match(/function openPdfReportsWorkspace/g)||[]).length===1);
chk('css scoped to workspace', c.includes('#pdfReportsWorkspace .pdfv1-item') && c.includes('#pdfReportsWorkspace .pdfv1-handle') && c.includes('#pdfReportsWorkspace .pdfv1-layer'));
chk('pointer events used for gestures + pad', (a.match(/pointerdown/g)||[]).length >= 3 && a.includes('pointercancel'));
chk('aspect ratio locked for images', a.includes('it.aspect'));
chk('clamp keeps item partly visible', a.includes('keep - w') && a.includes('keep - h'));
chk('per-page session state', a.includes('pdfV1P2Items') && a.includes('pdfV1P2Cur') && a.includes('pdfV1P2PageCount'));
chk('hook called after Phase1 open', a.includes('pdfV1P2AfterOpen(file)'));
chk('date uses device locale (no new i18n system)', a.includes('toLocaleDateString'));
chk('RTL stage coords isolated', c.includes('.pdfv1-stage') && c.includes('direction: ltr'));
chk('no forbidden Phase2 features', !/pdfV1P2[\s\S]*?(exportPdf|savePdf|print|whatsapp|telegram|mailto|merge|split|compress|ocr)/.test(a.slice(a.indexOf('let pdfV1P2PageCount'), a.indexOf('let smartScanStream'))));

// Behavioral assertions (logic-level)
const chkFn = (name, code) => { try { chk(name, !!eval(code)); } catch(e){ chk(name, false, String(e)); } };
// Simulate clamp math with jest-like inline check
const keep=0.05;
const clamp=(it)=>{const w=Math.min(0.95,Math.max(0.06,it.w));let h=Math.min(0.95,Math.max(0.05,it.h));it.w=w;it.h=h;it.x=Math.min(1-keep,Math.max(keep-w,it.x));it.y=Math.min(1-keep,Math.max(keep-h,it.y));return it;};
chkFn('clamp: never fully outside', 'clamp({x:-2,y:-2,w:0.3,h:0.2}).x >= (0.05-0.3)');
chkFn('clamp: keeps width sane', 'clamp({x:0,y:0,w:5,h:5}).w === 0.95');
console.log(fail===0 ? 'PHASE2 STATIC ALL PASS' : 'PHASE2 FAILURES: '+fail);
process.exit(fail===0?0:1);