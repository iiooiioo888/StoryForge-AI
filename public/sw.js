// ============================================
// StoryForge AI — Service Worker v1.0
// ============================================
const CACHE_NAME = 'storyforge-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/variables.css',
  '/css/base.css',
  '/css/nav.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/animations.css',
  '/css/decorations.css',
  '/css/pages/create.css',
  '/css/pages/explore.css',
  '/css/pages/prompts.css',
  '/js/app.js',
  '/js/api.js',
  '/js/utils.js',
  '/js/auth.js',
  '/js/components.js',
  '/js/router.js',
  '/js/pages/home.js',
  '/js/pages/workshop.js',
  '/js/pages/library.js',
  '/js/pages/prompts.js',
  '/js/pages/camera.js',
  '/js/pages/dashboard.js',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: cache-first for static assets, network-first for API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API requests: network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache new static assets
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    })
  );
});
