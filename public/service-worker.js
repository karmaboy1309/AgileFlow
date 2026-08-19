const CACHE_NAME = 'agileflow-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/main.jsx',
  '/src/index.css',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (e) => {
  // Bypassing chrome-extension requests
  if (e.request.url.startsWith('chrome-extension://')) return;

  // Network-first for api requests, cache-first for assets
  if (e.request.url.includes('/api/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => {
        return cached || fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return res;
        });
      }).catch(() => {
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
    );
  }
});
