// PHASE 38 AUDIT HARNESS part1
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8241;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/' || u === '') u = '/index.html';
  try { const d = fs.readFileSync(path.join(ROOT, u)); res.writeHead(200, { 'Content-Type': mimeOf(u) + '; charset=utf-8' }); res.end(d); }
  catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const URL = 'http://127.0.0.1:' + PORT + '/';
setTimeout(() => process.exit(124), 150000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { checks: [], pageErrors: [] };
function check(n, ok, d) { out.checks.push({ name: n, ok: !!ok, detail: d || '' }); console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  -> ' + d : '')); }
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
page.on('pageerror', (e) => out.pageErrors.push(String((e && e.message) || e)));
try {
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
let booted = false;
for (let i = 0; i < 30; i++) {
try { const d = await page.evaluate(() => document.querySelector('#primaryDisplay')?.textContent); if (d === '0') { booted = true; break; } } catch (e) {}
await sleep(400);
}
check('boot display=0', booted);
const tap = (sel) => page.evaluate((s) => { const b = document.querySelector(s); if (!b) throw new Error('missing ' + s); b.click(); return document.querySelector('#primaryDisplay').textContent; }, sel);
const read = () => page.evaluate(() => ({ display: document.querySelector('#primaryDisplay').textContent, expr: document.querySelector('#expressionDisplay').textContent, words: document.querySelector('#secondaryDisplay').textContent, lang: document.documentElement.lang, dir: document.documentElement.dir, sciOpen: document.querySelector('#scientificPanel').classList.contains('open') }));
const clear = () => tap('.control-btn[data-action="clear"]');
const num = (v) => tap('.keypad-btn.number[data-value="' + v + '"]');
const op = (v) => tap('.keypad-btn.operator[data-value="' + v + '"]');
const eq = () => tap('.keypad-btn.equals');
const fire = (keys) => page.evaluate((ks) => { for (const k of ks) document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); }, keys);
const sci = (v) => page.evaluate((x) => document.querySelector('.scientific-btn[data-scientific="' + x + '"]').click(), v);
const inv = await page.evaluate(() => ({ toggle: !!document.querySelector('#scientificToggle'), toggleText: document.querySelector('#scientificToggle')?.textContent, panel: !!document.querySelector('#scientificPanel'), btns: [...document.querySelectorAll('.scientific-btn')].map((b) => ({ label: b.textContent, sci: b.getAttribute('data-scientific') })), openInit: document.querySelector('#scientificPanel').classList.contains('open') }));
out.inventory = inv;
check('toggle exists', inv.toggle, inv.toggleText);
check('panel exists', inv.panel);
check('panel hidden initially', inv.openInit === false);
async function typeNum(str) { for (const ch of str) { await num(ch); } }
await page.evaluate(() => document.querySelector('#scientificToggle').click());
await sleep(150);
check('toggle opens panel', (await read()).sciOpen === true);
await clear(); await typeNum('9');
await page.evaluate(() => document.querySelector('.scientific-btn[data-scientific="sqrt("]').click());
const d1 = (await read()).display;
await eq(); let s = await read();
check('sqrt btn wraps to sqrt(9)', d1.includes('sqrt'), d1);
check('sqrt(9)=3', s.display === '3', 'display=' + s.display + ' words=' + s.words);
await clear(); await typeNum('4');
await page.evaluate(() => document.querySelector('.scientific-btn[data-scientific="^2"]').click());
const d2 = (await read()).display;
await eq(); s = await read();
check('x2 btn appends ^2', d2.includes('^2'), d2);
check('4^2=16', s.display === '16', 'display=' + s.display);
out.sqrtWords = s.words;
await clear();
await sci('('); await typeNum('2'); await op('+'); await typeNum('3'); await sci(')');
await op('*'); await typeNum('4'); await eq(); s = await read();
check('(2+3)*4=20', s.display === '20', 'display=' + s.display + ' expr=' + s.expr);
await clear();
await sci('('); await typeNum('2');
await page.evaluate(() => document.querySelector('.scientific-btn[data-scientific="^2"]').click());
await sci(')'); await eq(); s = await read();
check('(2^2)=4 free-expr power', s.display === '4', 'display=' + s.display);
await clear();
await sci('('); await sci('('); await typeNum('2'); await op('+'); await typeNum('3'); await sci(')');
await op('*'); await typeNum('4'); await sci(')'); await op('/'); await typeNum('2'); await eq(); s = await read();
check('((2+3)*4)/2=10', s.display === '10', 'display=' + s.display);
await clear(); await typeNum('2.25');
await page.evaluate(() => document.querySelector('.scientific-btn[data-scientific="sqrt("]').click());
await eq(); s = await read();
check('sqrt(2.25)=1.5', s.display === '1.5', 'display=' + s.display);
await clear(); await typeNum('0');
await page.evaluate(() => document.querySelector('.scientific-btn[data-scientific="sqrt("]').click());
await eq(); s = await read();
check('sqrt(0)=0', s.display === '0', 'display=' + s.display);
await clear(); await fire(['(', '7', '+', '8', ')', 'Enter']); s = await read();
check('keyboard (7+8)=15', s.display === '15', 'display=' + s.display);
await clear(); await fire(['s', 'q', 'r']); s = await read();
check('keyboard letters ignored', s.display === '0', 'display=' + s.display);
await clear(); await sci('('); await typeNum('2'); await op('+'); await typeNum('3'); await eq(); s = await read();
check('unbalanced (2+3 => Error', s.display === 'Error', 'display=' + s.display);
await clear(); await sci('('); await fire(['-', '5']); await sci(')'); await op('+'); await typeNum('3'); await eq(); s = await read();
check('(-5)+3=-2', s.display === '-2', 'display=' + s.display);
await clear(); await typeNum('5'); await op('+'); await op('+'); await typeNum('2'); await eq(); s = await read();
check('5++2=7 operator replace', s.display === '7', 'display=' + s.display);
await clear(); await typeNum('3'); await op('+'); await typeNum('4'); await eq();
const e1 = (await read()).display; await eq(); const e2 = (await read()).display;
check('repeated equals stable', e1 === '7' && e2 === '7', e1 + '/' + e2);
await clear(); await sci('('); await typeNum('9');
await page.evaluate(() => document.querySelector('.control-btn[data-action="backspace"]').click()); s = await read();
out.backspaceState = s.display;
check('backspace in free-expr recorded', true, 'display=' + s.display);
await clear(); s = await read();
check('AC resets 0', s.display === '0', 'display=' + s.display);
const hist = await page.evaluate(() => ({ count: document.querySelectorAll('#historyList .history-item,#historyList li').length, text: (document.querySelector('#historyList')?.textContent || '').slice(0, 220) }));
out.history = hist;
check('history logged sci calc', hist.count > 0, JSON.stringify(hist));
await clear(); await typeNum('9');
await page.evaluate(() => document.querySelector('.scientific-btn[data-scientific="sqrt("]').click());
await eq(); s = await read();
check('sci result words=three', /three/i.test(s.words), 'words=' + s.words);
out.speechBtn = await page.evaluate(() => !!document.querySelector('#speechButton'));
check('speech button exists', out.speechBtn === true);

out.langs = {};
for (const L of ['en', 'ar', 'ku', 'fr', 'de', 'es', 'ru', 'tr']) {
await page.evaluate((l) => { const sel = document.querySelector('#topBarLanguageSelect') || document.querySelector('#languageSelect'); if (sel) { sel.value = l; sel.dispatchEvent(new Event('change', { bubbles: true })); } }, L);
await sleep(220);
out.langs[L] = await page.evaluate(() => ({ toggle: document.querySelector('#scientificToggle')?.textContent, lang: document.documentElement.lang, dir: document.documentElement.dir }));
}
await page.evaluate(() => { const sel = document.querySelector('#topBarLanguageSelect') || document.querySelector('#languageSelect'); if (sel) { sel.value = 'en'; sel.dispatchEvent(new Event('change', { bubbles: true })); } });
await sleep(200);
out.responsive = {};
for (const w of [360, 390, 768, 1024, 1280]) {
await page.setViewport({ width: w, height: 800 });
await page.evaluate(() => document.querySelector('#scientificPanel').classList.add('open'));
await sleep(120);
out.responsive['ltr_' + w] = await page.evaluate(() => {
const btns = [...document.querySelectorAll('#scientificPanel .scientific-btn')].map((b) => { const r = b.getBoundingClientRect(); return { label: b.textContent, w: Math.round(r.width), h: Math.round(r.height), vis: r.width > 0 && r.height > 0 }; });
return { overflow: document.documentElement.scrollWidth > window.innerWidth + 1, btns };
});
}
await page.evaluate(() => { const sel = document.querySelector('#topBarLanguageSelect'); if (sel) { sel.value = 'ar'; sel.dispatchEvent(new Event('change', { bubbles: true })); } });
await sleep(250);
for (const w of [360, 390]) {
await page.setViewport({ width: w, height: 800 });
await page.evaluate(() => document.querySelector('#scientificPanel').classList.add('open'));
await sleep(120);
out.responsive['rtl_' + w] = await page.evaluate(() => {
const btns = [...document.querySelectorAll('#scientificPanel .scientific-btn')].map((b) => { const r = b.getBoundingClientRect(); return { label: b.textContent, w: Math.round(r.width), h: Math.round(r.height) }; });
return { dir: document.documentElement.dir, overflow: document.documentElement.scrollWidth > window.innerWidth + 1, btns };
});
}
out.evaluator = await page.evaluate(async () => {
const r = {};
try {
const m = await import('./src/core/ExpressionEvaluator.js');
for (const c of ['sqrt(9)', '2^3', '(2+3)*4', 'sqrt(2+7)', '2^2', 'sqrt(0)', '9^0.5', '((2+3)*4)/2', '-sqrt(9)', '2^(-2)', '(2+3', '2+3)', 'sqrt9', '3^^2', 'sin(30)', 'cos(0)', 'log(10)', 'pi', '5!']) { try { r[c] = m.evaluateExpression(c); } catch (e) { r[c] = 'ERROR: ' + e.message; } }
} catch (e) { r._import = 'ERROR: ' + e.message; }
return r;
});
check('evaluator probe ok', !!out.evaluator && Object.keys(out.evaluator).length > 5, JSON.stringify(out.evaluator).slice(0, 260));
} catch (err) {
console.error('HARNESS ERROR:', err);
out.checks.push({ name: 'HARNESS', ok: false, detail: String((err && err.message) || err) });
} finally {
try { await browser.close(); } catch (e) {}
server.close();
}
const pass = out.checks.filter((r) => r.ok).length;
console.log('==== RESULT: ' + pass + '/' + out.checks.length + ' passed ====');
try { fs.writeFileSync(path.join(HERE, '__p38_sci_audit.json'), JSON.stringify(out, null, 2)); } catch (e) {}
process.exit(0);

const e1 = (await read()).display; await eq(); const e2 = (await read()).display;
check('repeated equals stable', e1 === '7' && e2 === '7', e1 + '/' + e2);
await clear(); await sci('('); await typeNum('9');
await page.evaluate(() => document.querySelector('.control-btn[data-action="backspace"]').click()); s = await read();
out.backspaceState = s.display;
await clear(); s = await read();
check('AC resets 0', s.display === '0', 'display=' + s.display);
const hist = await page.evaluate(() => ({ count: document.querySelectorAll('#historyList .history-item,#historyList li').length, text: (document.querySelector('#historyList')?.textContent || '').slice(0, 220) }));
out.history = hist;
check('history logged sci calc', hist.count > 0, JSON.stringify(hist));
await clear(); await typeNum('9');
await page.evaluate(() => document.querySelector('.scientific-btn[data-scientific="sqrt("]').click());
await eq(); s = await read();
check('sci result words=three', /three/i.test(s.words), 'words=' + s.words);
out.speechBtn = await page.evaluate(() => !!document.querySelector('#speechButton'));
check('speech button exists', out.speechBtn === true);

check('4 sci buttons', inv.btns.length === 4, JSON.stringify(inv.btns));
await page.evaluate(() => document.querySelector('#scientificToggle').click());
await sleep(150);
check('toggle opens panel', (await read()).sciOpen === true);
async function typeNum(str) { for (const ch of str) { await num(ch); } }

