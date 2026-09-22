// SCRATCH one-off: re-measure the already-generated pdf.html at a viewport wider
// than the 794px A4 page to prove the earlier docOverflow=9 was a viewport artifact.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const LOG = path.join(HERE, '_mixdir_verify_out', 'pdfwidth.log');
const log = (s) => fs.appendFileSync(LOG, s + '\n');
try { fs.unlinkSync(LOG); } catch (e) {}
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
try {
  for (const w of [800, 900, 1280]) {
    const p = await browser.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.setViewport({ width: w, height: 1200 });
    await p.goto('file:///' + path.join(HERE, '_mixdir_verify_out', 'pdf.html').replace(/\\/g, '/'), { waitUntil: 'load', timeout: 60000 });
    await new Promise(r => setTimeout(r, 600));
    const m = await p.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const wide = [];
      document.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.right > vw + 1 || r.left < -1) wide.push({ tag: el.tagName + '.' + (el.className || ''), l: Math.round(r.left), r: Math.round(r.right) });
      });
      const page = document.querySelector('.eq-pdf-page, .eq-note-page, body > div');
      const li = document.querySelector('.eq-note-body li');
      return {
        docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        vw,
        pageW: page ? Math.round(page.getBoundingClientRect().width) : null,
        liDir: li ? getComputedStyle(li).direction : null,
        liBidi: li ? getComputedStyle(li).unicodeBidi : null,
        wide: wide.slice(0, 8)
      };
    });
    log(`w=${w} docOverflow=${m.docOverflow} vw=${m.vw} pageW=${m.pageW} liDir=${m.liDir} liBidi=${m.liBidi} wide=${JSON.stringify(m.wide)} errs=${errs.length}`);
    await p.close();
  }
  log('PDFWIDTH DONE');
} finally { await browser.close(); }