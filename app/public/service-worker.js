/* eslint-disable no-restricted-globals */

// Cache versioning
const CACHE_VERSION = 'v3';
const STATIC_CACHE = `anjou-edition-static-${CACHE_VERSION}`;
const MEDIA_CACHE = `anjou-edition-media-${CACHE_VERSION}`;
const PDF_CACHE = `anjou-edition-pdf-${CACHE_VERSION}`;

const ALL_CACHES = [STATIC_CACHE, MEDIA_CACHE, PDF_CACHE];

// Core shell assets to pre-cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  '/page-turn.mp3',
  '/secrets_vignoble_angevin.pdf',
  '/Seraphin-le-marin.pdf'
];

// Install Event: pre-cache static shell & core flipbook PDFs
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Use map with individual catches so if one asset fails, the rest still install
      return Promise.all(
        STATIC_ASSETS.map((asset) => {
          return cache.add(asset).catch((err) => {
            console.warn(`[Service Worker] Impossible de pré-mettre en cache l'asset : ${asset}`, err);
          });
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: purge stale caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !ALL_CACHES.includes(name))
          .map((staleName) => {
            console.log(`[Service Worker] Suppression de l'ancien cache : ${staleName}`);
            return caches.delete(staleName);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Intelligent multi-tier offline caching strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests and dynamic Firebase authentication/database endpoints
  if (
    request.method !== 'GET' ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('generativelanguage.googleapis.com') ||
    url.hostname.includes('firestore.googleapis.com')
  ) {
    return;
  }

  // 1. PDF FLIPBOOK DOCUMENTS STRATEGY (Cache-First with Background Update)
  if (url.pathname.endsWith('.pdf') || request.url.includes('.pdf')) {
    event.respondWith(
      caches.open(PDF_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 2. IMAGES & AUDIO MEDIA STRATEGY (Stale-While-Revalidate)
  const isImageOrMedia = 
    request.destination === 'image' ||
    request.destination === 'audio' ||
    url.hostname.includes('images.unsplash.com') ||
    url.hostname.includes('picsum.photos') ||
    url.hostname.includes('firebasestorage.googleapis.com') ||
    /\.(jpg|jpeg|png|gif|webp|svg|mp3|ogg)$/i.test(url.pathname);

  if (isImageOrMedia) {
    event.respondWith(
      caches.open(MEDIA_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 3. HTML SPA NAVIGATION & APP SHELL STRATEGY (Network-First with offline index.html fallback)
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // 4. STATIC SCRIPTS, STYLES & FONTS (Stale-While-Revalidate)
  event.respondWith(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      });
    })
  );
});
