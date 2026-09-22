// SMART DOCUMENTS — CLEAN RESET transform (this phase only).
const fs = require('fs');
const raw = fs.readFileSync('app.js', 'utf8');
const CRLF = raw.includes('\r\n');
const src = raw.split(/\r?\n/);
let lines = src;
let off = 0;
let s, e;

function seamStubText() {
  return [
    '// ============================================================',
    '// SMART DOCUMENTS — CLEAN RESET',
    '// The previous Smart Documents tools (scan/OCR, PDF import + in-place',
    '// PDF editor, blank document editor, tables/images/logo/signature tools,',
    '// templates, drafts storage, review and PDF export) were removed in the',
    '// Smart Documents clean-reset phase. The existing entry point',
    '// (#smartDocsModal) is KEPT and opens an EMPTY workspace. The seams below',
    '// remain as no-op hooks so the History bridge (PART 35) and any remaining',
    '// callers keep working without errors.',
    '// ============================================================',
    'let smartDocsStep = 1; // single empty stage after the reset',
    '',
    'function smartDocStepsReached() { /* stepper UI removed with the reset */ }',
    '',
    'function setSmartDocsStep(rawStep) {',
    '  smartDocsStep = Math.min(4, Math.max(1, parseInt(rawStep, 10) || 1));',
    '  return smartDocsStep;',
    '}',
    '',
    'function renderSmartDocsSteps() { /* no stepper UI after the reset */ }',
    '',
    '// No-op hook kept for behavioral tests / future phases.',
    'window.__smartDocsWorkflow = {',
    '  setStep: (n) => setSmartDocsStep(n),',
    '  getStep: () => smartDocsStep,',
    '  render: () => renderSmartDocsSteps()',
    '};',
    '',
    '// Scan seam reduced to a stable no-op surface (nothing to scan anymore).',
    'window.__smartScan = {',
    "  getState: () => ({ stage: 'home', step: smartDocsStep, result: null, recognized: null, inkRatio: 0, structure: null, activeTracks: [], cameraMode: 'auto' }),",
    '  open: () => { openSmartDocs(); },',
    '  setOcrResult: () => {},',
    '  clearOcrResult: () => {},',
    '  analyzeStructure: () => null,',
    '  debugMode: () => {},',
    '  reset: () => {},',
    '  stopCamera: () => {},',
    '  activeTracks: () => [],',
    '  isStreamStopped: () => true',
    '};',
    '',
    '// PART 35 (History bridge) targets — the bridge still works: it opens the',
    '// empty Smart Documents workspace; there is no content surface after the',
    '// reset, so the snapshot copy step resolves to null and stops cleanly.',
    'function smartBlankOpen() { openSmartDocs(); }',
    'function smartActivePageContent() { return null; }'
  ].join('\n');
}

function openCloseText() {
  return [
    'function openSmartDocs() {',
    '  if (smartDocsModal) {',
    "    smartDocsModal.classList.add('show');",
    "    smartDocsModal.setAttribute('aria-hidden', 'false');",
    "    document.body.classList.add('modal-open');",
    '  }',
    '  // The workspace always opens on its single empty stage after the reset.',
    '  setSmartDocsStep(1);',
    '}',
    '',
    'function closeSmartDocs() {',
    '  if (smartDocsModal) {',
    "    smartDocsModal.classList.remove('show');",
    "    smartDocsModal.setAttribute('aria-hidden', 'true');",
    "    if (document.body.classList.contains('modal-open') &&",
    '        !(notesManagerModal && notesManagerModal.classList.contains(\'show\'))) {',
    "      document.body.classList.remove('modal-open');",
    '    }',
    '  }',
    '}'
  ].join('\n');
}

