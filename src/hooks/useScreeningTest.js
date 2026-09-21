// useScreeningTest — the ONE way a React screen runs a screening-test module (face, speech, arm,
// eyes, balance). The modules in src/lib/tests/ stay framework-free and keep the PRD contract:
//
//     run({ mode, container, baseline, thresholds, camera })  ->  Promise<TestResult>
//     abort()
//
// This hook only adds React lifecycle around that contract:
//   - it passes a real DOM element (`containerRef`) for the module to draw its preview/graph in;
//   - it aborts the test if the screen is left (camera, microphone and sensors are released);
//   - it NEVER invents a result. If run() throws, status becomes "error" and result stays null —
//     the calling screen must turn that into NOT_TESTED, never into NORMAL (safety rule 8).
//
// Usage (from M2):
//   import * as armTest from "../lib/tests/arm.js";
//   const { containerRef, status, result, start, abort } = useScreeningTest(armTest);
//   <div ref={containerRef} />   ...   start({ mode: "emergency", baseline, thresholds })

import { useCallback, useEffect, useRef, useState } from "react";

export function useScreeningTest(testModule) {
  const containerRef = useRef(null);
  // Each start() gets a number. A result is only accepted if its number is still the current one,
  // so a late result from an aborted run (screen left, React StrictMode re-mount, EMERGENCY NOW)
  // can never be mistaken for the result of the run on screen.
  const currentRun = useRef(0);
  const [status, setStatus] = useState("idle");   // "idle" | "running" | "done" | "error"
  const [result, setResult] = useState(null);     // TestResult from the module, or null
  const [error, setError] = useState(null);

  const abort = useCallback(() => {
    if (currentRun.current === 0) return;
    currentRun.current = 0;
    try { testModule.abort(); } catch (err) { console.warn("[test] abort failed", err); }
  }, [testModule]);

  const start = useCallback(async (options) => {
    const runId = Date.now() + Math.random();
    currentRun.current = runId;
    setStatus("running");
    setResult(null);
    setError(null);
    try {
      const testResult = await testModule.run({ ...options, container: containerRef.current });
      if (currentRun.current !== runId) return null;   // aborted or replaced: ignore a late result
      currentRun.current = 0;
      setResult(testResult);
      setStatus("done");
      return testResult;
    } catch (err) {
      console.error("[test] run failed", err);
      if (currentRun.current === runId) { currentRun.current = 0; setError(err); setStatus("error"); }
      return null;
    }
  }, [testModule]);

  // Leaving the screen releases the camera / microphone / sensors.
  useEffect(() => abort, [abort]);

  return { containerRef, status, result, error, start, abort };
}
