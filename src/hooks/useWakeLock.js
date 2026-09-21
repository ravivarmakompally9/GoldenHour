// Keeps the screen on during the check, the alert and the Doctor Card (PRD Section 8).
// The browser drops a wake lock whenever the page is hidden (dialer opened, app switched), so it
// is requested again each time the page becomes visible. Unsupported browsers: nothing happens.

import { useEffect } from "react";

export function useWakeLock(active = true) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return undefined;
    let lock = null;
    let cancelled = false;

    const request = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (cancelled) next.release(); else lock = next;
      } catch { /* low battery or denied: the check still works, the screen may just dim */ }
    };

    request();
    document.addEventListener("visibilitychange", request);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", request);
      if (lock) lock.release().catch(() => {});
    };
  }, [active]);
}
