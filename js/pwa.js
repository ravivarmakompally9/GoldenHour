// pwa.js — registers the service worker and shows the "Update available — tap to reload" bar (F1).
//
// Update flow: a new sw.js installs in the background and then WAITS, so the running app is never
// swapped under the helper's hands mid-check. We show a bar; when it is tapped we tell the waiting
// worker to take over, and reload once it controls the page.

import { t } from "./i18n.js";

export function registerServiceWorker(updateBar) {
  if (!("serviceWorker" in navigator)) return;

  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;      // guard against a reload loop
    reloading = true;
    window.location.reload();
  });

  const offerUpdate = (worker) => {
    updateBar.textContent = t("update.available");
    updateBar.hidden = false;
    updateBar.onclick = () => {
      updateBar.disabled = true;
      worker.postMessage({ type: "SKIP_WAITING" });
    };
  };

  navigator.serviceWorker.register("./sw.js").then((registration) => {
    // A worker that finished installing earlier and is still waiting.
    if (registration.waiting && navigator.serviceWorker.controller) offerUpdate(registration.waiting);

    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        // "installed" + an existing controller = this is an UPDATE, not the first install.
        if (worker.state === "installed" && navigator.serviceWorker.controller) offerUpdate(worker);
      });
    });
  }).catch((err) => console.warn("[pwa] service worker registration failed", err));
}
