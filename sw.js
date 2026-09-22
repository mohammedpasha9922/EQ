const CACHE_NAME = 'eq-calculator-v4';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './numberToWords.js',
  './currencyService.js',
  './manifest.json',
  './favicon.ico',
  './apple-touch-icon.png',
  './icon-192.png',
  './src/core/index.js',
  './src/core/Decimal.js',
  './src/core/NumberToWords.js',
  './src/core/DisplayRenderer.js',
  './src/core/SpeechEngine.js',
  './src/core/ClipboardEngine.js',
  './src/core/HistoryEngine.js',
  './src/core/KeyboardHandler.js',
  './src/core/ResultScreen.js',
  './src/core/ExpressionEvaluator.js',
  './src/CalculatorManager.js',
  './src/modes/StandardCalculator.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

// PART 21 — Offline-first warmup (best effort only).
// The two CDN resources below (Font Awesome icons, Decimal.js) are external and
// must NEVER block installation. We cache them opportunistically while online so
// subsequent offline launches keep the exact same UI/behaviour; if the fetch
// fails, the app already falls back gracefully (system fonts / local math), so
// each entry is cached individually with its own catch.
// PART 35 — Notes PDF offline support: the html2pdf bundle (Generate/Save)
// and the pdf.js lib + worker (Preview) are CDN resources exactly like the two
// PART 21 entries below. They are cached opportunistically while online and
// then served from this cache by the fetch handler when offline. Best effort
// only — must NEVER block installation, each entry has its own catch.
const CDN_WARMUP_URLS = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/decimal.js@10.4.3/decimal.min.js',
  'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => caches.open(CACHE_NAME).then((cache) =>
        Promise.all(CDN_WARMUP_URLS.map((url) =>
          cache.add(new Request(url, { mode: 'no-cors' })).catch(() => { /* best effort */ })
        ))
      ))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});