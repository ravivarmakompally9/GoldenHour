// Pieces shared by the emergency-check screens (S8–S14).
//
// CALL and EMERGENCY NOW must be visible on EVERY check screen (PRD C11), so they sit in a bar
// fixed to the bottom of the screen: always in view, even while instructions scroll, and within
// thumb reach. These screens use SOLID high-contrast surfaces, not glass (DECISIONS D19).

import { useAppState } from "../state/AppState.jsx";
import { useCheck } from "../state/CheckState.jsx";
import { callLink } from "../lib/alerts.js";
import { CORE_TESTS } from "../lib/decision.js";
import { IconAlert, IconPhone } from "./icons.jsx";

/**
 * The "Call 108" button. THE 108 RULE: the label says 108 so the demo looks real, but the link
 * is built by callLink() from the DEMO number only, and "(demo: name)" is always shown under it.
 * No demo number saved -> it dials nothing and says what to do (DECISIONS D6).
 */
export function CallButton({ size = "" }) {
  const { settings, t, toast } = useAppState();
  const link = callLink(settings);
  const classes = "btn btn-call" + (size ? " btn-" + size : "");
  const content = (
    <>
      <span className="btn-row"><IconPhone />{t("check.call")}</span>
      {link && <small>{t("check.callDemo", { name: settings.demoEmergencyName })}</small>}
    </>
  );
  if (!link) {
    return <button className={classes} type="button" onClick={() => toast(t("settings.addDemoNumber"), 5000)}>{content}</button>;
  }
  return <a className={classes} href={link}>{content}</a>;
}

/** Bottom bar on every check screen: CALL 108 (demo) + EMERGENCY NOW. */
export function CheckBar() {
  const { t } = useAppState();
  const { emergencyNow } = useCheck();
  return (
    <div className="check-bar">
      <CallButton />
      <button className="btn btn-danger" type="button" onClick={emergencyNow}>
        <span className="btn-row"><IconAlert />{t("home.emergencyNow")}</span>
      </button>
    </div>
  );
}

export function StepLabel({ n, total }) {
  const { t } = useAppState();
  return <p className="step-label">{t("check.step", { n, total })}</p>;
}

/** Status WORD + colour for a test result (never colour alone). */
function ResultStatus({ status }) {
  const { t } = useAppState();
  const key = "status." + status;
  const tone = status === "NORMAL" ? "ok" : status === "NOT_TESTED" ? "warn" : "bad";
  return <span className={"result-status result-" + tone}>{t(key)}</span>;
}

/** What each core test found, for the alert and result screens. */
export function ResultsSummary({ session }) {
  const { t } = useAppState();
  return (
    <ul className="results">
      {CORE_TESTS.map((name) => {
        const result = session.results[name];
        if (!result) return null;
        const nameKey = "test." + name;
        const arm = name === "arm" && result.metrics ? result.metrics : null;
        return (
          <li key={name}>
            <div className="results-head"><strong>{t(nameKey)}</strong><ResultStatus status={result.status} /></div>
            {result.message && <div>{t(result.message, result.messageVars)}</div>}
            {arm && ["left", "right"].map((side) => {
              if (!arm[side] || arm[side].outcome !== "measured") return null;
              const sideKey = "arm.side." + side;
              return <div key={side} className="muted">{t("arm.drift", { side: t(sideKey), degrees: arm[side].A.toFixed(1) })}</div>;
            })}
          </li>
        );
      })}
    </ul>
  );
}
