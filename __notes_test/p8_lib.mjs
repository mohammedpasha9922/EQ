// PART 08 shared helpers
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..');
export const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
export const STORAGE_KEY = 'eq-note-manager-notes';
export const PORT = 8634;
export const PREEXISTING_SVG = /attribute d: Expected number|a2 2 2 0 0 0/i;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        let p = decodeURIComponent((req.url || '/').split('?')[0]);
        if (!p || p === '/') p = '/index.html';
        const f = path.join(ROOT, p);
        const e = path.extname(f).toLowerCase();
        const m = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };
        res.writeHead(200, { 'Content-Type': (m[e] || 'application/octet-stream') + '; charset=utf-8' });
        res.end(fs.readFileSync(f));
      } catch { if (!res.headersSent) { res.writeHead(404); res.end('nf'); } }
    });
    server.listen(PORT, () => resolve(server));
  });
}

export async function launch() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  return browser;
}
