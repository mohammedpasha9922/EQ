const fs = require('fs');
let out = 'CHECKED_AT=' + new Date().toISOString() + '\n';
try { out += 'reg_exit=' + fs.readFileSync('__reg_exit.txt', 'utf16le').replace(/\u0000/g, '') + '\n'; } catch (e) { out += 'reg_exit: not yet\n'; }
try {
  const t = fs.readFileSync('__reg_p18.txt', 'utf16le').split('\n');
  out += 'lines=' + t.length + '\nTAIL:\n' + t.slice(-15).join('\n');
} catch (e) { try { const t8 = fs.readFileSync('__reg_p18.txt', 'utf8'); out += t8.split('\n').filter((l)=>l.startsWith('FAIL')).join('\n'); } catch (e2) {} }
fs.writeFileSync('__p19_final.txt', out);
process.exit(0);