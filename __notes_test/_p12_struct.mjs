import fs from 'node:fs';
const t = fs.readFileSync('d:/Programs EQ7/EQ/__notes_test/p12_professional.mjs', 'utf8');
const ids = ['n-2x2','n-3x3','n-4x5','n-custom','n-merge','n-long','n-multi','n-imgtbl','n-chktbl','n-headtbl','n-rtl','n-para'];
let missing = 0;
ids.forEach((id) => { if (!t.includes("'" + id + "'")) { console.log('MISSING note ' + id); missing++; } });
['const seed','async function runCreate','function tableMeta','Page B','Page A','Responsive','catch (topErr)','RESULTS_JSON=','try {'].forEach((m) => { if (!t.includes(m)) { console.log('MISSING section: ' + m); missing++; } });
console.log('CHECKS_DONE missing=' + missing + ' lines=' + t.split('\n').length);