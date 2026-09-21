// S2 Language — shown on first launch only; the language can be changed later in Settings.
// Each button shows the language's own name, so it is readable without knowing English.

import { t } from "../i18n.js";
import { saveSettings, LANGUAGES } from "../settings.js";
import { el, button } from "../ui/components.js";

export function render(container, ctx) {
  const choose = async (lang) => {
    saveSettings({ language: lang, languageChosen: true });
    await ctx.changeLanguage(lang);
    ctx.navigate("home");
  };

  const labels = { en: t("language.en"), hi: t("language.hi"), te: t("language.te") };

  container.append(
    el("div", { class: "stack" },
      el("h1", { text: t("language.title") }),
      LANGUAGES.map((lang) => button({ label: labels[lang], size: "tall", onclick: () => choose(lang) }))
    )
  );
}
