// Service Worker for Offline Banking App
const CACHE_NAME = 'banking-app-v1';
const API_CACHE = 'banking-api-v1';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'
];

// Install service worker and cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker: Installation complete');
        return self.skipWaiting();
      })
  );
});

// Activate service worker and clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE) {
              console.log('🗑️ Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event handler - offline strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  event.respondWith(handleStaticRequest(request));
});

// Handle API requests with cache-first strategy for data, network-first for mutations
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const method = request.method;

  try {
    // For GET requests (data retrieval) - cache first
    if (method === 'GET') {
      const cachedResponse = await caches.match(request);
      
      if (cachedResponse) {
        console.log('📱 Service Worker: Serving cached API data');
        
        // Try to update cache in background
        fetch(request)
          .then(response => {
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(API_CACHE).then(cache => {
                cache.put(request, responseClone);
              });
            }
          })
          .catch(() => {
            // Network failed, cached version is still valid
          });
        
        return cachedResponse;
      }

      // Try network first
      const networkResponse = await fetch(request);
      
      if (networkResponse.ok) {
        const responseClone = networkResponse.clone();
        const cache = await caches.open(API_CACHE);
        cache.put(request, responseClone);
        console.log('🌐 Service Worker: Cached fresh API data');
        return networkResponse;
      }
    }

    // For POST/PUT/DELETE requests (mutations) - network only with queuing
    if (['POST', 'PUT', 'DELETE'].includes(method)) {
      const networkResponse = await fetch(request);
      
      if (networkResponse.ok) {
        return networkResponse;
      } else {
        // Queue the request for later if network fails
        await queueFailedRequest(request);
        return new Response(
          JSON.stringify({ 
            message: 'Request queued for when online',
            offline: true 
          }),
          { 
            status: 202,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Fallback for other requests
    return await fetch(request);
    
  } catch (error) {
    console.log('📱 Service Worker: Network failed, checking cache');
    
    // If network fails, try cache for GET requests
    if (method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    // For mutations, queue the request
    if (['POST', 'PUT', 'DELETE'].includes(method)) {
      await queueFailedRequest(request);
      return new Response(
        JSON.stringify({ 
          message: 'Request queued for when online',
          offline: true 
        }),
        { 
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }

    return new Response('Offline', { status: 503 });
  }
}

// Handle static asset requests with cache-first strategy
async function handleStaticRequest(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// Queue failed requests for background sync
async function queueFailedRequest(request) {
  const requestData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: request.method !== 'GET' ? await request.text() : null,
    timestamp: Date.now()
  };

  // Store in IndexedDB for background sync
  const db = await openDB();
  const transaction = db.transaction(['pendingRequests'], 'readwrite');
  const store = transaction.objectStore('pendingRequests');
  await store.add(requestData);
  
  console.log('📤 Service Worker: Request queued for background sync');
}

// Open IndexedDB for request queuing
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('BankingAppSync', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingRequests')) {
        db.createObjectStore('pendingRequests', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(syncPendingRequests());
  }
});

// Sync pending requests when back online
async function syncPendingRequests() {
  try {
    const db = await openDB();
    const transaction = db.transaction(['pendingRequests'], 'readwrite');
    const store = transaction.objectStore('pendingRequests');
    const requests = await store.getAll();

    for (const requestData of requests) {
      try {
        const response = await fetch(requestData.url, {
          method: requestData.method,
          headers: requestData.headers,
          body: requestData.body
        });

        if (response.ok) {
          await store.delete(requestData.id);
          console.log('✅ Service Worker: Synced pending request');
        }
      } catch (error) {
        console.log('❌ Service Worker: Failed to sync request, will retry later');
      }
    }
  } catch (error) {
    console.error('Service Worker sync error:', error);
  }
}

// Message handling for cache updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_USER_DATA') {
    cacheUserData(event.data.payload);
  }
});

// Cache user-specific data
async function cacheUserData(data) {
  const cache = await caches.open(API_CACHE);
  
  // Cache accounts
  if (data.accounts) {
    const accountsResponse = new Response(JSON.stringify(data.accounts));
    cache.put(`/api/accounts/${data.userId}`, accountsResponse);
  }
  
  // Cache transactions
  if (data.transactions) {
    for (const [accountId, transactions] of Object.entries(data.transactions)) {
      const transactionsResponse = new Response(JSON.stringify(transactions));
      cache.put(`/api/transactions/${accountId}`, transactionsResponse);
    }
  }
  
  // Cache payees
  if (data.payees) {
    const payeesResponse = new Response(JSON.stringify(data.payees));
    cache.put(`/api/payees/${data.userId}`, payeesResponse);
  }
  
  console.log('📱 Service Worker: User data cached for offline access');
}