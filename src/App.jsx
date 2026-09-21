// App — picks the screen for the current hash route and draws the parts that are on EVERY
// screen: the yellow DEMO MODE banner, the toast and the "Update available" bar.

import { useEffect } from "react";
import { useAppState } from "./state/AppState.jsx";
import { useHashRoute, navigate } from "./hooks/useHashRoute.js";
import { resolveRoute } from "./lib/router.js";
import { isStandalone, wasInstallSkipped } from "./pwa/installPrompt.js";
import { useAppUpdate } from "./pwa/useAppUpdate.js";
import { stop as stopVoice } from "./lib/tts.js";
import { DemoBanner, Toast } from "./components/ui.jsx";

import InstallScreen from "./screens/InstallScreen.jsx";
import LanguageScreen from "./screens/LanguageScreen.jsx";
import SettingsScreen from "./screens/SettingsScreen.jsx";
import ProfileScreen from "./screens/ProfileScreen.jsx";
import ContactsScreen from "./screens/ContactsScreen.jsx";
import HomeScreen from "./screens/HomeScreen.jsx";
import PlaceholderScreen from "./screens/PlaceholderScreen.jsx";

const SCREENS = {
  install: InstallScreen,      // S1
  language: LanguageScreen,    // S2
  settings: SettingsScreen,    // S3
  profile: ProfileScreen,      // S4
  contacts: ContactsScreen,    // S5  (#/contacts, #/contacts/new, #/contacts/<id>)
  home: HomeScreen,            // S7
  soon: PlaceholderScreen      // screens from later milestones (#/soon/check, #/soon/baseline)
};

export default function App() {
  const { settings, t } = useAppState();
  const requested = useHashRoute();
  const { updateReady, applyUpdate } = useAppUpdate();

  const route = resolveRoute(requested, {
    known: Object.keys(SCREENS),
    standalone: isStandalone(),
    installSkipped: wasInstallSkipped(),
    languageChosen: settings.languageChosen
  });

  // Keep the address bar in step when the rules redirected us (first launch, unknown route...).
  useEffect(() => {
    if (route.name !== requested.name) navigate(route.name, route.params);
  }, [route.name, requested.name]); // eslint-disable-line react-hooks/exhaustive-deps

  // Leaving a screen always silences any voice instruction.
  useEffect(() => () => stopVoice(), [route.name]);

  const Screen = SCREENS[route.name];

  return (
    <>
      <DemoBanner />
      <main className="app">
        {/* key: a fresh screen (and fresh form state) for every route */}
        <Screen key={route.name + "/" + route.params.join("/")} params={route.params} />
      </main>
      <Toast />
      {updateReady && (
        <button className="update-bar" type="button" onClick={applyUpdate}>{t("update.available")}</button>
      )}
    </>
  );
}
