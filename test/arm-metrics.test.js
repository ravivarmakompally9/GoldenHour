// Synthetic angle series only (allowed in unit tests, never in the app — safety rule 8).
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_THRESHOLDS } from "../src/lib/thresholds.js";
import {
  mean, std, angleDelta, smoothOrientation, checkReadiness, isDropSample, isAccelSpike,
  computeArmMetrics, classifyArmTest, buildArmResult, relativeSeries
} from "../src/lib/tests/arm-metrics.js";

const thr = DEFAULT_THRESHOLDS.arm;
const near = (actual, expected, tolerance, label) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, (label || "value") + ": expected about " + expected + ", got " + actual);

// Small repeatable "random" jitter so tests never flake.
function jitter(i, size) { return size * Math.sin(i * 12.9898) * Math.cos(i * 4.1414); }

/** A 10-second recording at `hz`: beta and gamma move linearly from start to end, plus jitter. */
function recording({ beta = [2, 2], gamma = [-1, -1], hz = 60, noise = 0.15, ms = thr.recordMs } = {}) {
  const orientation = [];
  const motion = [];
  const n = Math.round((ms / 1000) * hz);
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * ms;
    const k = t / ms;
    orientation.push({ t, beta: beta[0] + (beta[1] - beta[0]) * k + jitter(i, noise), gamma: gamma[0] + (gamma[1] - gamma[0]) * k + jitter(i + 7, noise) });
    motion.push({ t, rotMag: 1 + Math.abs(jitter(i, 0.5)), accMag: 9.8 + jitter(i, 0.2) });
  }
  return { orientation, motion };
}
const metricsOf = (options) => { const r = recording(options); return computeArmMetrics(r.orientation, r.motion, thr); };
const measured = (options) => ({ outcome: "measured", metrics: metricsOf(options) });
const steady = () => measured();

// ---------- helpers ----------

test("mean, std and angleDelta", () => {
  assert.equal(mean([1, 2, 3]), 2);
  near(std([2, 4, 4, 4, 5, 5, 7, 9]), 2, 1e-9);
  assert.ok(Number.isNaN(mean([])));
  assert.equal(angleDelta(10, 350), 20);
  assert.equal(angleDelta(-179, 179), 2, "wraps across +/-180");
  assert.equal(angleDelta(5, 15), -10);
});

test("smoothing removes jitter but follows a slow drift", () => {
  const raw = recording({ beta: [0, 20], noise: 1 }).orientation;
  const smooth = smoothOrientation(raw, thr.smoothingAlpha);
  assert.equal(smooth.length, raw.length);
  const wobble = (series) => std(series.slice(1).map((s, i) => s.beta - series[i].beta));
  assert.ok(wobble(smooth) < wobble(raw) / 2, "smoothed series must wobble much less");
  near(smooth.at(-1).beta, 20, 1.5, "end of drift");
});

// ---------- readiness ----------

test("readiness: flat + steady for a full second", () => {
  const flat = recording({ ms: 1500 }).orientation;
  assert.deepEqual(checkReadiness(flat, 1500, thr), { flat: true, steady: true, ready: true });

  const tilted = recording({ beta: [35, 35], ms: 1500 }).orientation;
  assert.equal(checkReadiness(tilted, 1500, thr).flat, false);
  assert.equal(checkReadiness(tilted, 1500, thr).ready, false);

  const shaky = recording({ noise: 12, ms: 1500 }).orientation;
  assert.equal(checkReadiness(shaky, 1500, thr).steady, false);

  assert.equal(checkReadiness(flat.filter((s) => s.t > 1300), 1500, thr).ready, false, "0.2 s of data is not enough");
  assert.equal(checkReadiness([], 1500, thr).ready, false);
});

// ---------- one arm ----------

test("steady arm: tiny drift, valid, not dropped", () => {
  const m = metricsOf();
  assert.equal(m.valid, true);
  assert.equal(m.dropped, false);
  assert.ok(m.A < 1.5, "A should be near 0, got " + m.A);
  near(m.sampleRate, 60, 1);
  assert.ok(m.tremor !== null && m.tremor >= 0);
});

