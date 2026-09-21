// app.js — app start-up, hash router and screen switching.
//
// Routing uses the URL hash (#/home, #/settings, ...) because GitHub Pages only serves static
// files: a hash never reaches the server, so every route works offline and after a reload.
//
// A screen module exports:  render(container, ctx)  and may return a cleanup function that the
// router calls before showing the next screen (to stop cameras, timers, sensors...).
//   ctx = { navigate(route), params: [...], settings, changeLanguage(lang) }

import * as i18n from "./i18n.js";
import { getSettings } from "./settings.js";
import { renderDemoBanner } from "./ui/components.js";
import { stop as stopVoice } from "./tts.js";
import { registerServiceWorker } from "./pwa.js";

import * as install from "./screens/install.js";
import * as language from "./screens/language.js";
import * as home from "./screens/home.js";
import * as settingsScreen from "./screens/settings.js";
import * as profile from "./screens/profile.js";
import * as contacts from "./screens/contacts.js";
import * as placeholder from "./screens/placeholder.js";

const ROUTES = {
  install,                 // S1
  language,                // S2
  settings: settingsScreen, // S3
  profile,                 // S4
  contacts,                // S5  (#/contacts, #/contacts/new, #/contacts/<id>)
  home,                    // S7
  soon: placeholder        // screens that arrive in later milestones (#/soon/check, #/soon/baseline)
};

const appEl = document.getElementById("app");
const bannerEl = document.getElementById("demo-banner");
let cleanup = null;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches;
}

/** "#/contacts/c1" -> { name: "contacts", params: ["c1"] } */
function parseHash() {
  const parts = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  return { name: parts[0] || "", params: parts.slice(1).map(decodeURIComponent) };
}

export function navigate(route) {
  const target = "#/" + route;
  if (window.location.hash === target) showCurrentRoute();
  else window.location.hash = target;
}

/** Where to go when the URL has no (or an unknown) route. */
function defaultRoute(settings) {
  // S1 is for the browser only; an installed app skips straight past it.
  if (!isStandalone() && !install.wasSkipped()) return "install";
  if (!settings.languageChosen) return "language";
  return "home";
}

function showCurrentRoute() {
  const settings = getSettings();
  const { name, params } = parseHash();

  if (!ROUTES[name] || (name === "install" && isStandalone())) {
    navigate(defaultRoute(settings));
    return;
  }
  // First launch: the language must be chosen (S2) before any other screen is shown.
  if (!settings.languageChosen && name !== "install" && name !== "language") {
    navigate("language");
    return;
  }

  // Leave the old screen cleanly: run its cleanup and silence any voice instruction.
  if (typeof cleanup === "function") {
    try { cleanup(); } catch (err) { console.error("[app] cleanup failed", err); }
  }
  cleanup = null;
  stopVoice();

  renderDemoBanner(bannerEl, settings);
  appEl.replaceChildren();
  window.scrollTo(0, 0);

  try {
    cleanup = ROUTES[name].render(appEl, { navigate, params, settings, changeLanguage }) || null;
  } catch (err) {
    // A broken screen must never leave the helper with a blank page.
    console.error("[app] screen failed:", name, err);
    if (name !== "home") navigate("home");
  }
}

async function start() {
  await i18n.setLanguage(getSettings().language);
  window.addEventListener("hashchange", showCurrentRoute);
  showCurrentRoute();
  registerServiceWorker(document.getElementById("update-bar"));
}

/** Screens call ctx.changeLanguage() so the banner and the screen redraw in the new language. */
async function changeLanguage(lang) {
  await i18n.setLanguage(lang);
  showCurrentRoute();
}

start();
