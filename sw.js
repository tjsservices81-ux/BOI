/**
 * Bank of Ireland Mobile PWA Service Worker
 * Handles caching, offline functionality, and prevents blank screens
 * 
 * VERSION: 4.4.0 - Transaction deletion balance fix, notification alerts removed
 * BUILD: {{BUILD_TIMESTAMP}}
 */

const SW_VERSION = '4.4.0';
const BUILD_TIMESTAMP = Date.now();
const CACHE_NAME = `boi-mobile-v${SW_VERSION}-${BUILD_TIMESTAMP}`;
const FALLBACK_CACHE = `boi-fallback-v${SW_VERSION}`;

// Critical assets that must be cached for PWA to work
const CRITICAL_ASSETS = [
  '/',
  '/client/index.html',
  '/client/src/main.tsx',
  '/client/src/App.tsx',
  '/client/src/index.css',
  '/manifest.json',
  '/boi_app_icon.png',
  '/boi_logo.svg'
];

// Assets to cache for better performance
const CACHE_ASSETS = [
  '/icon-footer-accounts.svg',
  '/icon-footer-accounts-highlight.svg',
  '/icon-footer-payments.svg',
  '/icon-footer-payments-highlight.svg',
  '/icon-footer-services.svg',
  '/icon-footer-services-highlight.svg',
  '/icon-footer-apply.svg',
  '/icon-footer-apply-highlight.svg',
  '/icon-footer-more.svg',
  '/icon-footer-more-highlight.svg',
  '/Icons_Fingerprint.svg',
  '/icon_HID.svg'
];

// Network-first patterns for API calls
const NETWORK_FIRST_PATTERNS = [
  /\/api\//,
  /\/auth\//,
  /\/login/,
  /\/dashboard/
];

// Cache-first patterns for static assets
const CACHE_FIRST_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
  /\.(?:css|js|woff|woff2|ttf|eot)$/
];

