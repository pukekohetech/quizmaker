/*
 * Service Worker
 *
 * This service worker implements a simple cache-first strategy for the core
 * assets of the quiz builder. It pre-caches the HTML, CSS, JS, manifest and
 * icon files during installation, and intercepts fetch requests to serve
 * cached responses when available. Any network requests that fail will fall
 * back to the cached version (if present).
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `quiz-builder-${CACHE_VERSION}`;

// List of URLs to cache for offline use. Paths are relative to the root of
// the application. If you add new top-level assets (e.g. additional JS
// bundles or stylesheets), include them here to ensure they are cached.
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event: cache core assets. The `self.skipWaiting()` call ensures
// that this service worker immediately takes control without waiting for
// existing service workers to finish.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event: clean up old caches. This keeps the storage footprint
// minimal by deleting caches that do not match the current version.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key.startsWith('quiz-builder-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
  // Take control of uncontrolled clients immediately after activation.
  return self.clients.claim();
});

// Fetch event: respond with cached assets when available. If the request is
// not in the cache, it will be fetched from the network. If the network
// request fails (e.g. offline), the cached response will be served if
// possible.
self.addEventListener('fetch', event => {
  const request = event.request;
  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request)
        .then(networkResponse => {
          // Optionally cache new resources. Only cache responses from same
          // origin to avoid caching cross-origin requests.
          if (request.url.startsWith(self.location.origin)) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, networkResponse.clone());
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If network fetch fails, attempt to serve a cached offline page.
          // For now we simply return nothing here. You could extend this to
          // serve a custom offline fallback page if desired.
          return caches.match('/index.html');
        });
    })
  );
});