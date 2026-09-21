// AppState — the small amount of state every screen shares: settings, the t() translate
// function for the chosen language, and the toast message.
//
// All rules stay in the framework-free modules under src/lib/ (settings.js forces Demo Mode on,
// validatePhone blocks emergency numbers...). This file only mirrors them into React.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getSettings, saveSettings as persistSettings } from "../lib/settings.js";
import * as storage from "../lib/storage.js";
import { translatorFor } from "../i18n/index.js";

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
  const [settings, setSettings] = useState(() => getSettings());
  const [toastMessage, setToastMessage] = useState("");
  const toastTimer = useRef(null);

  const t = useMemo(() => translatorFor(settings.language), [settings.language]);

  // Screen readers and fonts pick the right language from <html lang>.
  useEffect(() => { document.documentElement.lang = settings.language; }, [settings.language]);

  /** Save changes through lib/settings.js (which validates and locks Demo Mode), then re-render. */
  const saveSettings = useCallback((changes) => {
    const saved = persistSettings(changes);
    setSettings(saved);
    return saved;
  }, []);

  /** "Reset all data": delete every gh_ key and go back to first-launch defaults. */
  const resetAll = useCallback(() => {
    storage.clearAll();
    setSettings(getSettings());
  }, []);

  const toast = useCallback((message, ms = 2500) => {
    clearTimeout(toastTimer.current);
    setToastMessage(message);
    toastTimer.current = setTimeout(() => setToastMessage(""), ms);
  }, []);

  const value = useMemo(
    () => ({ settings, saveSettings, resetAll, t, toast, toastMessage }),
    [settings, saveSettings, resetAll, t, toast, toastMessage]
  );
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error("useAppState must be used inside <AppStateProvider>");
  return value;
}
