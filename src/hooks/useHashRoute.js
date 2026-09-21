// React glue for the hash router (logic: src/lib/router.js).

import { useEffect, useState } from "react";
import { parseHash, buildHash } from "../lib/router.js";

/** Go to a route, e.g. navigate("contacts", ["c1"]) or navigate("home"). */
export function navigate(name, params = []) {
  const target = buildHash(name, params);
  if (window.location.hash !== target) window.location.hash = target;
}

/** Current route, re-rendering the component whenever the hash changes. */
export function useHashRoute() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}
