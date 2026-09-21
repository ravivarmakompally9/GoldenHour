// arm.js — F9 Arm test (pronator drift): reads the phone's motion sensors and runs the test.
// Plain JavaScript, no React. All maths and the verdict live in arm-metrics.js (unit-tested).
//
// PRD contract (DECISIONS D24 adds the optional extras):
//   run({ mode, container, baseline, thresholds, camera, onUpdate }) -> Promise<TestResult>
//   abort()        stop now (screen left / EMERGENCY NOW)      -> resolves NOT_TESTED
//   armPlaced()    helper tapped "Phone is on the palm"        (D22)
//   cannotDo()     helper tapped "They cannot do this test"    -> NOT_COMPLETED (a warning sign)
//
// `container` is where the live tilt graph is drawn (optional). The module shows NO words: it
// reports its state through onUpdate(state) and the screen (or dev/arm.html) renders the
// instructions from the i18n files.
//
//   state = { phase, arm, secondsLeft, flat, steady, showHint, dBeta, dGamma, eventRate, motionRate }
//
// HOW THE ANGLES ARE READ (important, learned on a real phone): Chrome on Android sends a
// deviceorientation event ONLY when an angle changes by ~0.1 degree. A steady arm sends almost
// nothing. So the events just update "the latest angle", and a steady 50-times-a-second clock
// samples that latest angle (sample-and-hold). Silence means "nothing moved", never "failed".
// Sensors are judged broken only if BOTH orientation and motion events stop for seconds
// (devicemotion keeps firing ~60 times a second even when the phone is perfectly still).
//   phase: "checking" -> [ "place" -> "waiting" -> "settling" -> "recording" -> "rest" ] x2 -> "done"
//
// SAFETY: every number in the result comes from real sensor events. There is no simulated path.

import { getThresholds } from "../thresholds.js";
import { angleDelta, mean, checkReadiness, isDropSample, isAccelSpike, computeArmMetrics, buildArmResult, relativeSeries, holdResample, longestGap } from "./arm-metrics.js";
import { createArmChart } from "./arm-chart.js";

const ARMS = ["left", "right"];
const TICK_MS = 100;          // state updates + graph repaint: 10 times a second
const READY_BUFFER_MS = 3000; // how much history the readiness check keeps

let active = null;            // the one run in progress (the PRD contract has module-level abort())
let lastChart = null;         // kept after the run so the final graph stays visible

export function run(options = {}) {
  if (active) active.finish("aborted");
  return new Promise((resolve) => {
    active = createRun(options, (result) => { active = null; resolve(result); });
    active.start();
  });
}

export function abort() { if (active) active.finish("aborted"); }
export function armPlaced() { if (active) active.armPlaced(); }
export function cannotDo() { if (active) active.finish("cannot"); }

function vibrate(pattern) {
  // Not every phone vibrates (and Do Not Disturb can silence it); the screen shows the cue too.
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch { /* ignore */ }
}

