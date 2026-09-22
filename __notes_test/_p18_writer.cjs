const fs = require('fs');
const src = 'd:/Programs EQ7/EQ/app.js';
const dst = 'd:/Programs EQ7/EQ/__notes_test/p18_final_run.mjs';
fs.copyFileSync(src, dst);
const t = fs.readFileSync(dst, 'utf8');
// quick feature scan
const feats = {
  smartScanOpen: /smartScanOpen/.test(t),
  companyProfile: /companyProfileModal/.test(t),
  pdfScanCreate: /pdfScanCreateCard/.test(t),
  pdfReportsWorkspace: /pdfReportsWorkspace/.test(t),
  eqLanguage: /switchLanguage|EQ7_I18N/.test(t)
};
console.log('APP_SYNTAX_OK len=' + t.length);
console.log('FEATURES=' + JSON.stringify(feats));
