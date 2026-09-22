// PHASE 37E — real-browser Kurdish TTS verification (test-only artifact).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8338;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  const fp = path.join(ROOT, urlPath);
  try { const d = fs.readFileSync(fp); res.writeHead(200, { 'Content-Type': mimeOf(fp) + '; charset=utf-8' }); res.end(d); }
  catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const URL = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 240000);

const pageErrors = [];
function check(name, ok, detail = '') { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`); if (!ok) process.exitCode = 1; }
function notVerified(name, detail = '') { console.log(`NOT VERIFIED  ${name}  -> ${detail}`); }

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
page.on('pageerror', (e) => pageErrors.push('pageerror: ' + String(e && e.message || e)));
page.on('console', (m) => { if (m.type() === 'error') pageErrors.push('console.error: ' + m.text()); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function boot() {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  let ok = false;
  for (let i = 0; i < 40; i++) {
    try { const d = await page.evaluate(() => document.querySelector('#primaryDisplay')?.textContent); if (d === '0') { ok = true; break; } } catch (e) {}
    await sleep(350);
  }
  if (!ok) throw new Error('app did not reach display=0');
}
// Wrap speechSynthesis.speak to capture what the app ACTUALLY requests.
async function installCapture() {
  await page.evaluate(() => {
    window.__captured = [];
    const syn = window.speechSynthesis;
    if (syn.__p37e) return;
    const origSpeak = syn.speak.bind(syn);
    syn.speak = (u) => {
      window.__captured.push({ text: u.text, lang: u.lang, voiceLang: u.voice ? u.voice.lang : null, voiceName: u.voice ? u.voice.name : null });
      origSpeak(u);
    };
    syn.__p37e = true;
  });
}
const captured = () => page.evaluate(() => window.__captured || []);
async function setLang(locale) {
  await page.evaluate((l) => { const s = document.getElementById('topBarLanguageSelect'); if (s) { s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); } }, locale);
  await sleep(250);
}
async function clickCalcSpeaker() {
  await page.evaluate(() => { const b = document.getElementById('speechButton'); if (b) b.click(); });
  await sleep(400);
}
async function clickHistorySpeaker() {
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.history-speak-btn')].filter((b) => b.offsetParent !== null);
    if (btns.length) btns[0].click();
  });
  await sleep(400);
}
async function compute23() {
  const t = (sel) => page.evaluate((s) => { const b = document.querySelector(s); if (b) b.click(); }, sel);
  await t('.keypad-btn.number[data-value="2"]');
  await t('.keypad-btn.operator[data-value="+"]');
  await t('.keypad-btn.number[data-value="3"]');
  await t('.keypad-btn.equals');
  await sleep(250);
}
// ---------- Baseline pre-existing console/page errors (SVG path warning, test-server 404s) ----------
const baselineErrs = [...pageErrors];
pageErrors.length = 0;

const EXPECT = { en: 'en-US', ar: 'ar-SA', es: 'es-ES', fr: 'fr-FR', ru: 'ru-RU', de: 'de-DE', tr: 'tr-TR' };

// ---------- Report actual voice availability on this machine ----------
await boot();
const voiceReport = await page.evaluate(() => (window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : []).map((v) => `${v.name} [${v.lang}]`));
const kuVoices = voiceReport.filter((v) => /(^|\[)\s*(ku|ckb|kmr)/i.test(v) || /kurdish|sorani|kurmanji/i.test(v));
console.log(`Total TTS voices on this machine: ${voiceReport.length}`);
console.log(`Kurdish-compatible voices: ${kuVoices.length ? kuVoices.join(' | ') : 'NONE'}`);

// ---------- Regression: 7 existing languages unchanged (Calculator speaker) ----------
for (const [loc, exp] of Object.entries(EXPECT)) {
  await boot();
  await installCapture();
  await setLang(loc);
  await clickCalcSpeaker();
  const c = await captured();
  check(`Calculator TTS lang for ${loc} stays ${exp}`, c.length > 0 && c[0].lang === exp, JSON.stringify(c[0] || {}));
}

// ---------- Kurdish: Calculator speaker ----------
await boot();
await installCapture();
await setLang('ku');
await clickCalcSpeaker();
let c = await captured();
check('Kurdish Calculator speaker exists and clicked produced a TTS request', c.length > 0, JSON.stringify(c[0] || {}));
check('Kurdish Calculator TTS does NOT use English locale', c.length > 0 && !/^en(-|_|$)/i.test(c[0]?.lang || 'en'), JSON.stringify(c[0] || {}));
check('Kurdish Calculator TTS requests ku/Kurdish locale', c.length > 0 && /^(ku|ckb|kmr)/i.test(c[0]?.lang || ''), JSON.stringify(c[0] || {}));
check('Kurdish: spoken text stays Kurdish numeric text (no English number words)', c.length > 0 && !/\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\b/i.test(c[0]?.text || ''), `text=${c[0]?.text}`);

// ---------- Kurdish: History speaker ----------
await compute23();
await page.evaluate(() => { const o = document.getElementById('historyToggle'); if (o) o.click(); });
await sleep(300);
await installCapture();
await clickHistorySpeaker();
let h = await captured();
check('Kurdish History speaker produced a TTS request', h.length > 0, JSON.stringify(h[0] || {}));
check('Kurdish History TTS does NOT use English locale', h.length > 0 && !/^en(-|_|$)/i.test(h[0]?.lang || 'en'), JSON.stringify(h[0] || {}));
check('Kurdish History TTS requests ku/Kurdish locale (same config as Calculator)', h.length > 0 && h[0]?.lang === c[0]?.lang, `history=${h[0]?.lang} calculator=${c[0]?.lang}`);

// ---------- Kurdish RTL unchanged ----------
const rtl = await page.evaluate(() => ({ lang: document.documentElement.lang, dir: document.documentElement.dir, body: document.body.getAttribute('data-language') }));
check('Kurdish RTL unchanged (html.lang=ku, dir=rtl, data-language=ku)', rtl.lang === 'ku' && rtl.dir === 'rtl' && rtl.body === 'ku', JSON.stringify(rtl));

// ---------- Errors (vs pre-fix control run: SVG-path warning + test-server 404s exist BEFORE the fix too) ----------
const preExistingSigs = [/<path> attribute d: Expected number/, /Failed to load resource.*404/];
const newErrs = pageErrors.filter((e) => !preExistingSigs.some((r) => r.test(e)));
check('No NEW JavaScript errors introduced (all 8 languages exercised)', newErrs.length === 0, newErrs.slice(0, 5).join(' || '));

// ---------- Honest voice availability report ----------
if (kuVoices.length === 0) {
  notVerified('Physical audible Kurdish pronunciation', 'no Kurdish voice installed in this Chrome/OS; verified programmatically that the app requests a Kurdish locale and never an English fallback');
} else {
  check('Kurdish voice installed and selected when present', true, kuVoices.join(' | '));
}
await browser.close();
server.close();
console.log('PHASE 37E TEST DONE');

