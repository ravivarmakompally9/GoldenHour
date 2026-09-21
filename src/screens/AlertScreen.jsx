// S13 HIGH ALERT — F11 + F12. Red, solid, one clear instruction: call 108 now.
//
// Order on screen (PRD F11): heading + what failed, big CALL, family-alert countdown with CANCEL,
// sugar prompt for diabetics (R8), WhatsApp / per-contact alerts, waiting-for-ambulance tips.
// The Doctor Card and the AI explanation join this screen in M4; the hospital button in M7.
//
// The session is loaded from storage by id, so this screen survives the reload that Android may
// do when the helper returns from the dialer or the SMS app.

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppState } from "../state/AppState.jsx";
import { useWakeLock } from "../hooks/useWakeLock.js";
import { navigate } from "../hooks/useHashRoute.js";
import { getSession, saveSession, recordAlertOpened } from "../lib/session.js";
import { getContacts, getPrimary } from "../lib/contacts.js";
import { getProfile } from "../lib/profile.js";
import { getThresholds } from "../lib/thresholds.js";
import { getLocation } from "../lib/location.js";
import { needsSugarPrompt, failedTests } from "../lib/decision.js";
import { elapsedMinutes, formatClock } from "../lib/lkw.js";
import { buildMessage, smsLink, waLink, startCountdown, pause, resume, cancel } from "../lib/alerts.js";
import { say } from "../lib/tts.js";
import { Button } from "../components/ui.jsx";
import { CallButton, ResultsSummary } from "../components/check.jsx";
import { IconAlert } from "../components/icons.jsx";

