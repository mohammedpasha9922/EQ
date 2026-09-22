import fs from 'node:fs';
const a = fs.readFileSync('app.js', 'utf8');
const h = fs.readFileSync('index.html', 'utf8');
let fail = 0;
const chk = (n, ok, d = '') => { console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  -> ' + d : '')); if (!ok) fail++; };

// Locate the Phase 3 section
const p3Start = a.indexOf('PDF V1 — Phase 3: EXPORT ONLY');
const p3End = a.indexOf('PART 4 — SMART SCAN');
const p3 = p3Start >= 0 && p3End > p3Start ? a.slice(p3Start, p3End) : '';
chk('Phase 3 section exists in app.js', p3.length > 500);

// 1. Export button exists exactly once inside the existing workspace tools
chk('export button exists once', (h.match(/id="pdfV1ExportBtn"/g) || []).length === 1);
chk('export button inside pdfV1Tools row', h.indexOf('id="pdfV1Tools"') < h.indexOf('id="pdfV1ExportBtn"') && h.indexOf('id="pdfV1ExportBtn"') < h.indexOf('id="pdfV1Stage"'));
chk('export wired once', (p3.match(/function pdfV1ExportWire/g) || []).length === 1 && (p3.match(/addEventListener\('click'/g) || []).length === 1);

// 2-7. Overlay merge: images + text via pdf-lib embeds, page loop
chk('uses existing pdf-lib loader (no new dependency)', p3.includes('smartImportLoadPdfLib'));
chk('loads original PDF bytes only once', (p3.match(/arrayBuffer\(\)/g) || []).length === 1 && p3.includes('PDFDocument.load'));
chk('embeds PNG overlays (stamp/drawn/uploaded signatures)', p3.includes('embedPng'));
chk('embeds JPG uploads', p3.includes('embedJpg'));
chk('text/date rendered as small item canvas', p3.includes('pdfV1ExportTextToPng') && p3.includes("toDataURL('image/png')"));

// 8-9. Page isolation
chk('per-page overlay lookup only', p3.includes("pdfV1P2Items[String(p)]"));
chk('pages without overlays are skipped untouched', p3.includes('if (!items.length) continue;'));

// 10-11. Page size preserved
chk('uses original page size (no fixed A4)', p3.includes('page.getSize()') && p3.includes('pw') && p3.includes('ph') && !p3.includes("'a4'") && !p3.includes('A4'));
chk('y-axis flipped to PDF origin', p3.includes('ph - it.y * ph - bh'));

// 12-13. No giant canvas; sequential page loop
chk('no giant document canvas', !p3.includes('pdfV1Viewer') && !/canvas[\s\S]{0,40}numPages/.test(p3) && (p3.match(/createElement\('canvas'\)/g) || []).length === 1);
chk('strict sequential for-loop over pages', /for \(let p = 1; p <= n; p\+\+\)/.test(p3));
chk('text canvas size capped', p3.includes('2200'));

// 14. Memory cleanup
chk('temporary canvas released', p3.includes('pdfV1ExportReleaseCanvas') && p3.includes('c.width = 0'));
chk('no array accumulating rendered page images', !p3.includes('push(page') && !p3.includes('pages.push'));

// 15. Error handling + progress + re-entry guard
chk('error shown in workspace, button restored', p3.includes('Export failed. Please try again.') && p3.includes('finally') && p3.includes('btn.disabled = false'));
chk('progress label per page', p3.includes('Exporting ') && p3.includes('/ '));
chk('re-entry guard', p3.includes('pdfV1ExportBusy'));

// 16-17. Download naming; Phase 1/2 untouched markers
chk('download name preserves original name', p3.includes("-edited.pdf") && p3.includes("pdfV1P2File.name"));
chk('Phase 1 import code still present', a.includes('function pdfV1WireImport') && a.includes('pdfV1IsPdfFile') && a.includes('URL.createObjectURL(file)'));
chk('Phase 2 overlay code still present', a.includes('function pdfV1P2Render') && a.includes('function pdfV1P2AddImg') && a.includes('function pdfV1P2AddDate') && a.includes('pdfV1P2AfterOpen(file)'));

// 18. Scope protection: no touches of unrelated features
chk('no smartDocs/export engine edits', !/pdfV1Export[\s\S]*smartDocsModal/.test(p3) && (a.match(/function openSmartDocs/g) || []).length === 1);
chk('no forbidden Phase3 features (share/print/ocr/server/cloud)', !/(whatsapp|telegram|mailto|supabase|stripe|firebase|XMLHttpRequest|fetch\('http)/.test(p3));

console.log(fail === 0 ? 'PHASE3 STATIC ALL PASS' : 'PHASE3 FAILURES: ' + fail);
process.exit(fail === 0 ? 0 : 1);
