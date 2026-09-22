import fs from 'node:fs';
const a = fs.readFileSync('app.js', 'utf8');
let fail = 0;
const chk = (n, ok, d = '') => { console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  -> ' + d : '')); if (!ok) fail++; };

// Locate the Phase 3/4 PDF V1 section (Phase 4 lives inside the same block)
const start = a.indexOf('PDF V1 — Phase 3: EXPORT ONLY');
const end = a.indexOf('PART 4 — SMART SCAN');
const sec = start >= 0 && end > start ? a.slice(start, end) : '';
chk('PDF V1 export section exists', sec.length > 500);

// 1. Share helper exists once and uses Web Share API with FILES only
chk('share helper defined once', (sec.match(/function pdfV1ExportTryShare/g) || []).length === 1);
chk('checks navigator.share', sec.includes('navigator.share'));
chk('checks navigator.canShare', sec.includes('navigator.canShare'));
chk('canShare called with files array', /canShare\(\{ files: \[pdfFile\] \}\)/.test(sec));
chk('share called with files (not url/text)', /navigator\.share\(\{ files: \[pdfFile\], title: filename \}\)/.test(sec) && !/share\(\{[\s\S]{0,80}(url:|text:)/.test(sec));
chk('File built as application/pdf', /new File\(\[blob\], filename, \{ type: 'application\/pdf' \}\)/.test(sec));

// 2. Share uses the SAME Phase 3 output blob (no re-generation)
chk('share receives the saved pdf blob', /await pdfV1ExportTryShare\(blob, filename\)/.test(sec));
chk('no second pdf generation in finalize', (sec.match(/pdf\.save\(\)/g) || []).length === 1 && (sec.match(/new Blob\(\[out\]/g) || []).length === 1);

// 3. Download fallback reuses the same blob and the same naming
chk('download fallback defined once', (sec.match(/function pdfV1ExportDownload/g) || []).length === 1);
chk('fallback triggered only when share unsupported/failed', /if \(!shared\) pdfV1ExportDownload\(blob, filename\)/.test(sec));
chk('same -edited.pdf naming preserved', sec.includes("-edited.pdf") && sec.includes("pdfV1P2File.name"));
chk('no Share+Download double delivery', !/pdfV1ExportTryShare[\s\S]{0,400}pdfV1ExportDownload[\s\S]{0,60}pdfV1ExportDownload/.test(sec));

// 4. Cancellation handling: AbortError is not an error and not a download
chk('AbortError / NotAllowedError treated as cancelled', sec.includes("e.name === 'AbortError'") && sec.includes("e.name === 'NotAllowedError'"));
chk('cancelled path returns without forced download', /if \(e && \(e\.name === 'AbortError' \|\| e\.name === 'NotAllowedError'\)\) return true;/.test(sec));

// 5. Real share failure shows in-workspace error, button restored by existing finally
chk('unexpected share failure shows in-workspace error', sec.includes('Sharing failed. Downloading instead.'));
chk('workspace error element still used', sec.includes('pdfV1ShowError'));

// 6. No new share/download UI, no custom sheet, no app integrations
chk('no new PDF button in HTML', (fs.readFileSync('index.html', 'utf8').match(/id="pdfV1ExportBtn"/g) || []).length === 1 && !/id="pdfV1ShareBtn"/.test(fs.readFileSync('index.html', 'utf8')));
chk('no forbidden integrations in section', !/(whatsapp|telegram|mailto|supabase|stripe|firebase|XMLHttpRequest|fetch\('http|window\.open)/.test(sec));

console.log(fail === 0 ? 'PHASE4 STATIC ALL PASS' : 'PHASE4 FAILURES: ' + fail);
process.exit(fail === 0 ? 0 : 1);
