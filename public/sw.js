// Vaktlogg som app (installert fra Chrome): mellomlagrer filene, så appen starter raskt og virker uten nett.
// Selve siden hentes fra nettet først (så en ny versjon kommer med en gang); bilder, skript og fonter fra lageret.
const CACHE = 'vaktlogg-v2'

// Ved installering: legg startsiden og filene den peker på i lageret, så appen virker uten nett fra første stund
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      const res = await fetch('./', { cache: 'reload' })
      await cache.put('./', res.clone())
      const html = await res.text()
      const files = [...html.matchAll(/(?:src|href)="(\.?\/?[^"#?]+\.(?:js|css|png|svg|webp|webmanifest|woff2?))"/g)].map((m) => m[1])
      await cache.addAll([...new Set(files)])
    })().catch(() => {}),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return
  if (req.mode === 'navigate') {
    // Siden: nettet først, lageret når du er uten nett
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy))
          return res
        })
        .catch(() => caches.match(req, { ignoreSearch: true, ignoreVary: true }).then((hit) => hit ?? caches.match('./'))),
    )
    return
  }
  // Filene: lageret først, og oppdater i bakgrunnen
  const update = caches.open(CACHE).then((cache) =>
    fetch(req).then((res) => {
      if (res.ok) cache.put(req, res.clone())
      return res
    }),
  )
  event.waitUntil(update.catch(() => undefined))
  event.respondWith(caches.match(req, { ignoreVary: true }).then((hit) => hit ?? update))
})
