// session.js — one emergency check (PRD Section 13 "Session"), kept in gh_sessions (last 20).
//
// The session is saved as soon as the decision is made. That matters on Android: when the helper
// comes back from the dialer or the SMS app, the PWA may have been reloaded — the alert screen
// then restores everything from the saved session instead of losing it.

import * as storage from "./storage.js";
import { decide, CORE_TESTS } from "./decision.js";

export const SESSIONS_KEY = "gh_sessions";
export const MAX_SESSIONS = 20;

const pad = (n) => String(n).padStart(2, "0");

/** "s_20260926_2231" + seconds, so two checks in one minute never collide. */
export function sessionId(date = new Date()) {
  return "s_" + date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate()) + "_" +
    pad(date.getHours()) + pad(date.getMinutes()) + pad(date.getSeconds());
}

export function createSession({ testedPerson = "other", profile = null, now = new Date() } = {}) {
  return {
    id: sessionId(now),
    startedAt: now.toISOString(),
    testedPerson,                                   // "other" -> rear camera, "self" -> front camera
    // Local snapshot for the alert message and the card. NEVER sent to an LLM (constraint C4).
    person: { name: profile && profile.name ? profile.name : "", age: profile && Number.isFinite(profile.age) ? profile.age : null },
    lastKnownWell: { time: null, label: "unknown" },
    results: { face: null, speech: null, arm: null, eyes: null, balance: null },
    emergencyNow: false,
    decision: null,
    explanation: null,
    location: null,
    familyAlert: "pending",                         // "pending" | "fired" | "cancelled"
    alertsSent: []
  };
}

/**
 * A NOT_TESTED result for a test that did not run. `message` is an i18n key saying WHY:
 *   "check.notAvailable"   the test is not built yet in this version (DECISIONS D20)
 *   "check.skippedByEmergency"  EMERGENCY NOW was pressed (rule R1)
 */
export function notTestedResult(test, message, now = new Date()) {
  return {
    test, status: "NOT_TESTED", mode: "emergency", rule: "general", weakerSide: null, metrics: {},
    engine: "none", message, messageVars: {}, startedAt: now.toISOString(), durationMs: 0
  };
}

/** Fill every core test that has no result yet, then compute the rule-based decision. */
export function finalizeSession(session, { emergencyNow = false, missingReason = "check.notAvailable", now = new Date() } = {}) {
  const results = { ...session.results };
  for (const test of CORE_TESTS) {
    if (!results[test]) results[test] = notTestedResult(test, emergencyNow ? "check.skippedByEmergency" : missingReason, now);
  }
  const extended = results.eyes || results.balance ? { eyes: results.eyes, balance: results.balance } : null;
  return { ...session, results, emergencyNow, decision: decide(results, extended, emergencyNow) };
}

/** Raw sensor series are big and only needed for the live graph: never stored. */
function withoutSeries(session) {
  const results = {};
  for (const [name, result] of Object.entries(session.results)) {
    if (!result) { results[name] = result; continue; }
    const { series, ...rest } = result; // eslint-disable-line no-unused-vars
    results[name] = rest;
  }
  return { ...session, results };
}

export function getSessions() {
  const saved = storage.get(SESSIONS_KEY, []);
  return Array.isArray(saved) ? saved : [];
}

export function getSession(id) {
  return getSessions().find((s) => s && s.id === id) || null;
}

/** Insert or update, newest first, keep the last 20. Returns true if the phone stored it. */
export function saveSession(session) {
  const others = getSessions().filter((s) => s && s.id !== session.id);
  return storage.set(SESSIONS_KEY, [withoutSeries(session), ...others].slice(0, MAX_SESSIONS));
}

/**
 * Record that an alert link was OPENED. A PWA cannot know whether the helper really pressed
 * Send in the SMS app, so we say "opened", never "sent".
 */
export function recordAlertOpened(session, contactId, channel, now = new Date()) {
  return { ...session, alertsSent: [...session.alertsSent, { contactId, channel, status: "opened", at: now.toISOString() }] };
}
