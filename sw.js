// Service Worker for additional security measures
const CACHE_NAME = 'boi-mobile-secure-v1';

// Security headers for all responses
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
};

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Intercept all fetch requests to add security headers
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response to modify headers
        const modifiedResponse = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: {
            ...Object.fromEntries(response.headers.entries()),
            ...securityHeaders
          }
        });
        
        return modifiedResponse;
      })
      .catch(() => {
        // Return a secure error response
        return new Response('Security: Access Denied', {
          status: 403,
          headers: securityHeaders
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