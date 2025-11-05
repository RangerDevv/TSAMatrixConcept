// Service Worker for TSA Matrix - Offline Caching
const CACHE_NAME = 'tsa-matrix-v1';
const STATIC_CACHE_NAME = 'tsa-matrix-static-v1';
const DYNAMIC_CACHE_NAME = 'tsa-matrix-dynamic-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/matrix',
  '/registerToMatrix',
  '/favicon.svg',
  // Add any other critical static assets
];

// API endpoints that should be cached
const API_CACHE_PATTERNS = [
  /\/v1\/databases\/.*\/collections\/.*\/documents/,
  /\/v1\/account/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME && 
                cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Handle navigation requests (pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            // Serve from cache, but also try to update in background
            fetch(request)
              .then((fetchResponse) => {
                if (fetchResponse && fetchResponse.status === 200) {
                  const responseClone = fetchResponse.clone();
                  caches.open(STATIC_CACHE_NAME)
                    .then((cache) => cache.put(request, responseClone));
                }
              })
              .catch(() => {}); // Ignore fetch errors when updating cache
            return response;
          }
          
          // Not in cache, try network
          return fetch(request)
            .then((fetchResponse) => {
              if (fetchResponse && fetchResponse.status === 200) {
                const responseClone = fetchResponse.clone();
                caches.open(STATIC_CACHE_NAME)
                  .then((cache) => cache.put(request, responseClone));
              }
              return fetchResponse;
            })
            .catch(() => {
              // Network failed, return offline fallback
              return caches.match('/') || new Response('Offline', { 
                status: 503, 
                statusText: 'Service Unavailable' 
              });
            });
        })
    );
    return;
  }

  // Handle API requests (Appwrite)
  if (url.hostname.includes('appwrite') || API_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
    event.respondWith(
      // Network first strategy for API calls
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE_NAME)
              .then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request)
            .then((response) => {
              if (response) {
                return response;
              }
              // Return offline indicator for API calls
              return new Response(JSON.stringify({ 
                error: 'Offline', 
                message: 'This data is not available offline' 
              }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              });
            });
        })
    );
    return;
  }

  // Handle static assets (CSS, JS, images)
  if (request.destination === 'style' || 
      request.destination === 'script' || 
      request.destination === 'image' ||
      request.destination === 'font') {
    event.respondWith(
      // Cache first strategy for static assets
      caches.match(request)
        .then((response) => {
          if (response) {
            return response;
          }
          
          return fetch(request)
            .then((fetchResponse) => {
              if (fetchResponse && fetchResponse.status === 200) {
                const responseClone = fetchResponse.clone();
                caches.open(STATIC_CACHE_NAME)
                  .then((cache) => cache.put(request, responseClone));
              }
              return fetchResponse;
            });
        })
    );
    return;
  }

  // Default: try network first, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE_NAME)
            .then((cache) => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-matrix-data') {
    event.waitUntil(
      // Here you could implement logic to sync offline changes
      // when the connection is restored
      syncOfflineData()
    );
  }
});

// Function to sync offline data when connection is restored
async function syncOfflineData() {
  try {
    // Get any pending offline actions from IndexedDB or localStorage
    // and attempt to sync them with the server
    console.log('[SW] Syncing offline data...');
    // Implementation would depend on your specific offline action storage
  } catch (error) {
    console.error('[SW] Failed to sync offline data:', error);
  }
}

// Handle push notifications (if needed in the future)
self.addEventListener('push', (event) => {
  console.log('[SW] Push message received');
  // Implementation for push notifications if needed
});