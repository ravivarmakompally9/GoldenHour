// S3 Settings — F2: language, locked Demo Mode, demo phone numbers, LLM provider + API keys,
// voice, developer mode and "Reset all data".

import { useState } from "react";
import { useAppState } from "../state/AppState.jsx";
import { validatePhone, getApiKey, setApiKey, LANGUAGES, LLM_PROVIDERS } from "../lib/settings.js";
import * as storage from "../lib/storage.js";
import { navigate } from "../hooks/useHashRoute.js";
import { Header, Button, Card, TextField, SelectField, ToggleField, focusFirstError } from "../components/ui.jsx";
import { IconAlert, IconCheck, IconSettings, IconShield, IconTrash, IconWave } from "../components/icons.jsx";

export default function SettingsScreen() {
  const { settings, saveSettings, resetAll, t, toast } = useAppState();

  const [form, setForm] = useState(() => ({
    demoEmergencyName: settings.demoEmergencyName,
    demoEmergencyNumber: settings.demoEmergencyNumber,
    demoHospitalNumber: settings.demoHospitalNumber,
    llmProvider: settings.llmProvider,
    keyGemini: getApiKey("gemini"),
    keyOpenrouter: getApiKey("openrouter"),
    voice: settings.voice,
    developerMode: settings.developerMode
  }));
  const [errors, setErrors] = useState({});
  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));

  const languageNames = { en: t("language.en"), hi: t("language.hi"), te: t("language.te") };
  const providerNames = { gemini: t("settings.llm.gemini"), openrouter: t("settings.llm.openrouter"), none: t("settings.llm.none") };

  /** Check one phone field. Empty is fine unless `required`. Returns { value, error }. */
  function checkPhone(typed, required) {
    if (typed.trim() === "" && !required) return { value: "", error: "" };
    const result = validatePhone(typed);
    const errorKey = "error." + result.error; // "error.phone_emergency_blocked" or "error.phone_invalid"
    return result.ok ? { value: result.value, error: "" } : { value: null, error: t(errorKey) };
  }

  function save() {
    const name = form.demoEmergencyName.trim();
    // The emergency number is needed for calling, but Settings can still be saved without it
    // (for example to switch voice off). The banner and Home checklist keep nagging until it is set.
    const emergency = checkPhone(form.demoEmergencyNumber, name !== "");
    const hospital = checkPhone(form.demoHospitalNumber, false);
    // A number without a name would make the banner read "calls go to , not 108".
    const nameError = emergency.value && name === "" ? t("settings.demoNameRequired") : "";

    const nextErrors = { demoEmergencyName: nameError, demoEmergencyNumber: emergency.error, demoHospitalNumber: hospital.error };
    setErrors(nextErrors);
    if (nameError || emergency.error || hospital.error) { focusFirstError(); return; }

    const saved = saveSettings({
      demoEmergencyName: name,
      demoEmergencyNumber: emergency.value,
      demoHospitalNumber: hospital.value,
      llmProvider: form.llmProvider,
      voice: form.voice,
      developerMode: form.developerMode
    });
    const keysSaved = setApiKey("gemini", form.keyGemini) && setApiKey("openrouter", form.keyOpenrouter);

    // Read back what was really stored: if storage is blocked, say so instead of a false "Saved".
    const stored = storage.get("gh_settings", null);
    if (!stored || stored.demoEmergencyNumber !== saved.demoEmergencyNumber || !keysSaved) {
      toast(t("common.saveFailed"), 5000);
      return;
    }
    toast(t("common.saved"));
    navigate("home");
  }

  function reset() {
    if (!window.confirm(t("settings.resetConfirm"))) return;
    resetAll();                       // back to first-launch state
    toast(t("settings.resetDone"));
    navigate("language");
  }

  return (
    <div className="stack">
      <Header title={t("settings.title")} onBack={() => navigate("home")} />

      {/* Also what a CALL button shows when no demo number exists yet (DECISIONS D6). */}
      {!settings.demoEmergencyNumber && (
        <div className="panel panel-warn panel-row"><IconAlert /><strong>{t("settings.addDemoNumber")}</strong></div>
      )}

      <Card title={t("settings.section.demo")} icon={<IconShield />}>
        {/* Demo Mode: a switch that is ON and LOCKED. No code path in Part 1 turns it off
            (see normaliseSettings in src/lib/settings.js). */}
        <ToggleField label={t("settings.demoMode")} hint={t("settings.demoLocked")} checked locked />
        <TextField label={t("settings.demoName")} value={form.demoEmergencyName} onChange={set("demoEmergencyName")} error={errors.demoEmergencyName} />
        <TextField
          label={t("settings.demoNumber")} value={form.demoEmergencyNumber} onChange={set("demoEmergencyNumber")}
          error={errors.demoEmergencyNumber} hint={t("settings.demoNumberHint")}
          type="tel" inputMode="tel" placeholder={t("settings.phonePlaceholder")}
        />
        <TextField
          label={t("settings.hospitalNumber")} value={form.demoHospitalNumber} onChange={set("demoHospitalNumber")}
          error={errors.demoHospitalNumber} hint={t("settings.hospitalHint")}
          type="tel" inputMode="tel" placeholder={t("settings.phonePlaceholder")}
        />
      </Card>

      <Card title={t("settings.section.ai")} icon={<IconWave />}>
        <SelectField
          label={t("settings.llmProvider")} value={form.llmProvider} onChange={set("llmProvider")}
          options={LLM_PROVIDERS.map((p) => ({ value: p, label: providerNames[p] }))}
        />
        {/* type="password" hides the key from people looking at the screen (and from screenshots). */}
        <TextField label={t("settings.keyGemini")} value={form.keyGemini} onChange={set("keyGemini")} type="password" hint={t("settings.keyHint")} />
        <TextField label={t("settings.keyOpenrouter")} value={form.keyOpenrouter} onChange={set("keyOpenrouter")} type="password" />
      </Card>

      <Card title={t("settings.section.app")} icon={<IconSettings />}>
        {/* Language applies at once (no Save needed), so a helper who cannot read the current
            language is never stuck hunting for a Save button. */}
        <SelectField
          label={t("settings.language")}
          value={settings.language}
          onChange={(language) => saveSettings({ language, languageChosen: true })}
          options={LANGUAGES.map((l) => ({ value: l, label: languageNames[l] }))}
        />
        <ToggleField label={t("settings.voice")} checked={form.voice} onChange={set("voice")} />
        <ToggleField label={t("settings.developer")} hint={t("settings.developerHint")} checked={form.developerMode} onChange={set("developerMode")} />
      </Card>

      <Button label={t("common.save")} icon={<IconCheck />} variant="primary" onClick={save} />
      <Button label={t("settings.reset")} icon={<IconTrash />} variant="quiet" onClick={reset} />
    </div>
  );
}
