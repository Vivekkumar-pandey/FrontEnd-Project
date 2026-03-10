/**
 * Service Worker — Cache-first for offline gameplay
 * Tic Tac Toe Neon Arena PWA
 */

const CACHE_NAME = 'ttt-neon-v5';
const ASSETS = [
    './',
    './index.html',
    './styles/style.css',
    './scripts/game.js',
    './scripts/ai.js',
    './scripts/ui.js',
    './scripts/state.js',
    './scripts/storage.js',
    './scripts/utils.js',
    './scripts/multiplayer.js',
    './scripts/analytics.js',
    './manifest.json',
];

// Install — pre-cache core assets
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate — clean old caches
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// Fetch — cache-first, fallback to network
self.addEventListener('fetch', (e) => {
    // Skip non-GET and external requests
    if (e.request.method !== 'GET') return;

    e.respondWith(
        caches.match(e.request).then(cached => {
            if (cached) return cached;
            return fetch(e.request).then(response => {
                // Cache successful same-origin responses
                if (response.ok && e.request.url.startsWith(self.location.origin)) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                }
                return response;
            });
        }).catch(() => {
            // Offline fallback — return cached index
            if (e.request.mode === 'navigate') {
                return caches.match('./index.html');
            }
        })
    );
});
