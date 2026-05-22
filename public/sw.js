// FieldApp Service Worker — Offline + Sync
const CACHE = 'schnellr-v16';
const SHELL = [
  './app.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
];

// Install: Shell cachen
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// Activate: alten Cache löschen
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: Cache-first für Shell, Network-first für Supabase
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Supabase API → immer Network, bei Fehler nichts aus Cache
  if (url.includes('supabase.co')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', {status: 503})));
    return;
  }

  // Nominatim (Geocoding) → nur Network
  if (url.includes('nominatim.openstreetmap.org')) {
    e.respondWith(fetch(e.request).catch(() => new Response('[]', {
      headers: {'Content-Type': 'application/json'}
    })));
    return;
  }

  // Alles andere: Cache-first, dann Network, dann Cache-Fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('./app.html'));
    })
  );
});

// Background Sync: Offline-Queue flushen
self.addEventListener('sync', e => {
  if (e.tag === 'fieldapp-sync') {
    e.waitUntil(self.clients.matchAll().then(clients => {
      clients.forEach(c => c.postMessage({type: 'FLUSH_QUEUE'}));
    }));
  }
});

// Push-Benachrichtigung empfangen + anzeigen
self.addEventListener('push', e => {
  let data = { title: 'SchnellR', body: 'Neue Benachrichtigung', url: '/', icon: '/icon-192.png' };
  try { if (e.data) data = { ...data, ...e.data.json() }; } catch (_) {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:  data.body,
      icon:  data.icon,
      badge: '/icon-192.png',
      data:  { url: data.url },
      vibrate: [100, 50, 100],
      actions: [{ action: 'open', title: 'Öffnen' }],
    })
  );
});

// Klick auf Benachrichtigung → App öffnen
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url ?? '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const c of clientList) {
        if (c.url.includes(self.location.origin) && 'focus' in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
