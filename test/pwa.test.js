// Checks the PWA/build configuration as TEXT, so `node --test` needs no `npm install`.
// The real build output is checked separately by scripts/check-dist.mjs (run after `vite build`).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(root, file), "utf8");
const config = read("vite.config.js");

test("base path defaults to /goldenhour/ and can be overridden by the deploy workflow", () => {
  assert.match(config, /DEFAULT_BASE = "\/goldenhour\/"/);
  assert.match(config, /process\.env\.VITE_BASE \|\| DEFAULT_BASE/);
  assert.match(read(".github/workflows/deploy.yml"), /VITE_BASE: \/\$\{\{ github\.event\.repository\.name \}\}\//);
});

test("workbox precache limit is about 30 MB (the 2 MB default silently skips the model and WASM)", () => {
  assert.match(config, /MAX_PRECACHE_BYTES = 30 \* 1024 \* 1024/);
  assert.match(config, /maximumFileSizeToCacheInBytes: MAX_PRECACHE_BYTES/);
});

test("precache patterns cover app code, fonts, WASM and the face model", () => {
  const patterns = config.match(/globPatterns: \["([^"]+)"\]/);
  assert.ok(patterns, "globPatterns not found");
  for (const ext of ["js", "css", "html", "json", "png", "woff2", "wasm", "task"]) {
    assert.ok(patterns[1].split(/[{},]/).includes(ext), "precache is missing ." + ext + " files");
  }
});

test("service worker uses generateSW and waits for the user before updating", () => {
  assert.match(config, /strategies: "generateSW"/);
  assert.match(config, /registerType: "prompt"/);
  assert.doesNotMatch(config, /skipWaiting: true/);
  assert.doesNotMatch(config, /registerType: "autoUpdate"/);
  assert.match(read("src/pwa/useAppUpdate.js"), /onNeedRefresh/);
  assert.match(read("src/App.jsx"), /update\.available/);
});

test("manifest matches PRD F1", () => {
  for (const expected of [
    /manifestFilename: "manifest\.json"/, /name: "GoldenHour"/, /short_name: "GoldenHour"/,
    /start_url: "\.\/"/, /display: "standalone"/, /orientation: "portrait"/,
    /background_color: "#ffffff"/, /theme_color: "#d32f2f"/, /sizes: "192x192"/, /sizes: "512x512"/
  ]) assert.match(config, expected);
  for (const icon of ["public/icons/icon-192.png", "public/icons/icon-512.png"]) {
    assert.ok(existsSync(join(root, icon)), icon + " is missing");
  }
});

test("one-tap install: beforeinstallprompt is captured before React starts", () => {
  assert.match(read("src/pwa/installPrompt.js"), /addEventListener\("beforeinstallprompt"/);
  const main = read("src/main.jsx");
  const firstImport = main.split("\n").find((line) => line.startsWith("import"));
  assert.match(firstImport, /installPrompt\.js/, "installPrompt.js must be the first import in main.jsx");
});

test("index.html loads nothing from a CDN", () => {
  assert.doesNotMatch(read("index.html"), /(src|href)="(https?:)?\/\//);
});

test("versions are pinned exactly and the lockfile is committed (C20)", () => {
  const pkg = JSON.parse(read("package.json"));
  for (const [name, version] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) {
    assert.match(version, /^\d+\.\d+\.\d+$/, name + " must be pinned to an exact version, got " + version);
  }
  assert.equal(pkg.dependencies.react.split(".")[0], "18");
  assert.ok(existsSync(join(root, "package-lock.json")), "package-lock.json must be committed");
});

test("logic stays framework-free: nothing in src/lib imports React, JSX or Vite-only modules", () => {
  const offenders = [];
  const walk = (dir) => {
    for (const name of readdirSync(join(root, dir))) {
      const rel = join(dir, name);
      if (statSync(join(root, rel)).isDirectory()) { walk(rel); continue; }
      if (!/\.(js|mjs)$/.test(name)) { if (/\.(jsx|tsx?)$/.test(name)) offenders.push(rel + " (not plain JS)"); continue; }
      const src = read(rel);
      if (/from\s+["'](react|react-dom)(\/[^"']*)?["']/.test(src)) offenders.push(rel + " imports react");
      if (/from\s+["'][^"']+\.jsx["']/.test(src)) offenders.push(rel + " imports a .jsx file");
      if (/from\s+["']virtual:/.test(src) || /import\.meta\.env/.test(src)) offenders.push(rel + " uses Vite-only APIs");
    }
  };
  walk("src/lib");
  assert.deepEqual(offenders, []);
});
