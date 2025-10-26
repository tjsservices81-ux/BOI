/**
 * Bank of Ireland Mobile PWA Service Worker
 * Handles caching, offline functionality, and prevents blank screens
 */

const CACHE_NAME = 'boi-mobile-v3.5.0';
const FALLBACK_CACHE = 'boi-fallback-v1.0.0';

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

self.addEventListener('install', (event) => {
  console.log('📱 PWA Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache critical assets
      caches.open(CACHE_NAME).then((cache) => {
        console.log('💾 Caching critical assets');
        return cache.addAll(CRITICAL_ASSETS.concat(CACHE_ASSETS));
      }),
      
      // Create fallback cache with offline page
      caches.open(FALLBACK_CACHE).then((cache) => {
        const offlineHTML = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <meta name="apple-mobile-web-app-capable" content="yes">
            <title>Bank of Ireland - Offline</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                background: linear-gradient(135deg, #126987 0%, #0e5a75 100%);
                color: white; min-height: 100vh; display: flex;
                align-items: center; justify-content: center; padding: 20px;
              }
              .container { text-align: center; max-width: 400px; }
              .logo { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
              .message { margin-bottom: 30px; line-height: 1.6; }
              .retry-btn { 
                background: white; color: #126987; border: none;
                padding: 15px 30px; border-radius: 8px; font-size: 16px;
                font-weight: 600; cursor: pointer; margin: 10px;
              }
              .loading { 
                display: inline-block; width: 20px; height: 20px;
                border: 2px solid rgba(255,255,255,0.3);
                border-radius: 50%; border-top-color: white;
                animation: spin 1s ease-in-out infinite;
              }
              @keyframes spin { to { transform: rotate(360deg); } }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">Bank of Ireland</div>
              <div class="message">
                <div id="statusMessage">Connecting to your banking app...</div>
                <div class="loading" id="loader"></div>
              </div>
              <button class="retry-btn" onclick="retryConnection()">Retry Connection</button>
              <button class="retry-btn" onclick="clearCache()">Clear Cache & Reload</button>
            </div>
            <script>
              let retryCount = 0;
              const maxRetries = 3;
              
              function updateStatus(message, showLoader = true) {
                document.getElementById('statusMessage').textContent = message;
                document.getElementById('loader').style.display = showLoader ? 'inline-block' : 'none';
              }
              
              async function retryConnection() {
                retryCount++;
                updateStatus('Attempting to reconnect...');
                
                try {
                  const response = await fetch('/', { cache: 'no-cache' });
                  if (response.ok) {
                    updateStatus('Connection restored! Redirecting...', false);
                    setTimeout(() => window.location.reload(), 1000);
                    return;
                  }
                } catch (error) {
                  console.log('Retry failed:', error);
                }
                
                if (retryCount >= maxRetries) {
                  updateStatus('Unable to connect. Please check your internet connection.', false);
                } else {
                  updateStatus('Retrying connection...', true);
                  setTimeout(retryConnection, 2000);
                }
              }
              
              async function clearCache() {
                updateStatus('Clearing cache...');
                try {
                  if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                  }
                  updateStatus('Cache cleared. Reloading...', false);
                  setTimeout(() => window.location.reload(true), 1000);
                } catch (error) {
                  updateStatus('Cache clear failed. Please try manually.', false);
                }
              }
              
              // Auto-retry on load
              setTimeout(retryConnection, 2000);
              
              // Check for connection restore
              window.addEventListener('online', () => {
                updateStatus('Connection detected! Reloading...', false);
                setTimeout(() => window.location.reload(), 1000);
              });
            </script>
          </body>
          </html>
        `;
        
        return cache.put('/offline.html', new Response(offlineHTML, {
          headers: { 'Content-Type': 'text/html' }
        }));
      })
    ]).then(() => {
      console.log('✅ PWA Service Worker installed successfully');
      // Skip waiting to activate immediately
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('🚀 PWA Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== FALLBACK_CACHE) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Take control immediately
      self.clients.claim()
    ]).then(() => {
      console.log('✅ PWA Service Worker activated');
      
      // Notify clients that SW is ready
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_ACTIVATED' });
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