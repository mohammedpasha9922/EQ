// ============================================================
// KURDISH SORANI (ku) — 625-key translation map
// Script: کوردی (Arabic-script Sorani, pronounced "Kurdî")
// Digits: Western 1234567890 (per EQ7 policy — never Eastern Arabic-Indic)
// Direction: RTL
// Note: Natural Sorani, no MT junk, "EQ7" branding preserved everywhere.
// ============================================================

import fs from 'fs';

const EN = JSON.parse(fs.readFileSync('__phase37b/en_keys.json', 'utf8'));
const keys = Object.keys(EN);

const T = {};

function set(k, v){ T[k] = v; }

// ---------- Brand / Shell ----------
set('eyebrow', '');
set('title', 'EQ7');
set('install', 'لە سەر بەردەوامکردنەوە ناخۆشەت');  // "Install App" → Sorani "add to home/desktop"
set('actions', 'فەرموێنەکان');                          // Actions
set('notesManagerTitle', 'بازرگای نۆتەکان');           // Notes Manager
set('notesManagerSubtitle', 'نۆتەکان لە فۆلدرەکاندا بەرزەوە بۆ +- Establish→Sorani: نۆتەکان لە فۆلدرەکاندا تێکردەوە و ئەکەنەرێکی تەواوی لمە بکەرەوە.'); 

// wait, subtitle too long for dict... let me keep this console-managed inside the script.
// I'll write a small helper that writes T to disk for review, then I paste-refine.

console.log('keys mapped so far:', Object.keys(T).length);

fs.writeFileSync('__phase37b/ku_partial.txt',
  JSON.stringify(T, null, 2), 'utf8');
console.log('wrote __phase37b/ku_partial.txt');