function createRun({ mode = "emergency", container = null, baseline = null, thresholds = null, onUpdate = () => {} }, resolve) {
  const thr = (thresholds || getThresholds()).arm;
  const startedAtMs = Date.now();

  let phase = "checking";
  let armIndex = 0;
  let phaseStart = performance.now();
  let recordStart = 0;
  let startRef = null;                 // angles the arm started at (for live drop detection + graph)
  let readiness = { flat: false, steady: false, ready: false };
  let sensorSeen = false;
  let finished = false;
  let ticker = null;
  let chart = null;

  let latest = null;                   // newest angles the sensor told us: { beta, gamma }
  let sampler = null;                  // the steady clock that samples `latest`
  const recent = [];                   // last few seconds of SAMPLED angles, for the readiness check
  let rawEvents = [];                  // orientation events as they arrived { t, beta, gamma } (absolute ms)
  let sensorTimes = [];                // when ANY sensor event arrived (to detect real silence)
  let liveSamples = [];                // current arm's sampled recording (live graph + drop check)
  let motion = [];
  const arms = { left: { outcome: "skipped" }, right: { outcome: "skipped" } };
  const series = { left: [], right: [] };
  let orientationTimes = [];           // for the live events-per-second readout
  let motionTimes = [];

  const armName = () => ARMS[armIndex];
  const setPhase = (next) => { phase = next; phaseStart = performance.now(); emit(); };

  // ---------- sensor events ----------

  function onOrientation(event) {
    if (!Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return; // null = no gyroscope / blocked
    sensorSeen = true;
    const now = performance.now();
    latest = { beta: event.beta, gamma: event.gamma };
    orientationTimes.push(now);
    sensorTimes.push(now);
    // Keep the raw events: the final metrics are computed from them (holdResample), and the one
    // event from just before the recording gives the starting angle.
    rawEvents.push({ t: now, beta: event.beta, gamma: event.gamma });
    if (phase !== "recording" && rawEvents.length > 200) rawEvents = rawEvents.slice(-50);
  }

  function onMotion(event) {
    const now = performance.now();
    motionTimes.push(now);
    sensorTimes.push(now);
    if (phase !== "recording") { if (sensorTimes.length > 400) sensorTimes = sensorTimes.slice(-100); return; }
    const r = event.rotationRate;
    const a = event.accelerationIncludingGravity;
    const rotMag = r && Number.isFinite(r.alpha) ? Math.hypot(r.alpha || 0, r.beta || 0, r.gamma || 0) : NaN;
    const accMag = a && Number.isFinite(a.x) ? Math.hypot(a.x || 0, a.y || 0, a.z || 0) : NaN;
    motion.push({ t: now - recordStart, rotMag, accMag });
    if (isAccelSpike(accMag, thr)) endArm("dropped");
  }

  /** The steady clock: 50 times a second, take the latest known angle (sample-and-hold). */
  function sample() {
    if (finished || !latest) return;
    const now = performance.now();
    recent.push({ t: now, beta: latest.beta, gamma: latest.gamma });
    while (recent.length > 0 && recent[0].t < now - READY_BUFFER_MS) recent.shift();

    if (phase !== "recording") return;
    const point = { t: now - recordStart, beta: latest.beta, gamma: latest.gamma };
    liveSamples.push(point);

    // Start reference: the first sample at first, then the mean of the first second (as in the metrics).
    if (!startRef || point.t <= thr.startWindowMs) {
      const firstSecond = liveSamples.filter((p) => p.t <= thr.startWindowMs);
      startRef = { beta: mean(firstSecond.map((p) => p.beta)), gamma: mean(firstSecond.map((p) => p.gamma)) };
    }
    if (chart) chart.push(point.t, angleDelta(point.beta, startRef.beta), point.gamma - startRef.gamma);

    // The arm fell: stop at once. Waiting out the 10 seconds would only delay help.
    if (isDropSample(point, startRef, thr)) endArm("dropped");
  }

  // ---------- the flow ----------

  function tick() {
    if (finished) return;
    const now = performance.now();
    const elapsed = now - phaseStart;

    if (phase === "checking") {
      if (sensorSeen) setPhase("place");
      else if (elapsed > thr.sensorCheckMs) finish("no_sensor");
    } else if (phase === "waiting") {
      readiness = checkReadiness(recent, now, thr);
      if (readiness.ready) { vibrate(200); setPhase("settling"); }        // cue: "Close your eyes and hold still."
    } else if (phase === "settling") {
      if (elapsed >= thr.settleMs) beginRecording();
    } else if (phase === "recording") {
      if (elapsed >= thr.recordMs) endArm("measured");
    } else if (phase === "rest") {
      if (elapsed >= thr.restMs) {
        if (armIndex === ARMS.length - 1) finish("complete");
        else { armIndex += 1; setPhase("place"); }
      }
    }
    if (chart && phase === "recording") chart.draw();
    emit();
  }

  function beginRecording() {
    liveSamples = [];
    motion = [];
    startRef = null;
    recordStart = performance.now();
    // Keep only the newest earlier event: it is the angle the phone has right now.
    rawEvents = rawEvents.slice(-1);
    sensorTimes = [];
    if (container && !chart) {
      if (lastChart) { lastChart.destroy(); lastChart = null; }
      chart = createArmChart(container, { limitDeg: thr.generalMaxA, seconds: thr.recordMs / 1000 });
    }
    if (chart) chart.reset();
    setPhase("recording");
  }

  function endArm(outcome) {
    if (phase !== "recording") return;
    vibrate([200, 100, 200]);                                              // cue: "Open your eyes and lower your arm."
    const recordEnd = performance.now();
    // Final numbers come from the raw events, resampled by the same unit-tested function.
    const recorded = holdResample(rawEvents, recordStart, Math.min(recordEnd, recordStart + thr.recordMs), thr.sampleStepMs);
    let metrics = computeArmMetrics(recorded, motion, thr);
    // Sensors that went completely silent (screen off, app in background) = technical problem.
    if (metrics.valid && longestGap(sensorTimes, recordStart, recordEnd) > thr.maxSensorSilenceMs) {
      metrics = { ...metrics, valid: false, reason: "sensor_silent" };
    }
    if (startRef) series[armName()] = relativeSeries(recorded, startRef);
    if (chart) chart.draw();

    if (outcome === "dropped" || metrics.dropped) {
      arms[armName()] = { outcome: "dropped", metrics };
      finish("complete");                                                  // D23: do not test the other arm
      return;
    }
    arms[armName()] = metrics.valid ? { outcome: "measured", metrics } : { outcome: "invalid", metrics };
    setPhase("rest");
  }

  /** reason: "complete" | "aborted" | "cannot" | "no_sensor" */
  function finish(reason) {
    if (finished) return;
    finished = true;
    clearInterval(ticker);
    clearInterval(sampler);
    window.removeEventListener("deviceorientation", onOrientation);
    window.removeEventListener("devicemotion", onMotion);

    if (reason === "cannot") arms[armName()] = { outcome: "cannot" };
    if (reason === "no_sensor") { arms.left = { outcome: "no_sensor" }; arms.right = { outcome: "no_sensor" }; }
    if (reason === "aborted") ARMS.forEach((side) => { if (arms[side].outcome === "skipped") arms[side] = { outcome: "aborted" }; });

    lastChart = chart;
    phase = "done";
    emit();

    const result = buildArmResult({
      mode, arms, thr,
      baselineArm: baseline && baseline.arm ? baseline.arm : null,
      startedAt: new Date(startedAtMs).toISOString(),
      durationMs: Date.now() - startedAtMs,
      series
    });
    result.aborted = reason === "aborted";
    resolve(result);
  }

  function emit() {
    const now = performance.now();
    orientationTimes = orientationTimes.filter((t) => t > now - 1000);
    motionTimes = motionTimes.filter((t) => t > now - 1000);
    const left = { settling: thr.settleMs, recording: thr.recordMs }[phase];
    const last = recent[recent.length - 1];
    try {
      onUpdate({
        phase,
        arm: armName(),
        secondsLeft: left ? Math.max(0, Math.ceil((left - (now - phaseStart)) / 1000)) : null,
        flat: readiness.flat,
        steady: readiness.steady,
        showHint: phase === "waiting" && now - phaseStart > thr.readyHintMs,
        dBeta: startRef && last ? angleDelta(last.beta, startRef.beta) : null,
        dGamma: startRef && last ? last.gamma - startRef.gamma : null,
        eventRate: orientationTimes.length,   // orientation events in the last second (low = steady, that is fine)
        motionRate: motionTimes.length          // devicemotion events in the last second (should stay ~60)
      });
    } catch (err) { console.error("[arm] onUpdate failed", err); }
  }

  return {
    start() {
      window.addEventListener("deviceorientation", onOrientation);
      window.addEventListener("devicemotion", onMotion);
      ticker = setInterval(tick, TICK_MS);
      sampler = setInterval(sample, thr.sampleStepMs);
      emit();
    },
    armPlaced() {
      if (phase !== "place") return;
      // Forget everything from BEFORE the tap: the phone may have been lying flat on a table, and
      // that must never count as "held flat and steady on the palm" (DECISIONS D22).
      recent.length = 0;
      readiness = { flat: false, steady: false, ready: false };
      setPhase("waiting");
    },
    finish
  };
}
