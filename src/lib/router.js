// router.js — tiny hash router core (plain JS, unit-tested). React glue: src/hooks/useHashRoute.js
//
// Why a HASH router: GitHub Pages only serves static files. A deep link like /goldenhour/settings
// would be a 404 there, but /goldenhour/#/settings always loads index.html, works offline, and
// survives a reload.

/** "#/contacts/c1" -> { name: "contacts", params: ["c1"] } ;  "" -> { name: "", params: [] } */
export function parseHash(hash) {
  const parts = String(hash || "").replace(/^#\/?/, "").split("/").filter(Boolean);
  const decode = (part) => { try { return decodeURIComponent(part); } catch { return part; } };
  return { name: parts[0] || "", params: parts.slice(1).map(decode) };
}

/** "contacts", ["c1"] -> "#/contacts/c1" */
export function buildHash(name, params = []) {
  return "#/" + [name, ...params.map(encodeURIComponent)].join("/");
}

/**
 * Decide which screen to really show. Pure, so the first-launch rules are unit-tested.
 *   known        list of route names that exist
 *   standalone   true when running as an installed app
 *   installSkipped  "Continue in the browser" was tapped in this tab
 *   languageChosen  the first-launch Language screen (S2) is done
 */
export function resolveRoute(route, { known, standalone, installSkipped, languageChosen }) {
  const fallback = () => {
    if (!standalone && !installSkipped) return { name: "install", params: [] };   // S1: browser only
    if (!languageChosen) return { name: "language", params: [] };
    return { name: "home", params: [] };
  };

  if (!known.includes(route.name)) return fallback();
  if (route.name === "install" && standalone) return fallback();      // S1 is hidden when installed
  // First launch: the language must be chosen before any other screen is shown.
  if (!languageChosen && route.name !== "install" && route.name !== "language") {
    return { name: "language", params: [] };
  }
  return route;
}
