import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const swSource = readFileSync(join(root, "sw.js"), "utf8");

function precacheList() {
  const block = swSource.match(/const PRECACHE = \[([\s\S]*?)\];/);
  assert.ok(block, "PRECACHE array not found in sw.js");
  return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

/** Every file that must be available offline. */
function shippedFiles() {
  const files = ["index.html", "manifest.json"];
  const walk = (dir) => {
    if (!existsSync(join(root, dir))) return;
    for (const name of readdirSync(join(root, dir))) {
      const rel = join(dir, name);
      if (statSync(join(root, rel)).isDirectory()) walk(rel);
      else if (!name.startsWith(".") && !name.endsWith(".md")) files.push(rel);
    }
  };
  ["css", "js", "i18n", "icons", "vendor", "models", "data"].forEach(walk);
  return files.map((f) => "./" + f.split("\\").join("/"));
}

test("sw.js precaches every shipped file (offline mode cannot silently miss one)", () => {
  const listed = new Set(precacheList());
  const missing = shippedFiles().filter((f) => !listed.has(f));
  assert.deepEqual(missing, [], "add these files to PRECACHE in sw.js and bump CACHE_VERSION");
});

test("every PRECACHE entry exists (one 404 makes the whole service-worker install fail)", () => {
  for (const url of precacheList()) {
    if (url === "./") continue;
    assert.ok(existsSync(join(root, url)), url + " is listed in PRECACHE but does not exist");
  }
  assert.ok(precacheList().includes("./"), "the start_url ./ must be precached");
});

test("PRECACHE uses relative paths only (GitHub Pages serves from a sub-folder)", () => {
  for (const url of precacheList()) assert.match(url, /^\.\//, url);
});

test("cache name is versioned and the worker waits for the user before updating", () => {
  assert.match(swSource, /const CACHE_VERSION = "goldenhour-v\d+";/);
  const installHandler = swSource.slice(swSource.indexOf('addEventListener("install"'), swSource.indexOf('addEventListener("activate"'));
  assert.doesNotMatch(installHandler.replace(/\/\/.*$/gm, ""), /skipWaiting\(\)/, "install must not skip waiting");
});

test("manifest matches PRD F1", () => {
  const m = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
  assert.equal(m.name, "GoldenHour");
  assert.equal(m.short_name, "GoldenHour");
  assert.equal(m.start_url, "./");
  assert.equal(m.display, "standalone");
  assert.equal(m.orientation, "portrait");
  assert.equal(m.background_color, "#ffffff");
  assert.equal(m.theme_color, "#d32f2f");
  for (const size of ["192x192", "512x512"]) {
    const icon = m.icons.find((i) => i.sizes === size && i.type === "image/png");
    assert.ok(icon, "missing " + size + " PNG icon");
    assert.ok(existsSync(join(root, icon.src)), icon.src + " does not exist");
  }
});

test("index.html links the manifest and uses only relative local URLs", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  assert.match(html, /<link rel="manifest" href="manifest\.json">/);
  assert.doesNotMatch(html, /(src|href)="(https?:)?\/\//, "no CDN or absolute URLs: everything is vendored");
  assert.doesNotMatch(html, /(src|href)="\//, "no root-absolute paths");
});
