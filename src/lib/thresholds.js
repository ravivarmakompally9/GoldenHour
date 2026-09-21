// thresholds.js — every number that decides NORMAL vs ABNORMAL lives here (PRD Section 19).
//
// Rule for all workstreams: test modules must READ these values, never hardcode their own.
// These are STARTING values. They get tuned during calibration (developer panel, F16), which
// saves overrides to localStorage under "gh_thresholds" so the phone can be tuned without a
// redeploy. getThresholds() returns defaults + overrides.

import * as storage from "./storage.js";

export const THRESHOLDS_KEY = "gh_thresholds";

export const DEFAULT_THRESHOLDS = {
  // ---- F7 Face test ----
  face: {
    generalMaxF: 0.35,            // no baseline: smile asymmetry F above this = ABNORMAL
    generalMaxDrest: 0.08,        // no baseline: resting droop D_rest above this = ABNORMAL
    baselineMarginF: 0.20,        // with baseline: F above (baseline F + this) = ABNORMAL
    baselineMarginDrest: 0.05,    // with baseline: D_rest above (baseline D_rest + this) = ABNORMAL
    minSmileLift: 0.03,           // larger lift below this = "no smile detected" -> retry
    weightLandmarks: 0.7,         // F = 0.7 * A_lm + 0.3 * A_bs
    weightBlendshapes: 0.3,
    topSmileFrameFraction: 0.30,  // smile height uses the top 30% of smile frames
    maxHeadRollDeg: 10,           // frame quality filter
    maxHeadYawDeg: 10,
    yawFallbackNoseOffset: 0.15,  // nose offset > 0.15 x eye distance = head turned
    minFaceWidthRatio: 0.30,      // face must fill at least 30% of the frame width
    minValidFrameRatio: 0.60,     // under 60% good frames -> "Face the camera and come closer"
    neutralMs: 2000,
    smileMs: 3000,
    noFaceHintMs: 3000,           // no face for 3 s -> "Turn on a light"
    maxRetries: 2,                // after 2 failed retries -> NOT_COMPLETED
    minFps: 15
  },

  // ---- F8 Speech test ----
  speech: {
    generalMaxWer: 0.30,
    generalMinRate: 1.2,          // words per second
    generalMaxPauseRatio: 0.40,
    baselineMarginWer: 0.25,
    baselineMinRateFraction: 0.70, // rate below 70% of baseline = ABNORMAL
    baselineMarginPauseRatio: 0.20,
    vadNoiseMultiplier: 3,        // a frame is speech if RMS > 3 x noise floor
    frameMs: 30,
    leadInMs: 500,                // recorded before the beep to measure background noise
    maxRecordMs: 6000,
    endSilenceMs: 1500,           // stop 1.5 s after speech ends
    maxRetries: 1                 // silence: one retry, then NOT_COMPLETED
  },

  // ---- F9 Arm test ----
  arm: {
    generalMaxA: 12,              // degrees; no baseline: either arm A above this = ABNORMAL
    generalMaxDiff: 8,            // degrees; no baseline: left-right difference above this
    baselineMarginA: 8,           // with baseline: A above (that arm's baseline + this)
    baselineMarginDiff: 6,        // with baseline: diff above (baseline diff + this)
    pronationWeight: 0.5,         // A = drift + 0.5 x pronation
    smoothingAlpha: 0.2,          // exponential moving average on beta and gamma
    readyMaxTiltDeg: 20,          // phone must be roughly flat to start
    readyMaxStdDeg: 2,            // ...and steady (std of beta under 2 degrees for 1 second)
    readyWindowMs: 1000,
    settleMs: 2000,               // settling time, not scored
    recordMs: 10000,
    startWindowMs: 1000,          // start angles = mean of the first 1 s
    endWindowMs: 2000,            // end angles = mean of the last 2 s
    dropAngleDeg: 45,             // any sample this far from the start angle = arm fell
    dropAccel: 20,                // m/s^2 spike = phone dropped -> NOT_COMPLETED
    sampleStepMs: 20,             // angles are resampled (sample-and-hold) 50 times a second
    minSamplesPerSecond: 20,      // fewer RESAMPLED samples than this = recording cut short (technical)
    maxSensorSilenceMs: 3000,     // no motion AND no orientation event for this long = sensors stopped
    sensorCheckMs: 4000,          // no orientation event within 4 s = no sensors -> NOT_TESTED
                                  // (generous: a still phone sends its first event late)
    readyHintMs: 15000,           // still not flat+steady after 15 s -> show the "hold flatter" hint
    restMs: 1500                  // pause after each arm ("Open your eyes and lower your arm")
  },

  // ---- F17 Eyes test (P2) ----
  eyes: {
    gazeOffCentre: 0.2,
    gazeFrameFraction: 0.70,
    gazeRangeRatio: 0.50,         // movement to one side < 50% of the other = ABNORMAL
    sideVisionDotsPerSide: 3,
    sideVisionMaxMisses: 2,       // 2 or more of 3 missed on the same side, both eyes
    dotMs: 500,
    dotGapMinMs: 800,
    dotGapMaxMs: 2000
  },

  // ---- F18 Balance test (P2) ----
  balance: {
    generalMaxRmsSway: 0.25,      // m/s^2, eyes closed, no baseline
    baselineSwayMultiplier: 2,    // more than 2 x baseline = ABNORMAL
    phaseMs: 15000
  },

  // ---- F11 alert countdown and F14 LLM ----
  alert: { countdownSeconds: 10 },
  llm: { timeoutMs: 8000 }
};

/**
 * Pure helper: copy `defaults`, then apply matching numeric `overrides` on top.
 * Unknown groups/keys and non-number values are ignored, so a broken gh_thresholds record can
 * never remove a threshold or turn it into text.
 */
export function mergeThresholds(defaults, overrides) {
  const merged = {};
  for (const group of Object.keys(defaults)) {
    merged[group] = { ...defaults[group] };
    const groupOverrides = overrides && typeof overrides === "object" ? overrides[group] : null;
    if (!groupOverrides || typeof groupOverrides !== "object") continue;
    for (const name of Object.keys(defaults[group])) {
      const value = groupOverrides[name];
      if (typeof value === "number" && Number.isFinite(value)) merged[group][name] = value;
    }
  }
  return merged;
}

/** Thresholds to use right now: PRD defaults plus any values tuned on this phone. */
export function getThresholds() {
  return mergeThresholds(DEFAULT_THRESHOLDS, storage.get(THRESHOLDS_KEY, null));
}
