/* modo — service worker.
   Кэшируем только неизменяемую статику и страницу «нет сети». HTML с данными
   пользователя и запросы к Supabase всегда идут в сеть: иначе после смены
   аккаунта человек увидит чужую закэшированную страницу. */

const VERSION = "v3";
const STATIC_CACHE = `modo-static-${VERSION}`;
const OFFLINE_URL = "/offline";

const PRECACHE = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/manifest.webmanifest",
  OFFLINE_URL,
];

/** Минимальная страница на случай, если /offline не оказался в кэше. */
const FALLBACK_HTML = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>Нет сети — modo</title><style>html,body{margin:0;height:100%}body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;box-sizing:border-box;text-align:center;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#fff;color:#171717}@media (prefers-color-scheme:dark){body{background:#0a0a0a;color:#f5f5f5}}h1{font-size:20px;margin:0}p{font-size:14px;color:#737373;max-width:20rem;margin:0}a{margin-top:8px;padding:8px 16px;border-radius:8px;background:#f97316;color:#fff;text-decoration:none;font-size:14px;font-weight:500}</style></head><body><div style="font-size:28px">📴</div><h1>Нет подключения</h1><p>modo не смог связаться с сервером. Проверьте интернет и попробуйте снова — данные никуда не делись.</p><a href="/">Повторить</a></body></html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then(async (cache) => {
        // Кэшируем по одному: один недоступный файл не должен ломать установку.
        await Promise.allSettled(PRECACHE.map((url) => cache.add(url)));

        // Проверяем офлайн-страницу отдельно и повторяем один раз —
        // при первой установке сервер может отдать её не сразу.
        if (!(await cache.match(OFFLINE_URL))) {
          await cache.add(OFFLINE_URL).catch(() => undefined);
        }
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** Статика Next.js и иконки: имена с хэшем, поэтому cache-first безопасен. */
function isImmutableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/")
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Supabase и прочие внешние домены не трогаем вовсе.
  if (url.origin !== self.location.origin) return;

  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches
              .open(STATIC_CACHE)
              .then((cache) => cache.put(request, copy))
              .catch(() => undefined);
          }
          return response;
        });
      })
    );
    return;
  }

  // Навигация: сначала сеть, при обрыве — страница «нет сети».
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        const offline = await cache.match(OFFLINE_URL);
        if (offline) return offline;

        return new Response(FALLBACK_HTML, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      })
    );
  }
});
