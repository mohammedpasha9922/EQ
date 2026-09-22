import { readFileSync, writeFileSync } from 'node:fs';
const path = new URL('./ku_data.mjs', import.meta.url);
let src = readFileSync(path, 'utf8');

const missing = {
  smartTemplatesPaymentReceipt: "وەسڵی پارەدان",
  smartTemplatesRentalAgreement: "ڕێکەوتنامەی کرێ",
  smartTemplatesMyTemplates: "قاڵبەکانی من",
  smartTemplatesSimpleAgreement: "ڕێکەوتنامەی ئاسان",
  smartScanTitle: "📸 سکانکردنی بەڵگە",
  smartScanCapture: "گرتن",
  smartScanUploadFallback: "لەجیاتی ئەوە وێنەیەک لە ئامێرەکەت هەڵبژێرە",
  smartScanDetecting: "دۆزینەوەی بەڵگە",
  smartScanCorrecting: "ڕاستکردنەوەی وێنە",
  smartScanImproving: "باشترکردنی وێنە",
  smartScanReading: "خوێندنەوەی دەق",
  smartScanProcessing: "پرۆسێسکردن...",
  smartScanReviewTitle: "پێداچوونەوەی ئەنجامی ناسینەوە",
  smartScanPreviewLabel: "بەڵگەی پرۆسێسکراو",
  smartUntitledDoc: "بەڵگەی بێ ناونیشان",
  smartBlankNavOf: "لە",
  smartPdfSave: "پاشەکەوتکردنی PDF",
  currencyRatesError: "نرخەکان بەردەست نین",
  folderDeleteConfirmText: "تێبینییەکانی ناو ئەم فۆڵدەرە دەگوازرێنەوە بۆ بەشی بێ فۆڵدەر و دەپارێزرێن."
};

// Remove spurious keys (not part of the reference set)
const spurious = ["smartScanCamera", "smartScanBrowse", "smartScanFiles", "smartScanChooseFile"];
for (const k of spurious) {
  src = src.replace(new RegExp(`^\\s*"${k}": "[^"]*",?\\r?\\n`, 'm'), '');
}

// Update smartScanTitle in place (add the 📸 emoji that matches the English source)
src = src.replace('"smartScanTitle": "سکانکردنی بەڵگە"', '"smartScanTitle": "📸 سکانکردنی بەڵگە"');

// Insert missing keys (in en_keys.json order) before the final "};" (smartScanTitle already present)
const EN = JSON.parse(readFileSync(new URL('../__phase37b/en_keys.json', import.meta.url), 'utf8'));
const order = Object.keys(EN);
const insertDict = { ...missing };
delete insertDict.smartScanTitle;
const sorted = order.filter((k) => insertDict[k]);
const lines = sorted.map((k) => `  "${k}": "${missing[k].replace(/"/g, '\\"')}"`);
let block = lines.slice(0, -1).map((l) => l + ',').concat(lines.slice(-1)).join('\n');
src = src.replace(/\n};(\s*)$/m, '\n' + block + '\n};$1');

writeFileSync(path, src, 'utf8');
console.log('Inserted missing keys:', Object.keys(missing).length);
console.log('Removed spurious keys:', spurious.join(', '));
