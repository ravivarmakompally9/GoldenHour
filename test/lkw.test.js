import { test } from "node:test";
import assert from "node:assert/strict";
import { lkwFromOption, lkwFromClock, elapsedMinutes, formatClock } from "../src/lib/lkw.js";

const now = new Date(2026, 8, 26, 22, 31, 5); // 26 Sep 2026, 10:31 PM local time

test("quick options store the right timestamp and label", () => {
  assert.deepEqual(lkwFromOption("just_now", now), { time: now.toISOString(), label: "just_now" });
  assert.equal(elapsedMinutes(lkwFromOption("min30", now), now), 30);
  assert.equal(elapsedMinutes(lkwFromOption("hour1", now), now), 60);
  assert.deepEqual(lkwFromOption("unknown", now), { time: null, label: "unknown" });
  assert.throws(() => lkwFromOption("waking", now));
});

test("a clock time means the most recent moment with that time, never the future", () => {
  const today = lkwFromClock("21:40", "exact", now);
  assert.equal(elapsedMinutes(today, now), 51);
  assert.equal(today.label, "exact");

  const morning = new Date(2026, 8, 27, 7, 0, 0);
  const bedtime = lkwFromClock("23:30", "waking", morning);
  assert.equal(new Date(bedtime.time).getDate(), 26, "23:30 typed at 07:00 is yesterday");
  assert.equal(elapsedMinutes(bedtime, morning), 450);
  assert.equal(bedtime.label, "waking");
});

test("bad clock input returns null", () => {
  for (const bad of ["", null, "25:00", "12:75", "noon", "9"]) assert.equal(lkwFromClock(bad, "exact", now), null);
});

test("elapsedMinutes: unknown is null, never negative", () => {
  assert.equal(elapsedMinutes({ time: null, label: "unknown" }, now), null);
  assert.equal(elapsedMinutes(null, now), null);
  assert.equal(elapsedMinutes({ time: "garbage" }, now), null);
  assert.equal(elapsedMinutes({ time: new Date(now.getTime() + 60000).toISOString() }, now), 0);
});

test("formatClock is plain ASCII 12-hour time", () => {
  assert.equal(formatClock(new Date(2026, 8, 26, 21, 40)), "9:40 PM");
  assert.equal(formatClock(new Date(2026, 8, 26, 0, 5)), "12:05 AM");
  assert.equal(formatClock(new Date(2026, 8, 26, 12, 0)), "12:00 PM");
  assert.match(formatClock(now.toISOString()), /^[\x20-\x7E]+$/);
  assert.equal(formatClock("garbage"), "");
});
