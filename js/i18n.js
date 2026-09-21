// i18n.js — every user-facing string comes from i18n/<lang>.json (PRD Section 9 "Language").
//
// How it works: English is always loaded as the safety net. If a Hindi/Telugu string is
// missing, the English one is shown instead of a blank or a raw key — in an emergency a
// readable instruction in the "wrong" language beats no instruction.

import { LANGUAGES } from "./settings.js";

// BCP-47 tags used by voice guidance (F15) and the <html lang> attribute.
export const LOCALES = { en: "en-IN", hi: "hi-IN", te: "te-IN" };

let currentLang = "en";
let strings = {};   // strings of the chosen language
let fallback = {};  // English

/** Pure: replace {name} placeholders. Unknown placeholders are left visible so bugs get noticed. */
export function format(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (whole, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole
  );
}

/** Pure: find `key` in `primary`, then in `backup`; as a last resort return the key itself. */
export function lookup(key, primary, backup) {
  if (primary && typeof primary[key] === "string") return primary[key];
  if (backup && typeof backup[key] === "string") return backup[key];
  return key;
}

async function fetchStrings(lang) {
  try {
    const res = await fetch("./i18n/" + lang + ".json");
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } catch (err) {
    console.warn("[i18n] could not load", lang, err);
    return {};
  }
}

/** Load a language (and English, once). Safe to call again when the user switches language. */
export async function setLanguage(lang) {
  const wanted = LANGUAGES.includes(lang) ? lang : "en";
  if (Object.keys(fallback).length === 0) fallback = await fetchStrings("en");
  strings = wanted === "en" ? fallback : await fetchStrings(wanted);
  currentLang = wanted;
  if (typeof document !== "undefined") document.documentElement.lang = wanted;
  return currentLang;
}

export function getLanguage() {
  return currentLang;
}

/** Translate: t("banner.demo", { name: "Teammate A" }) */
export function t(key, vars) {
  return format(lookup(key, strings, fallback), vars);
}
