const CACHE = "gtgroup-v2";
const CORE = [
  "./",
  "index.html",
  "about.html",
  "download.html",
  "subscribe.html",
  "reports.html",
  "library.html",
  "weekly-report.html",
  "monthly-report.html",
  "educational-guide.html",
  "institutional-guide.html",
  "book.html",
  "style.css",
  "reports.js",
  "supabase-config.js",
  "manifest.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
