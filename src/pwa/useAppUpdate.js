// useAppUpdate — registers the service worker built by vite-plugin-pwa and reports when a new
// version is waiting (F1: "Update available — tap to reload").
//
// registerType is "prompt" (vite.config.js): the new version WAITS until the user taps the bar,
// so the app never swaps itself in the middle of an emergency check.

import { useEffect, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";

export function useAppUpdate() {
  const [updateReady, setUpdateReady] = useState(false);
  const updateRef = useRef(null);

  useEffect(() => {
    updateRef.current = registerSW({
      onNeedRefresh: () => setUpdateReady(true),
      onRegisterError: (err) => console.warn("[pwa] service worker registration failed", err)
    });
  }, []);

  // Tells the waiting worker to take over, then reloads the page.
  const applyUpdate = () => { if (updateRef.current) updateRef.current(true); };

  return { updateReady, applyUpdate };
}
