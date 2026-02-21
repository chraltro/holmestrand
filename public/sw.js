// Huset Service Worker — offline support & caching
const CACHE_VERSION = "huset-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// App shell — core files needed for offline rendering
const APP_SHELL = [
  "/",
  "/channel/generelt",
  "/manifest.json",
  "/favicon.svg",
];

// Install: cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL).catch(() => {
        // Don't fail install if some resources aren't available yet
        console.log("[SW] Some app shell resources unavailable, skipping");
      });
    })
  );
  // Activate immediately without waiting for existing tabs to close
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter(
            (key) =>
              key !== STATIC_CACHE &&
              key !== DYNAMIC_CACHE &&
              key !== IMAGE_CACHE
          )
          .map((key) => caches.delete(key))
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST, DELETE, etc.)
  if (request.method !== "GET") return;

  // Skip Supabase API/realtime requests — always go to network
  if (
    url.hostname.includes("supabase") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  // Images: cache-first with network fallback
  if (
    request.destination === "image" ||
    url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)$/i)
  ) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) => {
        return cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request)
            .then((response) => {
              if (response.ok) {
                cache.put(request, response.clone());
              }
              return response;
            })
            .catch(() => {
              // Return a fallback for failed image loads
              return new Response("", { status: 408 });
            });
        });
      })
    );
    return;
  }

  // Next.js static assets (_next/static): cache-first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }

  // HTML pages: network-first with cache fallback
  if (
    request.headers.get("accept")?.includes("text/html") ||
    request.destination === "document"
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache a copy of successful page loads
          if (response.ok) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline: try cache, then fallback to offline page
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            return caches.match("/").then((index) => {
              if (index) return index;
              return new Response(offlineHTML(), {
                headers: { "Content-Type": "text/html" },
              });
            });
          });
        })
    );
    return;
  }

  // Everything else (JS, CSS, fonts): stale-while-revalidate
  event.respondWith(
    caches.open(DYNAMIC_CACHE).then((cache) => {
      return cache.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached || new Response("", { status: 408 }));

        return cached || networkFetch;
      });
    })
  );
});

// Periodic cache cleanup — keep image cache under 100 entries
self.addEventListener("message", (event) => {
  if (event.data === "CLEAN_CACHES") {
    caches.open(IMAGE_CACHE).then((cache) => {
      cache.keys().then((keys) => {
        if (keys.length > 100) {
          // Delete the oldest 50 entries
          keys.slice(0, 50).forEach((key) => cache.delete(key));
        }
      });
    });
  }
});

function offlineHTML() {
  return `<!DOCTYPE html>
<html lang="nb">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Huset — Frakoblet</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
      background: #1A1520;
      color: #FDF6EC;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .container { text-align: center; max-width: 360px; }
    .icon {
      width: 80px;
      height: 80px;
      border-radius: 20px;
      background: linear-gradient(135deg, #E8A87C, #D4726A);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 36px;
    }
    h1 {
      font-family: 'Fraunces', serif;
      font-size: 24px;
      margin-bottom: 12px;
    }
    p {
      color: rgba(253, 246, 236, 0.6);
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    button {
      background: linear-gradient(135deg, #E8A87C, #D4726A);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🏠</div>
    <h1>Du er frakoblet</h1>
    <p>Det ser ut som du ikke har internettilgang akkurat na. Sjekk tilkoblingen din og prov igjen.</p>
    <button onclick="location.reload()">Prov igjen</button>
  </div>
</body>
</html>`;
}
