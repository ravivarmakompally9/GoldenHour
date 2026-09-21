// S12 Arm test — F9. The sensor work is done by src/lib/tests/arm.js (plain JS); this screen
// starts it through useScreeningTest, shows the instruction for the module's current phase, and
// hands the TestResult to the rule engine. Nothing here can produce a result by itself.

import { useEffect, useState } from "react";
import { useAppState } from "../../state/AppState.jsx";
import { useCheck } from "../../state/CheckState.jsx";
import { useScreeningTest } from "../../hooks/useScreeningTest.js";
import * as armTest from "../../lib/tests/arm.js";
import { getThresholds } from "../../lib/thresholds.js";
import * as storage from "../../lib/storage.js";
import { notTestedResult } from "../../lib/session.js";
import { Button } from "../../components/ui.jsx";
import { StepLabel } from "../../components/check.jsx";

export default function ArmTestStep({ n, total }) {
  const { t } = useAppState();
  const { conclude } = useCheck();
  const { containerRef, status, start } = useScreeningTest(armTest);
  const [state, setState] = useState({ phase: "checking", arm: "left", secondsLeft: null, flat: false, steady: false, showHint: false });

  useEffect(() => {
    let alive = true;
    start({ mode: "emergency", baseline: storage.get("gh_baseline", null), thresholds: getThresholds(), onUpdate: (s) => { if (alive) setState(s); } })
      .then((result) => { if (alive && result) conclude({ arm: result }); });
    return () => { alive = false; };
  }, [start, conclude]);

  // The module threw (should not happen): a technical failure is NOT_TESTED, never NORMAL.
  useEffect(() => { if (status === "error") conclude({ arm: notTestedResult("arm", "arm.result.invalid") }); }, [status, conclude]);

  function cannotDo() {
    if (window.confirm(t("arm.cannotDoConfirm"))) armTest.cannotDo();
  }

  const instruction = {
    checking: t("arm.checkingSensors"),
    place: state.arm === "left" ? t("arm.place.left") : t("arm.place.right"),
    waiting: t("arm.waitingReady"),
    settling: t("arm.closeEyes"),
    recording: t("arm.recording"),
    rest: t("arm.openEyes"),
    done: ""
  }[state.phase];

  return (
    <>
      <StepLabel n={n} total={total} />
      <h1 className="arm-label">{state.arm === "left" ? t("arm.label.left") : t("arm.label.right")}</h1>
      <p className="instruction" aria-live="assertive">{instruction}</p>

      {state.phase === "place" && (
        <>
          <p className="solid-card">{t("arm.helperNote")}</p>
          <Button label={t("arm.placedButton")} variant="primary" size="tall" onClick={() => armTest.armPlaced()} />
        </>
      )}

      {state.phase === "waiting" && (
        <div className="solid-card">
          {!state.flat && <p><strong>{t("arm.needFlat")}</strong></p>}
          {state.flat && !state.steady && <p><strong>{t("arm.needSteady")}</strong></p>}
          {state.showHint && <p className="muted">{t("arm.readyHint")}</p>}
        </div>
      )}

      {state.secondsLeft !== null && <p className="countdown-number" aria-hidden="true">{t("arm.secondsLeft", { seconds: state.secondsLeft })}</p>}

      {/* Live tilt graph, drawn by the module. Hidden until there is something to show. */}
      <div ref={containerRef} className="tilt-graph" hidden={!["recording", "rest"].includes(state.phase)} />

      {state.phase !== "checking" && state.phase !== "done" && (
        <Button label={t("arm.cannotDo")} className="btn-solid btn-outline-danger" onClick={cannotDo} />
      )}
    </>
  );
}
