// S1 Install page (browser only) — F1. Hidden when GoldenHour runs as an installed app
// (see resolveRoute in src/lib/router.js).

import { useEffect, useState } from "react";
import { useAppState } from "../state/AppState.jsx";
import { useInstallPrompt } from "../hooks/useInstallPrompt.js";
import { rememberInstallSkipped } from "../pwa/installPrompt.js";
import { navigate } from "../hooks/useHashRoute.js";
import { Button } from "../components/ui.jsx";

const NO_EVENT_HINT_MS = 4000;

export default function InstallScreen() {
  const { settings, t } = useAppState();
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const [showChromeHint, setShowChromeHint] = useState(false);

  // PRD S1: show "Please open in Chrome" if the install event never fires.
  useEffect(() => {
    if (canInstall || installed) { setShowChromeHint(false); return undefined; }
    const timer = setTimeout(() => setShowChromeHint(true), NO_EVENT_HINT_MS);
    return () => clearTimeout(timer);
  }, [canInstall, installed]);

  async function install() {
    // No install event (not Chrome, an in-app browser, or already installed): explain what to do.
    const shown = await promptInstall();
    if (!shown) setShowChromeHint(true);
  }

  function continueInBrowser() {
    rememberInstallSkipped();
    navigate(settings.languageChosen ? "home" : "language");
  }

  return (
    <div className="stack install">
      <img src={import.meta.env.BASE_URL + "icons/icon-192.png"} alt="" width="128" height="128" />
      <h1>{t("app.name")}</h1>
      <p className="instruction">{t("install.purpose")}</p>
      <Button label={t("install.button")} variant="danger" size="tall" onClick={install} />
      {/* Always visible under the button, because Chrome may delay its popup (PRD F1 edge cases). */}
      <p>{t("install.fallback")}</p>
      {installed && <div className="panel"><strong>{t("install.done")}</strong></div>}
      {showChromeHint && !installed && (
        <div className="panel panel-warn">
          <strong>{t("install.openInChrome")}</strong>
          <p className="small">{t("install.openInChromeHint")}</p>
        </div>
      )}
      <Button label={t("install.continueBrowser")} variant="quiet" onClick={continueInBrowser} />
      <p className="disclaimer">{t("app.disclaimer")}</p>
    </div>
  );
}
