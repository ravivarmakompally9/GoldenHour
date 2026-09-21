// S2 Language — shown on first launch only; changeable later in Settings.
// Each button shows the language's own name, so it is readable without knowing English.

import { useAppState } from "../state/AppState.jsx";
import { LANGUAGES } from "../lib/settings.js";
import { navigate } from "../hooks/useHashRoute.js";
import { Button } from "../components/ui.jsx";

export default function LanguageScreen() {
  const { saveSettings, t } = useAppState();
  const names = { en: t("language.en"), hi: t("language.hi"), te: t("language.te") };

  function choose(language) {
    saveSettings({ language, languageChosen: true });
    navigate("home");
  }

  return (
    <div className="stack">
      <h1>{t("language.title")}</h1>
      {LANGUAGES.map((lang) => (
        <Button key={lang} label={names[lang]} className="lang-tile glass" onClick={() => choose(lang)} />
      ))}
    </div>
  );
}
