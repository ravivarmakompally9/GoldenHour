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

const PHASE_TRACK = [
  { key: "place", label: "arm.phase.place" },
  { key: "hold", label: "arm.phase.hold" },
  { key: "record", label: "arm.phase.record" },
  { key: "lower", label: "arm.phase.lower" }
];

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

  useEffect(() => { window.scrollTo(0, 0); }, [state.phase, state.arm]);

  const trackIndex = { checking: -1, place: 0, waiting: 1, settling: 2, recording: 2, rest: 3, done: 4 }[state.phase];

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
      <p className="arm-of">{t("arm.armOf", { n: state.arm === "left" ? 1 : 2 })}</p>

      {/* Where we are inside this arm's test, so the helper always knows what comes next. */}
      <ol className="phase-track" aria-hidden="true">
        {PHASE_TRACK.map((item, index) => (
          <li key={item.key} className={index < trackIndex ? "is-done" : index === trackIndex ? "is-now" : ""}>
            <span className="phase-dot">{index < trackIndex ? "✓" : index + 1}</span>
            <span className="phase-name">{t(item.label)}</span>
          </li>
        ))}
      </ol>

      <p className="instruction" aria-live="assertive">{instruction}</p>

      {state.phase === "place" && (
        <>
          {/* The button comes BEFORE the helper note: on a real phone the note pushed it below the
              fold, behind the bottom bar, and the helper could not find how to start. */}
          <Button label={t("arm.placedButton")} variant="primary" size="tall" onClick={() => armTest.armPlaced()} />
          <p className="solid-card small">{t("arm.helperNote")}</p>
        </>
      )}

      {state.phase === "waiting" && (
        <div className="solid-card">
          {/* Live feedback: exactly what the app is waiting for. Word + symbol, never colour alone. */}
          <p className={"ready-check " + (state.flat ? "is-ok" : "is-wait")}><span>{t("arm.check.flat")}</span><strong>{state.flat ? "✓ " + t("arm.ok") : "… " + t("arm.notYet")}</strong></p>
          <p className={"ready-check " + (state.steady ? "is-ok" : "is-wait")}><span>{t("arm.check.steady")}</span><strong>{state.steady ? "✓ " + t("arm.ok") : "… " + t("arm.notYet")}</strong></p>
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