test("slow sag of 18 degrees is measured as drift (mean of first 1 s vs last 2 s)", () => {
  const m = metricsOf({ beta: [2, 20] });
  // Linear sag: first-second mean is ~0.9 deg in, last-two-seconds mean is ~1.8 deg before the end.
  near(m.driftBeta, 18 * (1 - 0.05 - 0.10), 0.6, "driftBeta");
  assert.ok(m.pronationGamma < 1);
  near(m.A, m.driftBeta + 0.5 * m.pronationGamma, 0.02, "A = drift + 0.5 x pronation");
  assert.ok(m.signedDrift > 0);
});

test("palm rotation counts at half weight", () => {
  const m = metricsOf({ gamma: [0, 30] });
  near(m.pronationGamma, 30 * 0.85, 0.8, "pronation");
  near(m.A, 0.5 * m.pronationGamma, 0.6, "A");
});

test("drop: a sudden 60 degree fall, or an acceleration spike", () => {
  const fall = recording();
  fall.orientation.filter((s) => s.t > 6000).forEach((s) => { s.beta += 60; });
  assert.equal(computeArmMetrics(fall.orientation, fall.motion, thr).dropped, true);

  const bump = recording();
  bump.motion[300].accMag = 31;
  assert.equal(computeArmMetrics(bump.orientation, bump.motion, thr).dropped, true);

  assert.equal(isDropSample({ beta: 46.1, gamma: 0 }, { beta: 1, gamma: 0 }, thr), true);
  assert.equal(isDropSample({ beta: 45.9, gamma: 0 }, { beta: 1, gamma: 0 }, thr), false);
  assert.equal(isDropSample({ beta: 0, gamma: -50 }, { beta: 0, gamma: 0 }, thr), true);
  assert.equal(isAccelSpike(20.1, thr), true);
  assert.equal(isAccelSpike(9.8, thr), false);
  assert.equal(isAccelSpike(null, thr), false);
});

test("too little sensor data is a TECHNICAL problem (valid: false), not a patient sign", () => {
  assert.equal(metricsOf({ hz: 5 }).valid, false);
  assert.equal(metricsOf({ hz: 5 }).reason, "too_few_samples");
  assert.equal(computeArmMetrics([], [], thr).valid, false);
  const gap = recording();
  const noEnd = gap.orientation.filter((s) => s.t < 7000);
  assert.equal(computeArmMetrics(noEnd, gap.motion, thr).reason, "missing_window");
  const nulls = recording().orientation.map((s) => ({ ...s, beta: null }));
  assert.equal(computeArmMetrics(nulls, [], thr).valid, false);
});

// ---------- verdict ----------

const withA = (A) => ({ outcome: "measured", metrics: { A, sampleRate: 60 } });

test("general rule boundaries: A > 12 is ABNORMAL, exactly 12 is not; diff > 8 is ABNORMAL, exactly 8 is not", () => {
  assert.equal(classifyArmTest({ left: withA(12), right: withA(11) }, null, thr).status, "NORMAL");
  assert.equal(classifyArmTest({ left: withA(12.01), right: withA(11) }, null, thr).status, "ABNORMAL");
  assert.equal(classifyArmTest({ left: withA(10), right: withA(2) }, null, thr).status, "NORMAL");
  const lopsided = classifyArmTest({ left: withA(2), right: withA(10.5) }, null, thr);
  assert.equal(lopsided.status, "ABNORMAL");
  assert.equal(lopsided.weakerSide, "right");
  assert.equal(lopsided.message, "arm.result.weakerRight");
  assert.equal(lopsided.rule, "general");
  assert.equal(lopsided.diff, 8.5);
});

test("steady arms NORMAL; sagging arm ABNORMAL with the weaker side named", () => {
  const ok = classifyArmTest({ left: steady(), right: steady() }, null, thr);
  assert.equal(ok.status, "NORMAL");
  assert.equal(ok.weakerSide, null);
  assert.equal(ok.message, "arm.result.normal");

  const sag = classifyArmTest({ left: measured({ beta: [2, 20] }), right: steady() }, null, thr);
  assert.equal(sag.status, "ABNORMAL");
  assert.equal(sag.weakerSide, "left");

  const both = classifyArmTest({ left: withA(14), right: withA(19) }, null, thr);
  assert.equal(both.weakerSide, "right", "both over the limit: the larger A is the weaker side");
});

