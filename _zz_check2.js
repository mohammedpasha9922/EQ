const fs = require('fs');
const out = [];
const app = fs.readFileSync('app.js', 'utf8');
const head = fs.readFileSync('_tmp_head_app.js', 'utf8');
const appLines = app.split(/\r?\n/);
const headLines = head.split(/\r?\n/);

// A) Where are the "missing" Notes helpers declared anywhere (app, or other modules)?
['folderNameExists', 'makeFolderId', 'isNoteBlockTag'].forEach(fn => {
  out.push('=== ' + fn + ' ===');
  const patterns = [
    ['head-function', headLines.findIndex(l => new RegExp('^(?:async\\s+)?function\\s+' + fn + '\\b').test(l)) + 1],
    ['app-function', appLines.findIndex(l => new RegExp('^(?:async\\s+)?function\\s+' + fn + '\\b').test(l)) + 1],
    ['head-const', headLines.findIndex(l => new RegExp('(?:const|let|var)\\s+' + fn + '\\b').test(l)) + 1],
    ['app-const', appLines.findIndex(l => new RegExp('(?:const|let|var)\\s+' + fn + '\\b').test(l)) + 1]
  ];
  patterns.forEach(([k, v]) => out.push('  ' + k + '=' + (v > 0 ? v : 'MISSING')));
  // usage sites in app.js
  const uses = [];
  appLines.forEach((l, i) => { if (new RegExp('\\b' + fn + '\\s*\\(').test(l)) uses.push(i + 1); });
  out.push('  app-usages=' + uses.join(',') + ' (count=' + uses.length + ')');
  const headUses = [];
  headLines.forEach((l, i) => { if (new RegExp('\\b' + fn + '\\s*\\(').test(l)) headUses.push(i + 1); });
  out.push('  head-usages=' + headUses.join(',') + ' (count=' + headUses.length + ')');
});

// B) smart* leftovers: i18n keys vs real logic
['smartTableCreate', 'smartTemplates', 'smartDraft'].forEach(k => {
  out.push('=== ' + k + ' ===');
  appLines.forEach((l, i) => {
    const n = i + 1;
    if (l.includes(k)) {
      const isI18n = /^\s*[\w"']*smart\w*['"]?\s*:\s*['"]/.test(l) || /"smart[A-Za-z]*"\s*:/.test(l);
      out.push('  ' + n + (isI18n ? ' [I18N] ' : ' [CODE] ') + l.trim().slice(0, 130));
    }
  });
});

// C) correct sibling markers
const sib = {
  calculator: ['function calculateResult', 'function updateDisplay', 'primaryDisplay', 'function handleDigit'],
  notes: ['function openNotesView', 'function openNotes', 'notesView', 'renderNotesList', 'function newNote'],
  age: ['ageCalculator', 'ageCalc', 'Age Calculator'],
  engineering: ['engineering', 'Engineering'],
  currency: ['currencyService', 'currencyConverterModal']
};
Object.keys(sib).forEach(k => {
  sib[k].forEach(m => {
    out.push('SIB ' + k + ' :: ' + m + ' app=' + (app.split(m).length - 1) + ' html=' + (htmlCount(m)) );
  });
});
function htmlCount(m) { return fs.readFileSync('index.html', 'utf8').split(m).length - 1; }

fs.writeFileSync('_zz_check2_out.txt', out.join('\n'), 'utf8');
console.log('WROTE _zz_check2_out.txt lines=' + out.length);
