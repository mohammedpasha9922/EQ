import fs from 'fs';
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
const lines = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
// lines is 0-based; line N in editor = lines[N-1]
const pick = (n) => JSON.stringify(lines[n - 1] ?? '<EOF>');
fs.writeFileSync('d:/Programs EQ7/EQ/__notes_test/_frame_wspace.txt', [
  '17591:>' + pick(17591) + '<',
  '17592:>' + pick(17592) + '<',
  '17593:>' + pick(17593) + '<',
  '17594:>' + pick(17594) + '<'
].join('\n'));
// Count occurrences of the suspicious indented close + browser paths
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'];
const lineNums = [];
chrome.forEach((p) => {
  let i = 0;
  while ((i = s.indexOf(p, i)) !== -1) {
    const ln = s.slice(0, i).split('\n').length;
    lineNums.push(ln);
    i += p.length;
  }
});
fs.appendFileSync('d:/Programs EQ7/EQ/__notes_test/_frame_wspace.txt', '\nchromePathsLines: ' + JSON.stringify(lineNums));
