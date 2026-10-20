/* eslint-disable no-restricted-globals */

// Cache versioning
const CACHE_VERSION = 'v16';
const STATIC_CACHE = `anjou-edition-static-${CACHE_VERSION}`;
const MEDIA_CACHE = `anjou-edition-media-${CACHE_VERSION}`;
const PDF_CACHE = `anjou-edition-pdf-${CACHE_VERSION}`;

const ALL_CACHES = [STATIC_CACHE, MEDIA_CACHE, PDF_CACHE];

// Vérifie que l'URL de la requête utilise bien http: ou https: (exclut chrome-extension:, blob:, data:, etc.)
const isCacheableRequest = (req) => {
  if (!req) return false;
  const rawUrl = typeof req === 'string' ? req : req.url;
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  return rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('/');
};

// Écriture sécurisée dans le Cache API (ignore silencieusement les schémas d'extensions navigateur)
const safeCachePut = async (cache, req, res) => {
  try {
    if (!cache || !res || !isCacheableRequest(req)) return;
    await cache.put(req, res);
  } catch (e) {
    // Ignore unsupported schemes (e.g. chrome-extension://) or quota errors
  }
};

// Garantie absolue qu'une réponse passée à event.respondWith() est une instance de Response valide
const ensureValidResponse = (res, fallbackStatus = 504, fallbackText = 'Offline') => {
  if (res && typeof Response !== 'undefined' && res instanceof Response) {
    return res;
  }
  return new Response('', { status: fallbackStatus, statusText: fallbackText });
};

const getSpaFallbackResponse = async () => {
  try {
    const indexMatch = await caches.match('/index.html', { ignoreSearch: true });
    if (indexMatch) return indexMatch;

    const rootMatch = await caches.match('/', { ignoreSearch: true });
    if (rootMatch) return rootMatch;

    const netRes = await fetch('/index.html');
    if (netRes) return netRes;
  } catch (e) {
    // ignore
  }

  return new Response(
    '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Anjou Édition</title></head><body><div id="root"></div></body></html>',
    {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    }
  );
};

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
      return Promise.all(
        STATIC_ASSETS.map((asset) => {
          const req = new Request(asset, { cache: 'reload' });
          return fetch(req)
            .then((res) => {
              if (res && res.status === 200) {
                return safeCachePut(cache, asset, res);
              }
            })
            .catch((err) => {
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
  if (!request || !request.url) return;

  // Ignorer immédiatement les schémas d'extensions (chrome-extension://, moz-extension://, blob:, data:)
  if (!request.url.startsWith('http://') && !request.url.startsWith('https://')) {
    return;
  }

  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }

  // Skip non-GET requests and dynamic Firebase authentication/database endpoints
  if (
    request.method !== 'GET' ||
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('generativelanguage.googleapis.com') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebasestorage.googleapis.com')
  ) {
    return;
  }

  // 1. PDF FLIPBOOK DOCUMENTS STRATEGY (Cache-First with Background Update)
  if (url.pathname.endsWith('.pdf') || request.url.includes('.pdf')) {
    event.respondWith(
      caches.open(PDF_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              safeCachePut(cache, request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse || ensureValidResponse(null, 504, 'PDF Offline'));

        const resolved = cachedResponse || (await fetchPromise);
        return ensureValidResponse(resolved, 504, 'PDF Offline');
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
    /\.(jpg|jpeg|png|gif|webp|svg|mp3|ogg)$/i.test(url.pathname);

  if (isImageOrMedia) {
    event.respondWith(
      caches.open(MEDIA_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              safeCachePut(cache, request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse || ensureValidResponse(null, 504, 'Media Offline'));

        const resolved = cachedResponse || (await fetchPromise);
        return ensureValidResponse(resolved, 504, 'Media Offline');
      })
    );
    return;
  }

  // 3. HTML SPA NAVIGATION & APP SHELL STRATEGY (Network-First with guaranteed index.html Response fallback)
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then(async (networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => safeCachePut(cache, '/index.html', copy)).catch(() => {});
            return networkResponse;
          }
          if (networkResponse && networkResponse.status === 404) {
            return await getSpaFallbackResponse();
          }
          return networkResponse || (await getSpaFallbackResponse());
        })
        .catch(async () => {
          return await getSpaFallbackResponse();
        })
    );
    return;
  }

  // 4. STATIC SCRIPTS, STYLES & FONTS (Stale-While-Revalidate)
  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const cachedResponse = await cache.match(request);
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            safeCachePut(cache, request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => cachedResponse || ensureValidResponse(null, 504, 'Asset Offline'));

      const resolved = cachedResponse || (await fetchPromise);
      return ensureValidResponse(resolved, 504, 'Asset Offline');
    })
  );
});
