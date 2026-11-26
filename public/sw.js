const CACHE_NAME = "life-maps-shell-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icon.svg", "/apple-touch-icon.png"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(async path => {
      try { await cache.add(path); } catch { /* An optional icon must not block installation. */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith("life-maps-") && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin ||
      url.pathname.startsWith("/api/") || url.pathname.startsWith("/.well-known/")) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put("/", response.clone());
        return response;
      } catch {
        return (await cache.match(request)) || (await cache.match("/")) ||
          new Response("Нет подключения к интернету. Откройте приложение после восстановления соединения.", {
            status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
      }
    })());
    return;
  }

  if (["script", "style", "image", "font"].includes(request.destination) ||
      /\.(?:js|css|svg|png|webp|woff2?)$/i.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })());
  }
});
