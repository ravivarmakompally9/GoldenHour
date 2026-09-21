// installPrompt.js — catches Android Chrome's "beforeinstallprompt" event (F1 one-tap install).
//
// Chrome fires the event when the page is installable. It can fire BEFORE React has drawn the
// install page, so this module is imported first thing in src/main.jsx and keeps the event until
// the user taps "Install GoldenHour". React reads it through src/hooks/useInstallPrompt.js.

const SKIP_KEY = "gh_install_skipped";

let deferredPrompt = null;   // the saved event; usable once
let installed = false;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();    // stop Chrome's own mini-infobar; we show a big button instead
  deferredPrompt = event;
  notify();
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  installed = true;
  notify();
});

// useSyncExternalStore needs the SAME object back until something changes.
let snapshot = { canInstall: false, installed: false };
export function getSnapshot() {
  const canInstall = deferredPrompt !== null;
  if (snapshot.canInstall !== canInstall || snapshot.installed !== installed) snapshot = { canInstall, installed };
  return snapshot;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Show Android's "Install app?" popup. Returns false if there is no saved event to use. */
export async function promptInstall() {
  if (!deferredPrompt) return false;
  const event = deferredPrompt;
  deferredPrompt = null;     // an event can only be used once
  notify();
  event.prompt();
  await event.userChoice;    // we do not need the answer; "appinstalled" tells us
  return true;
}

export function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches;
}

/** "Continue in the browser" is remembered per tab (sessionStorage): asked again next visit. */
export function wasInstallSkipped() {
  try { return window.sessionStorage.getItem(SKIP_KEY) === "1"; } catch { return false; }
}

export function rememberInstallSkipped() {
  try { window.sessionStorage.setItem(SKIP_KEY, "1"); } catch { /* private mode: fine */ }
}
