// alerts.js — F11 family-alert countdown + F12 emergency links and message. Plain JS, unit-tested.
//
// THE 108 RULE lives here too: callLink() can ONLY ever contain the demo emergency number from
// Settings. There is no branch, flag or fallback in Part 1 that produces an emergency number, and
// every number is re-validated right before a link is built (defence in depth: even a number
// edited by hand in localStorage cannot become a link).
//
// PRD contract: startCountdown(seconds, onFire), pause(), resume(), cancel(),
//               buildMessage(session, contact, lang), callLink(settings), smsLink(phone, text),
//               waLink(phone, text)

import { validatePhone } from "./settings.js";
import { failedTests } from "./decision.js";
import { createTranslator } from "./i18n.js";
import { formatClock } from "./lkw.js";

// ---------- links ----------

/** tel: link for the CALL button — demo number only. null = calling is off (DECISIONS D6). */
export function callLink(settings) {
  const check = validatePhone(String((settings && settings.demoEmergencyNumber) || ""));
  return check.ok ? "tel:" + check.value : null;
}

/** sms:<number>?body=<text>. One contact per link: multi-recipient links differ between phones. */
export function smsLink(phone, text) {
  const check = validatePhone(String(phone || ""));
  return check.ok ? "sms:" + check.value + "?body=" + encodeURIComponent(text) : null;
}

/** WhatsApp click-to-chat link: country code + number as digits only, no plus sign. */
export function waLink(phone, text) {
  const check = validatePhone(String(phone || ""));
  return check.ok ? "https://wa.me/" + check.value.replace("+", "") + "?text=" + encodeURIComponent(text) : null;
}

/** Google Maps link with 6 decimals (about 10 cm; more digits would be noise). */
export function mapsLink(lat, lng) {
  return "https://maps.google.com/?q=" + Number(lat).toFixed(6) + "," + Number(lng).toFixed(6);
}

// ---------- message ----------

// The message strings live in src/i18n/*.json like every other string. This module must stay
// free of Vite-only JSON imports, so the app hands the dictionaries over once at start-up
// (src/i18n/index.js) and unit tests load the JSON files from disk.
let catalog = { en: {} };
export function setMessageCatalog(dictionaries) { catalog = dictionaries; }

/**
 * The family alert text (SMS / WhatsApp) in the CONTACT's language.
 * session.person = { name, age } is a local snapshot of the profile; it is never sent to an LLM.
 */
export function buildMessage(session, contact, lang) {
  const t = createTranslator(catalog[lang] || catalog.en, catalog.en);

  const failed = failedTests(session.results).map((name) => { const key = "test." + name; return t(key); });
  const tests = failed.length > 0 ? failed.join(", ") : t("sms.noTestsEmergencyButton");

  const lkw = session.lastKnownWell;
  const time = lkw && lkw.time ? formatClock(lkw.time) : t("sms.unknown");

  const loc = session.location;
  let location = t("sms.locationUnavailable");
  if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
    location = mapsLink(loc.lat, loc.lng);
    if (loc.source === "last") location += " " + t("sms.lastKnown", { time: formatClock(loc.at) });
  }

  const person = session.person || {};
  const name = (person.name || t("sms.someone")) + (Number.isFinite(person.age) ? " (" + person.age + ")" : "");

  return t("sms.template", {
    name, tests, time, location,
    hospital: t("sms.nearestHospital"),
    // "Lives nearby" changes the last line: come now vs hospital details will follow (PRD F4).
    closing: contact && contact.livesNearby ? t("sms.comeNow") : t("sms.hospitalFollows")
  });
}

// ---------- countdown ----------

// One countdown at a time (module level, as in the PRD contract). It counts whole seconds and
// only while running: pause() freezes it (app in background, e.g. the dialer is open).
let countdown = null;

/**
 * startCountdown(seconds, onFire, { onTick, timers })
 *   onTick(remaining) is called at once and after every second.
 *   timers = { setInterval, clearInterval } can be replaced in unit tests.
 */
export function startCountdown(seconds, onFire, { onTick = () => {}, timers = globalThis } = {}) {
  cancel();
  const state = { remaining: Math.max(0, Math.floor(seconds)), paused: false, done: false, id: null };
  const stop = () => { state.done = true; timers.clearInterval(state.id); if (countdown === state) countdown = null; };

  state.tick = () => {
    if (state.done || state.paused) return;
    state.remaining -= 1;
    onTick(state.remaining);
    if (state.remaining <= 0) { stop(); onFire(); }
  };
  state.stop = stop;

  countdown = state;
  onTick(state.remaining);
  if (state.remaining === 0) { stop(); onFire(); return; }
  state.id = timers.setInterval(state.tick, 1000);
}

export function pause() { if (countdown) countdown.paused = true; }
export function resume() { if (countdown) countdown.paused = false; }
export function cancel() { if (countdown) countdown.stop(); }
export function isCountingDown() { return Boolean(countdown); }
