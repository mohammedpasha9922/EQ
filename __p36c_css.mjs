import fs from 'node:fs';
const css = fs.readFileSync('styles.css','utf8');
const i = css.indexOf('PART 36B');
console.log(css.slice(i, i+9000));
