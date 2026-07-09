const CACHE = "plan10k-v20";
const ASSETS = ["/", "/index.html", "/manifest.json"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  // Ne pas intercepter les appels API Strava, GitHub Gist et Open-Meteo :
  // ces requêtes doivent toujours atteindre le réseau, jamais servies
  // depuis le cache.
  if (e.request.url.includes("/api/") || e.request.url.includes("open-meteo") || e.request.url.includes("strava.com") || e.request.url.includes("github.com")) return;

  // Stratégie network-first : toujours essayer le réseau en premier, cache
  // en secours hors-ligne uniquement.
  e.respondWith(
    fetch(e.request)
      .then(resp => {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return resp;
      })
      .catch(() =>
        caches.match(e.request)
          .then(cached => cached || caches.match("/index.html"))
      )
  );
});
