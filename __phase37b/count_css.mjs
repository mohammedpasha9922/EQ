import fs from 'fs';
const s = fs.readFileSync('styles.css', 'utf8');
const lines = s.split('\n');
const matches = [];
lines.forEach((l, i) => {
  if (l.includes("body[data-language='ar']")) {
    matches.push((i + 1) + ': ' + l.trim());
  }
});
console.log('count:', matches.length);
matches.forEach(m => console.log(m));