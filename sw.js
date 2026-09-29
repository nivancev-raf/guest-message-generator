const CACHE_NAME = 'guest-message-generator-v4';
const urlsToCache = [
  '/guest-message-generator/',
  '/guest-message-generator/index.html',
  '/guest-message-generator/manifest.json',
  '/guest-message-generator/styles.css',
  '/guest-message-generator/config.js',
  '/guest-message-generator/utils.js',
  '/guest-message-generator/templates.js',
  '/guest-message-generator/auth.js',
  '/guest-message-generator/api.js',
  '/guest-message-generator/pwa.js',
  '/guest-message-generator/menu.js',
  '/guest-message-generator/apartments.js',
  '/guest-message-generator/editor.js',
  '/guest-message-generator/profile.js',
  '/guest-message-generator/app.js',
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
      .then(function() {
        return self.skipWaiting();
      })
  );
});

// Activate event - remove caches from older versions
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys()
      .then(function(names) {
        return Promise.all(
          names
            .filter(function(name) { return name !== CACHE_NAME; })
            .map(function(name) { return caches.delete(name); })
        );
      })
      .then(function() {
        return self.clients.claim();
      })
  );
});

// Fetch event - network first for the app's own files, cache as offline fallback.
// Requests to other origins (Supabase API, CDN) are never cached here.
self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, copy);
          });
        }
        return response;
      })
      .catch(function() {
        return caches.match(event.request);
      })
  );
});
