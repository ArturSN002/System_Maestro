/**
 * ============================================================================
 * SERVICE WORKER - PORTAL MAESTRO
 * App shell offline, cache runtime e push background.
 * ============================================================================
 */

const MAESTRO_SW_VERSION = "12.38.0-qa-stabilization";
const CACHE_NAME = "maestro-shell-" + MAESTRO_SW_VERSION;
const DYNAMIC_CACHE = "maestro-runtime-" + MAESTRO_SW_VERSION;
const MAP_TILES_CACHE = "maestro-map-tiles-v1";
const OFFLINE_FALLBACK_URL = "./index.html";
const OFFLINE_DB_NAME = "MaestroOfflineDB";
const OFFLINE_DB_VERSION = 2;
const OFFLINE_STORES = {
  inbox: "notifications",
  cache: "cacheEntries"
};

const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./404.html",
  "./style.css",
  "./style.css?v=12.38",
  "./app.js",
  "./app.js?v=12.38",
  "./icone.png",
  "./MGA.png",
  "./manifest.json",
  "./assets/geojson/Rota_UFRN_Noturno_IDA.json",
  "./assets/geojson/Rota_UFRN_Noturno_VOLTA.json"
];

const RUNTIME_CACHE_HOSTS = [
  "cdn.jsdelivr.net",
  "unpkg.com",
  "cdnjs.cloudflare.com",
  "www.gstatic.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com"
];

function redactSWLog(value) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/(\d{3})\.?\d{3}\.?\d{3}-?(\d{2})/g, "$1.***.***-$2")
    .replace(/([A-Z0-9._%+-])[A-Z0-9._%+-]*@([A-Z0-9.-]+\.[A-Z]{2,})/gi, "$1***@$2")
    .replace(/\b[A-Za-z0-9_-]{48,}\b/g, "[token-redacted]");
}

function logSW(level, message, details) {
  const method = ["error", "warn", "info", "log"].includes(level) ? level : "log";
  const writer = console && typeof console[method] === "function" ? console[method].bind(console) : null;
  if (!writer) return;
  const safeMessage = redactSWLog(message);
  if (details === undefined) writer(safeMessage);
  else writer(safeMessage, redactSWLog(details && details.message ? details.message : details));
}

let firebaseInicializado = false;

try {
  importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js");
  importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js");

  const params = new URL(self.location.href).searchParams;
  const projectId = params.get("projectId");
  const firebaseConfig = {
    apiKey: params.get("apiKey"),
    authDomain: projectId ? projectId + ".firebaseapp.com" : "",
    projectId: projectId,
    storageBucket: projectId ? projectId + ".appspot.com" : "",
    messagingSenderId: params.get("senderId"),
    appId: params.get("appId")
  };

  if (self.firebase && firebaseConfig.apiKey && firebaseConfig.apiKey !== "null") {
    firebase.initializeApp(firebaseConfig);
    firebaseInicializado = true;
  }
} catch (error) {
  logSW("warn", "[SW] Firebase indisponivel no service worker.", error);
}

function isHttpRequest(request) {
  return request && request.url && /^https?:/i.test(request.url);
}

function isApiRequest(url) {
  const parsed = new URL(url);
  const hostname = parsed.hostname;
  const isGoogleApi = hostname.endsWith("googleapis.com") && hostname !== "fonts.googleapis.com";
  return hostname === "script.google.com" ||
    hostname.indexOf("script.google.com") !== -1 ||
    hostname.indexOf("firestore") !== -1 ||
    (isGoogleApi && !url.includes("fcm"));
}

function isRuntimeCacheHost(hostname) {
  return RUNTIME_CACHE_HOSTS.indexOf(hostname) !== -1;
}

function isDriveAsset(url) {
  return url.includes("drive.google.com/thumbnail") || url.includes("drive.google.com/uc");
}

function isAppShellAsset(requestUrl) {
  if (requestUrl.origin !== self.location.origin) return false;
  return requestUrl.pathname === self.location.pathname.replace(/\/sw\.js$/, "/") ||
    /\.(?:html|css|js|json|png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(requestUrl.pathname);
}

async function broadcastToClients(message) {
  const clientList = await clients.matchAll({ type: "window", includeUncontrolled: true });
  clientList.forEach((client) => {
    try {
      client.postMessage(Object.assign({
        source: "maestro-sw",
        version: MAESTRO_SW_VERSION
      }, message || {}));
    } catch (error) {
      logSW("warn", "[SW] Falha ao notificar cliente.", error);
    }
  });
}

function prepareOfflineStores(db) {
  if (!db.objectStoreNames.contains(OFFLINE_STORES.inbox)) {
    db.createObjectStore(OFFLINE_STORES.inbox, { keyPath: "timestamp" });
  }

  if (!db.objectStoreNames.contains(OFFLINE_STORES.cache)) {
    const cacheStore = db.createObjectStore(OFFLINE_STORES.cache, { keyPath: "key" });
    cacheStore.createIndex("domain", "domain", { unique: false });
    cacheStore.createIndex("expiresAt", "expiresAt", { unique: false });
    cacheStore.createIndex("updatedAt", "updatedAt", { unique: false });
  }
}

async function matchCached(request) {
  return caches.match(request).then((cached) => cached || caches.match(request, { ignoreSearch: true }));
}

async function cacheResponse(cacheName, request, response) {
  if (!response || request.method !== "GET") return response;
  if (!(response.ok || response.type === "opaque" || response.type === "opaqueredirect")) return response;

  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  } catch (error) {
    logSW("warn", "[SW] Falha ao atualizar cache.", error);
  }

  return response;
}

