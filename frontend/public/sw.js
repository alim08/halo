// Halo Service Worker – minimal shell for PWA installability.
// Expand with caching strategies as features mature.

const CACHE_NAME = "halo-v1";

self.addEventListener("install", (event) => {
  // Skip waiting so the new SW activates immediately.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Clean up old caches.
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  // Network-first for all requests (MVP).
  // TODO: add offline-shell caching for app shell assets.
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
