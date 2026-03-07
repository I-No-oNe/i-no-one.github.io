// TuneX Service Worker — v3
// Handles background server-wake notifications and PWA caching

const CACHE_NAME = 'tunex-v3';
const ASSETS = [
  '../../TuneX.html',
  '../themes.json',
  '../css/style.css',
  '../js/app.js',
  './manifest.json',
  '../icons/icon-192.png',
  '../icons/icon-512.png'
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

// ─── Message: handle commands from main thread ────────────────────────────
let wakeWatchTimer = null;
let wakeWatchAttempts = 0;
let _backendUrl = '';
let _token = '';
let _isWatching = false;

self.addEventListener('message', async (e) => {
  const { type, backendUrl, token } = e.data || {};

  if (type === 'START_WAKE_WATCH') {
    _backendUrl = backendUrl || _backendUrl;
    _token = token || _token;
    startWakeWatch(_backendUrl, _token);
  }

  if (type === 'STOP_WAKE_WATCH') {
    stopWakeWatch();
  }

  if (type === 'PING_SW') {
    e.ports?.[0]?.postMessage({ type: 'PONG' });
  }
});

// ─── Background ping: poll /api/ping until server wakes ───────────────────
function stopWakeWatch() {
  _isWatching = false;
  if (wakeWatchTimer) { clearTimeout(wakeWatchTimer); wakeWatchTimer = null; }
  wakeWatchAttempts = 0;
}

async function startWakeWatch(backendUrl, token) {
  if (_isWatching) return; // already running
  stopWakeWatch();
  _isWatching = true;
  wakeWatchAttempts = 0;
  pollPing(backendUrl, token);
}

async function pollPing(backendUrl, token) {
  if (!_isWatching) return;

  wakeWatchAttempts++;
  // Give up after ~8 minutes (60 attempts × 8s)
  if (wakeWatchAttempts > 60) {
    stopWakeWatch();
    return;
  }

  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 7000);
    const r = await fetch(`${backendUrl}/api/ping`, {
      signal: controller.signal,
      cache: 'no-store',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    clearTimeout(tid);

    if (r.ok) {
      stopWakeWatch();
      await notifyServerReady(backendUrl);
      return;
    }
  } catch (err) {
    // Network error or timeout — keep trying
  }

  // Check if a visible client is now showing — if so, let main thread handle it
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const hasVisible = clients.some(c => c.visibilityState === 'visible');
  if (hasVisible) {
    // Post message so main thread can handle the "server ready" state
    clients.forEach(c => c.postMessage({ type: 'SERVER_READY' }));
    stopWakeWatch();
    return;
  }

  // Schedule next attempt in 8s
  wakeWatchTimer = setTimeout(() => pollPing(backendUrl, token), 8000);
}

async function notifyServerReady(backendUrl) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

  // Always post message to any open tabs
  clients.forEach(c => c.postMessage({ type: 'SERVER_READY' }));

  // Only show notification if no tab is currently focused/visible
  const hasVisibleClient = clients.some(c => c.visibilityState === 'visible');
  if (hasVisibleClient) return;

  // Fire the system notification
  try {
    await self.registration.showNotification('TuneX is ready! 🎵', {
      body: 'The server is online — tap to start listening.',
      icon: '../icons/icon-192.png',
      badge: '../icons/icon-192.png',
      tag: 'tunex-ready',
      renotify: false,
      requireInteraction: false,
      silent: false,
      data: {
        url: self.registration.scope
      },
      actions: [
        { action: 'open', title: '▶ Open TuneX' }
      ]
    });
  } catch (err) {
    console.warn('[TuneX SW] showNotification failed:', err);
  }
}

// ─── Notification click: focus or open the app ────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const targetUrl = e.notification.data?.url || self.registration.scope;

  e.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        // Try to focus an existing TuneX tab
        const existing = clients.find(c =>
            c.url.includes('TuneX') ||
            c.url.includes('tunex') ||
            c.url.startsWith(self.registration.scope)
        );
        if (existing) {
          existing.focus();
          existing.postMessage({ type: 'SERVER_READY' });
          return;
        }
        // Otherwise open a new tab
        return self.clients.openWindow(targetUrl);
      })
  );
});

// ─── Push (future Web Push support) ───────────────────────────────────────
self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data?.json() ?? {}; } catch { data = { body: e.data?.text() || '' }; }
  e.waitUntil(
      self.registration.showNotification(data.title || 'TuneX', {
        body: data.body || '',
        icon: '../icons/icon-192.png',
        badge: '../icons/icon-192.png',
        tag: data.tag || 'tunex-push',
        data
      })
  );
});