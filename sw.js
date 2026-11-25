// Service worker: gjør at Vennebets starter uten nett.
// Når du endrer filer i appen, øk VERSION så telefonene henter den nye versjonen.
const VERSION = "v1";
const CACHE = "vennebets-" + VERSION;
const FONT_CACHE = "vennebets-fonter";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/app.css",
  "./js/app.js",
  "./js/store.js",
  "./js/rules.js",
  "./js/views.js",
  "./js/util.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-192.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== FONT_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Skrifttyper fra Google: lagres første gang, brukes fra lageret etterpå.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.open(FONT_CACHE).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok || res.type === "opaque") c.put(req, res.clone());
        return res;
      })))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Selve appen: vis lagret versjon med en gang (raskt, virker uten nett), og hent ny i bakgrunnen.
  const isPage = req.mode === "navigate";
  event.respondWith(
    caches.open(CACHE).then((c) =>
      c.match(isPage ? "./index.html" : req, { ignoreSearch: isPage }).then((hit) => {
        const fresh = fetch(req).then((res) => {
          if (res.ok) c.put(isPage ? "./index.html" : req, res.clone());
          return res;
        }).catch(() => hit);
        return hit || fresh;
      })
    )
  );
});
