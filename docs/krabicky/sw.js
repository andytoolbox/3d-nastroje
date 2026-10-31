/* Krabičky a organizéry – offline režim aplikace (service worker)
 * Created by Julius Andy Antoš */
const VERSION = 'krabicky-20261031195054';
const SHELL = ['./', 'index.html', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('krabicky-') && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Nejdřív síť (vždy nejnovější verze), bez internetu z mezipaměti
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((m) => m || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
