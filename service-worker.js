const CACHE = 'vysyon-mobile-snapshot-viewer-v2';
const ASSETS = ['./', './index.html', './manifest.json', './icons/icon-192.svg', './icons/icon-512.svg'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Wichtig: Snapshot niemals dauerhaft cachen. Immer frisch von GitHub Pages laden.
  if (url.pathname.endsWith('/data/latest-scan.json')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
