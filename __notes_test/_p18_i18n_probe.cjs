const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
const lines = s.split('\n');
// Find all language block boundaries: each dict starts with e.g. "if (state.locale === 'en') {" or similar
// The English dict is the base. Each key we care about should appear once per language block.
const keys = ['smartScanStatusEdited','smartScanAccepted','smartScanEditTitle','smartScanEditDocTitlePh','smartScanCreatePdf','smartScanPdfCreating','smartScanPdfCreated','smartScanOfflinePdf','smartScanPdfFailed','smartScanReviewNote','smartScanStatusNeeds','smartScanEditHint','smartScanStructHeading','smartScanStructParagraph','smartScanStructTable','smartScanStructNumber','smartScanStructDate','smartScanStructField'];
// Just report line numbers + the locale context for each key occurrence
keys.forEach(k => {
  lines.forEach((l, i) => {
    if (l.includes(k + ':')) {
      console.log('L' + (i+1) + ': ' + l.trim().slice(0, 120));
    }
  });
});
