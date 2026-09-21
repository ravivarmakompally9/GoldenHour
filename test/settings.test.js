import { test } from "node:test";
import assert from "node:assert/strict";
import { sampleMobile, useFakeStorage } from "./helpers.js";
import {
  validatePhone, normaliseSettings, getSettings, saveSettings, isDemoReady,
  getApiKey, setApiKey, DEFAULT_SETTINGS
} from "../js/settings.js";

// ---------- validatePhone: THE 108 RULE ----------

test("validatePhone blocks the named emergency numbers", () => {
  for (const code of ["108", "112", "100", "101", "102"]) {
    const r = validatePhone(code);
    assert.equal(r.ok, false, code + " must be refused");
    assert.equal(r.value, null);
    assert.equal(r.error, "phone_emergency_blocked");
  }
});

test("validatePhone blocks EVERY 3-digit and 4-digit number", () => {
  for (let n = 0; n <= 9999; n++) {
    for (const width of [3, 4]) {
      const code = String(n).padStart(width, "0");
      if (code.length !== width) continue;
      const r = validatePhone(code);
      assert.equal(r.ok, false, code + " must be refused");
      assert.equal(r.error, "phone_emergency_blocked");
    }
  }
});

test("validatePhone blocks emergency codes hidden behind prefixes and separators", () => {
  for (const sneaky of ["+91108", "+91 112", "0108", "1-0-8", " 108 ", "(112)", "+91-100", "1091"]) {
    const r = validatePhone(sneaky);
    assert.equal(r.ok, false, JSON.stringify(sneaky) + " must be refused");
    assert.equal(r.error, "phone_emergency_blocked");
  }
});

test("validatePhone accepts 10-digit Indian mobiles starting 6-9 and stores +91 format", () => {
  for (const first of ["6", "7", "8", "9"]) {
    const n = sampleMobile(first);
    assert.deepEqual(validatePhone(n), { ok: true, value: "+91" + n, error: null });
  }
});

test("validatePhone accepts common ways of typing the same number", () => {
  const n = sampleMobile("9", "1");
  const expected = "+91" + n;
  const spaced = n.slice(0, 5) + " " + n.slice(5);
  for (const typed of [n, "+91" + n, "+91 " + spaced, "91" + n, "0" + n, n.slice(0, 5) + "-" + n.slice(5), " " + n + " "]) {
    const r = validatePhone(typed);
    assert.equal(r.ok, true, JSON.stringify(typed) + " should be accepted");
    assert.equal(r.value, expected);
  }
});

test("validatePhone rejects wrong lengths, wrong first digits and junk", () => {
  const nineDigits = "9" + "0".repeat(8);
  const elevenDigits = "9" + "0".repeat(10);
  const bad = [
    "", "   ", nineDigits, elevenDigits,
    sampleMobile("5"), sampleMobile("0"), sampleMobile("1"),
    "+1" + sampleMobile("6"), "abc", sampleMobile("9").slice(0, 9) + "x"
  ];
  for (const typed of bad) {
    const r = validatePhone(typed);
    assert.equal(r.ok, false, JSON.stringify(typed) + " must be refused");
    assert.equal(r.value, null);
    assert.ok(["phone_invalid", "phone_emergency_blocked"].includes(r.error));
  }
  assert.equal(validatePhone(nineDigits).error, "phone_invalid");
});

test("validatePhone only strips 91 when the length proves it is a country code", () => {
  // "91" + 8 digits is itself a 10-digit mobile starting with 9: keep all 10 digits.
  const tenDigits = "91" + "0".repeat(8);
  assert.equal(validatePhone(tenDigits).value, "+91" + tenDigits);
  // "91" + 9 digits (11 digits) is neither a mobile nor a country code + mobile.
  assert.equal(validatePhone("91" + "9" + "0".repeat(8)).ok, false);
});

test("validatePhone survives non-string input", () => {
  for (const v of [null, undefined, 108, {}, []]) {
    assert.equal(validatePhone(v).ok, false);
  }
});

// ---------- Demo Mode lock ----------

test("Demo Mode is on by default and cannot be switched off", () => {
  useFakeStorage();
  assert.equal(DEFAULT_SETTINGS.demoMode, true);
  assert.equal(getSettings().demoMode, true);
  assert.equal(saveSettings({ demoMode: false }).demoMode, true);
  assert.equal(getSettings().demoMode, true);
  assert.equal(normaliseSettings({ demoMode: false }).demoMode, true);
  assert.equal(normaliseSettings({ demoMode: "off" }).demoMode, true);
});

test("an emergency number written straight into storage is treated as not set", () => {
  const fake = useFakeStorage();
  fake.setItem("gh_settings", JSON.stringify({ demoEmergencyNumber: "108", demoHospitalNumber: "112", demoEmergencyName: "X" }));
  const s = getSettings();
  assert.equal(s.demoEmergencyNumber, "");
  assert.equal(s.demoHospitalNumber, "");
  assert.equal(isDemoReady(s), false);
});

test("settings save, reload and fall back to defaults on junk", () => {
  const fake = useFakeStorage();
  const n = sampleMobile("8");
  saveSettings({ language: "te", demoEmergencyNumber: n, demoEmergencyName: " Teammate A ", voice: false });
  const s = getSettings();
  assert.equal(s.language, "te");
  assert.equal(s.demoEmergencyNumber, "+91" + n);
  assert.equal(s.demoEmergencyName, "Teammate A");
  assert.equal(s.voice, false);
  assert.equal(isDemoReady(s), true);

  assert.equal(normaliseSettings({ language: "fr", llmProvider: "evil" }).language, "en");
  assert.equal(normaliseSettings({ llmProvider: "evil" }).llmProvider, "gemini");

  fake.setItem("gh_settings", "{broken json");
  assert.deepEqual(getSettings(), DEFAULT_SETTINGS);
});

test("API keys are stored as plain text under gh_key_<provider> and can be cleared", () => {
  const fake = useFakeStorage();
  setApiKey("gemini", "  placeholder-not-a-real-key  ");
  assert.equal(fake.getItem("gh_key_gemini"), "placeholder-not-a-real-key");
  assert.equal(getApiKey("gemini"), "placeholder-not-a-real-key");
  setApiKey("gemini", "");
  assert.equal(fake.getItem("gh_key_gemini"), null);
  assert.equal(getApiKey("openrouter"), "");
});
