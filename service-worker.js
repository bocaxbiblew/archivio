/*
 * Archivio Stream — service worker
 *
 * Two rules, and they matter:
 *
 *  1. HTML is network-first. The pages are not hashed, so a cached index.html
 *     would keep pointing at stale script/style URLs forever. If the network
 *     fails we fall back to the cached copy so the app still opens offline.
 *
 *  2. Everything else is stale-while-revalidate. Assets are requested with a
 *     ?v=N query string, so a deploy changes the URL and the old entry simply
 *     stops being referenced. Old cache versions are purged on activate.
 *
 * Bump CACHE_VERSION whenever this file's logic changes.
 */

const CACHE_VERSION = 'v3';
const CACHE_NAME = `archivio-${CACHE_VERSION}`;

// Shell files precached on install so a cold offline load still renders.
const PRECACHE_URLS = [
  './index.html',
  './style.css',
  './script.js',
  './config.js',
  './assets/unnamed.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // addAll rejects the whole install if any single request fails, which
      // would leave the app with no worker at all. Cache what we can instead.
      .then((cache) =>
        Promise.all(
          PRECACHE_URLS.map((url) =>
            cache.add(url).catch(() => {
              /* optional asset — ignore */
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('archivio-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only GETs are cacheable, and never touch the API or other origins.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isHTML =
    request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Last resort for a deep link that was never visited: the shell.
    const shell = await cache.match('./index.html');
    if (shell) return shell;
    throw err;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: false });

  const network = fetch(request)
    .then((response) => {
      // Opaque cross-origin responses (fonts, Boxicons) are still worth
      // caching; they just cannot be inspected.
      if (response && (response.ok || response.type === 'opaque')) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || (await network) || Response.error();
}