test("baseline rule: arm over its own baseline + 8, or diff over baseline diff + 6", () => {
  const baseline = { left: { A: 3 }, right: { A: 2 }, diff: 1 };
  assert.equal(classifyArmTest({ left: withA(10.9), right: withA(9.9) }, baseline, thr).status, "NORMAL");
  assert.equal(classifyArmTest({ left: withA(10.9), right: withA(9.9) }, baseline, thr).rule, "baseline");
  assert.equal(classifyArmTest({ left: withA(11.1), right: withA(9) }, baseline, thr).status, "ABNORMAL");
  // 8.5 vs 1 -> diff 7.5 > 1 + 6, although neither arm is over its own limit.
  const r = classifyArmTest({ left: withA(8.5), right: withA(1) }, baseline, thr);
  assert.equal(r.status, "ABNORMAL");
  assert.equal(r.weakerSide, "left");
  // A broken baseline record falls back to the general rule.
  assert.equal(classifyArmTest({ left: withA(1), right: withA(1) }, { left: { A: "x" } }, thr).rule, "general");
});

test("an arm the patient cannot do is NOT_COMPLETED, even if the other arm is perfect", () => {
  const cannot = classifyArmTest({ left: { outcome: "cannot" }, right: { outcome: "skipped" } }, null, thr);
  assert.equal(cannot.status, "NOT_COMPLETED");
  assert.equal(cannot.weakerSide, "left");
  assert.equal(cannot.message, "arm.result.notCompleted");

  const dropped = classifyArmTest({ left: steady(), right: { outcome: "dropped" } }, null, thr);
  assert.equal(dropped.status, "NOT_COMPLETED");
  assert.equal(dropped.weakerSide, "right");
  assert.equal(dropped.message, "arm.result.dropped");
});

test("technical problems are NOT_TESTED and never NORMAL; a measured bad arm still counts", () => {
  assert.equal(classifyArmTest({ left: { outcome: "no_sensor" }, right: { outcome: "no_sensor" } }, null, thr).status, "NOT_TESTED");
  assert.equal(classifyArmTest({ left: { outcome: "no_sensor" }, right: { outcome: "no_sensor" } }, null, thr).message, "arm.result.noSensors");
  const half = classifyArmTest({ left: steady(), right: { outcome: "invalid" } }, null, thr);
  assert.equal(half.status, "NOT_TESTED", "half a test is never called normal");
  assert.equal(half.message, "arm.result.invalid");
  assert.equal(classifyArmTest({ left: withA(15), right: { outcome: "aborted" } }, null, thr).status, "ABNORMAL");
});

// ---------- TestResult ----------

test("buildArmResult returns the PRD TestResult shape", () => {
  const result = buildArmResult({
    mode: "emergency", arms: { left: measured({ beta: [2, 20] }), right: steady() }, baselineArm: null, thr,
    startedAt: "2026-09-26T22:31:05+05:30", durationMs: 31000
  });
  assert.deepEqual(Object.keys(result).sort(), ["durationMs", "engine", "message", "messageVars", "metrics", "mode", "rule", "series", "startedAt", "status", "test", "weakerSide"]);
  assert.equal(result.test, "arm");
  assert.equal(result.engine, "sensors");
  assert.equal(result.status, "ABNORMAL");
  assert.equal(result.weakerSide, "left");
  assert.ok(result.metrics.left.A > 12 && result.metrics.right.A < 2);
  assert.ok(result.metrics.diff > 8);
  assert.doesNotThrow(() => JSON.stringify(result));
});

test("baseline mode ignores the stored baseline (it is being recorded right now)", () => {
  const stored = { left: { A: 0 }, right: { A: 0 }, diff: 0 };
  const arms = { left: withA(9), right: withA(9) };
  assert.equal(buildArmResult({ mode: "baseline", arms, baselineArm: stored, thr }).rule, "general");
  assert.equal(buildArmResult({ mode: "emergency", arms, baselineArm: stored, thr }).rule, "baseline");
});

test("relativeSeries is relative to the start and compact", () => {
  const series = relativeSeries([{ t: 0.4, beta: 5.04, gamma: -2 }, { t: 16.7, beta: 9.56, gamma: 1.26 }], { beta: 5, gamma: -2 });
  assert.deepEqual(series, [{ t: 0, beta: 0, gamma: 0 }, { t: 17, beta: 4.6, gamma: 3.3 }]);
});
