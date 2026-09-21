import { test } from "node:test";
import assert from "node:assert/strict";
import { useFakeStorage, useBrokenStorage } from "./helpers.js";
import * as storage from "../src/lib/storage.js";
import { DEFAULT_THRESHOLDS, mergeThresholds, getThresholds } from "../src/lib/thresholds.js";

test("get returns the fallback for missing or broken values", () => {
  const fake = useFakeStorage();
  assert.equal(storage.get("gh_nothing", "fallback"), "fallback");
  fake.setItem("gh_broken", "{not json");
  assert.deepEqual(storage.get("gh_broken", { safe: true }), { safe: true });
});

test("set then get round-trips JSON values", () => {
  useFakeStorage();
  assert.equal(storage.set("gh_profile", { name: "Lakshmi", age: 68 }), true);
  assert.deepEqual(storage.get("gh_profile"), { name: "Lakshmi", age: 68 });
});

test("clearAll removes every gh_ key and nothing else", () => {
  const fake = useFakeStorage();
  storage.set("gh_settings", { a: 1 });
  storage.set("gh_contacts", []);
  storage.setText("gh_key_gemini", "placeholder");
  fake.setItem("someone-elses-key", "keep me");
  assert.equal(storage.clearAll(), true);
  assert.equal(fake.length, 1);
  assert.equal(fake.getItem("someone-elses-key"), "keep me");
});

test("blocked storage never throws: reads give fallbacks, writes give false", () => {
  useBrokenStorage();
  assert.equal(storage.get("gh_settings", "fallback"), "fallback");
  assert.equal(storage.getText("gh_key_gemini", ""), "");
  assert.equal(storage.set("gh_settings", {}), false);
  assert.equal(storage.setText("gh_key_gemini", "x"), false);
  assert.equal(storage.clearAll(), false);
  assert.deepEqual(getThresholds(), DEFAULT_THRESHOLDS);
});

// ---------- thresholds (PRD Section 19 starting values) ----------

test("default thresholds match the PRD Section 19 table", () => {
  const t = DEFAULT_THRESHOLDS;
  assert.equal(t.face.generalMaxF, 0.35);
  assert.equal(t.face.baselineMarginF, 0.20);
  assert.equal(t.face.generalMaxDrest, 0.08);
  assert.equal(t.face.baselineMarginDrest, 0.05);
  assert.equal(t.face.minSmileLift, 0.03);
  assert.equal(t.speech.generalMaxWer, 0.30);
  assert.equal(t.speech.baselineMarginWer, 0.25);
  assert.equal(t.speech.generalMinRate, 1.2);
  assert.equal(t.speech.baselineMinRateFraction, 0.70);
  assert.equal(t.speech.generalMaxPauseRatio, 0.40);
  assert.equal(t.speech.baselineMarginPauseRatio, 0.20);
  assert.equal(t.arm.generalMaxA, 12);
  assert.equal(t.arm.baselineMarginA, 8);
  assert.equal(t.arm.generalMaxDiff, 8); // DECISIONS D7: 8 degrees, not the interim 6
  assert.equal(t.arm.baselineMarginDiff, 6);
  assert.equal(t.arm.dropAngleDeg, 45);
  assert.equal(t.arm.dropAccel, 20);
  assert.equal(t.eyes.gazeOffCentre, 0.2);
  assert.equal(t.eyes.gazeFrameFraction, 0.70);
  assert.equal(t.eyes.sideVisionMaxMisses, 2);
  assert.equal(t.balance.generalMaxRmsSway, 0.25);
  assert.equal(t.balance.baselineSwayMultiplier, 2);
  assert.equal(t.alert.countdownSeconds, 10);
  assert.equal(t.llm.timeoutMs, 8000);
});

test("mergeThresholds applies numeric overrides and ignores junk", () => {
  const merged = mergeThresholds(DEFAULT_THRESHOLDS, {
    arm: { generalMaxA: 10, generalMaxDiff: "lots", madeUp: 1 },
    nonsense: { x: 1 },
    face: null
  });
  assert.equal(merged.arm.generalMaxA, 10);
  assert.equal(merged.arm.generalMaxDiff, 8);
  assert.equal("madeUp" in merged.arm, false);
  assert.equal("nonsense" in merged, false);
  assert.deepEqual(merged.face, DEFAULT_THRESHOLDS.face);
  assert.equal(DEFAULT_THRESHOLDS.arm.generalMaxA, 12, "defaults must not be mutated");
});

test("getThresholds reads tuned values from gh_thresholds", () => {
  useFakeStorage();
  storage.set("gh_thresholds", { face: { generalMaxF: 0.4 } });
  assert.equal(getThresholds().face.generalMaxF, 0.4);
  assert.equal(getThresholds().face.generalMaxDrest, 0.08);
});
