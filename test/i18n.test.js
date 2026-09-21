import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { format, lookup, createTranslator } from "../src/lib/i18n.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = (lang) => JSON.parse(readFileSync(join(root, "src", "i18n", lang + ".json"), "utf8"));
const en = load("en"), hi = load("hi"), te = load("te");
const realKeys = (obj) => Object.keys(obj).filter((k) => !k.startsWith("_")).sort();

test("format fills {placeholders} and leaves unknown ones visible", () => {
  assert.equal(format("calls go to {name}, not 108", { name: "Teammate A" }), "calls go to Teammate A, not 108");
  assert.equal(format("{count} SAVED", { count: 0 }), "0 SAVED");
  assert.equal(format("Hello {missing}", {}), "Hello {missing}");
});

test("lookup falls back to English, then to the key itself", () => {
  assert.equal(lookup("a", { a: "अ" }, { a: "A" }), "अ");
  assert.equal(lookup("b", { a: "अ" }, { b: "B" }), "B");
  assert.equal(lookup("c", {}, {}), "c");
});

test("createTranslator translates, fills placeholders and falls back to English", () => {
  const t = createTranslator(te, en);
  assert.equal(t("banner.demo", { name: "Teammate A" }), te["banner.demo"].replace("{name}", "Teammate A"));
  assert.equal(createTranslator({}, en)("common.save"), "Save");
  assert.equal(t("no.such.key"), "no.such.key");
});

test("en, hi and te have exactly the same keys", () => {
  assert.deepEqual(realKeys(hi), realKeys(en));
  assert.deepEqual(realKeys(te), realKeys(en));
});

test("every string is non-empty and keeps the same {placeholders} as English", () => {
  const holes = (s) => (s.match(/\{\w+\}/g) || []).sort();
  for (const key of realKeys(en)) {
    for (const [lang, dict] of [["hi", hi], ["te", te]]) {
      assert.ok(typeof dict[key] === "string" && dict[key].trim() !== "", lang + " " + key + " is empty");
      assert.deepEqual(holes(dict[key]), holes(en[key]), lang + " " + key + " placeholders differ");
    }
  }
});

test("Hindi and Telugu files carry the NEEDS NATIVE SPEAKER REVIEW note (C17)", () => {
  assert.match(hi._note, /NEEDS NATIVE SPEAKER REVIEW/);
  assert.match(te._note, /NEEDS NATIVE SPEAKER REVIEW/);
});

test("PRD exact wording is intact in English; '108' survives translation", () => {
  assert.equal(en["app.disclaimer"], "GoldenHour is a screening aid that prompts people to seek emergency care. It is not a diagnostic device and does not replace a doctor.");
  assert.equal(en["banner.demo"], "DEMO MODE — calls go to {name}, not 108");
  assert.equal(en["error.phone_emergency_blocked"], "Demo Mode: emergency numbers are blocked. Enter a teammate's mobile.");
  assert.equal(en["settings.addDemoNumber"], "Add a demo emergency number to enable calling.");
  assert.equal(en["install.fallback"], "Tap ⋮ → Install app");
  assert.equal(en["update.available"], "Update available — tap to reload");
  for (const key of realKeys(en).filter((k) => en[k].includes("108"))) {
    assert.ok(hi[key].includes("108"), "hi " + key + " lost 108");
    assert.ok(te[key].includes("108"), "te " + key + " lost 108");
  }
});

test("no string in any language uses forbidden reassurance wording (C10)", () => {
  const forbidden = [/you are fine/i, /no stroke/i, /not a stroke/i, /normal person/i, /nothing to worry/i];
  for (const dict of [en, hi, te]) {
    for (const key of realKeys(dict)) {
      for (const bad of forbidden) assert.doesNotMatch(dict[key], bad, key);
    }
  }
});

test("every t(\"key\") used in the app code exists in en.json", () => {
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(js|jsx)$/.test(full)) files.push(full);
    }
  };
  walk(join(root, "src"));
  const used = new Set();
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/\bt\(\s*"([^"]+)"/g)) used.add(m[1]);
  }
  const missing = [...used].filter((k) => !(k in en));
  assert.deepEqual(missing, [], "keys used in code but missing from en.json");
});
