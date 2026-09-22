// ku_chunk2.js — append more keys to ku_map.json (read-modify-write)
const fs = require('fs');
const M = JSON.parse(fs.readFileSync('__phase37b/ku_map.json', 'utf8'));

// ---------- Language display names (for selector + help) ----------
M.languageEnglish = 'ئینگلیزی';
M.languageArabic = 'عەرەبی';
M.languageFrench = 'فەڕەنسی';
M.languageRussian = 'روسێ';
M.languageGerman = 'یەمەنی';
M.languageTurkish = 'تۆرکی';
M.languageSpanish = 'سپاڵنەوە';

// ---------- Drawer ----------
M.drawerTop = 'لە بەرەو';
M.drawerSide = 'لە یاسای';
M.expand = 'بەرگەشتن';
M.Minimize = 'کەمکردنەوە';
M.installModalSubtitle = 'بابەتەکەی تێپەڕەوە';
M.installModalClose = 'بەدیارم';
M.settingsSubtitle = 'سەرەتاڵەتی بەرنامە، رەنگ و پشتیبەند دوورەوە.';
M.appSoundsLabel = 'دەق و تەنھا';
M.soundHapticsLabel = 'دەق و تەنھا';
M.soundHapticsCaption = 'پاشەکردنی دەق و تەنھا بەپێی دەق و تەنھا، ئەگەر هەبێت پشتیبەندەوە.';
M.soundProfileLabel = 'پێشکەشکردنی نوێکردنەوە';
M.profileClassic = 'کلاسیکی';
M.profileSoft = 'نێوانی';
M.profileModern = 'نێوەری';
M.profileClick = 'کلیك';
M.profileSilent = 'وەک دەقەوە';
M.speakerLabel = 'دەق و پێشبینەوە';
M.speakerCaption = 'کاتێک ئەوەی ON دەبێتەوە، پێشبینەوەی دەق و تەنھا بەپێی دەق و تەنھا، ئەگەر هەبێت پشتیبەندەوە. کاتێک OFF، ئەوەی ئەمەی تێپەڕەوە.';
M.modeGeneral = 'حسابکردنی ئاسایی';
M.scientificToggle = 'زانیاری';
M.percentResultLabel = 'بەراژە';
M.currencyConverterTitle = 'پێشکەشکردنی دەقینەوە';
M.currencyConverterSubtitle = 'پێشکەشکردنی ژمارەکان لەگەڵ دەقینەوە.';
M.resetButton = 'دەستەوە';
M.swapButton = 'دەستپێکردن';
M.favoritesButton = 'پێشکەشکردنی خێرا';
M.recentButton = 'تازەکردەوە';

// ---------- Currency converter specific ----------
M.fromLabel = 'لە ';
M.toLabel = 'بۆ ';
M.convertedLabel = 'پێشکەشکردنی بەراژە';
M.bankRateMode = '🏦 نرخەکانی باوژەکان';
M.marketRateMode = '🏪 نرخەکانی بازرگانی';
M.marketRateFieldLabel = 'نرخەکانی بازرگانی';
M.cachedLabel = 'پاشەکردنەوە';
M.refreshButton = 'تازەکردەوە';
M.globalDirectoryButton = 'پێشکەشکردنی باوژەکان';
M.currencyDirectoryTitle = 'پۆلە کول دادە꾀 relational';
M.currencyDirectorySubtitle = 'پۆلە چاکسازی بۆ چاکسازی بەرنامەی ئاسایی.';
M.currencySearchPlaceholder = 'پۆلە دادە꾀 relational';

// ---------- Drawer bottom ----------
M.drawerEyebrow = '';
M.drawerTitle = 'EQ7';
M.drawerHistory = 'تێبینەوەی دەقەکان';
M.drawerNotes = 'نۆتەکان';
M.drawerPdf = 'PDF';

fs.writeFileSync('__phase37b/ku_map.json', JSON.stringify(M, null, 2), 'utf8');
console.log('chunk2 OK: ' + Object.keys(M).length + ' keys');
