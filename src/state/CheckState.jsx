// CheckState — the emergency check in progress (in memory) and the actions that move it along.
// All rules are in src/lib (session.js, decision.js); this file only connects them to the screens.
//
// As soon as a decision exists the session is SAVED and the app moves to #/alert/<id> or
// #/result/<id>. Those screens load the session from storage, so they survive a reload when the
// helper comes back from the dialer or the SMS app.

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { createSession, finalizeSession, saveSession } from "../lib/session.js";
import { getProfile } from "../lib/profile.js";
import { navigate } from "../hooks/useHashRoute.js";

const CheckContext = createContext(null);

export function CheckProvider({ children }) {
  const [session, setSession] = useState(null);
  const latest = useRef(null);            // always the newest session, also inside callbacks
  const update = (next) => { latest.current = next; setSession(next); };

  const startCheck = useCallback((testedPerson) => {
    update(createSession({ testedPerson, profile: getProfile() }));
  }, []);

  const setLastKnownWell = useCallback((lkw) => {
    if (latest.current) update({ ...latest.current, lastKnownWell: lkw });
  }, []);

  /** Decide (rule engine), save, and show the outcome. Used by the last test and by EMERGENCY NOW. */
  const conclude = useCallback((results, { emergencyNow = false } = {}) => {
    // A session that already has a decision is FINISHED: never add to it. (EMERGENCY NOW pressed on
    // Home after an earlier check must create a new session, not overwrite the old one.)
    const open = latest.current && !latest.current.decision ? latest.current : null;
    const base = open || createSession({ profile: getProfile() });
    const done = finalizeSession({ ...base, results: { ...base.results, ...results } }, { emergencyNow });
    saveSession(done);
    // Keep the finished session in memory until a new check starts. Clearing it here would make
    // the check screen think the session was lost and jump back to step 1 before the result shows.
    update(done);
    navigate(done.decision === "HIGH_ALERT" ? "alert" : "result", [done.id]);
  }, []);

  /** R1: EMERGENCY NOW — straight to HIGH ALERT; tests that did not run are marked NOT_TESTED. */
  const emergencyNow = useCallback(() => conclude({}, { emergencyNow: true }), [conclude]);

  const value = useMemo(() => ({ session, startCheck, setLastKnownWell, conclude, emergencyNow }),
    [session, startCheck, setLastKnownWell, conclude, emergencyNow]);
  return <CheckContext.Provider value={value}>{children}</CheckContext.Provider>;
}

export function useCheck() {
  const value = useContext(CheckContext);
  if (!value) throw new Error("useCheck must be used inside <CheckProvider>");
  return value;
}
