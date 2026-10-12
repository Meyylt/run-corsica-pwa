importScripts("https://cdn.jsdelivr.net/npm/idb@8/build/umd.js");

const CACHE_NAME = "runcorse-v3";
const APP_SHELL = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/offline.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  console.log("🔧 SW: Installation en cours...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener("activate", (event) => {
  console.log("✅ SW: Activé !");
  event.waitUntil(
    caches.keys().then((keys) => 
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html")));
  } else {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-outbox") {
    console.log("🔄 SW: Background Sync déclenché !");
    event.waitUntil(flushOutboxSW());
  }
});

async function flushOutboxSW() {
  const db = await idb.openDB("run-corse-db", 1);
  const items = await db.getAll("outbox");
  for (const item of items) {
    try {
      await fetch("https://httpbin.org/post", { method: "POST", body: JSON.stringify(item) });
      await db.delete("outbox", item.id);
    } catch (err) {
      console.error("Erreur de synchronisation depuis le SW", err);
    }
  }
}

self.addEventListener("message", (event) => {
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});