// sw.js — F1 service worker: makes GoldenHour open and work with no internet.
//
// Strategy: CACHE FIRST. On install we download every app file into a versioned cache. After
// that, every request is answered from the cache, so the app behaves the same in a village with
// no signal as it does on Wi-Fi. The network is only used for files that are not in the cache.
//
// !! EVERY DEPLOY: bump CACHE_VERSION, and add any new file to PRECACHE. !!
// test/pwa.test.js fails if a file under css/, js/, i18n/, icons/, vendor/, models/ or data/ is
// missing from PRECACHE, so a forgotten file cannot silently break offline mode.

const CACHE_VERSION = "goldenhour-v1";

const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/styles.css",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./i18n/en.json",
  "./i18n/hi.json",
  "./i18n/te.json",
  "./data/hospitals.json",
  "./js/app.js",
  "./js/contacts.js",
  "./js/i18n.js",
  "./js/profile.js",
  "./js/pwa.js",
  "./js/settings.js",
  "./js/storage.js",
  "./js/thresholds.js",
  "./js/tts.js",
  "./js/ui/components.js",
  "./js/screens/contacts.js",
  "./js/screens/home.js",
  "./js/screens/install.js",
  "./js/screens/language.js",
  "./js/screens/placeholder.js",
  "./js/screens/profile.js",
  "./js/screens/settings.js"
];

self.addEventListener("install", (event) => {
  // { cache: "reload" } skips the browser's HTTP cache, so a new version never precaches stale files.
  // We do NOT call skipWaiting() here: the new version waits until the user taps
  // "Update available — tap to reload", so the app never changes in the middle of a check.
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" })))
    )
  );
});

self.addEventListener("activate", (event) => {
  // Delete caches from older versions, then start controlling open pages.
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((n) => n.startsWith("goldenhour-") && n !== CACHE_VERSION).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle our own files. LLM calls (F14) and Hugging Face model downloads (F8) go straight
  // to the network; Transformers.js keeps its own browser cache for the Whisper weights.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      // ignoreSearch: "./?source=pwa" style URLs still match the cached file.
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;
      try {
        return await fetch(request);
      } catch (err) {
        // Offline and not cached: for a page load, fall back to the app shell.
        if (request.mode === "navigate") {
          const shell = await cache.match("./index.html");
          if (shell) return shell;
        }
        throw err;
      }
    })
  );
});
