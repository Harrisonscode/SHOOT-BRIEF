const CACHE_NAME = "shootbrief-v1";

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  "/",
  "/dashboard",
  "/offline.html",
];

// Install — cache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => {
        // Don't fail install if precaching fails
      });
    })
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network first, fall back to cache, then offline page
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and external requests
  if (request.method !== "GET") return;
  if (!url.origin.includes(self.location.origin)) return;
  // Skip API and Supabase calls — always go to network
  if (url.pathname.startsWith("/api/") || url.hostname.includes("supabase")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses for static assets
        if (response.ok && (
          url.pathname.startsWith("/assets/") ||
          url.pathname.startsWith("/icons/") ||
          url.pathname === "/manifest.json" ||
          url.pathname === "/favicon.svg"
        )) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // Network failed — try cache
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // For navigation requests, show offline page
          if (request.mode === "navigate") {
            return caches.match("/offline.html").then((offlinePage) => {
              return offlinePage || new Response(
                "<h1>You're offline</h1><p>Open Shoot Brief when you have a connection.</p>",
                { headers: { "Content-Type": "text/html" } }
              );
            });
          }
          return new Response("Offline", { status: 503 });
        });
      })
  );
});