async function networkFirst(request, cacheName, fallbackUrl) {
  try {
    const networkResponse = await fetch(request);
    return cacheResponse(cacheName, request, networkResponse);
  } catch (error) {
    const cached = await matchCached(request);
    if (cached) return cached;
    if (fallbackUrl) return matchCached(fallbackUrl);
    throw error;
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await matchCached(request);
  if (cached) return cached;
  const networkResponse = await fetch(request);
  return cacheResponse(cacheName, request, networkResponse);
}

async function networkFirstFreshAsset(request, cacheName) {
  try {
    const networkResponse = await fetch(request, { cache: "no-store" });
    return cacheResponse(cacheName, request, networkResponse);
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return matchCached(request);
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cached = await matchCached(request);
  const fetchPromise = fetch(request)
    .then((networkResponse) => cacheResponse(cacheName, request, networkResponse))
    .catch(() => cached);

  return cached || fetchPromise;
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(ASSETS_TO_CACHE.map(async (asset) => {
        try {
          await cache.add(asset);
        } catch (error) {
          logSW("warn", "[SW] Asset nao precacheado.", { asset: asset, error: error && error.message ? error.message : error });
        }
      }));
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((cacheNames) => Promise.all(
        cacheNames.map((cacheName) => {
          const keep = cacheName === CACHE_NAME ||
            cacheName === DYNAMIC_CACHE ||
            cacheName === MAP_TILES_CACHE;
          return keep ? Promise.resolve(false) : caches.delete(cacheName);
        })
      )),
      broadcastToClients({ type: "MAESTRO_SW_ACTIVATED", cacheName: CACHE_NAME })
    ])
  );
});

self.addEventListener("message", (event) => {
  const data = event.data || {};

  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (data.type === "CLEAR_RUNTIME_CACHE") {
    event.waitUntil(caches.delete(DYNAMIC_CACHE));
    return;
  }

  if (data.type === "CLEAR_ALL_MAESTRO_CACHES") {
    event.waitUntil(
      caches.keys().then((cacheNames) => Promise.all(
        cacheNames.map((cacheName) => /^maestro-/i.test(cacheName) ? caches.delete(cacheName) : Promise.resolve(false))
      )).then(() => broadcastToClients({ type: "MAESTRO_CACHES_CLEARED" }))
    );
    return;
  }

  if (data.type === "PREFETCH_APP_SHELL") {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE).catch(() => null))
    );
    return;
  }

  if (data.type === "PING_VERSION" && event.source && typeof event.source.postMessage === "function") {
    event.source.postMessage({
      source: "maestro-sw",
      type: "MAESTRO_SW_VERSION",
      version: MAESTRO_SW_VERSION,
      cacheName: CACHE_NAME
    });
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (!request || request.method !== "GET" || !isHttpRequest(request)) return;
  if (request.cache === "only-if-cached" && request.mode !== "same-origin") return;

  const requestUrl = new URL(request.url);
  const url = request.url;

  if (isApiRequest(url)) return;

  if (url.includes("tile.openstreetmap.org")) {
    event.respondWith(cacheFirst(request, MAP_TILES_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, CACHE_NAME, OFFLINE_FALLBACK_URL));
    return;
  }

  if (isDriveAsset(url)) {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
    return;
  }

  if (isAppShellAsset(requestUrl)) {
    if (/\.(?:html|css|js|json)$/i.test(requestUrl.pathname)) {
      event.respondWith(networkFirstFreshAsset(request, CACHE_NAME));
      return;
    }
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  if (isRuntimeCacheHost(requestUrl.hostname)) {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
  }
});

try {
  if (firebaseInicializado && self.firebase && firebase.messaging && firebase.messaging.isSupported()) {
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const notification = payload.notification || {};
      const data = payload.data || {};
      const notificationTitle = notification.title || data.title || "Novo Aviso - Maestro";
      const notificationOptions = {
        body: notification.body || data.body || "Voce tem uma nova mensagem.",
        icon: notification.icon || data.icon || "./icone.png",
        badge: data.badge || "./icone.png",
        vibrate: [200, 100, 200, 100, 200],
        data: data.click_action ? data : Object.assign({ click_action: "./" }, data),
        requireInteraction: true
      };

      const salvarNotificacao = () => {
        const dbReq = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
        dbReq.onupgradeneeded = (e) => {
          prepareOfflineStores(e.target.result);
        };
        dbReq.onsuccess = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(OFFLINE_STORES.inbox)) return;
          const tx = db.transaction(OFFLINE_STORES.inbox, "readwrite");
          const store = tx.objectStore(OFFLINE_STORES.inbox);

          const limite = Date.now() - 604800000;
          const range = IDBKeyRange.upperBound(limite);
          store.openCursor(range).onsuccess = (ec) => {
            const cursor = ec.target.result;
            if (cursor) {
              store.delete(cursor.primaryKey);
              cursor.continue();
            }
          };

          store.add({
            title: notificationTitle,
            body: notificationOptions.body,
            timestamp: Date.now(),
            icon: notificationOptions.icon,
            link: notificationOptions.data.click_action,
            status: "unread"
          });
        };
      };

      try {
        salvarNotificacao();
      } catch (error) {
        logSW("error", "[SW] Erro ao guardar Inbox.", error);
      }

      return self.registration.showNotification(notificationTitle, notificationOptions);
    });
  }
} catch (error) {
  logSW("warn", "[SW] Push em background ignorado.", error);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "close") return;

  const data = event.notification.data || {};
  const urlToOpen = new URL(data.click_action || "./", self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i += 1) {
        const client = windowClients[i];
        if (client.url === urlToOpen && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
      return null;
    })
  );
});