export default function AlertScreen({ params }) {
  const { t } = useAppState();
  const [session, setSession] = useState(() => getSession(params[0]));
  const latest = useRef(session);
  const [remaining, setRemaining] = useState(null);
  const [locating, setLocating] = useState(false);
  const [, setMinuteTick] = useState(0);
  useWakeLock(true);

  /** Change the session and save it at once (so a reload never loses alert state). */
  const commit = useCallback((change) => {
    const next = change(latest.current);
    latest.current = next;
    setSession(next);
    saveSession(next);
  }, []);

  const contacts = getContacts();
  const primary = getPrimary(contacts);
  const others = contacts.filter((c) => !c.primary);
  const messageFor = (contact) => buildMessage(latest.current, contact, contact.language);

  // Unknown id (old link, data reset): nothing to show here.
  useEffect(() => { if (!session) navigate("home"); }, [session]);

  // Spoken once (real voice arrives in M4; the text is always on screen as well).
  useEffect(() => { if (session) say("alert.voice"); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Live location for the message. If it fails the message says "Location unavailable".
  useEffect(() => {
    if (!latest.current || latest.current.location) return;
    setLocating(true);
    getLocation().then((location) => { commit((s) => ({ ...s, location })); setLocating(false); });
  }, [commit]);

  // "52 min ago" must keep counting while the screen stays open.
  useEffect(() => { const id = setInterval(() => setMinuteTick((n) => n + 1), 60000); return () => clearInterval(id); }, []);

  // Family-alert countdown: starts as soon as the alert shows, pauses while the app is hidden.
  const fire = useCallback(() => {
    const contact = getPrimary(getContacts());
    if (!contact) return;
    commit((s) => recordAlertOpened({ ...s, familyAlert: "fired" }, contact.id, "sms"));
    // A PWA cannot send an SMS silently: this opens the SMS app pre-filled and the helper taps Send.
    // Some phones block opening another app without a tap; the big button below covers that case.
    const link = smsLink(contact.phone, buildMessage(latest.current, contact, contact.language));
    if (link) window.location.href = link;
  }, [commit]);

  useEffect(() => {
    if (!latest.current || latest.current.familyAlert !== "pending" || !primary) return undefined;
    startCountdown(getThresholds().alert.countdownSeconds, fire, { onTick: setRemaining });
    const onVisibility = () => (document.visibilityState === "hidden" ? pause() : resume());
    document.addEventListener("visibilitychange", onVisibility);
    return () => { document.removeEventListener("visibilitychange", onVisibility); cancel(); };
  }, [fire, Boolean(primary)]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!session) return null;

  function cancelFamilyAlert() {
    if (!window.confirm(t("alert.cancelConfirm"))) return;
    cancel();
    commit((s) => ({ ...s, familyAlert: "cancelled" }));
  }

  const opened = (contact, channel) => () => commit((s) => recordAlertOpened({ ...s, familyAlert: s.familyAlert === "pending" ? "fired" : s.familyAlert }, contact.id, channel));
  const counting = session.familyAlert === "pending" && primary && remaining !== null && remaining > 0;
  const minutes = elapsedMinutes(session.lastKnownWell);
  const failed = failedTests(session.results);
  const locationKey = locating ? "alert.location.pending" : !session.location ? "alert.location.none" : session.location.source === "live" ? "alert.location.live" : "alert.location.last";

  return (
    <div className="stack alert-screen">
      <h1 className="alert-title"><IconAlert />{t("alert.title")}</h1>
      {session.emergencyNow && failed.length === 0 && <p className="alert-sub">{t("alert.emergencyPressed")}</p>}

      <CallButton size="huge" />

      {/* ---- family alert ---- */}
      {!primary && (
        <div className="solid-card">
          <p><strong>{t("alert.noContact")}</strong></p>
          <Button label={t("alert.addContact")} className="btn-solid" onClick={() => navigate("contacts", ["new"])} />
        </div>
      )}
      {primary && counting && (
        <div className="solid-card countdown-card">
          <p className="instruction" aria-live="polite">{t("alert.countdown", { name: primary.name, seconds: remaining })}</p>
          <Button label={t("alert.cancel")} className="btn-solid" size="tall" onClick={cancelFamilyAlert} />
        </div>
      )}
      {primary && !counting && (
        <div className="solid-card">
          {session.familyAlert === "cancelled" && <p><strong>{t("alert.cancelled")}</strong></p>}
          {session.familyAlert === "fired" && <p><strong>{t("alert.opened", { name: primary.name })}</strong></p>}
          {/* Always available, also after CANCEL (PRD safety case: cancelled by mistake). */}
          <a className="btn btn-primary btn-tall" href={smsLink(primary.phone, messageFor(primary))} onClick={opened(primary, "sms")}>{t("alert.sendNow")}</a>
        </div>
      )}
      {primary && (
        <div className="solid-card stack-tight">
          <a className="btn btn-solid" href={waLink(primary.phone, messageFor(primary))} target="_blank" rel="noreferrer" onClick={opened(primary, "whatsapp")}>{t("alert.whatsapp", { name: primary.name })}</a>
          {/* One tap per extra contact: multi-recipient SMS links behave differently across phones. */}
          {others.map((c) => (
            <a key={c.id} className="btn btn-solid" href={smsLink(c.phone, messageFor(c))} onClick={opened(c, "sms")}>{t("alert.alertContact", { name: c.name })}</a>
          ))}
          <p className="muted small">{t(locationKey)}</p>
        </div>
      )}

      {/* R8: never replaces calling 108. */}
      {needsSugarPrompt(getProfile()) && <div className="solid-card solid-warn"><strong>{t("alert.sugar")}</strong></div>}

      <div className="solid-card">
        <h2 className="card-heading">{t("alert.results")}</h2>
        <p><strong>{minutes === null ? t("alert.lkwUnknown") : t("alert.lkw", { time: formatClock(session.lastKnownWell.time), minutes })}</strong></p>
        <ResultsSummary session={session} />
      </div>

      {/* C18: this text must be reviewed by a mentor or doctor before the final demo. */}
      <div className="solid-card">
        <h2 className="card-heading">{t("alert.waitingTitle")}</h2>
        <p>{t("alert.waitingTips")}</p>
      </div>

      <p className="alert-disclaimer">{t("app.disclaimer")}</p>
      <Button label={t("alert.home")} className="btn-ghost-light" onClick={() => navigate("home")} />
    </div>
  );
}
