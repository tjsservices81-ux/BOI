// Bank of Ireland PWA Service Worker
// Provides offline support with intelligent caching strategy

const CACHE_NAME = 'boi-banking-v1';
const RUNTIME_CACHE = 'boi-runtime-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/background.jpg',
  '/boi_logo.svg',
  '/Icons_Fingerprint.svg',
  '/apple_Pay_Mark.svg',
  '/PDF.svg',
  '/check.svg',
  '/OpenSans-Regular-webfont.woff',
  '/OpenSans-Bold-webfont.woff',
  '/OpenSans-Light-webfont.woff',
  '/OpenSans-Semibold-webfont.woff'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  '/api/health',
  '/api/auth/validate/',
  '/api/accounts',
  '/api/transactions'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
      })
      .then(() => {
        console.log('Service Worker: Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated successfully');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API requests - Network First with Cache Fallback
    event.respondWith(handleApiRequest(request));
  } else if (STATIC_ASSETS.some(asset => url.pathname === asset || url.pathname.endsWith(asset))) {
    // Static assets - Cache First
    event.respondWith(handleStaticAsset(request));
  } else if (url.pathname.startsWith('/') && !url.pathname.includes('.')) {
    // SPA routes - Network First with Cache Fallback to index.html
    event.respondWith(handleSpaRoute(request));
  } else {
    // Other assets (fonts, images, etc.) - Cache First with Network Fallback
    event.respondWith(handleOtherAssets(request));
  }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first
    const networkResponse = await fetch(request.clone());
    
    // Cache successful responses for certain endpoints
    if (networkResponse.ok && shouldCacheApiResponse(url.pathname)) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request.clone(), networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed for API request, trying cache:', url.pathname);
    
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Add offline indicator header
      const response = cachedResponse.clone();
      response.headers.set('X-Served-By', 'service-worker-cache');
      return response;
    }
    
    // Return offline response for certain endpoints
    return createOfflineApiResponse(url.pathname);
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Failed to fetch static asset:', request.url);
    throw error;
  }
}

// Handle SPA routes
async function handleSpaRoute(request) {
  try {
    // Try network first
    return await fetch(request);
  } catch (error) {
    // Fallback to cached index.html for SPA routing
    console.log('Service Worker: Network failed for SPA route, serving cached index.html');
    const cache = await caches.open(CACHE_NAME);
    return await cache.match('/index.html') || await cache.match('/');
  }
}

// Handle other assets with cache-first strategy
async function handleOtherAssets(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Failed to fetch asset:', request.url);
    throw error;
  }
}

// Check if API response should be cached
function shouldCacheApiResponse(pathname) {
  return API_CACHE_PATTERNS.some(pattern => pathname.includes(pattern));
}

// Create offline API responses
function createOfflineApiResponse(pathname) {
  if (pathname.includes('/api/health')) {
    return new Response(JSON.stringify({
      status: 'offline',
      timestamp: new Date().toISOString(),
      server: 'Bank of Ireland API (Offline)'
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  }
  
  // Default offline response
  return new Response(JSON.stringify({
    error: 'Offline',
    message: 'This feature requires an internet connection'
  }), {
    headers: { 'Content-Type': 'application/json' },
    status: 503
  });
}

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
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