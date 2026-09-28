// Forja: service worker. Permite instalar la app y abrirla sin conexión.
// La app (mismo origen) se pide siempre a la red revalidando con el servidor (cache: 'no-cache'),
// para no mezclar un index.html nuevo con scripts antiguos de la caché HTTP. Sin conexión se usa la copia guardada.
// Las librerías y fuentes externas (con versión fija) se sirven desde la caché. Supabase nunca se cachea.
const CACHE = 'forja-v3';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png',
  'js/catalog.js', 'js/figures.js', 'js/plan.js', 'js/injuries.js', 'js/activities.js', 'js/bodymap.js', 'js/sync.js', 'js/timer.js', 'js/hr.js'];
const CDN = ['cdn.tailwindcss.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    e.respondWith(fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true })
      .then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : undefined))));
    return;
  }

  if (CDN.includes(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    })));
  }
});
