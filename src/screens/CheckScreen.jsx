// The emergency check flow: #/check/who (S8) -> #/check/lkw (S9) -> #/check/arm (S12).
// Face (S10) arrives in M3 and Speech (S11) in M5; until then they are recorded as NOT_TESTED
// and the result screen says so (DECISIONS D20).

import { useEffect } from "react";
import { useCheck } from "../state/CheckState.jsx";
import { useWakeLock } from "../hooks/useWakeLock.js";
import { navigate } from "../hooks/useHashRoute.js";
import { CheckBar } from "../components/check.jsx";
import CheckWhoStep from "./check/CheckWhoStep.jsx";
import CheckLkwStep from "./check/CheckLkwStep.jsx";
import ArmTestStep from "./check/ArmTestStep.jsx";

const STEPS = { who: CheckWhoStep, lkw: CheckLkwStep, arm: ArmTestStep };
export const STEP_ORDER = ["who", "lkw", "arm"];

export default function CheckScreen({ params }) {
  const { session } = useCheck();
  const step = STEPS[params[0]] ? params[0] : "who";
  useWakeLock(true);   // the screen must not switch off while someone has their eyes closed

  // After a reload the in-memory check is gone: start again from the first step.
  const lostSession = step !== "who" && !session;
  useEffect(() => { if (lostSession) navigate("check", ["who"]); }, [lostSession]);
  if (lostSession) return null;

  const Step = STEPS[step];
  return (
    <div className="stack check-screen">
      <Step n={STEP_ORDER.indexOf(step) + 1} total={STEP_ORDER.length} />
      <CheckBar />
    </div>
  );
}
