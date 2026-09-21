import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHash, buildHash, resolveRoute } from "../src/lib/router.js";

const known = ["install", "language", "settings", "profile", "contacts", "home", "soon"];
const ready = { known, standalone: true, installSkipped: false, languageChosen: true };

test("parseHash and buildHash round-trip", () => {
  assert.deepEqual(parseHash(""), { name: "", params: [] });
  assert.deepEqual(parseHash("#/home"), { name: "home", params: [] });
  assert.deepEqual(parseHash("#/contacts/c1"), { name: "contacts", params: ["c1"] });
  assert.deepEqual(parseHash("#/soon/check/"), { name: "soon", params: ["check"] });
  assert.equal(buildHash("contacts", ["c 1"]), "#/contacts/c%201");
  assert.deepEqual(parseHash(buildHash("contacts", ["c 1"])), { name: "contacts", params: ["c 1"] });
  assert.deepEqual(parseHash("#/contacts/%E0%A4%A"), { name: "contacts", params: ["%E0%A4%A"] }, "bad escapes do not throw");
});

test("browser first visit shows the install page; installed app never does", () => {
  const browser = { known, standalone: false, installSkipped: false, languageChosen: false };
  assert.equal(resolveRoute(parseHash(""), browser).name, "install");
  assert.equal(resolveRoute(parseHash("#/install"), ready).name, "home", "S1 is hidden when installed");
  assert.equal(resolveRoute(parseHash(""), { ...browser, installSkipped: true }).name, "language");
});

test("language must be chosen before any other screen", () => {
  const firstLaunch = { ...ready, languageChosen: false };
  for (const hash of ["", "#/home", "#/settings", "#/contacts/new", "#/nonsense"]) {
    assert.equal(resolveRoute(parseHash(hash), firstLaunch).name, "language", hash);
  }
  assert.equal(resolveRoute(parseHash("#/language"), firstLaunch).name, "language");
});

test("known routes pass through with their params; unknown routes go Home", () => {
  assert.deepEqual(resolveRoute(parseHash("#/contacts/c2"), ready), { name: "contacts", params: ["c2"] });
  assert.equal(resolveRoute(parseHash("#/nonsense"), ready).name, "home");
  assert.equal(resolveRoute(parseHash(""), ready).name, "home");
});
