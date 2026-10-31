/* Písmo do STL – offline režim aplikace (service worker)
 * Created by Julius Andy Antoš */
const VERSION = 'pismo-20261031195054';
const FONTS_CACHE = 'pismo-fonts';
const SHELL = ['./', 'index.html', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== FONTS_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Soubory fontů ze složky fonts/: jednou stáhnout, pak brát z mezipaměti (fungují i offline)
  if (/\/fonts\/[^/]+\.(ttf|otf|woff)$/i.test(url.pathname)) {
    e.respondWith(caches.open(FONTS_CACHE).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }

  // Aplikace a seznam fontů: nejdřív síť (vždy nejnovější verze), bez internetu z mezipaměti
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((m) => m || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
