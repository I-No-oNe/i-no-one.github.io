// TuneX Service Worker
// Handles background server-wake notifications and PWA caching

const CACHE_NAME = 'tunex-v1';
const ASSETS = [
  '../../TuneX.html',           // Main HTML in root
  '../themes.json',             // themes.json is in /tuneX/
  '../css/style.css',           // CSS in /tuneX/css/
  '../js/app.js',               // App logic in /tuneX/js/
  './manifest.json',            // Manifest in same folder as SW
  '../icons/icon-192.png',       // Icon path
  '../icons/icon-512.png'       // Icon path
];

// ─── Install: cache static assets ─────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

// ─── Activate: clean old caches ───────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── Fetch: serve from cache, fallback to network ─────────────────────────
self.addEventListener('fetch', (e) => {
  // Don't cache API calls or cross-origin requests
  if (e.request.url.includes('/api/') || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// ─── Message: handle ping-and-notify from main thread ─────────────────────
self.addEventListener('message', async (e) => {
  if (e.data?.type === 'START_WAKE_WATCH') {
    const { backendUrl, token } = e.data;
    startWakeWatch(backendUrl, token);
  }
  if (e.data?.type === 'STOP_WAKE_WATCH') {
    stopWakeWatch();
  }
});

// ─── Background ping: poll /api/ping until server wakes ───────────────────
let wakeWatchTimer = null;
let wakeWatchAttempts = 0;

function stopWakeWatch() {
  if (wakeWatchTimer) { clearTimeout(wakeWatchTimer); wakeWatchTimer = null; }
  wakeWatchAttempts = 0;
}

async function startWakeWatch(backendUrl, token) {
  stopWakeWatch();
  wakeWatchAttempts = 0;
  pollPing(backendUrl, token);
}

async function pollPing(backendUrl, token) {
  wakeWatchAttempts++;
  if (wakeWatchAttempts > 20) {
    // Give up after ~80 seconds of polling from background
    stopWakeWatch();
    return;
  }
  try {
    const r = await fetch(`${backendUrl}/api/ping`, {
      signal: AbortSignal.timeout(6000),
      cache: 'no-store',
    });
    if (r.ok) {
      stopWakeWatch();
      // Check if the client tab is focused — if not, fire notification
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const allHidden = clients.every(c => !c.focused);
      if (allHidden) {
        await self.registration.showNotification('TuneX is ready!', {
          body: 'Server is online — tap to start listening.',
          icon: '../icons/icon-192.png',
          badge: '../icons/icon-192.png',
          tag: 'tunex-ready',
          renotify: false,
          data: { url: self.location.origin + self.registration.scope },
        });
      } else {
        // Tab is open — post message so main thread handles it
        clients.forEach(c => c.postMessage({ type: 'SERVER_READY' }));
      }
      return;
    }
  } catch {}
  // Not ready yet — poll again in 4s
  wakeWatchTimer = setTimeout(() => pollPing(backendUrl, token), 4000);
}

// ─── Notification click: focus or open the app ────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = e.notification.data?.url || self.location.origin;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes('tunex'));
      if (existing) return existing.focus();
      return self.clients.openWindow(target);
    })
  );
});
