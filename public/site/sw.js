const CACHE = 'intserfin-site-v1';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll([
        '/site/index.html',
        '/site/assets/logo-intserfin.png',
        '/site/assets/favicon.svg',
        '/site/site.webmanifest'
      ])
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.pathname.startsWith('/site/') && url.origin === self.location.origin) return;
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.open(CACHE).then(cache =>
        fetch(event.request).then(response => {
          cache.put(event.request, response.clone());
          return response;
        }).catch(() => cache.match(event.request))
      )
    );
    return;
  }
  if (event.request.destination === 'image' || event.request.destination === 'font' || event.request.destination === 'style') {
    event.respondWith(
      caches.open(CACHE).then(cache =>
        fetch(event.request).then(response => {
          cache.put(event.request, response.clone());
          return response;
        }).catch(() => cache.match(event.request))
      )
    );
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then(resp =>
        resp || caches.match('/site/index.html')
      )
    )
  );
});
