// guard.test.js — fails the build if app code could dial a real emergency number, or if a
// phone-number-like literal or API key sneaks into the app (PRD Section 16: the 108 rule, C2, C5).
//
// Scope (DECISIONS D8, updated for React + Vite in D14):
//   scanned      index.html, vite.config.js, src/**, public/** and dev/** (text files)
//   not scanned  docs/ (the PRD describes Part 2's tel:108), the unit tests in test/,
//                node_modules/, dist/, and any folder named vendor/ or models/ (third-party files)
//   NOTE: src/lib/tests/ holds the screening-test MODULES (face, arm, speech) and IS scanned.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_FILES = ["index.html", "vite.config.js"];
const SCAN_DIRS = ["src", "public", "dev"];
const SKIP_DIR_NAMES = ["vendor", "models", "node_modules", "dist"];
const TEXT_FILE = /\.(html|js|jsx|mjs|json|css|svg|txt|webmanifest)$/i;

function appFiles() {
  const files = SCAN_FILES.filter((f) => existsSync(join(root, f)));
  const walk = (dir) => {
    if (!existsSync(join(root, dir))) return;
    for (const name of readdirSync(join(root, dir))) {
      const rel = join(dir, name);
      if (statSync(join(root, rel)).isDirectory()) {
        if (!SKIP_DIR_NAMES.includes(name)) walk(rel);
      } else if (TEXT_FILE.test(name)) files.push(rel);
    }
  };
  SCAN_DIRS.forEach(walk);
  return files;
}

const sources = appFiles().map((file) => ({ file, text: readFileSync(join(root, file), "utf8") }));

/** Collect "file:line  matched text" for every hit, so a failure says exactly where to look. */
function findAll(regex) {
  const hits = [];
  for (const { file, text } of sources) {
    text.split("\n").forEach((line, i) => {
      for (const m of line.matchAll(regex)) hits.push(file + ":" + (i + 1) + "  " + m[0]);
    });
  }
  return hits;
}

test("the guard actually scans the app (sanity check)", () => {
  const names = sources.map((s) => s.file.split("\\").join("/"));
  for (const must of ["index.html", "vite.config.js", "src/lib/settings.js", "src/App.jsx", "src/screens/SettingsScreen.jsx", "src/i18n/en.json", "public/data/hospitals.json"]) {
    assert.ok(names.includes(must), must + " was not scanned");
  }
  assert.ok(!names.some((n) => /^(docs|test|node_modules|dist)\//.test(n) || /(^|\/)(vendor|models)\//.test(n)));
});

test("THE 108 RULE: no tel: link to an emergency or short code anywhere in app code", () => {
  // tel:108, tel:+91108, tel: 112, "tel:" + "108" written with odd spacing, etc.
  const hits = findAll(/tel:\s*(\+?\s*91)?[\s-]*1\d{2,3}(?!\d)/gi);
  assert.deepEqual(hits, []);
});

test("no tel:, sms: or wa.me link with a hardcoded number: numbers come only from Settings", () => {
  const hits = [
    ...findAll(/\b(tel|sms):\s*\+?\d/gi),
    ...findAll(/wa\.me\/\d/gi)
  ];
  assert.deepEqual(hits, []);
});

test("no phone-number-like literal in app code", () => {
  // Digit boundaries on both sides, so long numbers inside URLs, hashes or IDs are not flagged.
  const hits = findAll(/(?<!\d)(\+91)?[6-9]\d{9}(?!\d)/g);
  assert.deepEqual(hits, []);
});

test("no API-key-looking literal in app code", () => {
  const hits = [
    ...findAll(/AIza[0-9A-Za-z_-]{30,}/g),        // Google API keys
    ...findAll(/sk-or-v1-[0-9a-f]{20,}/gi),       // OpenRouter keys
    ...findAll(/\bsk-[A-Za-z0-9]{32,}/g),         // generic secret keys
    ...findAll(/\bgsk_[A-Za-z0-9]{30,}/g)         // Groq keys
  ];
  assert.deepEqual(hits, []);
});

test("Demo Mode has no off switch in app code", () => {
  const hits = findAll(/demoMode\s*[:=]\s*false/g);
  assert.deepEqual(hits, []);
});

test("the guard's own patterns work (built at runtime so no real-looking number is committed)", () => {
  const fakeMobile = "9" + "0".repeat(9);
  assert.match("call " + fakeMobile + " now", /(?<!\d)(\+91)?[6-9]\d{9}(?!\d)/);
  assert.match("+91" + fakeMobile, /(?<!\d)(\+91)?[6-9]\d{9}(?!\d)/);
  assert.doesNotMatch("id=" + "1".repeat(4) + fakeMobile + "5", /(?<!\d)(\+91)?[6-9]\d{9}(?!\d)/, "digits inside a longer number are ignored");
  assert.match("tel:" + "108", /tel:\s*(\+?\s*91)?[\s-]*1\d{2,3}(?!\d)/i);
  assert.match("tel:+91" + "112", /tel:\s*(\+?\s*91)?[\s-]*1\d{2,3}(?!\d)/i);
});
