const CACHE_NAME = "vysyon-github-v3-shell-20260707";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./github-adapter.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // Never cache external market/API calls. They must stay fresh.
  if (url.origin !== self.location.origin) return;

  // App shell: cache first, then network. For HTML, try network first so GitHub updates arrive quickly.
  if (req.mode === "navigate" || url.pathname.endsWith("/index.html") || url.pathname.endsWith("/")) {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put("./index.html", copy));
        return res;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(caches.match(req).then(cached => cached || fetch(req)));
});
