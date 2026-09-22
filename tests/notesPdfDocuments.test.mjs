import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// ---------------------------------------------------------------------------
// PHASE 09 — NOTES PDF PROFESSIONAL DOCUMENTS / TEMPLATES
// Source-inspection tests (no browser, no network, no ESM import of app.js),
// mirroring the existing notesPdfExport / notesDataModel style. Verify the
// presentation-only document options (template, header, footer, watermark)
// exist, are wired to buildNotePdfHtml via the existing pipeline, are localized
// in all 7 languages, never mutate note data, and that the preview controls +
// CSS are present.
// ---------------------------------------------------------------------------

const appSource = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const htmlSource = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const cssSource = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

function check(name, condition, detail) {
  if (condition) console.log('PASS  ' + name);
  else console.error('FAIL  ' + name + (detail ? '  -> ' + detail : ''));
  assert.ok(condition, name + (detail ? '  -> ' + detail : ''));
}

const countOf = (src, str) => (src.match(new RegExp(str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;

// --- Templates + session options state -------------------------------------
test('Phase 09: templates + document options state exist', () => {
  check('NOTE_PDF_TPL_NAMES defined with 9 templates',
    /const NOTE_PDF_TPL_NAMES = \['blank', 'report', 'invoice', 'receipt', 'contract', 'cv', 'business', 'engineering', 'letter'\]/.test(appSource),
    'templates missing');
  check('notePdfDocOptions state defined',
    /const notePdfDocOptions = \{/.test(appSource), 'doc options missing');
                    check('doc options have template/header/footer/watermark',
    /template: 'report',\r?\n\s*header: true,\r?\n\s*footer: true,\r?\n\s*watermark: \{ on: false/.test(appSource), 'shape missing');
  check('resetNotePdfDocOptions resets watermark',
    /function resetNotePdfDocOptions\(\)/.test(appSource), 'reset missing');
});

// --- Preview UI controls + CSS ---------------------------------------------
test('Phase 09: preview document-options UI + CSS present', () => {
  check('doc toggle button in index', /id="notePdfDocToggleBtn"/.test(htmlSource), 'toggle missing');
  check('doc options panel in index', /id="notePdfDocOptions"/.test(htmlSource), 'panel missing');
  check('template select present', /id="notePdfDocTemplate"/.test(htmlSource), 'template select missing');
  check('header/footer/watermark toggles present',
    /id="notePdfDocHeader"[\s\S]*id="notePdfDocFooter"[\s\S]*id="notePdfDocWmOn"/.test(htmlSource), 'toggles missing');
  check('watermark text input present', /id="notePdfDocWmText"/.test(htmlSource), 'wm input missing');
  check('all 9 templates in options', /value="letter" data-i18n="pdfTplLetter"/.test(htmlSource), 'letter template missing');
  check('doc options CSS present', /\.note-pdf-doc-options \{/.test(cssSource), 'CSS missing');
});

// --- i18n keys present in all 7 languages ----------------------------------
test('Phase 09: document-option i18n keys localised in all 7 languages', () => {
  check('pdfDocOptions in 7 languages', countOf(appSource, 'pdfDocOptions:') === 7, 'got ' + countOf(appSource, 'pdfDocOptions:'));
  ['pdfTplBlank', 'pdfTplReport', 'pdfTplInvoice', 'pdfTplReceipt', 'pdfTplContract', 'pdfTplCv', 'pdfTplBusiness', 'pdfTplEngineering', 'pdfTplLetter'].forEach((k) => {
    check(k + ' x7', countOf(appSource, k + ':') === 7, 'got ' + countOf(appSource, k + ':'));
  });
});

// --- Controls wired + described -------------------------------------------
test('Phase 09: controls refs + wiring exist', () => {
  check('doc toggle ref', /const notePdfDocToggleBtn =/.test(appSource), 'toggle ref missing');
  check('doc template ref', /const notePdfDocTemplate =/.test(appSource), 'template ref missing');
  check('syncNotePdfDocControls defined', /function syncNotePdfDocControls\(\)/.test(appSource), 'sync missing');
  check('refreshNotePdfPreviewDocOptions defined', /function refreshNotePdfPreviewDocOptions\(\)/.test(appSource), 'refresh missing');
  check('regenerates via existing pipeline', /openNotePdfPreview\(\);/.test(appSource), 'regenerate not via existing pipeline');
  check('toggle + change listeners wired', /notePdfDocTemplate\.addEventListener\('change', refreshNotePdfPreviewDocOptions\)/.test(appSource), 'listener missing');
});

// --- Data safety: presentation only, no note mutation -----------------------
test('Phase 09: renderer does not mutate note data', () => {
  const start = appSource.indexOf('const NOTE_PDF_TPL_NAMES');
  const end = appSource.indexOf('function initNotePdfPreviewControls');
  const seg = (start !== -1 && end !== -1 && start < end) ? appSource.slice(start, end) : appSource;
  check('no saveNotesData call', !seg.includes('saveNotesData('), 'calls saveNotesData');
  check('no saveCurrentOpenNote call', !seg.includes('saveCurrentOpenNote('), 'calls saveCurrentOpenNote');
  check('no note.body write', !/note\.body\s*=/.test(seg), 'writes body');
  check('no note.bodyBlocks write', !/note\.bodyBlocks\s*=/.test(seg), 'writes bodyBlocks');
  check('no localStorage usage', !seg.includes('localStorage'), 'touches storage');
});
// --- Applied into the PDF HTML via buildNotePdfHtml (no signature change) ---
test('Phase 09: buildNotePdfHtml applies presentation options (template+wm+footer)', () => {
  check('buildNotePdfHtml signature unchanged (note)', /function buildNotePdfHtml\(note\)/.test(appSource), 'signature changed');
  check('reads notePdfDocOptions from module state',
    /const docOptions = notePdfDocOptions \|\| \{/.test(appSource), 'options not read');
  check('template class emitted', /' eq-pdf-tpl-' \+ tplName/.test(appSource), 'template class missing');
  check('watermark div emitted (escaped)', /'<div class="eq-pdf-watermark"[^]*escapeHtml\(wm\.text\)/.test(appSource), 'watermark not escaped');
  check('professional footer meta emitted', /footerMeta/.test(appSource), 'footer meta missing');
        check('header-note emitted when header enabled', /eq-pdf-header-note/.test(appSource), 'header-note missing');
});

// --- Phase 10: final export fidelity (Notes -> Final PDF, no engine rewrite) ---
test('Phase 10: export fidelity - table wide-fit + multi-page safe', () => {
  // Templates/watermark/header/footer are baked into the exported HTML (Phase 09).
  check('buildNotePdfBlob calls buildNotePdfHtml', /const html = buildNotePdfHtml\(note\);/.test(appSource), 'blob does not use html builder');
  check('html2pdf engine reused (no new library URL)', /loadExternalScript\(PDF_LIB_URL\)/.test(appSource), 'engine changed');
  // Wide tables constrained to printable width so no columns are clipped.
  check('fixed-layout PDF table constrained to page width', /table-layout:fixed; width:100%; max-width:100%;/.test(appSource), 'fixed width missing');
  check('table wrap has max-width:100%', /\.eq-pdf-table-wrap \{[^}]*max-width:100%/.test(appSource), 'table-wrap max-width missing');
  // Oversized single row must not be forced off the page (tall-row escape hatch).
  check('tall-row break escape hatch present', /\.eq-pdf-note-table tbody tr\.tall \{ page-break-inside:auto/.test(appSource), 'tall row rule missing');
  // Body CSS escapes text so Arabic/English/symbols/largenumbers survive.
  check('body uses overflow-wrap:anywhere', /\.eq-pdf-text-block \{[^}]*overflow-wrap:anywhere/.test(appSource), 'nowrap missing');
  check('title uses overflow-wrap:anywhere', /\.eq-note-title \{[^}]*overflow-wrap:anywhere/.test(appSource), 'title nowrap missing');
  // Header/footer/meta are emitted (fidelity + branding preserved).
  check('EQ7 brand in export', /brandTitle = 'EQ7 Calculator'/.test(appSource), 'brand missing');
  check('EQ7 footer note emitted', /footerNote = 'Created with EQ7 Calculator'/.test(appSource), 'footer note missing');
  check('footer date/time/day emitted', /footerMeta/.test(appSource), 'footer meta missing');
  // RTL aware: per-cell dir + title/meta dir from pdfCellDir reused from History.
  check('per-cell dir attr for RTL', /notePdfCellDirAttr\(cell\)/.test(appSource), 'cell dir missing');
});

test('Phase 10: annotation burn-in is a documented limitation (not faked)', () => {
  // Annotations are preview-only; the exported blob is produced from
  // buildNotePdfHtml (note content only) - no annotation compositing into PDF.
  const seg = appSource.slice(appSource.indexOf('function buildNotePdfHtml'), appSource.indexOf('function buildNotePdfHtml') + 2000);
  check('buildNotePdfHtml has no annotation compositing', !/annotation|annoLayer/.test(seg), 'accidental burn-in');
  check('notePdfAnnoState is separate preview state', /notePdfAnnoState = \{ tool: 'edit'/.test(appSource), 'anno state missing');
});

// --- Phase 11 fixes: TDZ reorder, Arabic burn-in, coordinator, cache invalidation ---
function fnBody(src, name) {
  const start = src.indexOf('function ' + name);
  if (start < 0) return '';
  const open = src.indexOf('{', start);
  return open < 0 ? '' : src.slice(open + 1);
}

test('Phase 11: viewport declared before use (TDZ fixed in renderNotePdfPreviewPage)', () => {
  const body = fnBody(appSource, 'renderNotePdfPreviewPage');
  const decl = body.indexOf('const viewport =');
  const use = body.indexOf('notePdfPreviewState.viewport = viewport');
  check('renderNotePdfPreviewPage present', decl !== -1 && use !== -1, 'function missing');
  check('const viewport declared before the assignment that reads it', use > decl && use !== -1, 'TDZ still present');
});

test('Phase 11: burn coordinator exists and blob delegates to it', () => {
  check('notePdfAnnoBurnAnnotations defined (async)', /async function notePdfAnnoBurnAnnotations\(/.test(appSource), 'coordinator missing');
  check('buildFinalNotePdfBlob delegates to coordinator', /return notePdfAnnoBurnAnnotations\(baseBlob\)/.test(appSource), 'blob does not delegate');
  check('no-annotations still returns the base blob (pass-through)', /if \(!notePdfAnnoHasAny\(\)\) return baseBlob/.test(appSource), 'pass-through removed');
});

test('Phase 11: Save / Share / Print all use the final (burned) PDF URL', () => {
  const saveSeg = appSource.slice(appSource.indexOf('function saveNotePdfPreview'), appSource.indexOf('function printNotePdfPreview'));
  const printSeg = appSource.slice(appSource.indexOf('function printNotePdfPreview'), appSource.indexOf('function shareNotePdfPreview'));
  const shareSeg = appSource.slice(appSource.indexOf('function shareNotePdfPreview'), appSource.indexOf('notePdfAnnoHasAny'));
  check('save uses final URL', saveSeg.includes('notePdfFinalPreviewUrl()'), 'save final missing');
  check('print uses final URL', printSeg.includes('notePdfFinalPreviewUrl()'), 'print final missing');
  check('share uses final URL', shareSeg.includes('notePdfFinalPreviewUrl()'), 'share final missing');
});

test('Phase 11: Arabic/mixed annotation text is NOT silently dropped', () => {
  const seg = appSource.slice(appSource.indexOf('function notePdfAnnoBurnText'), appSource.indexOf('function notePdfAnnoBurnText') + 3000);
  check('notePdfAnnoBurnText helper defined', /function notePdfAnnoBurnText/.test(appSource), 'helper missing');
  check('no silent non-Latin return-drop guard', !seg.includes('u00FF]*$.test(text)) return;'), 'Arabic still dropped');
  check('canvas text shaping used (fillText)', /\.fillText\(/.test(seg), 'no canvas text path');
  check('RTL direction respected', /ctx\.direction/.test(seg), 'no rtl direction');
  check('raster embedded via pdf-lib embedPng', /embedPng\(/.test(seg), 'no embedPng');
  check('burned image placed with drawImage', /drawImage\(/.test(seg), 'no image placement');
});

test('Phase 11: clear invalidates the cached final blob (no stale annotations)', () => {
  const seg = appSource.slice(appSource.indexOf('function clearNotePdfAnnotations'), appSource.indexOf('function resetNotePdfAnnotations'));
  check('clear nulls finalUrl', /finalUrl = null/.test(seg), 'finalUrl not invalidated');
  check('clear nulls finalKey', /finalKey = null/.test(seg), 'finalKey not invalidated');
});
//