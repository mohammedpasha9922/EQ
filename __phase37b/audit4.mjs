import fs from 'fs';
const s = fs.readFileSync('app.js', 'utf8');
const lines = s.split(/\r?\n/);
const out = [];
const ctx = (n) => { out.push('--- ctx around ' + n + ' ---'); for (let i = n - 6; i < n + 5; i++) out.push((i + 1) + ': ' + lines[i]); };
[5054, 8343, 9059, 9062, 9274, 9302, 9919, 11421, 12784, 12809, 13039, 13290, 19102, 19358].forEach(ctx);
fs.writeFileSync('__phase37b/audit4.txt', out.join('\n'), 'utf8');
console.log('ok');