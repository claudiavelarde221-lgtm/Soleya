const CACHE = 'soleya-v9';
const FILES = ['./', 'index.html', 'styles.css', 'app.js', 'qrcode.js', 'icons/logo-negro.png', 'icons/logo-dorado.png', 'fonts/cormorant-garamond-latin-600-normal.woff2', 'fonts/cormorant-garamond-latin-700-normal.woff2', 'fonts/cormorant-garamond-latin-500-italic.woff2', 'fonts/poppins-latin-400-normal.woff2', 'fonts/poppins-latin-500-normal.woff2', 'fonts/poppins-latin-600-normal.woff2', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// Red primero (para recibir actualizaciones); si no hay internet, usa lo guardado.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
