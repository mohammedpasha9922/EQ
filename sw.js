const CACHE_NAME = 'eq-calculator-v3';
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

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
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