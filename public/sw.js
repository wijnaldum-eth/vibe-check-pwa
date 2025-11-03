const CACHE_NAME = 'vibe-check-v1';
const STATIC_CACHE_NAME = 'vibe-check-static-v1';
const API_CACHE_NAME = 'vibe-check-api-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/_next/static/css/app/layout.css',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Handle different types of requests
  if (url.origin === self.location.origin) {
    // Handle static assets and API routes differently
    if (url.pathname.startsWith('/api/')) {
      // API routes - network first with cache fallback
      event.respondWith(handleApiRequest(request));
    } else if (url.pathname.startsWith('/_next/static/') ||
               url.pathname.startsWith('/favicon') ||
               url.pathname.includes('.png') ||
               url.pathname.includes('.jpg') ||
               url.pathname.includes('.svg')) {
      // Static assets - cache first
      event.respondWith(handleStaticRequest(request));
    } else {
      // Pages - network first with cache fallback
      event.respondWith(handlePageRequest(request));
    }
  } else {
    // External requests - network only
    event.respondWith(fetch(request));
  }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful API responses
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for API request, trying cache:', request.url);

    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return a generic offline response for API requests
    return new Response(
      JSON.stringify({
        error: 'Offline mode - some features may be limited',
        offline: true
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static assets with cache-first strategy
async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Failed to fetch static asset:', request.url);

    // Return cached version if available, otherwise fail
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response('Asset not available offline', { status: 404 });
  }
}

// Handle page requests with network-first strategy
async function handlePageRequest(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for page request, trying cache:', request.url);

    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return the cached homepage as fallback
    const cachedHome = await caches.match('/');
    if (cachedHome) {
      return cachedHome;
    }

    return new Response('Offline - Please check your connection', {
      status: 503,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[SW] Push message received');

  if (!event.data) {
    console.log('[SW] Push event has no data');
    return;
  }

  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'Time to log your crypto sentiment!',
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      vibrate: [200, 100, 200],
      data: data.data || {},
      actions: [
        {
          action: 'open',
          title: 'Open Vibe Check'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ],
      tag: 'vibe-check-daily',
      renotify: true,
      requireInteraction: true,
      silent: false
    };

    event.waitUntil(
      self.registration.showNotification(
        data.title || '🚀 Daily Vibe Check Reminder',
        options
      )
    );
  } catch (error) {
    console.error('[SW] Error handling push message:', error);
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');

  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data || {};

  if (action === 'dismiss') {
    return;
  }

  // Open the app to the appropriate page
  const urlToOpen = notificationData.url || '/dashboard?log=true';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to find an existing window and focus it
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }

        // If no existing window, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Notification close event (for analytics)
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
  // Could send analytics here about notification dismissal
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);

  if (event.tag === 'background-sync-moods') {
    event.waitUntil(syncMoodData());
  }
});

// Sync mood data when back online
async function syncMoodData() {
  try {
    // Get stored mood data from IndexedDB
    const pendingMoods = await getPendingMoods();

    for (const mood of pendingMoods) {
      try {
        const response = await fetch('/api/moods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mood)
        });

        if (response.ok) {
          await removePendingMood(mood.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync mood:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// IndexedDB helpers for offline storage
async function getPendingMoods() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VibeCheckDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pendingMoods'], 'readonly');
      const store = transaction.objectStore('pendingMoods');
      const getAllRequest = store.getAll();

      getAllRequest.onerror = () => reject(getAllRequest.error);
      getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingMoods')) {
        db.createObjectStore('pendingMoods', { keyPath: 'id' });
      }
    };
  });
}

async function removePendingMood(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VibeCheckDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pendingMoods'], 'readwrite');
      const store = transaction.objectStore('pendingMoods');
      const deleteRequest = store.delete(id);

      deleteRequest.onerror = () => reject(deleteRequest.error);
      deleteRequest.onsuccess = () => resolve();
    };
  });
}

// Periodic sync for daily reminders (not widely supported yet)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-reminder') {
    event.waitUntil(showDailyReminder());
  }
});

async function showDailyReminder() {
  try {
    await self.registration.showNotification(
      '🌅 Good morning! Time to log your vibe',
      {
        body: 'Start your day by tracking your crypto sentiment',
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        tag: 'vibe-check-morning',
        requireInteraction: false,
        actions: [
          {
            action: 'open',
            title: 'Log Vibe Now'
          }
        ]
      }
    );
  } catch (error) {
    console.error('[SW] Failed to show daily reminder:', error);
  }
}