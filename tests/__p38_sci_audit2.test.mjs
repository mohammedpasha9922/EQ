// P38 follow-up probe (test-only)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8242;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
const server = http.createServer((req, res) => {
let u = decodeURIComponent(req.url.split('?')[0]);
if (u === '/' || u === '') u = '/index.html';
try { const d = fs.readFileSync(path.join(ROOT, u)); res.writeHead(200, { 'Content-Type': mimeOf(u) + '; charset=utf-8' }); res.end(d); }
catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const URL = 'http://127.0.0.1:' + PORT + '/';
setTimeout(() => process.exit(124), 120000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { checks: [], pageErrors: [] };
function check(n, ok, d) { out.checks.push({ name: n, ok: !!ok, detail: d || '' }); console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  -> ' + d : '')); }
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
page.on('pageerror', (e) => out.pageErrors.push(String((e && e.message) || e)));
try {
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
for (let i = 0; i < 30; i++) { try { const d = await page.evaluate(() => document.querySelector('#primaryDisplay')?.textContent); if (d === '0') break; } catch (e) {} await sleep(400); }
const tap = (sel) => page.evaluate((s) => { document.querySelector(s).click(); return document.querySelector('#primaryDisplay').textContent; }, sel);
const read = () => page.evaluate(() => ({ display: document.querySelector('#primaryDisplay').textContent, expr: document.querySelector('#expressionDisplay').textContent, words: document.querySelector('#secondaryDisplay').textContent }));
const clear = () => tap('.control-btn[data-action="clear"]');
const num = (v) => tap('.keypad-btn.number[data-value="' + v + '"]');
const eq = () => tap('.keypad-btn.equals');
async function typeNum(str) { for (const ch of str) { await num(ch); } }
await page.evaluate(() => document.querySelector('#scientificToggle').click());
await sleep(150);
// F1: fresh sqrt with no prior digit: AC -> sqrt btn. What display?
await clear();
await page.evaluate(() => document.querySelector('.scientific-btn[data-scientific="sqrt("]').click());
let r = await read();
out.freshSqrtDisplay = r.display;
check('fresh sqrt display recorded', true, r.display);
await eq(); r = await read();
out.freshSqrtEq = r.display;
check('fresh sqrt then = recorded', true, r.display + ' words=' + r.words);
// F2: sqrt(9) typed fully via parens: ( sqrt(9) ) -> need legacy sqrt inside free expr? Try: ( then 9 then ) then sqrt btn then =
await clear();
await page.evaluate(() => document.querySelector('.scientific-btn[data-scientific="("]').click());
await typeNum('9');
await page.evaluate(() => document.querySelector('.scientific-btn[data-scientific=")"]').click());
r = await read();
out.paren9 = r.display;
await page.evaluate(() => document.querySelector('.scientific-btn[data-scientific="sqrt("]').click());
r = await read();
out.afterSqrtOnParen = r.display;
await eq(); r = await read();
out.afterSqrtOnParenEq = r.display;
check('paren9 then sqrt then = recorded', true, out.paren9 + ' | ' + out.afterSqrtOnParen + ' | ' + out.afterSqrtOnParenEq);
// F3: x2 then = with no digits (fresh): AC -> x2 -> =
await clear();
await page.evaluate(() => document.querySelector('.scientific-btn[data-scientific="^2"]').click());
r = await read();
out.freshPow = r.display;
await eq(); r = await read();
out.freshPowEq = r.display;
check('fresh ^2 recorded', true, out.freshPow + ' => ' + out.freshPowEq);
// F4: implicit mult 2(3) = 6?
await clear();
await typeNum('2');
await page.evaluate(() => document.querySelector('.scientific-btn[data-scientific="("]').click());
await typeNum('3');
await page.evaluate(() => document.querySelector('.scientific-btn[data-scientific=")"]').click());
await eq(); r = await read();
out.implicit = r.display;
check('implicit 2(3)=6', r.display === '6', r.display);
// F5: sqrt via free expr typed manually? type ( s q r t impossible via buttons; record that sqrt( cannot be typed inside parens via UI
// F6: history entry for paren expr
const hist = await page.evaluate(() => [...document.querySelectorAll('#historyList .history-item,#historyList li')].map((li) => li.textContent.replace(/\s+/g, ' ').slice(0, 120)));
out.histItems = hist;
check('history items recorded', true, JSON.stringify(hist).slice(0, 300));
// F7: evaluator extra cases incl sqrt(9)+1, 2*sqrt(9), sqrt(16)+sqrt(9)
out.evaluator = await page.evaluate(async () => {
const q = {};
try {
const m = await import('./src/core/ExpressionEvaluator.js');
for (const c of ['sqrt(9)+1', '2*sqrt(9)', 'sqrt(16)+sqrt(9)', 'sqrt(2.25)', 'sqrt(-9)', '(2^2)', '2^(3)', '2^3^2', '10/0', '3.5*2']) { try { q[c] = m.evaluateExpression(c); } catch (e) { q[c] = 'ERROR: ' + e.message; } }
} catch (e) { q._import = 'ERROR: ' + e.message; }
return q;
});
check('evaluator extra ok', Object.keys(out.evaluator).length > 3, JSON.stringify(out.evaluator));
} catch (err) { console.error('HARNESS ERROR:', err); out.checks.push({ name: 'HARNESS', ok: false, detail: String((err && err.message) || err) });
} finally { try { await browser.close(); } catch (e) {} server.close(); }
const pass = out.checks.filter((x) => x.ok).length;
console.log('==== RESULT: ' + pass + '/' + out.checks.length + ' passed ====');
try { fs.writeFileSync(path.join(HERE, '__p38_sci_audit2.json'), JSON.stringify(out, null, 2)); } catch (e) {}
process.exit(0);

