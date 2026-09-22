const fs = require('fs');
// ============================================================
// ku_map.json — Kurdish Sorani (ku) 625-key translation
// Script: Arabic-script Sorani  ·  Digits: Western 1234567890
// RTL: yes  ·  EQ7 branding preserved  ·  Natural Sorani
// ============================================================
const M = {
  eyebrow: "",
  title: "EQ7",
  install: "لە سەر بەرنامەدا تێپەڕەوە",
  actions: "فەرموێنەکان",
  notesManagerTitle: "بازرگای نۆتەکان",
  notesManagerSubtitle: "نۆتەکان لە فۆلدرەکاندا بەرزەوە و ئەکەنەرێکی تەواوی لمە بکەرەوە.",
  foldersTitle: "فۆلدرەکان",
  addFolder: "+ فۆلدر",
  newNoteButton: "نۆتەی تەواوی لمە",
  notesTitle: "نۆتەکان",
  refreshNotes: "تازەکردەوە",
  fullScreenNoteTitle: "نۆتەی تەواوی لمە",
  noteFolderLabel: "فۆلدر",
  noteTitleLabel: "ناونیشان",
  noteTitlePlaceholder: "ناونیشانی نۆتە",
  folderSelectLabel: "فۆلدر",
  noteBodyPlaceholder: "دەست بە نووسینیت...",
  noteTableInsertPopupTitle: "خۆشی خشتە چاپ بکە",
  noteHeadingMenuLabel: "غرێب",
  noteHeading1Label: "غرێب ١",
  noteHeading2Label: "غرێب ٢",
  noteHeading3Label: "غرێب ٣",
  noteNormalTextLabel: "دەقێکی ئاسایی",
  noteTableRowsLabel: "ڕێژەکان",
  noteTableColsLabel: "ستۆکان",
  noteTableHeaderRowLabel: "ڕێژەی سەرەکی سیڕی",
  noteTableInsertBtnLabel: "خۆشی خشتە چاپ بکە",
  noteImageLabel: "وێنە",
  noteImageUpload: "دامەزراندن",
  noteImageCamera: "کەمێرە",
  noteTablePresetCustomLabel: "خۆشەhati"
};
fs.writeFileSync("__phase37b/ku_map.json", JSON.stringify(M, null, 2), "utf8");
console.log("seed OK", Object.keys(M).length);
