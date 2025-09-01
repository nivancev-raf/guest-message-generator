const CACHE_NAME = 'guest-message-generator-v1';
const urlsToCache = [
  '/guest-message-generator/',
  '/guest-message-generator/index.html',
  '/guest-message-generator/manifest.json',
  '/guest-message-generator/icon-192.png',
  '/guest-message-generator/icon-512.png'
];

// Install event
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});