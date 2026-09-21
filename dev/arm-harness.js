// Harness for the arm test module. Plain JavaScript on purpose (no React): it proves that
// src/lib/tests/arm.js works on its own, as the PRD working rules require.
// There is NO simulated-sensor button here: results must come from real sensor data (rule 8).

import * as armTest from "../src/lib/tests/arm.js";
import { getThresholds } from "../src/lib/thresholds.js";
import { createTranslator } from "../src/lib/i18n.js";
import en from "../src/i18n/en.json";

const t = createTranslator(en, en);
const $ = (id) => document.getElementById(id);
const thresholds = getThresholds();

$("thresholds").textContent = "thresholds.arm in use:\n" + JSON.stringify(thresholds.arm, null, 1);

function instructionFor(state) {
  switch (state.phase) {
    case "checking": return t("arm.checkingSensors");
    case "place": return (state.arm === "left" ? t("arm.place.left") : t("arm.place.right")) + " " + t("arm.helperNote");
    case "waiting": return t("arm.waitingReady") + (state.showHint ? " " + t("arm.readyHint") : "");
    case "settling": return t("arm.closeEyes");
    case "recording": return t("arm.recording");
    case "rest": return t("arm.openEyes");
    default: return "";
  }
}

function show(state) {
  const running = state.phase !== "done";
  $("arm").textContent = running ? (state.arm === "left" ? t("arm.label.left") : t("arm.label.right")) : "";
  $("instruction").textContent = instructionFor(state);
  $("count").textContent = state.secondsLeft === null ? "" : t("arm.secondsLeft", { seconds: state.secondsLeft });
  $("ready").textContent = state.phase === "waiting" ? "flat: " + (state.flat ? "yes" : "NO") + " · steady: " + (state.steady ? "yes" : "NO") : "";
  $("live").textContent = state.dBeta === null ? "" : "Δβ " + state.dBeta.toFixed(1) + "°  Δγ " + state.dGamma.toFixed(1) + "°";
  $("rate").textContent = "sensor: " + state.sampleRate + " samples/s";
  $("placed").disabled = state.phase !== "place";
  $("cannot").disabled = !running;
  $("abort").disabled = !running;
}

$("start").addEventListener("click", async () => {
  $("start").disabled = true;
  $("verdict").textContent = "";
  $("verdict").className = "";
  $("result").textContent = "";

  const result = await armTest.run({ mode: $("mode").value, container: $("graph"), baseline: null, thresholds, onUpdate: show });

  $("start").disabled = false;
  $("verdict").textContent = t("status." + result.status) + " — " + t(result.message);
  $("verdict").className = result.status;
  // The raw series is long; show its size instead of every point.
  const printable = { ...result, series: { left: result.series.left.length + " points", right: result.series.right.length + " points" } };
  $("result").textContent = JSON.stringify(printable, null, 1);
  console.log("[arm harness] TestResult", result);
});

$("placed").addEventListener("click", () => armTest.armPlaced());
$("cannot").addEventListener("click", () => armTest.cannotDo());
$("abort").addEventListener("click", () => armTest.abort());
