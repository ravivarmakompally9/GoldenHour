// S9 Last seen normal — F6. One tap for the common answers; "Unknown" never blocks the check.
// "Found on waking" asks for BEDTIME: doctors count a wake-up stroke from when the person was
// last seen normal before sleeping, not from when they woke up.

import { useState } from "react";
import { useAppState } from "../../state/AppState.jsx";
import { useCheck } from "../../state/CheckState.jsx";
import { lkwFromOption, lkwFromClock } from "../../lib/lkw.js";
import { navigate } from "../../hooks/useHashRoute.js";
import { Button, Header } from "../../components/ui.jsx";
import { StepLabel } from "../../components/check.jsx";

export default function CheckLkwStep({ n, total }) {
  const { t } = useAppState();
  const { setLastKnownWell } = useCheck();
  const [asking, setAsking] = useState(null);     // null | "waking" | "exact"
  const [clock, setClock] = useState("");
  const [error, setError] = useState("");

  const next = (lkw) => { setLastKnownWell(lkw); navigate("check", ["arm"]); };

  function useClock() {
    const lkw = lkwFromClock(clock, asking);
    if (!lkw) { setError(t("check.lkw.timeInvalid")); return; }
    next(lkw);
  }

  if (asking) {
    return (
      <>
        <Header title={asking === "waking" ? t("check.lkw.bedtime") : t("lkw.option.exact")} onBack={() => { setAsking(null); setError(""); }} />
        <StepLabel n={n} total={total} />
        {asking === "waking" && <p className="muted">{t("check.lkw.bedtimeHint")}</p>}
        <div className={"field" + (error ? " has-error" : "")}>
          <label className="field-label" htmlFor="lkw-clock">{t("check.lkw.timeLabel")}</label>
          <input id="lkw-clock" className="time-input" type="time" value={clock} onChange={(e) => { setClock(e.target.value); setError(""); }} />
          <span className="field-error" role="alert">{error}</span>
        </div>
        <Button label={t("check.lkw.useTime")} variant="primary" size="tall" onClick={useClock} />
        <Button label={t("lkw.option.unknown")} className="btn-solid" onClick={() => next(lkwFromOption("unknown"))} />
      </>
    );
  }

  return (
    <>
      <Header title={t("check.lkw.title")} onBack={() => navigate("check", ["who"])} />
      <StepLabel n={n} total={total} />
      <Button label={t("lkw.option.just_now")} variant="primary" onClick={() => next(lkwFromOption("just_now"))} />
      <Button label={t("lkw.option.min30")} className="btn-solid" onClick={() => next(lkwFromOption("min30"))} />
      <Button label={t("lkw.option.hour1")} className="btn-solid" onClick={() => next(lkwFromOption("hour1"))} />
      <Button label={t("lkw.option.waking")} className="btn-solid" onClick={() => setAsking("waking")} />
      <Button label={t("lkw.option.exact")} className="btn-solid" onClick={() => setAsking("exact")} />
      <Button label={t("lkw.option.unknown")} className="btn-solid" onClick={() => next(lkwFromOption("unknown"))} />
    </>
  );
}
