/* سكرتيري — يخلي الموقع يفتح بدون إنترنت على الكمبيوتر */
const CACHE = 'sk-v3';
const FILES = ['./', './index.html', './css/app.css', './js/config.js', './js/parser.js', './js/store.js', './js/native.js', './js/geo.js', './js/sync.js', './js/travel.js', './js/app.js', './icon.svg', './manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return;
  // الشبكة أولاً عشان التحديثات توصل، والكاش لو ما فيه نت
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});
