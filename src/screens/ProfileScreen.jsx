// S4 Medical profile — F3. The facts an emergency doctor needs in the first minutes; they feed
// the Doctor Handoff Card (M4). Only the name and the consent tick are required.
// The rules live in src/lib/profile.js (unit-tested); this file is only the form.

import { useState } from "react";
import { useAppState } from "../state/AppState.jsx";
import { getProfile, saveProfile, validateProfile, SEXES, BLOOD_GROUPS } from "../lib/profile.js";
import * as storage from "../lib/storage.js";
import { navigate } from "../hooks/useHashRoute.js";
import { Header, Button, TextField, SelectField, ChoiceField, ToggleField, focusFirstError } from "../components/ui.jsx";

export default function ProfileScreen() {
  const { t, toast } = useAppState();
  const [form, setForm] = useState(() => {
    const p = getProfile();
    return { ...p, age: p.age ?? "" };
  });
  const [errors, setErrors] = useState({});
  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));
  const goHome = () => navigate("home");

  const yesNoUnknown = [
    { value: "yes", label: t("common.yes") },
    { value: "no", label: t("common.no") },
    { value: "unknown", label: t("common.unknown") }
  ];
  const sexNames = { F: t("profile.sex.F"), M: t("profile.sex.M"), O: t("profile.sex.O") };

  function save() {
    const result = validateProfile(form);
    setErrors({
      name: result.errors.name ? t(result.errors.name) : "",
      age: result.errors.age ? t(result.errors.age) : "",
      consent: result.errors.consent ? t(result.errors.consent) : ""
    });
    if (!result.ok) { focusFirstError(); return; }

    saveProfile(result.value);
    // Read back: only say "Saved" if the phone really stored it.
    if ((storage.get("gh_profile", null) || {}).name !== result.value.name) {
      toast(t("common.saveFailed"), 5000);
      return;
    }
    toast(t("common.saved"));
    goHome();
  }

  return (
    <div className="stack">
      <Header title={t("profile.title")} onBack={goHome} />
      <p>{t("profile.intro")}</p>
      <div className="panel panel-warn small">{t("profile.fictional")}</div>

      <TextField label={t("profile.name")} value={form.name} onChange={set("name")} error={errors.name} />
      <TextField label={t("profile.age")} value={form.age} onChange={set("age")} error={errors.age} type="number" inputMode="numeric" />
      <ChoiceField label={t("profile.sex")} value={form.sex} onChange={set("sex")} options={SEXES.map((s) => ({ value: s, label: sexNames[s] }))} />
      {/* Blood groups are international symbols, so only "unknown" needs translating. */}
      <SelectField
        label={t("profile.bloodGroup")} value={form.bloodGroup} onChange={set("bloodGroup")}
        options={BLOOD_GROUPS.map((g) => ({ value: g, label: g === "unknown" ? t("common.unknown") : g }))}
      />
      <ChoiceField label={t("profile.diabetic")} value={form.diabetic} onChange={set("diabetic")} options={yesNoUnknown} />
      <ChoiceField label={t("profile.bpMedicine")} value={form.bpMedicine} onChange={set("bpMedicine")} options={yesNoUnknown} />
      <ChoiceField label={t("profile.bloodThinners")} value={form.bloodThinners} onChange={set("bloodThinners")} options={yesNoUnknown} />
      <TextField label={t("profile.bloodThinnerName")} value={form.bloodThinnerName} onChange={set("bloodThinnerName")} hidden={form.bloodThinners !== "yes"} />
      <TextField label={t("profile.allergies")} value={form.allergies} onChange={set("allergies")} multiline />
      <TextField label={t("profile.otherConditions")} value={form.otherConditions} onChange={set("otherConditions")} hint={t("profile.otherConditionsHint")} multiline />

      {/* PRD Section 18 (consent): exact wording, and the Setup User must tick the box. */}
      <div className="panel">{t("profile.privacy")}</div>
      <ToggleField label={t("profile.consent")} checked={form.consent} onChange={set("consent")} error={errors.consent} />

      <Button label={t("common.save")} variant="primary" onClick={save} />
    </div>
  );
}
