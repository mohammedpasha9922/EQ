// PHASE 37E — generate a PRE-FIX control copy of app.js (only the TTS edit reverted).
import fs from 'node:fs';
const src = fs.readFileSync('app.js', 'utf8');
const ternary = "utterance.lang = state.locale === 'ar' ? 'ar-SA' : state.locale === 'es' ? 'es-ES' : state.locale === 'fr' ? 'fr-FR' : state.locale === 'ru' ? 'ru-RU' : state.locale === 'de' ? 'de-DE' : state.locale === 'tr' ? 'tr-TR' : 'en-US';";
const out = src
  .replace(/ {4}applySpeechLocale\(utterance, state\.locale\);\r?\n/g, `    ${ternary}\n`)
  .replace(/\/\/ ============================================================\r?\n\/\/ PHASE 37E[\s\S]*?let speechActive = false;\r?\n/, 'let speechActive = false;\n');
fs.writeFileSync('__phase37e/app_prefix.js', out);
console.log('control generated. occurrences of applySpeechLocale left:', (out.match(/applySpeechLocale/g) || []).length);
console.log('ternary restorations:', (out.match(/utterance\.lang = state\.locale === 'ar'/g) || []).length);
