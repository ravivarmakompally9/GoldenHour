// S7 Home — one huge EMERGENCY CHECK hero, the red EMERGENCY NOW button, the setup checklist
// and the Settings button. Designed so a panicking helper cannot miss the main action.

import { useAppState } from "../state/AppState.jsx";
import { isDemoReady } from "../lib/settings.js";
import { getProfile, isProfileDone } from "../lib/profile.js";
import { getContacts } from "../lib/contacts.js";
import * as storage from "../lib/storage.js";
import { navigate } from "../hooks/useHashRoute.js";
import { Button, Card, EmergencyNowButton, StatusWord } from "../components/ui.jsx";
import { IconChevron, IconPhone, IconPulse, IconSettings, IconUser, IconUsers, IconWave } from "../components/icons.jsx";

/** One checklist row: icon bubble, label, status WORD, chevron. Tap to open. */
function ChecklistRow({ icon, label, statusText, done, onClick }) {
  return (
    <li>
      <button className="row-btn" type="button" onClick={onClick}>
        <span className="row-icon">{icon}</span>
        {/* Status sits UNDER the label so long Hindi/Telugu labels never get squeezed. */}
        <span className="row-main">
          <strong>{label}</strong>
          <StatusWord text={statusText} done={done} />
        </span>
        <span className="row-go"><IconChevron /></span>
      </button>
    </li>
  );
}

/** Ring that fills as setup steps are completed. The count is also written as text. */
function ProgressRing({ done, total }) {
  const radius = 26;
  const length = 2 * Math.PI * radius;
  return (
    <svg className="progress-ring" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffb300" /><stop offset="100%" stopColor="#e53935" />
        </linearGradient>
      </defs>
      <circle className="track" cx="32" cy="32" r={radius} />
      <circle className="value" cx="32" cy="32" r={radius} strokeDasharray={length} strokeDashoffset={length * (1 - done / total)} />
    </svg>
  );
}

export default function HomeScreen() {
  const { settings, t } = useAppState();
  const demoReady = isDemoReady(settings);
  const profileDone = isProfileDone(getProfile());
  const contactCount = getContacts().length;
  const hasBaseline = Boolean(storage.get("gh_baseline", null));

  const steps = [demoReady, profileDone, contactCount > 0, hasBaseline];
  const doneCount = steps.filter(Boolean).length;
  const done = t("home.status.done");
  const notSet = t("home.status.notSet");

  return (
    <div className="stack">
      <header className="screen-header">
        <div className="brand">
          <img src={import.meta.env.BASE_URL + "icons/icon-192.png"} alt="" width="48" height="48" />
          <h1 className="brand-name">
            {t("app.name")}
            <span className="brand-tag">{t("home.tag")}</span>
          </h1>
        </div>
        <button className="icon-btn glass" type="button" aria-label={t("home.settings")} onClick={() => navigate("settings")}>
          <IconSettings />
        </button>
      </header>

      {/* The emergency check (S8–S14) arrives in milestone M2. Until then both buttons open an
          honest "not built yet" screen — the app never pretends to test anything. */}
      <Button
        top={<span className="beacon"><span className="beacon-core"><IconPulse /></span></span>}
        label={t("home.emergencyCheck")}
        sub={t("home.emergencyCheckHint")}
        size="huge"
        onClick={() => navigate("soon", ["check"])}
      />
      <EmergencyNowButton onClick={() => navigate("soon", ["check"])} />

      <Card>
        <div className="progress">
          <ProgressRing done={doneCount} total={steps.length} />
          <div className="progress-text">
            <strong>{t("home.progress", { done: doneCount, total: steps.length })}</strong>
            <span className="muted small">{doneCount === steps.length ? t("home.progressDone") : t("home.progressHint")}</span>
          </div>
        </div>
        <ul className="list" aria-label={t("home.setup")}>
          <ChecklistRow icon={<IconPhone />} label={t("home.check.demo")} statusText={demoReady ? done : notSet} done={demoReady} onClick={() => navigate("settings")} />
          <ChecklistRow icon={<IconUser />} label={t("home.check.profile")} statusText={profileDone ? done : notSet} done={profileDone} onClick={() => navigate("profile")} />
          <ChecklistRow
            icon={<IconUsers />}
            label={t("home.check.contacts")}
            statusText={contactCount > 0 ? t("home.status.contactsCount", { count: contactCount }) : notSet}
            done={contactCount > 0}
            onClick={() => navigate("contacts")}
          />
          <ChecklistRow
            icon={<IconWave />}
            label={t("home.check.baseline")}
            statusText={hasBaseline ? done : t("home.status.notRecorded")}
            done={hasBaseline}
            onClick={() => navigate("soon", ["baseline"])}
          />
        </ul>
      </Card>

      {/* Required on the Home screen by PRD Section 18. */}
      <p className="disclaimer">{t("app.disclaimer")}</p>
    </div>
  );
}

