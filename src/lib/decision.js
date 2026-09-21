// decision.js — F10 Decision Engine (PRD Section 11). Pure rules, no AI, no browser APIs.
//
// WHY RULES AND NOT AI: in an emergency we never let a model "hallucinate a you're fine". The
// decision is computed here BEFORE any LLM is called, and nothing the LLM says can change it.
// The rules deliberately lean toward false alarms: a false alarm costs a hospital trip, a missed
// stroke costs a life or a disability.

export const CORE_TESTS = ["face", "speech", "arm"];
export const EXTENDED_TESTS = ["eyes", "balance"];

export const DECISIONS = {
  HIGH_ALERT: "HIGH_ALERT",
  NO_CLEAR_SIGNS: "NO_CLEAR_SIGNS",
  COULD_NOT_TEST: "COULD_NOT_TEST",
  INCONCLUSIVE: "INCONCLUSIVE"
};

// A test that was never run counts as NOT_TESTED (a technical gap), never as NORMAL.
const statusOf = (result) => (result && result.status ? result.status : "NOT_TESTED");

/**
 * decide(core, extended, emergencyNow) — the PRD reference function, rule by rule:
 *   R1  EMERGENCY NOW pressed                         -> HIGH_ALERT
 *   R2  any core test ABNORMAL                        -> HIGH_ALERT
 *   R3  any core test NOT_COMPLETED (could not do it) -> HIGH_ALERT
 *   R4  ALL core tests NOT_TESTED (technical)         -> COULD_NOT_TEST
 *   R6  extended test ABNORMAL                        -> HIGH_ALERT
 *   R7  extended test NOT_COMPLETED                   -> INCONCLUSIVE
 *   R5  otherwise                                     -> NO_CLEAR_SIGNS
 * (R8, the diabetic sugar prompt, adds a box to the alert; it never changes the decision.)
 */
export function decide(core, extended, emergencyNow) {
  if (emergencyNow) return DECISIONS.HIGH_ALERT;
  const s = CORE_TESTS.map((name) => statusOf(core && core[name]));
  if (s.includes("ABNORMAL") || s.includes("NOT_COMPLETED")) return DECISIONS.HIGH_ALERT;
  if (s.every((x) => x === "NOT_TESTED")) return DECISIONS.COULD_NOT_TEST;
  if (extended) {
    const e = EXTENDED_TESTS.map((name) => extended[name]).filter(Boolean).map((r) => r.status);
    if (e.includes("ABNORMAL")) return DECISIONS.HIGH_ALERT;
    if (e.includes("NOT_COMPLETED")) return DECISIONS.INCONCLUSIVE;
  }
  return DECISIONS.NO_CLEAR_SIGNS;
}

/** Names of the tests that showed a warning sign (ABNORMAL or NOT_COMPLETED), core first. */
export function failedTests(results) {
  return [...CORE_TESTS, ...EXTENDED_TESTS].filter((name) => {
    const status = results && results[name] ? results[name].status : null;
    return status === "ABNORMAL" || (status === "NOT_COMPLETED" && CORE_TESTS.includes(name));
  });
}

/** Core tests that were NOT run (technical reasons) — shown so nobody mistakes a gap for a pass. */
export function untestedCoreTests(results) {
  return CORE_TESTS.filter((name) => statusOf(results && results[name]) === "NOT_TESTED");
}

/** R8: show "check sugar now" on the alert. It never replaces calling 108. */
export function needsSugarPrompt(profile) {
  return Boolean(profile && profile.diabetic === "yes");
}
