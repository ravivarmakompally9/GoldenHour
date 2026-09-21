// S1 Install page (browser only) — F1. Hidden when GoldenHour runs as an installed app
// (see resolveRoute in src/lib/router.js).

import { useEffect, useState } from "react";
import { useAppState } from "../state/AppState.jsx";
import { useInstallPrompt } from "../hooks/useInstallPrompt.js";
import { rememberInstallSkipped } from "../pwa/installPrompt.js";
import { navigate } from "../hooks/useHashRoute.js";
import { Button, Card } from "../components/ui.jsx";
import { IconCheck, IconDownload, IconInfo, PulseLine } from "../components/icons.jsx";

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
      <Card className="install-card">
        <div className="install-icon">
          <img src={import.meta.env.BASE_URL + "icons/icon-192.png"} alt="" width="132" height="132" />
        </div>
        <h1>{t("app.name")}</h1>
        <PulseLine />
        <p className="instruction">{t("install.purpose")}</p>
        <div className="chips">
          <span className="chip">{t("install.chip.offline")}</span>
          <span className="chip">{t("install.chip.seconds")}</span>
          <span className="chip">{t("install.chip.languages")}</span>
        </div>
      </Card>

      <Button label={t("install.button")} icon={<IconDownload />} variant="danger" size="tall" onClick={install} />
      {/* Always visible under the button, because Chrome may delay its popup (PRD F1 edge cases). */}
      <p className="muted"><strong>{t("install.fallback")}</strong></p>

      {installed && (
        <div className="panel panel-row"><IconCheck /><strong>{t("install.done")}</strong></div>
      )}
      {showChromeHint && !installed && (
        <div className="panel panel-warn panel-row">
          <IconInfo />
          <div>
            <strong>{t("install.openInChrome")}</strong>
            <p className="small">{t("install.openInChromeHint")}</p>
          </div>
        </div>
      )}

      {/* Manual route, always shown: Chrome sometimes never fires its install event (for example
          when the site was opened from another app), and newer Chrome calls the menu item
          "Add to Home screen". */}
      <Card className="install-steps">
        <strong>{t("install.manualTitle")}</strong>
        <p>{t("install.manual1")}</p>
        <p>{t("install.manual2")}</p>
        <p>{t("install.manual3")}</p>
        <p>{t("install.manual4")}</p>
      </Card>

      <Button label={t("install.continueBrowser")} variant="quiet" onClick={continueInBrowser} />
      <p className="disclaimer">{t("app.disclaimer")}</p>
    </div>
  );
}
