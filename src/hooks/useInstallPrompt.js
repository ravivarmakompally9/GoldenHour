import { useSyncExternalStore } from "react";
import { subscribe, getSnapshot, promptInstall } from "../pwa/installPrompt.js";

/** { canInstall, installed, promptInstall } — re-renders when Chrome's install event arrives. */
export function useInstallPrompt() {
  const state = useSyncExternalStore(subscribe, getSnapshot);
  return { ...state, promptInstall };
}
