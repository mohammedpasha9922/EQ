// TEMPORARY probe: inspect drawer markup + asset references (deleted after use).
import fs from 'node:fs';
const html = fs.readFileSync('index.html', 'utf8');
console.log('--- drawer-menu-item buttons ---');
const btns = html.match(/<button[^>]*class="drawer-menu-item"[^>]*>/g) || [];
btns.forEach((b) => console.log(b.replace(/\s+/g, ' ')));
console.log('--- asset refs ---');
const refs = html.match(/(?:href|src)="([^"]+)"/g) || [];
refs.forEach((r) => console.log(r));
console.log('--- pdf mentions in drawer area ---');
const i = html.indexOf('drawerMenu');
console.log('drawerMenu idx', i);
console.log('open-pdf-reports occurrences:', (html.match(/open-pdf-reports/g) || []).length);
console.log('PDF drawer button present:', /class="drawer-menu-item"[^>]*open-pdf-reports|open-pdf-reports[^>]*data-action/.test(html));
