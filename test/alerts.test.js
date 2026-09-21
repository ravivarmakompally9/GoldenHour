import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sampleMobile, useFakeStorage } from "./helpers.js";
import {
  callLink, smsLink, waLink, mapsLink, buildMessage, setMessageCatalog,
  startCountdown, pause, resume, cancel, isCountingDown
} from "../src/lib/alerts.js";
import { getLocation } from "../src/lib/location.js";
import { createSession, finalizeSession, saveSession, getSession, getSessions, recordAlertOpened, sessionId, MAX_SESSIONS } from "../src/lib/session.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dict = (lang) => JSON.parse(readFileSync(join(root, "src", "i18n", lang + ".json"), "utf8"));
setMessageCatalog({ en: dict("en"), hi: dict("hi"), te: dict("te") });

const demo = "+91" + sampleMobile("9");

// ---------- links: THE 108 RULE ----------

test("callLink uses ONLY the demo number, and is null when none is saved", () => {
  assert.equal(callLink({ demoEmergencyNumber: demo }), "tel:" + demo);
  for (const settings of [null, {}, { demoEmergencyNumber: "" }, { demoEmergencyNumber: "garbage" }]) assert.equal(callLink(settings), null);
});

test("no link builder will ever produce an emergency or short-code number", () => {
  for (const code of ["108", "112", "100", "101", "102", "+91108", "1091", "0112"]) {
    assert.equal(callLink({ demoEmergencyNumber: code }), null, "callLink " + code);
    assert.equal(smsLink(code, "x"), null, "smsLink " + code);
    assert.equal(waLink(code, "x"), null, "waLink " + code);
  }
  // Even with Demo Mode "switched off" by hand, the link is still the demo number: there is no other source.
  assert.equal(callLink({ demoMode: false, demoEmergencyNumber: demo }), "tel:" + demo);
});

test("smsLink, waLink and mapsLink formats (PRD F12)", () => {
  assert.equal(smsLink(demo, "A & B\nC"), "sms:" + demo + "?body=A%20%26%20B%0AC");
  assert.equal(waLink(demo, "hi there"), "https://wa.me/" + demo.slice(1) + "?text=hi%20there");
  assert.ok(!waLink(demo, "x").includes("+"), "WhatsApp numbers carry no plus sign");
  assert.equal(mapsLink(17.385, 78.4867), "https://maps.google.com/?q=17.385000,78.486700");
});

// ---------- message ----------

const lakshmi = { name: "Lakshmi", age: 68 };
function alertSession(overrides = {}) {
  const s = createSession({ profile: lakshmi, now: new Date(2026, 8, 26, 22, 31) });
  s.lastKnownWell = { time: new Date(2026, 8, 26, 21, 40).toISOString(), label: "exact" };
  s.results.arm = { status: "ABNORMAL" };
  s.location = { lat: 17.385, lng: 78.4867, at: s.startedAt, source: "live" };
  return { ...finalizeSession(s), ...overrides };
}

test("English message follows the PRD template (with the D21 wording) and is plain ASCII", () => {
  const text = buildMessage(alertSession(), { livesNearby: true }, "en");
  assert.equal(text, [
    "GOLDENHOUR ALERT: Lakshmi (68) may be having a STROKE.",
    "Failed tests: Arm.",
    "Last seen normal: 9:40 PM.",
    "Call 108 if not already called. Going to: nearest hospital.",
    "Location: https://maps.google.com/?q=17.385000,78.486700",
    "Please come now."
  ].join("\n"));
  assert.match(text, /^[\x0A\x20-\x7E]+$/, "no emoji or special characters: fits in fewer SMS parts");
  assert.doesNotMatch(text, /108 called/, "the app cannot know a call was made (D21)");
});

test("far-away contact, unknown time, no location, last-known location", () => {
  const far = buildMessage(alertSession({ lastKnownWell: { time: null, label: "unknown" }, location: null }), { livesNearby: false }, "en");
  assert.match(far, /Last seen normal: Unknown\./);
  assert.match(far, /Location: Location unavailable\n/);
  assert.match(far, /Hospital details will follow\.$/);

  const at = new Date(2026, 8, 26, 22, 10).toISOString();
  const last = buildMessage(alertSession({ location: { lat: 17.4, lng: 78.5, at, source: "last" } }), null, "en");
  assert.match(last, /q=17\.400000,78\.500000 \(last known 10:10 PM\)/);
});

test("EMERGENCY NOW message, missing name/age, several failed tests", () => {
  const s = finalizeSession(createSession({ profile: null }), { emergencyNow: true });
  const text = buildMessage(s, null, "en");
  assert.match(text, /^GOLDENHOUR ALERT: Someone may be having a STROKE\./);
  assert.match(text, /Failed tests: none recorded \(emergency button used\)\./);

  const many = alertSession();
  many.results.face = { status: "ABNORMAL" };
  many.results.speech = { status: "NOT_COMPLETED" };
  assert.match(buildMessage(many, null, "en"), /Failed tests: Face, Speech, Arm\./);
});

