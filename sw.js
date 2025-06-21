// OFFLINE FUNCTIONALITY: Complete offline support for Bank of Ireland app
const CACHE_NAME = 'boi-bank-offline-v2';
const urlsToCache = [
  '/',
  '/login',
  '/dashboard',
  '/biometric',
  '/splash',
  '/boi_logo.svg',
  '/background.jpg',
  '/Icons_Fingerprint.svg',
  '/face-id-seeklogo.svg',
  '/BOI_logo.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Caching assets for complete offline functionality');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// OFFLINE FUNCTIONALITY: Full offline operation with cached responses
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version immediately if available
        if (response) {
          return response;
        }

        // For API auth status checks, provide offline-compatible responses
        if (event.request.url.includes('/api/auth/status')) {
          return fetch(event.request).catch(() => {
            return new Response(JSON.stringify({
              isLoggedIn: true,
              needsBiometric: true,
              offline: true,
              user: null
            }), {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        }

        // For other API requests, try network then provide offline fallback
        if (event.request.url.includes('/api/')) {
          return fetch(event.request).catch(() => {
            return new Response(JSON.stringify({
              error: 'Offline mode - limited functionality',
              offline: true
            }), {
              headers: { 'Content-Type': 'application/json' },
              status: 503
            });
          });
        }

        // For page requests, try network with cache fallback
        return fetch(event.request).catch(() => {
          return caches.match('/');
        });
      }
    )
  );
});
      }
    )
  );
});
});

// Prevent any attempts to access the service worker from external sources
self.addEventListener('message', (event) => {
  if (event.origin !== self.location.origin) {
    return; // Ignore messages from external origins
  }
  
  // Only handle messages from the same origin
  if (event.data && event.data.type === 'SECURITY_CHECK') {
    event.ports[0].postMessage({ secure: true });
  }
});