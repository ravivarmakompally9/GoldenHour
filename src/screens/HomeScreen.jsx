// S7 Home — one huge EMERGENCY CHECK button, the red EMERGENCY NOW button, the setup checklist
// and the Settings button. Designed so a panicking helper cannot miss the main action.

import { useAppState } from "../state/AppState.jsx";
import { isDemoReady } from "../lib/settings.js";
import { getProfile, isProfileDone } from "../lib/profile.js";
import { getContacts } from "../lib/contacts.js";
import * as storage from "../lib/storage.js";
import { navigate } from "../hooks/useHashRoute.js";
import { Button, EmergencyNowButton, StatusWord } from "../components/ui.jsx";

/** One checklist row: label on the left, status WORD on the right, tap to open. */
function ChecklistRow({ label, statusText, done, onClick }) {
  return (
    <li>
      <button className="row-btn" type="button" onClick={onClick}>
        <span className="row-main"><strong>{label}</strong></span>
        <StatusWord text={statusText} done={done} />
        <span className="row-go" aria-hidden="true">›</span>
      </button>
    </li>
  );
}

export default function HomeScreen() {
  const { settings, t } = useAppState();
  const profileDone = isProfileDone(getProfile());
  const contactCount = getContacts().length;
  const hasBaseline = Boolean(storage.get("gh_baseline", null));
  const demoReady = isDemoReady(settings);

  const done = t("home.status.done");
  const notSet = t("home.status.notSet");

  return (
    <div className="stack">
      <header className="screen-header">
        <h1>{t("app.name")}</h1>
        <button className="icon-btn" type="button" aria-label={t("home.settings")} onClick={() => navigate("settings")}>⚙</button>
      </header>

      {/* The emergency check (S8–S14) arrives in milestone M2. Until then both buttons open an
          honest "not built yet" screen — the app never pretends to test anything. */}
      <Button
        label={t("home.emergencyCheck")}
        sub={t("home.emergencyCheckHint")}
        variant="primary"
        size="huge"
        onClick={() => navigate("soon", ["check"])}
      />
      <EmergencyNowButton onClick={() => navigate("soon", ["check"])} />

      <h2>{t("home.setup")}</h2>
      <ul className="list">
        <ChecklistRow label={t("home.check.demo")} statusText={demoReady ? done : notSet} done={demoReady} onClick={() => navigate("settings")} />
        <ChecklistRow label={t("home.check.profile")} statusText={profileDone ? done : notSet} done={profileDone} onClick={() => navigate("profile")} />
        <ChecklistRow
          label={t("home.check.contacts")}
          statusText={contactCount > 0 ? t("home.status.contactsCount", { count: contactCount }) : notSet}
          done={contactCount > 0}
          onClick={() => navigate("contacts")}
        />
        <ChecklistRow
          label={t("home.check.baseline")}
          statusText={hasBaseline ? done : t("home.status.notRecorded")}
          done={hasBaseline}
          onClick={() => navigate("soon", ["baseline"])}
        />
      </ul>

      {/* Required on the Home screen by PRD Section 18. */}
      <p className="disclaimer">{t("app.disclaimer")}</p>
    </div>
  );
}
