// arm-metrics.js — F9 Arm test (pronator drift): ALL the maths and the verdict, as pure functions.
// No browser APIs and no React, so every rule here is unit-tested with synthetic angle series
// (test/arm-metrics.test.js). The sensor reading lives in arm.js.
//
// MEDICAL IDEA: with eyes closed, a weak arm slowly SINKS and the palm TURNS INWARD, because the
// brain can no longer hold the arm in place without looking. The phone lies flat on the palm, so:
//   - the fingertips sinking tilts the phone front-to-back  -> `beta` changes  (drift)
//   - the palm turning inward rolls the phone sideways       -> `gamma` changes (pronation)
// A stroke affects ONE side, so the left-right difference matters as much as each arm alone.
//
// Sample shapes (t = milliseconds since the 10-second recording started):
//   orientation sample  { t, beta, gamma }          degrees
//   motion sample       { t, rotMag, accMag }       rotation speed in deg/s, acceleration in m/s^2
//
// Every limit comes from thresholds.js (`thr` below is thresholds.arm). Nothing is hardcoded.

// ---------- small maths helpers ----------

export function mean(values) {
  if (values.length === 0) return NaN;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Standard deviation: how much the values wobble around their mean. */
export function std(values) {
  if (values.length === 0) return NaN;
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

/** Smallest signed difference a - b in degrees. Handles the jump between +180 and -180. */
export function angleDelta(a, b) {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

const round = (value, places = 2) => (Number.isFinite(value) ? Number(value.toFixed(places)) : null);

// ---------- smoothing ----------

/**
 * Exponential moving average: new = alpha * sample + (1 - alpha) * previous.
 * Why: raw sensor angles jitter by a fraction of a degree. Smoothing removes the jitter but keeps
 * the slow sinking we are looking for. alpha = 0.2 (PRD) reacts within about 5 samples (~0.1 s).
 */
export function smoothOrientation(samples, alpha) {
  const out = [];
  let beta = null;
  let gamma = null;
  for (const s of samples) {
    beta = beta === null ? s.beta : beta + alpha * angleDelta(s.beta, beta);
    gamma = gamma === null ? s.gamma : gamma + alpha * (s.gamma - gamma);
    out.push({ t: s.t, beta, gamma });
  }
  return out;
}

// ---------- readiness (before recording starts) ----------

/**
 * Is the phone lying roughly flat and held steady? Looks at the last `readyWindowMs` of samples.
 * Returns { flat, steady, ready } so the screen can tell the helper WHAT to fix.
 */
export function checkReadiness(samples, nowT, thr) {
  const window = samples.filter((s) => s.t > nowT - thr.readyWindowMs && s.t <= nowT);
  // We need (almost) a full second of data; two samples 50 ms apart prove nothing.
  const coversWindow = window.length >= 10 && window[0].t <= nowT - 0.8 * thr.readyWindowMs;
  if (!coversWindow) return { flat: false, steady: false, ready: false };

  const flat = window.every((s) => Math.abs(s.beta) < thr.readyMaxTiltDeg && Math.abs(s.gamma) < thr.readyMaxTiltDeg);
  const steady = std(window.map((s) => s.beta)) < thr.readyMaxStdDeg && std(window.map((s) => s.gamma)) < thr.readyMaxStdDeg;
  return { flat, steady, ready: flat && steady };
}

// ---------- drop detection (used live during recording AND in the final metrics) ----------

/** True if this sample is further than `dropAngleDeg` from where the arm started. */
export function isDropSample(sample, start, thr) {
  return (
    Math.abs(angleDelta(sample.beta, start.beta)) > thr.dropAngleDeg ||
    Math.abs(sample.gamma - start.gamma) > thr.dropAngleDeg
  );
}

/**
 * True if the acceleration spikes. `accMag` includes gravity, so a phone at rest reads about
 * 9.8 m/s^2; a phone that is dropped or caught reads far above `dropAccel` (20 m/s^2) for a moment.
 */
export function isAccelSpike(accMag, thr) {
  return Number.isFinite(accMag) && accMag > thr.dropAccel;
}

// ---------- metrics for ONE arm ----------

/**
 * Turn one arm's 10-second recording into numbers.
 * Returns { valid, reason, beta0, gamma0, driftBeta, pronationGamma, signedDrift, tremor, A,
 *           dropped, sampleRate, sampleCount }.
 * `valid: false` means a TECHNICAL problem (too little sensor data) -> the arm is NOT_TESTED.
 * It never means the patient failed.
 */
export function computeArmMetrics(orientation, motion, thr) {
  const recorded = orientation.filter((s) => s.t >= 0 && s.t <= thr.recordMs && Number.isFinite(s.beta) && Number.isFinite(s.gamma));
  const sampleRate = recorded.length / (thr.recordMs / 1000);
  const base = { valid: false, sampleRate: round(sampleRate, 1), sampleCount: recorded.length };

  if (sampleRate < thr.minSamplesPerSecond) return { ...base, reason: "too_few_samples" };

  const smooth = smoothOrientation(recorded, thr.smoothingAlpha);
  const startWindow = smooth.filter((s) => s.t < thr.startWindowMs);
  const endWindow = smooth.filter((s) => s.t >= thr.recordMs - thr.endWindowMs);
  if (startWindow.length === 0 || endWindow.length === 0) return { ...base, reason: "missing_window" };

  // Start = mean of the first second; end = mean of the last two seconds (PRD F9).
  // Means (not single samples) so one twitch at the wrong moment cannot decide the result.
  const beta0 = mean(startWindow.map((s) => s.beta));
  const gamma0 = mean(startWindow.map((s) => s.gamma));
  const betaEnd = mean(endWindow.map((s) => s.beta));
  const gammaEnd = mean(endWindow.map((s) => s.gamma));

  const signedDrift = angleDelta(betaEnd, beta0);
  const driftBeta = Math.abs(signedDrift);              // fingertips sinking
  const pronationGamma = Math.abs(gammaEnd - gamma0);   // palm rolling
  // Drift counts fully, pronation half: sinking is the stronger sign (PRD starting weights).
  const A = driftBeta + thr.pronationWeight * pronationGamma;

  // Tremor: how uneven the rotation speed is. Information for the doctor card; not used for the verdict.
  const rotation = motion.filter((m) => m.t >= 0 && m.t <= thr.recordMs && Number.isFinite(m.rotMag)).map((m) => m.rotMag);
  const tremor = rotation.length > 0 ? std(rotation) : null;

  // Drop: judged on RAW samples (smoothing would hide a fast fall) against the start angles.
  const start = { beta: beta0, gamma: gamma0 };
  const dropped = recorded.some((s) => isDropSample(s, start, thr)) || motion.some((m) => isAccelSpike(m.accMag, thr));

  return {
    valid: true, reason: null,
    beta0: round(beta0), gamma0: round(gamma0),
    driftBeta: round(driftBeta), pronationGamma: round(pronationGamma), signedDrift: round(signedDrift),
    tremor: round(tremor), A: round(A),
    dropped, sampleRate: round(sampleRate, 1), sampleCount: recorded.length
  };
}

// ---------- verdict for BOTH arms ----------

// What happened to one arm:
//   "measured"   10 s recorded, metrics are valid
//   "dropped"    the arm fell or the phone dropped           -> NOT_COMPLETED (a warning sign)
//   "cannot"     helper tapped "They cannot do this test"    -> NOT_COMPLETED (a warning sign)
//   "no_sensor"  / "invalid" / "aborted" / "skipped"         -> technical, not a patient sign
const PATIENT_FAILED = ["dropped", "cannot"];

function hasArmBaseline(baselineArm) {
  return Boolean(
    baselineArm && baselineArm.left && baselineArm.right &&
    Number.isFinite(baselineArm.left.A) && Number.isFinite(baselineArm.right.A) && Number.isFinite(baselineArm.diff)
  );
}

/**
 * Decide the arm test. `arms` = { left: { outcome, metrics }, right: { outcome, metrics } }.
 * `baselineArm` = gh_baseline.arm or null. Returns { status, rule, weakerSide, diff, message }.
 *
 * Order matters and leans toward alerts (PRD Section 11: a false alarm costs a hospital trip,
 * a missed stroke costs a life):
 *   1. an arm the patient could not do       -> NOT_COMPLETED
 *   2. any measured arm over its limit       -> ABNORMAL
 *   3. an arm we could not measure           -> NOT_TESTED  (never NORMAL on half a test)
 *   4. left-right difference over its limit  -> ABNORMAL
 *   5. otherwise                             -> NORMAL
 */
export function classifyArmTest(arms, baselineArm, thr) {
  const sides = ["left", "right"];
  const useBaseline = hasArmBaseline(baselineArm);
  const rule = useBaseline ? "baseline" : "general";
  const result = (status, weakerSide, diff, message) => ({ status, rule, weakerSide, diff: round(diff), message });

  // 1. The patient could not do it.
  const failedSides = sides.filter((side) => PATIENT_FAILED.includes(arms[side].outcome));
  if (failedSides.length > 0) {
    const dropped = failedSides.some((side) => arms[side].outcome === "dropped");
    return result("NOT_COMPLETED", failedSides.length === 1 ? failedSides[0] : null, null,
      dropped ? "arm.result.dropped" : "arm.result.notCompleted");
  }

  // 2. A single arm over its own limit.
  const limitFor = (side) => (useBaseline ? baselineArm[side].A + thr.baselineMarginA : thr.generalMaxA);
  const measured = sides.filter((side) => arms[side].outcome === "measured");
  const overLimit = measured.filter((side) => arms[side].metrics.A > limitFor(side));

  const bothMeasured = measured.length === 2;
  const diff = bothMeasured ? Math.abs(arms.left.metrics.A - arms.right.metrics.A) : null;
  // Weaker side = the arm with the larger score A (PRD F9).
  const larger = bothMeasured ? (arms.left.metrics.A >= arms.right.metrics.A ? "left" : "right") : (overLimit[0] || null);
  const weakerMessage = (side) => (side === "left" ? "arm.result.weakerLeft" : "arm.result.weakerRight");

  if (overLimit.length > 0) {
    const weaker = overLimit.length === 1 ? overLimit[0] : larger;
    return result("ABNORMAL", weaker, diff, weakerMessage(weaker));
  }

  // 3. Something technical stopped one arm: do not call half a test normal.
  if (!bothMeasured) {
    const noSensor = sides.some((side) => arms[side].outcome === "no_sensor");
    return result("NOT_TESTED", null, null, noSensor ? "arm.result.noSensors" : "arm.result.invalid");
  }

  // 4. Left-right difference.
  const diffLimit = useBaseline ? baselineArm.diff + thr.baselineMarginDiff : thr.generalMaxDiff;
  if (diff > diffLimit) return result("ABNORMAL", larger, diff, weakerMessage(larger));

  // 5. No warning sign in this test.
  return result("NORMAL", null, diff, "arm.result.normal");
}

// ---------- TestResult (PRD Section 13) ----------

/** Shrink a raw angle series for the graph/result: angles relative to the start, one decimal. */
export function relativeSeries(orientation, start) {
  return orientation.map((s) => ({
    t: Math.round(s.t),
    beta: round(angleDelta(s.beta, start.beta), 1),
    gamma: round(s.gamma - start.gamma, 1)
  }));
}

/**
 * Assemble the TestResult every test module must return.
 * `message` is an i18n KEY (the screen translates it), see DECISIONS D24.
 * In "baseline" mode the personal baseline is ignored (we are recording it right now), and the
 * screen does not show the status as a verdict.
 */
export function buildArmResult({ mode, arms, baselineArm, thr, startedAt, durationMs, series = null }) {
  const verdict = classifyArmTest(arms, mode === "baseline" ? null : baselineArm, thr);
  const pick = (arm) => (arm.outcome === "measured"
    ? { outcome: arm.outcome, driftBeta: arm.metrics.driftBeta, pronationGamma: arm.metrics.pronationGamma,
        tremor: arm.metrics.tremor, A: arm.metrics.A, sampleRate: arm.metrics.sampleRate }
    : { outcome: arm.outcome, sampleRate: arm.metrics ? arm.metrics.sampleRate : null });

  return {
    test: "arm",
    status: verdict.status,
    mode,
    rule: verdict.rule,
    weakerSide: verdict.weakerSide,
    metrics: { left: pick(arms.left), right: pick(arms.right), diff: verdict.diff },
    engine: "sensors",
    message: verdict.message,
    messageVars: {},
    startedAt,
    durationMs,
    series // raw angle series for the graph; NOT stored in gh_sessions (too big)
  };
}
