// Scan for PART 22 i18n keys across all language blocks
const fs = require('fs');
const src = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');

// Find all i18n keys we need to add
const NEW_KEYS = [
  'pdfAddTitle',
  'pdfAddText',
  'pdfAddImage',
  'pdfAddLogo',
  'pdfAddSignature',
  'pdfAddStamp',
  'pdfAddDate',
  'pdfAddTable',
];

// Find the language block boundaries by looking for locale markers
// Strategy: find "en:" block start, then track each language block
const lines = src.split('\n');
const blocks = [];
let currentBlock = null;
let currentLabel = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Look for locale markers - these are the i18n dict blocks
  // Patterns like: en: {  or  'en': {  or  en:{  etc.
  const localeMatch = line.match(/^(\s*)([a-zA-Z]{2,3})\s*:\s*\{/);
  if (localeMatch && line.includes('Title:') && !line.includes('smart')) {
    // This might be a locale block
  }
  // Look for the actual i18n object pattern
}

// Better approach: find all occurrences of each key
const keyOccurrences = {};
for (const key of [...NEW_KEYS, 'smartImportTitle']) {
  const regex = new RegExp(`(${key}:)`, 'g');
  const matches = [...src.matchAll(regex)];
  keyOccurrences[key] = matches.map(m => m.index);
}

// Count total occurrences of each key
for (const key of NEW_KEYS) {
  const regex = new RegExp(`\\b${key}:`, 'g');
  const count = (src.match(regex) || []).length;
  console.log(`${key}: ${count} occurrence(s)`);
}

console.log('\n--- smartImportTitle occurrences (should be ~7) ---');
const sitRegex = /\bsmartImportTitle:/g;
const sitCount = (src.match(sitRegex) || []).length;
console.log(`smartImportTitle: ${sitCount} occurrence(s)`);

// Find line numbers of smartImportTitle
const smartImportTitleLines = [];
lines.forEach((line, idx) => {
  if (line.includes('smartImportTitle:')) {
    smartImportTitleLines.push({line: idx+1, content: line.trim().substring(0, 80)});
  }
});
console.log('\n--- smartImportTitle at lines ---');
smartImportTitleLines.forEach(l => console.log(`  L${l.line}: ${l.content}`));
