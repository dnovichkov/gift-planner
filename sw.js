// Простой Service Worker для офлайн-работы
const CACHE_NAME = 'gift-planner-v1';
const urlsToCache = [
  '/gift-planner/',
  '/gift-planner/index.html',
  '/gift-planner/src/styles/base.css',
  '/gift-planner/src/styles/tokens.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});