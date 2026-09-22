import fs from 'node:fs';
const p = '_pdfclear_smoke.mjs';
let lines = fs.readFileSync(p, 'utf8').split(/\r?\n/).map((l) => l.replace(/\r$/, ''));

// 1) remove trailing junk after the last 'process.exit(0);'
let lastExit = -1;
for (let i = 0; i < lines.length; i++) if (lines[i].includes('process.exit(0);')) lastExit = i;
if (lastExit < 0) { console.log('FAIL exit token'); process.exit(1); }
lines = lines.slice(0, lastExit + 1);

// 2) close the 'openedNow' evaluate block + add its missing check
const startIdx = lines.findIndex((l) => l.includes('const openedNow = await page.evaluate'));
if (startIdx < 0) { console.log('FAIL openedNow block'); process.exit(1); }
let retIdx = -1;
for (let i = startIdx; i < lines.length && i < startIdx + 10; i++) {
  if (lines[i].includes('aria-hidden')) { retIdx = i; break; }
}
if (retIdx < 0) { console.log('FAIL return line'); process.exit(1); }
if (!lines[retIdx + 1].startsWith('}')) {
  lines.splice(retIdx + 1, 0,
    '});',
    "check('clicking PDF opens the workspace shell', openedNow.show === true && openedNow.aria === 'false',",
    '  JSON.stringify(openedNow));');
}
fs.writeFileSync(p, lines.join('\r\n'), 'utf8');
console.log('OK lines=' + lines.length + ' openedNowRefs=' + (lines.filter((l) => l.includes('openedNow')).length));
