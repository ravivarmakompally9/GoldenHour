// App — picks the screen for the current hash route and draws the parts that are on EVERY
// screen: the yellow DEMO MODE banner, the toast and the "Update available" bar.

import { useEffect } from "react";
import { useAppState } from "./state/AppState.jsx";
import { useHashRoute, navigate } from "./hooks/useHashRoute.js";
import { resolveRoute } from "./lib/router.js";
import { isStandalone, wasInstallSkipped } from "./pwa/installPrompt.js";
import { useAppUpdate } from "./pwa/useAppUpdate.js";
import { stop as stopVoice } from "./lib/tts.js";
import { Backdrop, DemoBanner, Toast } from "./components/ui.jsx";

import InstallScreen from "./screens/InstallScreen.jsx";
import LanguageScreen from "./screens/LanguageScreen.jsx";
import SettingsScreen from "./screens/SettingsScreen.jsx";
import ProfileScreen from "./screens/ProfileScreen.jsx";
import ContactsScreen from "./screens/ContactsScreen.jsx";
import HomeScreen from "./screens/HomeScreen.jsx";
import PlaceholderScreen from "./screens/PlaceholderScreen.jsx";
import CheckScreen from "./screens/CheckScreen.jsx";
import AlertScreen from "./screens/AlertScreen.jsx";
import ResultScreen from "./screens/ResultScreen.jsx";

const SCREENS = {
  install: InstallScreen,      // S1
  language: LanguageScreen,    // S2
  settings: SettingsScreen,    // S3
  profile: ProfileScreen,      // S4
  contacts: ContactsScreen,    // S5  (#/contacts, #/contacts/new, #/contacts/<id>)
  home: HomeScreen,            // S7
  check: CheckScreen,          // S8, S9, S12 (#/check/who, #/check/lkw, #/check/arm)
  alert: AlertScreen,          // S13 (#/alert/<session id>)
  result: ResultScreen,        // S14 + "could not test" (#/result/<session id>)
  soon: PlaceholderScreen      // screens from later milestones (#/soon/baseline)
};

// Emergency screens use SOLID high-contrast surfaces; glass is for setup and home (DECISIONS D19).
const SURFACES = { check: "solid", result: "solid", alert: "alert" };

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

  // Tell the CSS which surface this screen uses (also pauses the animated background).
  const surface = SURFACES[route.name] || "glass";
  useEffect(() => { document.body.dataset.surface = surface; }, [surface]);

  // Leaving a screen always silences any voice instruction.
  useEffect(() => () => stopVoice(), [route.name]);

  const Screen = SCREENS[route.name];

  return (
    <>
      {surface === "glass" && <Backdrop />}
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
