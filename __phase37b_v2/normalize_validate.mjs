// PHASE 37B — normalize + validate the Kurdish dataset before any production use.
// Normalizes: Eastern Arabic-Indic/Arabic-Persian digits -> Western digits (EQ7 digit
// policy), fixes a couple of wording slips, then validates the full key set.
import { ku } from './ku_data.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

let src = readFileSync(new URL('./ku_data.mjs', import.meta.url), 'utf8');

// --- Normalize digits to Western (1234567890) ---
const digitMap = {
  '\u0660': '0', '\u06F0': '0',
  '\u0661': '1', '\u06F1': '1',
  '\u0662': '2', '\u06F2': '2',
  '\u0663': '3', '\u06F3': '3',
  '\u0664': '4', '\u06F4': '4',
  '\u0665': '5', '\u06F5': '5',
  '\u0666': '6', '\u06F6': '6',
  '\u0667': '7', '\u06F7': '7',
  '\u0668': '8', '\u06F8': '8',
  '\u0669': '9', '\u06F9': '9',
  '\u066B': '.', '\u0640': '-', '\u066C': ','
};
// '\u0660'..'\u0669' are Arabic-Indic, '\u06F0'..'\u06F9' are Extended Arabic-Indic (Farsi).
const digitRe = /[\u0660-\u0669\u06F0-\u06F9\u066B\u066C]/g;
let changed = 0;
let out = src.replace(digitRe, (ch) => { changed++; return digitMap[ch] ?? ch; });

// --- Fix wording slips ---
// نەتوانرا PDF آمادە بکەین -> ئامادە
out = out.replace("نەتوانرا PDF آمادە بکەین", "نەتوانرا PDF ئامادە بکەین");
// helpInstallDesc1 wording
out = out.replace(
  "دەتوانیت EQ7 لەسەر ئامێرە پشتگیرکراوەکان وەک بەرنامەیەک دامەزبەیت.",
  "دەتوانیت EQ7 وەک بەرنامەیەک لەسەر ئامێرە پشتگیرکراوەکاندا دامەزەری."
);

writeFileSync(new URL('./ku_data.mjs', import.meta.url), out, 'utf8');
console.log('Digit chars normalized:', changed);

// --- VALIDATION against English reference ---
const EN = JSON.parse(readFileSync(new URL('../__phase37b/en_keys.json', import.meta.url), 'utf8'));
const enKeys = Object.keys(EN);

const kuKeys = Object.keys(ku);
const kuSet = new Set(kuKeys);

// 1) duplicates in the JS source (duplicate object keys)
const seen = new Set(); const dups = [];
for (const k of kuKeys) { if (seen.has(k)) dups.push(k); seen.add(k); }

// 2) missing vs reference
const missing = enKeys.filter((k) => !kuSet.has(k));
// 3) extra keys (allowed: languageKurdish only)
const extras = kuKeys.filter((k) => !EN.hasOwnProperty(k));

// 4) empty / undefined / placeholder checks
const empty = [];
const englishPlaceholders = [];
const cjk = [];
const latinMixed = [];
// Keys whose value is legitimately non-Kurdish (brand / technical acronym / native name)
// or intentionally empty in the source (decorative eyebrow labels).
const whitelist = new Set([
  'title', 'drawerTitle', 'drawerPdf', 'pdfWorkspaceTitle',
  'smartTextDirLtr', 'smartTextDirRtl',
  'eyebrow', 'drawerEyebrow'
]);
for (const k of kuKeys) {
  if (k.startsWith('language')) continue; // native language names in their own script
  const v = ku[k];
  if (v === undefined || v === null) { empty.push(k); continue; }
  const s = String(v);
  if (s.trim() === '') { if (whitelist.has(k)) continue; empty.push(k); continue; }
  if (whitelist.has(k)) continue;
  // English placeholder check: value still entirely Latin words
  if (/^[A-Za-z][A-Za-z0-9 ,.!?&'()-]*$/.test(s.trim())) englishPlaceholders.push(k + ' => ' + s);
  // CJK detection
  if (/[\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/.test(s)) cjk.push(k + ' => ' + s);
}

// 5) interpolation token preservation: English contains {n} only for the relative/days keys
const tokenKeys = ['smartRelMins','smartRelHours','smartRelDays','updatedDaysAgo'];
let tokenBad = [];
for (const k of tokenKeys) {
  if (!kuSet.has(k)) { tokenBad.push(k + ' (missing)'); continue; }
  if (!String(ku[k]).includes('{n}')) tokenBad.push(k + ' (token lost)');
}

// 6) JavaScript validity (turn the object into an evaluable literal)
let jsValid = true, jsErr = '';
try { new Function('return (' + out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1) + ');'); } catch (e) { jsValid = false; jsErr = String(e); }

// 7) malformed keys (not camelCase / containing invalid chars)
const malformed = kuKeys.filter((k) => !/^[A-Za-z][A-Za-z0-9]*$/.test(k));

console.log('\n=== VALIDATION REPORT ===');
console.log('Reference (en) keys:', enKeys.length);
console.log('Kurdish keys:', kuKeys.length);
console.log('Duplicates:', dups.length ? dups.join(', ') : 0);
console.log('Missing:', missing.length ? missing.join(', ') : 0);
console.log('Extras:', extras.length ? extras.join(', ') : 0);
console.log('Empty/undefined:', empty.length ? empty.join(', ') : 0);
console.log('English placeholders:', englishPlaceholders.length ? englishPlaceholders.join(' | ') : 0);
console.log('CJK chars:', cjk.length ? cjk.join(' | ') : 0);
console.log('Interpolation token issues:', tokenBad.length ? tokenBad.join(', ') : 0);
console.log('Malformed keys:', malformed.length ? malformed.join(', ') : 0);
console.log('JS valid:', jsValid, jsErr || '');

const pass = enKeys.length === 625 && kuSet.size === kuKeys.length && dups.length === 0 &&
  missing.length === 0 && empty.length === 0 && englishPlaceholders.length === 0 &&
  cjk.length === 0 && tokenBad.length === 0 && malformed.length === 0 && jsValid;
console.log('\nOVERALL:', pass ? 'PASS' : 'FAIL');