// Inline fallback HTML generator (used if offline.html file fetch fails)
function createInlineOfflineHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <title>Bank of Ireland - Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: linear-gradient(135deg, #126987 0%, #0e5a75 100%); color: white; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .container { text-align: center; max-width: 400px; }
    .logo { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
    .message { margin-bottom: 30px; line-height: 1.6; }
    .btn { background: white; color: #126987; border: none; padding: 15px 30px; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; margin: 10px; display: block; width: 100%; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Bank of Ireland</div>
    <div class="message">You're currently offline. Please check your internet connection.</div>
    <button class="btn" onclick="location.reload()">Retry Connection</button>
    <button class="btn" onclick="caches.keys().then(k=>Promise.all(k.map(n=>caches.delete(n)))).then(()=>location.reload())">Clear Cache & Reload</button>
  </div>
</body>
</html>`;
}

self.addEventListener('install', (event) => {
  console.log(`📱 PWA Service Worker v${SW_VERSION} installing (build: ${BUILD_TIMESTAMP})...`);
  
  event.waitUntil(
    Promise.all([
      // Cache critical assets with cache-busting query params
      caches.open(CACHE_NAME).then(async (cache) => {
        console.log('💾 Caching critical assets with cache-busting');
        const requests = CRITICAL_ASSETS.concat(CACHE_ASSETS).map(url => {
          const cacheBustUrl = url.includes('?') 
            ? `${url}&v=${SW_VERSION}&t=${BUILD_TIMESTAMP}`
            : `${url}?v=${SW_VERSION}&t=${BUILD_TIMESTAMP}`;
          return new Request(cacheBustUrl, { cache: 'no-cache' });
        });
        
        try {
          await Promise.all(requests.map(async (req) => {
            try {
              const response = await fetch(req, { cache: 'no-cache' });
              if (response.ok) {
                const originalUrl = req.url.split('?')[0];
                await cache.put(originalUrl, response);
              }
            } catch (err) {
              console.warn('Failed to cache:', req.url, err);
            }
          }));
        } catch (err) {
          console.warn('Caching error:', err);
        }
        
        return cache;
      }),
      
      // Cache the actual offline.html file for fallback
      caches.open(FALLBACK_CACHE).then(async (cache) => {
        console.log('💾 Caching offline.html fallback page');
        try {
          // Fetch the actual offline.html file with cache-busting
          const response = await fetch(`/offline.html?v=${SW_VERSION}&t=${BUILD_TIMESTAMP}`, { 
            cache: 'no-cache' 
          });
          if (response.ok) {
            await cache.put('/offline.html', response);
            console.log('✅ offline.html cached successfully');
          } else {
            console.warn('⚠️ Could not fetch offline.html, creating inline fallback');
            // Fallback to inline HTML if file fetch fails
            await cache.put('/offline.html', new Response(createInlineOfflineHTML(), {
              headers: { 'Content-Type': 'text/html' }
            }));
          }
        } catch (err) {
          console.warn('⚠️ Error caching offline.html:', err);
          // Fallback to inline HTML on error
          await cache.put('/offline.html', new Response(createInlineOfflineHTML(), {
            headers: { 'Content-Type': 'text/html' }
          }));
        }
        return cache;
      })
    ]).then(() => {
      console.log('✅ PWA Service Worker installed successfully');
      // Skip waiting to activate immediately
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log(`🚀 PWA Service Worker v${SW_VERSION} activating (build: ${BUILD_TIMESTAMP})...`);
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches but preserve fallback cache
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Always preserve the current fallback cache
            if (cacheName === FALLBACK_CACHE) {
              console.log('✅ Preserving fallback cache:', cacheName);
              return Promise.resolve();
            }
            // Delete old main caches that don't match current version
            if (cacheName.startsWith('boi-mobile-') && 
                (!cacheName.includes(SW_VERSION) || !cacheName.includes(String(BUILD_TIMESTAMP)))) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
            // Delete old fallback caches that don't match current version
            if (cacheName.startsWith('boi-fallback-') && cacheName !== FALLBACK_CACHE) {
              console.log('🗑️ Deleting old fallback cache:', cacheName);
              return caches.delete(cacheName);
            }
            return Promise.resolve();
          })
        );
      }),
      
      // Take control of all clients immediately
      self.clients.claim()
    ]).then(() => {
      console.log(`✅ PWA Service Worker v${SW_VERSION} activated`);
      
      // Notify ALL clients about the new version with full details
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ 
            type: 'SW_ACTIVATED',
            version: SW_VERSION,
            buildTimestamp: BUILD_TIMESTAMP,
            message: `App updated to v${SW_VERSION}`
          });
        });
      });
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests unless it's our API
  if (url.origin !== location.origin) {
    return;
  }
  
  event.respondWith(handleFetch(request));
});

async function handleFetch(request) {
  const url = new URL(request.url);
  
  try {
    // Network-first strategy for API calls and dynamic content
    if (NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname))) {
      return await networkFirstStrategy(request);
    }
    
    // Cache-first strategy for static assets
    if (CACHE_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname))) {
      return await cacheFirstStrategy(request);
    }
    
    // Stale-while-revalidate for HTML pages
    return await staleWhileRevalidateStrategy(request);
    
  } catch (error) {
    console.error('Fetch handler error:', error);
    return await getFallbackResponse(request);
  }
}

async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    throw error;
  }
}

async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Always try to fetch fresh content in background
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // Network failed, but we might have cache
    return null;
  });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Wait for network if no cache
  const networkResponse = await fetchPromise;
  if (networkResponse) {
    return networkResponse;
  }
  
  throw new Error('No cache and network failed');
}

async function getFallbackResponse(request) {
  const url = new URL(request.url);
  
  // For HTML requests, return offline page
  if (request.headers.get('accept')?.includes('text/html')) {
    const offlineResponse = await caches.match('/offline.html');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // Ultimate fallback for main page
    if (url.pathname === '/') {
      const indexResponse = await caches.match('/client/index.html');
      if (indexResponse) {
        return indexResponse;
      }
    }
  }
  
  // For other requests, return a basic error response
  return new Response('Offline - Content unavailable', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain' }
  });
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('📱 Skipping waiting period');
    self.skipWaiting();
  }
});

// Handle errors
self.addEventListener('error', (event) => {
  console.error('PWA Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('PWA Service Worker unhandled rejection:', event.reason);
});

console.log('📱 Bank of Ireland PWA Service Worker loaded');