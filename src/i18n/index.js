// Bundles the three language files into the app, so every string works offline from the first
// load (no fetch needed). Vite turns each JSON import into a JavaScript object at build time.
//
// This file is Vite-only glue. The logic (format, lookup, createTranslator) is in src/lib/i18n.js.

import en from "./en.json";
import hi from "./hi.json";
import te from "./te.json";
import { createTranslator } from "../lib/i18n.js";

export const DICTIONARIES = { en, hi, te };

/** t() for a language code; unknown codes fall back to English. */
export function translatorFor(lang) {
  return createTranslator(DICTIONARIES[lang] || en, en);
}
