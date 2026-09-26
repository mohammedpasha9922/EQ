// TEMP: does page.evaluate(string) auto-invoke a stringified arrow function?
import puppeteer from 'puppeteer-core';
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.goto('about:blank');
await p.evaluate('() => { window.__called = true; }');
console.log('auto-invoked =', await p.evaluate('window.__called === true'));
await b.close();
