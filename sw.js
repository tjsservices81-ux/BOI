// Service Worker for app state persistence and security
const CACHE_NAME = 'boi-mobile-app-v2';
const STATIC_CACHE = 'boi-static-v2';
const DYNAMIC_CACHE = 'boi-dynamic-v2';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/src/main.tsx',
  '/src/index.css',
  '/src/App.tsx'
];

// Security headers for all responses
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
};

// App-specific headers for better caching
const appHeaders = {
  'Cache-Control': 'public, max-age=300', // 5 minutes for app resources
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(STATIC_FILES);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clear old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      clients.claim()
    ])
  );
});

// Cache strategy: Cache First for static assets, Network First for API calls
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle API requests with Network First strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone response for caching
          const responseClone = response.clone();
          
          // Cache successful API responses temporarily
          if (response.status === 200) {
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          
          // Add security headers
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: {
              ...Object.fromEntries(response.headers.entries()),
              ...securityHeaders
            }
          });
        })
        .catch(() => {
          // Try cache if network fails
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return new Response('Offline', {
              status: 503,
              headers: securityHeaders
            });
          });
        })
    );
    return;
  }
  
  // Handle static assets with Cache First strategy
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            // Add to cache
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseToCache);
              });
            
            // Add security headers to app resources
            return new Response(response.body, {
              status: response.status,
              statusText: response.statusText,
              headers: {
                ...Object.fromEntries(response.headers.entries()),
                ...securityHeaders,
                ...appHeaders
              }
            });
          })
          .catch(() => {
            return new Response('Resource not available', {
              status: 404,
              headers: securityHeaders
            });
          });
      })
  );
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