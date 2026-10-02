const CACHE_NAME = "agenda-corretor-v65";
const APP_SHELL = ["/", "/index.html", "/offline.html", "/manifest.webmanifest", "/icons/favicon-32.png", "/icons/icon-192.png", "/icons/icon-512.png", "/brand/mv-broker-logo.jpg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/") || caches.match("/offline.html"))
    );
    return;
  }

  const isCode = ["script", "style", "worker"].includes(request.destination);
  if (isCode) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && new URL(request.url).origin === self.location.origin) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) ?? Response.error())
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) =>
      cached ?? fetch(request).then((response) => {
        if (response.ok && new URL(request.url).origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
    )
  );
});

self.addEventListener("push", () => {
  // Preparado para notificações futuras; a assinatura será implementada em etapa própria.
});
