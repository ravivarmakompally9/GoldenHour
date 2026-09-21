// S1 Install page (browser only) — F1. Hidden when GoldenHour runs as an installed app.
//
// How Android install works: Chrome fires "beforeinstallprompt" when the page is installable.
// We must catch that event EARLY (it can fire before this screen is drawn), keep it, and call
// its prompt() later from a real tap. That is why the listeners sit at module level: app.js
// imports this file at start-up, so they are attached immediately.

import { t } from "../i18n.js";
import { el, button } from "../ui/components.js";

const SKIP_KEY = "gh_install_skipped";
const NO_EVENT_HINT_MS = 4000;

let deferredPrompt = null;      // the saved beforeinstallprompt event
let onInstallable = null;       // set by the visible screen so it can react when the event arrives
let onInstalled = null;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();       // stop Chrome's own mini-infobar; we show a big button instead
  deferredPrompt = event;
  if (onInstallable) onInstallable();
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  if (onInstalled) onInstalled();
});

/** "Continue in the browser" was tapped in this tab (sessionStorage: asked again next visit). */
export function wasSkipped() {
  try { return window.sessionStorage.getItem(SKIP_KEY) === "1"; } catch { return false; }
}

function rememberSkip() {
  try { window.sessionStorage.setItem(SKIP_KEY, "1"); } catch { /* private mode: fine */ }
}

export function render(container, ctx) {
  const chromeHint = el("div", { class: "panel panel-warn", hidden: true },
    el("strong", { text: t("install.openInChrome") }),
    el("p", { class: "small", text: t("install.openInChromeHint") })
  );
  const doneNote = el("div", { class: "panel", hidden: true }, el("strong", { text: t("install.done") }));

  async function install() {
    if (!deferredPrompt) {
      // No install event (not Chrome, in-app browser, or already installed): explain what to do.
      chromeHint.hidden = false;
      return;
    }
    deferredPrompt.prompt();                 // Android's own "Install app?" popup
    await deferredPrompt.userChoice;         // we do not need the answer; "appinstalled" tells us
    deferredPrompt = null;                   // an event can only be used once
  }

  onInstallable = () => { chromeHint.hidden = true; };
  onInstalled = () => { doneNote.hidden = false; chromeHint.hidden = true; };

  // PRD S1: show "Please open in Chrome" if the install event never fires.
  const hintTimer = setTimeout(() => { if (!deferredPrompt) chromeHint.hidden = false; }, NO_EVENT_HINT_MS);

  container.append(
    el("div", { class: "stack install" },
      el("img", { src: "icons/icon-192.png", alt: "", width: 128, height: 128 }),
      el("h1", { text: t("app.name") }),
      el("p", { class: "instruction", text: t("install.purpose") }),
      button({ label: t("install.button"), variant: "danger", size: "tall", onclick: install }),
      // Always visible under the button, because Chrome may delay the popup (PRD F1 edge cases).
      el("p", { text: t("install.fallback") }),
      doneNote,
      chromeHint,
      button({ label: t("install.continueBrowser"), variant: "quiet", onclick: () => { rememberSkip(); ctx.navigate("home"); } }),
      el("p", { class: "disclaimer", text: t("app.disclaimer") })
    )
  );

  return () => { clearTimeout(hintTimer); onInstallable = null; onInstalled = null; };
}
