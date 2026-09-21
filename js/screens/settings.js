// S3 Settings — F2: language, locked Demo Mode, demo phone numbers, LLM provider + API keys,
// voice, developer mode and "Reset all data".

import { t } from "../i18n.js";
import { validatePhone, saveSettings, getApiKey, setApiKey, LANGUAGES, LLM_PROVIDERS } from "../settings.js";
import * as storage from "../storage.js";
import { el, header, button, textField, selectField, toggleField, toast, focusFirstError } from "../ui/components.js";

export function render(container, ctx) {
  const { settings, navigate } = ctx;

  const languageNames = { en: t("language.en"), hi: t("language.hi"), te: t("language.te") };
  const providerNames = { gemini: t("settings.llm.gemini"), openrouter: t("settings.llm.openrouter"), none: t("settings.llm.none") };

  const language = selectField({
    label: t("settings.language"),
    value: settings.language,
    options: LANGUAGES.map((l) => ({ value: l, label: languageNames[l] }))
  });
  // Language applies at once (no Save needed) so a helper who cannot read the current
  // language is never stuck hunting for a Save button.
  language.input.addEventListener("change", async () => {
    saveSettings({ language: language.value, languageChosen: true });
    await ctx.changeLanguage(language.value);
  });

  // Demo Mode: shown as a switch that is ON and cannot be moved. There is no code path in
  // Part 1 that turns it off (see normaliseSettings in js/settings.js).
  const demoMode = toggleField({ label: t("settings.demoMode"), hint: t("settings.demoLocked"), checked: true, disabled: true });

  const demoName = textField({ label: t("settings.demoName"), value: settings.demoEmergencyName, autocomplete: "off" });
  const demoNumber = textField({
    label: t("settings.demoNumber"), value: settings.demoEmergencyNumber, type: "tel", inputmode: "tel",
    hint: t("settings.demoNumberHint"), placeholder: t("settings.phonePlaceholder")
  });
  const hospitalNumber = textField({
    label: t("settings.hospitalNumber"), value: settings.demoHospitalNumber, type: "tel", inputmode: "tel",
    hint: t("settings.hospitalHint"), placeholder: t("settings.phonePlaceholder")
  });

  const provider = selectField({
    label: t("settings.llmProvider"),
    value: settings.llmProvider,
    options: LLM_PROVIDERS.map((p) => ({ value: p, label: providerNames[p] }))
  });
  // type="password" hides the key from people looking at the screen (and from screenshots).
  const keyGemini = textField({ label: t("settings.keyGemini"), value: getApiKey("gemini"), type: "password", hint: t("settings.keyHint"), autocomplete: "off" });
  const keyOpenrouter = textField({ label: t("settings.keyOpenrouter"), value: getApiKey("openrouter"), type: "password", hint: t("settings.keyHint"), autocomplete: "off" });

  const voice = toggleField({ label: t("settings.voice"), checked: settings.voice });
  const developer = toggleField({ label: t("settings.developer"), hint: t("settings.developerHint"), checked: settings.developerMode });

  // Shown when the screen was opened by a CALL button that had no demo number (DECISIONS D6).
  const needNumberNotice = !settings.demoEmergencyNumber &&
    el("div", { class: "panel panel-warn" }, el("strong", { text: t("settings.addDemoNumber") }));

  /** Validate one phone field. Empty is allowed when `required` is false. Returns the value to save, or null on error. */
  function checkPhone(field, required) {
    const typed = field.value.trim();
    if (typed === "" && !required) { field.setError(""); return ""; }
    const result = validatePhone(typed);
    const errorKey = "error." + result.error; // "error.phone_emergency_blocked" or "error.phone_invalid"
    field.setError(result.ok ? "" : t(errorKey));
    return result.ok ? result.value : null;
  }

  function save() {
    const name = demoName.value.trim();
    // The emergency number is needed for calling, but Settings can still be saved without it
    // (for example to switch voice off). The banner and Home checklist keep nagging until set.
    const emergency = checkPhone(demoNumber, name !== "");
    const hospital = checkPhone(hospitalNumber, false);

    // A number without a name would make the banner read "calls go to , not 108".
    const nameMissing = Boolean(emergency) && name === "";
    demoName.setError(nameMissing ? t("settings.demoNameRequired") : "");

    if (emergency === null || hospital === null || nameMissing) {
      focusFirstError(container);
      return;
    }

    const saved = saveSettings({
      demoEmergencyName: name,
      demoEmergencyNumber: emergency,
      demoHospitalNumber: hospital,
      llmProvider: provider.value,
      voice: voice.checked,
      developerMode: developer.checked
    });
    const keysSaved = setApiKey("gemini", keyGemini.value) && setApiKey("openrouter", keyOpenrouter.value);

    // Read back what was really stored: if storage is blocked, say so instead of a false "Saved".
    const stored = storage.get("gh_settings", null);
    if (!stored || stored.demoEmergencyNumber !== saved.demoEmergencyNumber || !keysSaved) {
      toast(t("common.saveFailed"), 5000);
      return;
    }
    toast(t("common.saved"));
    navigate("home");
  }

  function resetAll() {
    if (!window.confirm(t("settings.resetConfirm"))) return;
    storage.clearAll();
    toast(t("settings.resetDone"));
    // Back to first-launch state: English, language screen.
    ctx.changeLanguage("en").then(() => navigate("language"));
  }

  container.append(
    el("div", { class: "stack" },
      header({ title: t("settings.title"), onBack: () => navigate("home") }),
      needNumberNotice,
      language.node,
      demoMode.node,
      demoName.node,
      demoNumber.node,
      hospitalNumber.node,
      provider.node,
      keyGemini.node,
      keyOpenrouter.node,
      voice.node,
      developer.node,
      button({ label: t("common.save"), variant: "primary", onclick: save }),
      button({ label: t("settings.reset"), variant: "danger", onclick: resetAll })
    )
  );
}
