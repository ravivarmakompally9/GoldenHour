// location.js — F12 live location for the family alert.
//
// getLocation() -> { lat, lng, at, source: "live" | "last" } or null   (PRD contract)
//   "live"  a fresh GPS/network fix
//   "last"  the last fix this phone saved earlier (with its time), used when a fresh one fails
//   null    nothing available -> the message says "Location unavailable" and still sends
//
// Permission is asked during Setup (Home checklist), not in the middle of an emergency.
// The location is stored only on this phone (gh_last_location) and only ever leaves it inside an
// alert message that the helper sends.

import * as storage from "./storage.js";

export const LAST_LOCATION_KEY = "gh_last_location";
const OPTIONS = { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }; // PRD F12

function lastSaved() {
  const last = storage.get(LAST_LOCATION_KEY, null);
  if (!last || !Number.isFinite(last.lat) || !Number.isFinite(last.lng)) return null;
  return { lat: last.lat, lng: last.lng, at: last.at, source: "last" };
}

/** `geolocation` can be replaced in unit tests; in the app it is navigator.geolocation. */
export function getLocation({ geolocation = globalThis.navigator && globalThis.navigator.geolocation } = {}) {
  return new Promise((resolve) => {
    if (!geolocation) { resolve(lastSaved()); return; }
    try {
      geolocation.getCurrentPosition(
        (position) => {
          const fix = { lat: position.coords.latitude, lng: position.coords.longitude, at: new Date().toISOString() };
          storage.set(LAST_LOCATION_KEY, fix);
          resolve({ ...fix, source: "live" });
        },
        () => resolve(lastSaved()),   // denied, timeout or no signal: fall back, never throw
        OPTIONS
      );
    } catch {
      resolve(lastSaved());
    }
  });
}

/** "granted" | "denied" | "prompt" | "unknown" — for the Home setup checklist. */
export async function locationPermission() {
  try {
    const status = await globalThis.navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    return "unknown";
  }
}
