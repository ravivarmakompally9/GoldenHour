// settings.js — F2: Settings, Demo Mode and phone-number validation.
//
// THE 108 RULE (PRD Section 16): Part 1 never dials 108, 112 or any real emergency number.
// Two things in this file enforce it:
//   1. validatePhone() refuses every short/emergency code, so one can never be saved.
//   2. Demo Mode is forced to `true` on every read AND every write. There is no code path
//      that turns it off in Part 1.

import * as storage from "./storage.js";

export const SETTINGS_KEY = "gh_settings";
export const LANGUAGES = ["en", "hi", "te"];
export const LLM_PROVIDERS = ["gemini", "openrouter", "none"];

export const DEFAULT_SETTINGS = {
  language: "en",
  languageChosen: false,        // false until the first-launch Language screen (S2) is done
  demoMode: true,               // locked on in Part 1
  demoEmergencyNumber: "",      // stored as +91XXXXXXXXXX, replaces 108 for every call
  demoEmergencyName: "",
  demoHospitalNumber: "",
  llmProvider: "gemini",
  voice: true,
  developerMode: false
};

// Short codes that must never be accepted. The length rule below already blocks them; this list
// is a second, explicit safety net in case the length rule is ever changed.
const BLOCKED_CODES = ["100", "101", "102", "108", "112"];

/**
 * Check a phone number typed by the user. Pure function (no browser APIs) so it is unit-tested.
 *
 * Accepts ONLY a 10-digit Indian mobile starting with 6, 7, 8 or 9, optionally written with
 * spaces, dashes, brackets, a leading 0, or a +91 / 91 country code.
 *
 * Returns { ok, value, error }:
 *   ok    true  -> value is the number in storage format "+91" + 10 digits, error is null
 *   ok    false -> value is null, error is "phone_emergency_blocked" or "phone_invalid"
 *                  (the screen shows the i18n string "error.<code>")
 */
export function validatePhone(str) {
  const fail = (error) => ({ ok: false, value: null, error });

  if (typeof str !== "string") return fail("phone_invalid");

  // Remove the separators people normally type. Anything else left over makes it invalid.
  let digits = str.trim().replace(/[\s\-().]/g, "");
  if (digits === "") return fail("phone_invalid");

  // Strip the country code, but only when the length proves it IS a country code.
  // (We must not turn "91" + 8 digits into something valid by accident.)
  if (digits.startsWith("+91")) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);

  if (!/^\d+$/.test(digits)) return fail("phone_invalid");

  // Emergency numbers and helplines are short codes (108, 112, 1091, 14567...).
  // The PRD blocks every 3-4 digit number; we block everything up to 6 digits to be safer.
  if (digits.length <= 6 || BLOCKED_CODES.includes(digits)) return fail("phone_emergency_blocked");

  if (!/^[6-9]\d{9}$/.test(digits)) return fail("phone_invalid");

  return { ok: true, value: "+91" + digits, error: null };
}

/** Pure: fill in missing fields, drop junk values, and force Demo Mode on. */
export function normaliseSettings(raw) {
  const s = { ...DEFAULT_SETTINGS, ...(raw && typeof raw === "object" ? raw : {}) };
  if (!LANGUAGES.includes(s.language)) s.language = DEFAULT_SETTINGS.language;
  if (!LLM_PROVIDERS.includes(s.llmProvider)) s.llmProvider = DEFAULT_SETTINGS.llmProvider;
  s.languageChosen = Boolean(s.languageChosen);
  s.voice = Boolean(s.voice);
  s.developerMode = Boolean(s.developerMode);

  // A number that does not pass validation is treated as "not set". This also protects against
  // someone editing localStorage by hand to sneak in an emergency number.
  for (const field of ["demoEmergencyNumber", "demoHospitalNumber"]) {
    const check = validatePhone(String(s[field] || ""));
    s[field] = check.ok ? check.value : "";
  }
  s.demoEmergencyName = String(s.demoEmergencyName || "").trim();

  s.demoMode = true; // THE 108 RULE: always on, cannot be switched off in Part 1.
  return s;
}

export function getSettings() {
  return normaliseSettings(storage.get(SETTINGS_KEY, null));
}

/** Merge `changes` into the saved settings. Returns the settings that were saved. */
export function saveSettings(changes) {
  const next = normaliseSettings({ ...getSettings(), ...changes });
  storage.set(SETTINGS_KEY, next);
  return next;
}

/** True when the CALL button can work: a valid demo number and the name of who answers it. */
export function isDemoReady(settings) {
  return Boolean(settings.demoEmergencyNumber && settings.demoEmergencyName);
}

// ---- API keys: typed on the phone, kept only in this phone's localStorage (constraint C5) ----

export function apiKeyStorageKey(provider) {
  return "gh_key_" + provider;
}

export function getApiKey(provider) {
  return storage.getText(apiKeyStorageKey(provider), "");
}

export function setApiKey(provider, key) {
  return storage.setText(apiKeyStorageKey(provider), String(key || "").trim());
}
