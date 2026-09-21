// lkw.js — F6 Last-Known-Well time (pure logic, unit-tested).
//
// WHY IT MATTERS: clot-busting treatment is only possible within about 4.5 hours of the moment
// the person was last seen completely normal, so this is the biggest line on the Doctor Card.
// For a stroke found on waking, doctors count from BEDTIME, not from waking up.
//
// Stored shape (PRD Section 13):  { time: ISO string or null, label: option key }
// `label` is an option KEY ("hour1", "unknown"...); the screen translates it ("lkw.option.hour1").

export const LKW_OPTIONS = ["just_now", "min30", "hour1", "waking", "unknown", "exact"];
const MINUTES_AGO = { just_now: 0, min30: 30, hour1: 60 };

/** Quick buttons: "Just now", "30 min ago", "1 hour ago", "Unknown". */
export function lkwFromOption(option, now = new Date()) {
  if (option === "unknown") return { time: null, label: "unknown" };
  if (!(option in MINUTES_AGO)) throw new Error("lkwFromOption: use lkwFromClock for " + option);
  return { time: new Date(now.getTime() - MINUTES_AGO[option] * 60000).toISOString(), label: option };
}

/**
 * "Pick exact time" and the "Found on waking" follow-up (bedtime): a clock time "HH:MM".
 * The most recent moment with that clock time is used: if 23:30 is typed at 07:00, it means
 * yesterday 23:30 — never a time in the future.
 */
export function lkwFromClock(clock, label, now = new Date()) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(clock || ""));
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null;
  const time = new Date(now);
  time.setHours(Number(match[1]), Number(match[2]), 0, 0);
  if (time.getTime() > now.getTime()) time.setDate(time.getDate() - 1);
  return { time: time.toISOString(), label };
}

/** Whole minutes since last-known-well, or null when unknown. */
export function elapsedMinutes(lkw, now = new Date()) {
  if (!lkw || !lkw.time) return null;
  const then = new Date(lkw.time).getTime();
  if (!Number.isFinite(then)) return null;
  return Math.max(0, Math.floor((now.getTime() - then) / 60000));
}

/**
 * "9:40 PM" in plain ASCII. Written by hand on purpose: toLocaleTimeString() can insert
 * non-ASCII spaces, which would break the "plain ASCII SMS" rule (PRD F12).
 */
export function formatClock(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (!Number.isFinite(d.getTime())) return "";
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return (hours % 12 === 0 ? 12 : hours % 12) + ":" + minutes + " " + (hours < 12 ? "AM" : "PM");
}
