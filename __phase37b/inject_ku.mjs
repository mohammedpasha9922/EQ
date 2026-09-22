// PHASE 37B: Inject Kurdish Sorani (ku) locale into app.js + app_fixed.js
// Also patches RTL gates, CSS, and language selector in index.html

const fs = require('fs');
const path = require('path');

// ============================================================
// 1. KURDISH SORANI TRANSLATIONS (625 keys)
// ============================================================
// Load English source of truth
const EN = JSON.parse(fs.readFileSync('__phase37b/en_keys.json', 'utf8'));

// Build Kurdish translations
const Ku = {};

// Helper: escape single quotes for JS string literal
function sq(s) { return "'" + String(s).replace(/'/g, "\\'") + "'"; }

// --- BRAND / SHELL ---
Ku.eyebrow = '';
Ku.title = 'EQ7';
Ku.install = 'لە سەر بەرنامەدا تێپەڕەوە';   // Install App
Ku.actions = 'فەرموێنەکان';                    // Actions

// --- NOTES MANAGER ---
Ku.notesManagerTitle = 'بازرگای نۆتەکان';
Ku.notesManagerSubtitle = 'نۆتەکان لە فۆلدرەکاندا بەرزەوە و ئەکەنەرێکی تەواوی لمە بکەرەوە.';
Ku.foldersTitle = 'فۆلدرەکان';
Ku.addFolder = '+ فۆلدر';
Ku.newNoteButton = 'نۆتەی تەواوی لمە';
Ku.notesTitle = 'نۆتەکان';
Ku.refreshNotes = 'تازەکردەوە';
Ku.fullScreenNoteTitle = 'نۆتەی تەواوی لمە';
Ku.noteFolderLabel = 'فۆلدر';
Ku.noteTitleLabel = 'ناونیشان';
Ku.noteTitlePlaceholder = 'ناونیشانی نۆتە';
Ku.folderSelectLabel = 'فۆلدر';
Ku.noteBodyPlaceholder = 'دەستبە نووسینیت...';
Ku.noteTableInsertPopupTitle = 'خۆشی خشتە چاپ بکە';
Ku.noteHeadingMenuLabel = 'غرێب';
Ku.noteHeading1Label = 'غرێب ١';
Ku.noteHeading2Label = 'غرێب ٢';
Ku.noteHeading3Label = 'غرێب ٣';
Ku.noteNormalTextLabel = 'دەقێکی ئاسایی';
Ku.noteTableRowsLabel = 'ڕێژەکان';
Ku.noteTableColsLabel = 'ستۆکان';
Ku.noteTableHeaderRowLabel = 'ڕێژەی سەرەکی سیڕی';
Ku.noteTableInsertBtnLabel = 'خۆشی خشتە چاپ بکە';
Ku.noteImageLabel = 'وێنە';
Ku.noteImageUpload = 'دامەزراندن';
Ku.noteImageCamera = 'کەمێرە';

fs.writeFileSync('__phase37b/ku_partial.txt', JSON.stringify(Ku, null, 2), 'utf8');
console.log('Phase 1: Written', Object.keys(Ku).length, 'keys to ku_partial.txt');