test("message is written in the contact's language and keeps 108 and the map link", () => {
  for (const lang of ["hi", "te"]) {
    const text = buildMessage(alertSession(), { livesNearby: true }, lang);
    assert.ok(text.includes("Lakshmi (68)") && text.includes("108") && text.includes("maps.google.com"), lang);
    assert.ok(!text.includes("{"), lang + " has an unfilled placeholder: " + text);
    assert.notEqual(text, buildMessage(alertSession(), { livesNearby: true }, "en"));
  }
  assert.equal(buildMessage(alertSession(), null, "xx"), buildMessage(alertSession(), null, "en"), "unknown language falls back to English");
});

// ---------- countdown ----------

function fakeTimers() {
  let fn = null;
  return { setInterval: (f) => { fn = f; return 1; }, clearInterval: () => { fn = null; }, second: () => { if (fn) fn(); }, get running() { return fn !== null; } };
}

test("countdown ticks down and fires exactly once at 0", () => {
  const timers = fakeTimers(); const ticks = []; let fired = 0;
  startCountdown(3, () => fired++, { onTick: (n) => ticks.push(n), timers });
  assert.deepEqual(ticks, [3]);
  timers.second(); timers.second();
  assert.equal(fired, 0);
  timers.second();
  assert.deepEqual(ticks, [3, 2, 1, 0]);
  assert.equal(fired, 1);
  timers.second();
  assert.equal(fired, 1);
  assert.equal(timers.running, false);
  assert.equal(isCountingDown(), false);
});

test("pause freezes the countdown (app in background); resume continues", () => {
  const timers = fakeTimers(); let fired = 0; let last = null;
  startCountdown(2, () => fired++, { onTick: (n) => { last = n; }, timers });
  timers.second();
  pause();
  for (let i = 0; i < 30; i++) timers.second();
  assert.equal(last, 1);
  assert.equal(fired, 0);
  resume();
  timers.second();
  assert.equal(fired, 1);
});

test("cancel stops it for good; a new countdown replaces the old one", () => {
  const timers = fakeTimers(); let fired = 0;
  startCountdown(1, () => fired++, { timers });
  cancel();
  timers.second();
  assert.equal(fired, 0);
  assert.equal(isCountingDown(), false);

  let second = 0;
  startCountdown(5, () => fired++, { timers });
  startCountdown(1, () => second++, { timers });
  timers.second();
  assert.equal(fired, 0);
  assert.equal(second, 1);
  pause(); resume(); cancel(); // safe when nothing is running
});

// ---------- location ----------

test("getLocation: live fix is saved; failure falls back to the last fix; nothing at all is null", async () => {
  useFakeStorage();
  assert.equal(await getLocation({ geolocation: null }), null);
  assert.equal(await getLocation({ geolocation: { getCurrentPosition: (ok, fail) => fail(new Error("denied")) } }), null);

  const live = await getLocation({ geolocation: { getCurrentPosition: (ok) => ok({ coords: { latitude: 17.385, longitude: 78.4867 } }) } });
  assert.equal(live.source, "live");
  assert.equal(live.lat, 17.385);

  const fallback = await getLocation({ geolocation: { getCurrentPosition: (ok, fail) => fail(new Error("timeout")) } });
  assert.deepEqual({ lat: fallback.lat, lng: fallback.lng, source: fallback.source, at: fallback.at }, { lat: 17.385, lng: 78.4867, source: "last", at: live.at });

  const throws = await getLocation({ geolocation: { getCurrentPosition: () => { throw new Error("boom"); } } });
  assert.equal(throws.source, "last");
});

// ---------- session ----------

test("finalizeSession fills missing core tests as NOT_TESTED and decides by the rules", () => {
  const s = createSession({ profile: lakshmi });
  s.results.arm = { test: "arm", status: "NORMAL", series: { left: [1, 2, 3] } };
  const done = finalizeSession(s);
  assert.equal(done.decision, "NO_CLEAR_SIGNS");
  assert.equal(done.results.face.status, "NOT_TESTED");
  assert.equal(done.results.face.message, "check.notAvailable");
  assert.equal(done.results.speech.status, "NOT_TESTED");

  const emergency = finalizeSession(createSession(), { emergencyNow: true });
  assert.equal(emergency.decision, "HIGH_ALERT");
  assert.equal(emergency.emergencyNow, true);
  assert.equal(emergency.results.arm.message, "check.skippedByEmergency");

  assert.equal(finalizeSession(createSession()).decision, "COULD_NOT_TEST");
});

test("sessions save without the raw series, update in place, and keep only the last 20", () => {
  useFakeStorage();
  const s = createSession({ profile: lakshmi });
  s.results.arm = { test: "arm", status: "ABNORMAL", series: { left: new Array(600).fill(0) } };
  let done = finalizeSession(s);
  assert.equal(saveSession(done), true);
  assert.equal(getSession(done.id).results.arm.series, undefined);
  assert.equal(getSession(done.id).decision, "HIGH_ALERT");

  done = recordAlertOpened({ ...done, familyAlert: "fired" }, "c1", "sms");
  saveSession(done);
  assert.equal(getSessions().length, 1);
  assert.deepEqual(getSession(done.id).alertsSent.map((a) => [a.contactId, a.channel, a.status]), [["c1", "sms", "opened"]]);

  for (let i = 0; i < 25; i++) saveSession({ ...finalizeSession(createSession()), id: "s_extra_" + i });
  assert.equal(getSessions().length, MAX_SESSIONS);
  assert.equal(getSession("nope"), null);
  assert.match(sessionId(new Date(2026, 8, 26, 22, 31, 7)), /^s_20260926_223107$/);
});
