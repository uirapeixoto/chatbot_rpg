self.addEventListener('install', e => {
  e.waitUntil(caches.open('rpg-v1').then(c => c.addAll(['/', '/app.js', '/styles.css'])))
})
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)))
})
