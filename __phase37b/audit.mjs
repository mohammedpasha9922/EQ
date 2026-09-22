import fs from 'fs';
const s = fs.readFileSync('app.js', 'utf8');
const lines = s.split(/\r?\n/);
lines.forEach((l, i) => { if (/^\s{2,4}[a-z]{2}\s*:\s*\{\s*$/.test(l)) console.log(i + 1, JSON.stringify(l.slice(0, 30))); });
const re = /locale === 'ar'/g; let m;
while ((m = re.exec(s))) {
  const line = s.slice(0, m.index).split('\n').length;
  console.log('ARCHK', line, JSON.stringify(s.slice(m.index - 100, m.index + 70).replace(/\n/g, ' | ')));
}
let i = s.indexOf('eq-language');
console.log('PERSIST', JSON.stringify(s.slice(i - 400, i + 400).replace(/\n/g, ' | ')));
i = s.indexOf('pdfReportLocaleDir');
console.log('PDFDIR', JSON.stringify(s.slice(i - 100, i + 700).replace(/\n/g, ' | ')));
i = s.indexOf('function setLanguage');
console.log('SETLANG', JSON.stringify(s.slice(i, i + 1400).replace(/\n/g, ' | ')));
const h = fs.readFileSync('index.html', 'utf8');
i = h.indexOf('languageSelect');
console.log('HTMLSEL', JSON.stringify(h.slice(i - 200, i + 2400).replace(/\n/g, ' | ')));