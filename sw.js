// Service Worker — Explorer Adventure Platform
const CACHE_NAME = 'explorer-v1';
const PRECACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/game.js',
  '/leaderboard.js',
  '/manifest.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

// Install — precache app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// Activate — clear old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network-first for tiles, cache-first for app shell
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Map tiles — network first (they change), fall back to cache
  if (url.hostname.includes('carto') || url.hostname.includes('openstreetmap') || url.hostname.includes('stamen')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // App files — cache first
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
