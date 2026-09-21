import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, failedTests, untestedCoreTests, needsSugarPrompt } from "../src/lib/decision.js";

const r = (status) => ({ status });
const core = (face, speech, arm) => ({ face: r(face), speech: r(speech), arm: r(arm) });
const N = "NORMAL", A = "ABNORMAL", NC = "NOT_COMPLETED", NT = "NOT_TESTED";

test("R1: EMERGENCY NOW is HIGH_ALERT whatever the results are", () => {
  assert.equal(decide(core(N, N, N), null, true), "HIGH_ALERT");
  assert.equal(decide(core(NT, NT, NT), null, true), "HIGH_ALERT");
  assert.equal(decide({}, null, true), "HIGH_ALERT");
});

test("R2: any core test ABNORMAL is HIGH_ALERT", () => {
  for (const c of [core(A, N, N), core(N, A, N), core(N, N, A), core(NT, NT, A)]) assert.equal(decide(c, null, false), "HIGH_ALERT");
});

test("R3: any core test NOT_COMPLETED is HIGH_ALERT", () => {
  for (const c of [core(NC, N, N), core(N, NC, N), core(N, N, NC), core(NT, NT, NC)]) assert.equal(decide(c, null, false), "HIGH_ALERT");
});

test("R4: all core tests NOT_TESTED is COULD_NOT_TEST (also when results are missing)", () => {
  assert.equal(decide(core(NT, NT, NT), null, false), "COULD_NOT_TEST");
  assert.equal(decide({ face: null, speech: null, arm: null }, null, false), "COULD_NOT_TEST");
  assert.equal(decide({}, null, false), "COULD_NOT_TEST");
});

test("R5: all NORMAL, or NORMAL mixed with NOT_TESTED, is NO_CLEAR_SIGNS", () => {
  assert.equal(decide(core(N, N, N), null, false), "NO_CLEAR_SIGNS");
  assert.equal(decide(core(NT, NT, N), null, false), "NO_CLEAR_SIGNS", "M2: only the arm test ran (D20)");
  assert.equal(decide(core(N, NT, N), { eyes: null, balance: null }, false), "NO_CLEAR_SIGNS");
});

test("R6: extended test ABNORMAL is HIGH_ALERT", () => {
  assert.equal(decide(core(N, N, N), { eyes: r(A), balance: null }, false), "HIGH_ALERT");
  assert.equal(decide(core(N, N, N), { eyes: r(N), balance: r(A) }, false), "HIGH_ALERT");
});

test("R7: extended test NOT_COMPLETED is INCONCLUSIVE, but ABNORMAL still wins", () => {
  assert.equal(decide(core(N, N, N), { eyes: r(NC), balance: r(N) }, false), "INCONCLUSIVE");
  assert.equal(decide(core(N, N, N), { eyes: r(NC), balance: r(A) }, false), "HIGH_ALERT");
  assert.equal(decide(core(N, N, N), { eyes: r("INCONCLUSIVE"), balance: r(N) }, false), "NO_CLEAR_SIGNS");
});

test("R8: the sugar prompt depends on the profile and never changes the decision", () => {
  assert.equal(needsSugarPrompt({ diabetic: "yes" }), true);
  assert.equal(needsSugarPrompt({ diabetic: "no" }), false);
  assert.equal(needsSugarPrompt({ diabetic: "unknown" }), false);
  assert.equal(needsSugarPrompt(null), false);
});

test("the engine can never return a reassuring value", () => {
  const allowed = ["HIGH_ALERT", "NO_CLEAR_SIGNS", "COULD_NOT_TEST", "INCONCLUSIVE"];
  for (const f of [N, A, NC, NT]) for (const s of [N, A, NC, NT]) for (const a of [N, A, NC, NT]) {
    assert.ok(allowed.includes(decide(core(f, s, a), null, false)));
  }
});

test("failedTests and untestedCoreTests", () => {
  const results = { face: r(NT), speech: r(NC), arm: r(A), eyes: r(A), balance: r(NC) };
  assert.deepEqual(failedTests(results), ["speech", "arm", "eyes"], "extended NOT_COMPLETED is inconclusive, not failed");
  assert.deepEqual(untestedCoreTests(results), ["face"]);
  assert.deepEqual(failedTests({}), []);
  assert.deepEqual(untestedCoreTests({}), ["face", "speech", "arm"]);
});
