// storage.js — the ONLY place that touches localStorage (PRD Section 13).
//
// Why every call is wrapped in try/catch: localStorage can throw (private mode, storage full,
// blocked by the browser) or hold broken JSON. In an emergency the app must still run, so a
// failed read returns the fallback and a failed write returns false instead of crashing.

const PREFIX = "gh_";

// Looked up on every call (not cached) so unit tests can plug in a fake localStorage.
function store() {
  return globalThis.localStorage;
}

/** Read a JSON value. Returns `fallback` if the key is missing, broken or storage is blocked. */
export function get(key, fallback = null) {
  try {
    const raw = store().getItem(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** Save a JSON value. Returns true if it was saved. */
export function set(key, value) {
  try {
    store().setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Plain-text variants, used for API keys (gh_key_gemini, gh_key_openrouter).
 * The PRD's llm.js reads keys with localStorage.getItem() directly, so they must be stored
 * as plain text, not as JSON with quotes around them.
 */
export function getText(key, fallback = "") {
  try {
    const raw = store().getItem(key);
    return raw === null || raw === undefined ? fallback : raw;
  } catch {
    return fallback;
  }
}

export function setText(key, text) {
  try {
    if (text) store().setItem(key, text);
    else store().removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * "Reset all data": delete every GoldenHour key.
 * Why not localStorage.clear(): other things on the same origin (for example the Transformers.js
 * model bookkeeping) must survive, so we only remove keys that start with "gh_" (DECISIONS D5).
 */
export function clearAll() {
  try {
    const s = store();
    const ours = [];
    for (let i = 0; i < s.length; i++) {
      const key = s.key(i);
      if (key && key.startsWith(PREFIX)) ours.push(key);
    }
    ours.forEach((key) => s.removeItem(key));
    return true;
  } catch {
    return false;
  }
}
