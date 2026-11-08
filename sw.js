/**
 * MOVE ON service worker: precached app shell (relative paths, works under any sub-path),
 * stale-while-revalidate for app files and a runtime cache for Google Fonts. Offline-first.
 */

const VERSION = 'v2.1.1';
const SHELL_CACHE = `moveon-shell-${VERSION}`;
const FONT_CACHE = 'moveon-fonts-v1';

const SHELL = [
  './',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
  'js/app.js',
  'js/router.js',
  'js/state.js',
  'js/ui.js',
  'js/icons.js',
  'js/tree.js',
  'js/goals.js',
  'js/poses.js',
  'js/metrics.js',
  'js/logger.js',
  'js/moderator.js',
  'js/tasks/index.js',
  'js/tasks/flashcards.js',
  'js/tasks/countdown.js',
  'js/tasks/breathing.js',
  'js/tasks/sequence.js',
  'js/tasks/reading.js',
  'js/tasks/custom.js',
  'js/screens/start.js',
  'js/screens/step.js',
  'js/screens/success.js',
  'js/screens/home.js',
  'js/screens/progress.js',
  'js/screens/safe.js',
  'js/screens/deposit.js',
  'js/sheets/register.js',
  'js/sheets/confirm.js',
  'js/sheets/cards.js',
];

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL.map((p) => new Request(p, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('moveon-') && k !== SHELL_CACHE && k !== FONT_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreSearch: cacheName === SHELL_CACHE });
  const network = fetch(request)
    .then((res) => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || (await network) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request, FONT_CACHE));
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL_CACHE);
      const cached = await cache.match('index.html');
      const network = fetch(request)
        .then((res) => { if (res.ok) cache.put('index.html', res.clone()); return res; })
        .catch(() => null);
      return cached || (await network) || Response.error();
    })());
    return;
  }
  event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
});