function wiringText() {
  return [
    '  // Smart Documents — CLEAN RESET: only the close/back entry remains.',
    '  if (closeSmartDocsButton) {',
    "    closeSmartDocsButton.addEventListener('click', closeSmartDocs);",
    '  }',
    '  if (smartDocsModal) {',
    "    smartDocsModal.addEventListener('click', (e) => {",
    '      if (e.target === smartDocsModal) closeSmartDocs();',
    '    });',
    "    smartDocsModal.addEventListener('keydown', (e) => {",
    "      if (e.key === 'Escape') { e.preventDefault(); closeSmartDocs(); }",
    '    });',
    '  }'
  ].join('\n');
}

// All cuts below run in DESCENDING original-line order. `off` accumulates the
// net line delta of every already-applied (higher) cut, so each cut maps its
// original 1-based range onto the current buffer with `orig + off`.

// 6) smart PDF-pages tail (orig 23822-24291, 2470 lines) — removed entirely.
s = 23822 + off; e = 24291 + off;
if (!/PART 25/.test(lines[s + 1]) || lines[s - 1].trim() !== '') {
  console.error('Tail boundary check failed:', JSON.stringify(lines[s - 1]), JSON.stringify(lines[s]));
  process.exit(1);
}
lines = lines.slice(0, s - 1);
/* descending cuts never shift lower ranges */

// 5) wiring block inside wireEvents (orig 22010-22471) -> minimal close wiring
const W = wiringText();
s = 22010 + off; e = 22471 + off;
if (!/Smart Documents home/.test(lines[s - 1]) || lines[e - 1] !== '  }' || !/templatesViewEl/.test(lines[e - 11])) {
  console.error('Wiring boundary check failed:', JSON.stringify(lines[s - 1]), '<->', JSON.stringify(lines[e - 1]));
  process.exit(1);
}
lines = lines.slice(0, s - 1).concat(W.split('\n'), lines.slice(e));
/* no shift for lower ranges */

// 4) smart mega-block (orig 7543-15846) — removed entirely.
s = 7543 + off; e = 15846 + off;
if (!/^\/\/ =+$/.test(lines[s - 1]) || lines[e - 1].trim() !== '') {
  console.error('Mega-block boundary check failed:', JSON.stringify(lines[s - 1]), '<->', JSON.stringify(lines[e - 1]));
  process.exit(1);
}
lines = lines.slice(0, s - 1).concat(lines.slice(e));
/* no shift for lower ranges */

// 3) open/close (orig 6910-6941) -> simplified entry point
const OC = openCloseText();
s = 6910 + off; e = 6941 + off;
if (!/^function openSmartDocs/.test(lines[s - 1]) || !/^}/.test(lines[e - 1])) {
  console.error('Open/Close boundary check failed:', JSON.stringify(lines[s - 1]), '<->', JSON.stringify(lines[e - 1]));
  process.exit(1);
}
lines = lines.slice(0, s - 1).concat(OC.split('\n'), lines.slice(e));
/* no shift for lower ranges */

// 2) workflow seam + smartScan seam (orig 6720-6782) -> no-op stubs
const SEAM = seamStubText();
s = 6720 + off; e = 6781 + off;
if (!/^function smartDocStepsReached/.test(lines[s - 1]) || !/^};$/.test(lines[e - 1])) {
  console.error('Seam boundary check failed:', JSON.stringify(lines[s - 1]), '<->', JSON.stringify(lines[e - 1]));
  process.exit(1);
}
lines = lines.slice(0, s - 1).concat(SEAM.split('\n'), lines.slice(e));
/* no shift for lower ranges */

// 1) state fields (PART 3/5/6/7 smart state) — orig 4628-4635
s = 4628 + off; e = 4635 + off;
if (!/PART 3 — Smart Documents workflow stage/.test(lines[s - 1]) || !/smartSelectedTemplate/.test(lines[e - 1])) {
  console.error('State boundary check failed:', JSON.stringify(lines[s - 1]), '<->', JSON.stringify(lines[e - 1]));
  process.exit(1);
}
lines = lines.slice(0, s - 1).concat(lines.slice(e));

fs.writeFileSync('app.js', lines.join(CRLF ? '\r\n' : '\n'));
console.log('OK — app.js now', lines.length, 'lines (was', src.length + ')');
