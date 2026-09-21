// S14 "No clear signs" and the amber "Could not run the tests" screen (rule R4).
//
// FIXED WORDING (PRD Section 11): the app never says "you are fine" or "no stroke". The normal
// result is exactly "No clear warning signs found." and always comes with "If you are still
// worried, call 108. Symptoms that come and go are still an emergency. Retest in 10 minutes."
// While only the arm test exists (M2), the screen also says which tests were NOT run (D20).

import { useEffect } from "react";
import { useAppState } from "../state/AppState.jsx";
import { useWakeLock } from "../hooks/useWakeLock.js";
import { navigate } from "../hooks/useHashRoute.js";
import { getSession } from "../lib/session.js";
import { untestedCoreTests } from "../lib/decision.js";
import { Button, Header } from "../components/ui.jsx";
import { CallButton, ResultsSummary } from "../components/check.jsx";

export default function ResultScreen({ params }) {
  const { t } = useAppState();
  const session = getSession(params[0]);
  useWakeLock(true);

  // A HIGH ALERT session always belongs on the alert screen, however this URL was reached.
  const wrongPlace = !session || session.decision === "HIGH_ALERT";
  useEffect(() => {
    if (!session) navigate("home");
    else if (session.decision === "HIGH_ALERT") navigate("alert", [session.id]);
  }, [session]);
  if (wrongPlace) return null;

  const couldNotTest = session.decision === "COULD_NOT_TEST";
  const untested = untestedCoreTests(session.results);

  return (
    <div className="stack check-screen no-bar">
      <Header title={t("app.name")} onBack={() => navigate("home")} />

      {couldNotTest ? (
        <div className="solid-card solid-warn"><p className="instruction">{t("result.couldNotTest")}</p></div>
      ) : (
        <div className="solid-card">
          <p className="instruction"><strong>{t("result.noClearSigns")}</strong></p>
          <p>{t("result.stillWorried")}</p>
        </div>
      )}

      {/* Never let a gap look like a pass. */}
      {!couldNotTest && untested.length > 0 && <div className="solid-card solid-warn"><strong>{t("result.onlyArm")}</strong></div>}

      <CallButton size="tall" />
      <Button label={t("result.retest")} variant="primary" onClick={() => navigate("check", ["who"])} />

      <div className="solid-card">
        <h2 className="card-heading">{t("alert.results")}</h2>
        <ResultsSummary session={session} />
      </div>
      <p className="disclaimer">{t("app.disclaimer")}</p>
    </div>
  );
}
