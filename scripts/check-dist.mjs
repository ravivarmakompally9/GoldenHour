// check-dist.mjs — run AFTER `vite build`. Proves the built app can really work offline.
//
// Why this exists: Workbox silently skips files that are too big or do not match its glob
// patterns. A skipped face model or WASM file would only show up as a broken face test in
// airplane mode. This script fails the build instead.
//
//   npm run build && node scripts/check-dist.mjs

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const problems = [];

if (!existsSync(dist)) {
  console.error("dist/ not found. Run `npm run build` first.");
  process.exit(1);
}

for (const file of ["index.html", "sw.js", "manifest.json"]) {
  if (!existsSync(join(dist, file))) problems.push("missing dist/" + file);
}

const sw = existsSync(join(dist, "sw.js")) ? readFileSync(join(dist, "sw.js"), "utf8") : "";
const precached = new Set([...sw.matchAll(/url:\s*"([^"]+)"/g)].map((m) => m[1]));

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(relative(dist, full).split("\\").join("/"));
  }
  return out;
}

// Every shipped file must be precached, except the service worker's own files and notes.
const skip = (f) => /^(sw\.js|workbox-[\w-]+\.js|registerSW\.js)$/.test(f) || /\.(md|map|txt)$/.test(f) || f.split("/").pop().startsWith(".");
for (const file of walk(dist)) {
  if (!skip(file) && !precached.has(file)) problems.push("NOT precached (offline would break): " + file);
}

if (problems.length > 0) {
  console.error("dist check FAILED:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log("dist check OK: " + precached.size + " files precached for offline use.");
