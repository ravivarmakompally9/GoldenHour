// i18n.js — translation core. Plain JavaScript, NO React and NO browser APIs, so it is covered by
// `node --test`. The strings live in src/i18n/<lang>.json; src/i18n/index.js bundles them and
// src/state/AppState.jsx hands a t() function to the React screens.
//
// English is always the safety net. If a Hindi/Telugu string is missing, the English one is shown
// instead of a blank or a raw key — in an emergency a readable instruction in the "wrong" language
// beats no instruction.

// BCP-47 tags used by voice guidance (F15) and the <html lang> attribute.
export const LOCALES = { en: "en-IN", hi: "hi-IN", te: "te-IN" };

/** Replace {name} placeholders. Unknown placeholders are left visible so bugs get noticed. */
export function format(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (whole, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole
  );
}

/** Find `key` in `primary`, then in `backup`; as a last resort return the key itself. */
export function lookup(key, primary, backup) {
  if (primary && typeof primary[key] === "string") return primary[key];
  if (backup && typeof backup[key] === "string") return backup[key];
  return key;
}

/**
 * Build a translate function for one language:
 *   const t = createTranslator(teluguStrings, englishStrings);
 *   t("banner.demo", { name: "Teammate A" })
 */
export function createTranslator(strings, fallback) {
  return (key, vars) => format(lookup(key, strings, fallback), vars);
}
