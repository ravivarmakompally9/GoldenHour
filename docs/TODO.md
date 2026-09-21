# GoldenHour — TODO (Part 1)

Living checklist. Order follows PRD §15 milestones. Tick items as they land; keep it short.
Owner = things only the team can do. Claude = build work (one milestone at a time, plan first).

## 0. Right now — unblock the first deploy (M1 close-out)

- [ ] **Owner:** test the M1 build on a real Android phone (README → "Test a branch on your phone"):
      install, language, 108/112 refused, banner, profile, contacts, airplane mode, update bar, reset.
- [ ] **Owner:** check the glass look on the phone — smooth scrolling? readable outdoors?
- [ ] **Owner:** skim `docs/PRD.md` once to confirm it matches your export.
- [x] GitHub repo → Settings → Pages → Source: **GitHub Actions** (done 2026-09-21).
      (Optional: rename the repo to `goldenhour`, see DECISIONS D15.)
- [x] Merged `ws0-foundation` into `main`, pushed, Actions green. Live at
      https://ravivarmakompally9.github.io/GoldenHour/ (case-sensitive; lowercase is a 404).
- [ ] **Owner:** install from the live link on the phone and run the M1 checklist.
- [ ] **Owner:** confirm the planned `card.js` change (`cardModel()` instead of `renderCard()`, D14).

## 1. M2 — Arm test → HIGH ALERT → call/SMS (first demoable version)

Branches `ws2-arm` + `ws4-alerts`.

- [x] `src/lib/tests/arm-metrics.js`: smoothing, readiness, drift Δβ, pronation Δγ, tremor, score A,
      drop detection, general + baseline rules — pure maths + unit tests on synthetic angle series.
- [x] `src/lib/tests/arm.js`: sensors, vibration cues, `run()/abort()` contract; NOT_TESTED when no
      gyroscope; NOT_COMPLETED on drop.
- [x] `dev/arm.html` harness (plain JS) — built.
- [ ] **Owner:** run the harness on a real phone (steady arm, slow sag, palm rotation, drop,
      "cannot do", phone left on a table) and report the numbers + samples/s.
- [x] Add `chart.js` (pinned) for the live tilt graph; record in `docs/VERSIONS.md`.
- [ ] `src/lib/decision.js`: `decide()` + unit tests for R1–R8.
- [ ] `src/lib/alerts.js`: countdown (pause/resume/cancel), `buildMessage`, `callLink` (demo number
      only, `null` when unset), `smsLink`, `waLink` + unit tests.
- [ ] `src/lib/location.js`: `getLocation()` with last-known fallback; ask permission during Setup.
- [ ] Session store (`gh_sessions`, last 20).
- [ ] Screens: S8 Who is tested, S9 Last seen normal (F6), S12 Arm test, S13 HIGH ALERT,
      S14 No clear signs — **solid high-contrast surfaces, not glass** (D19).
- [ ] Check top bar on every check screen: progress + CALL + EMERGENCY NOW. Wake Lock.
- [ ] Replace the "Not built yet" placeholder for the check route.
- [ ] Measure sensor sample rate with the animated background; pause orbs during tests if needed.

## 2. M3 — Face test (`ws1-face`)

- [ ] Add `@mediapipe/tasks-vision` (pinned); copy its `wasm/` to `public/vendor/mediapipe/wasm/`
      and `face_landmarker.task` to `public/models/`; record versions.
- [ ] `face-metrics.js`: frame quality filter, side-by-image-position, lifts, A_lm, A_bs, F, D_rest,
      no-smile check — pure maths + unit tests on synthetic landmarks.
- [ ] `face.js` (camera, GPU→CPU fallback, retries, snapshot in memory only) + `dev/face.html`.
- [ ] S10 Face test screen; confirm `check-dist` shows the model and WASM precached; airplane test.

## 3. M4 — Doctor Card, LLM explanation, voice (`ws5-card-llm-voice`)

- [ ] `card.js` (`cardModel`, `cardText`, `shareCard`) + S17 screen; QR (`qrcode-generator`),
      share as PNG (`html2canvas`); elapsed time updates every minute.
- [ ] `llm.js`: providers, 8 s timeout, name never sent, guardrails, templates (en/hi/te),
      one request per check + unit tests.
- [ ] `tts.js` real implementation (te-IN / hi-IN / en-IN, rate 0.9, beeps, mute button).

## 4. M5 — Speech, baseline, developer panel (`ws3-speech`, `ws6-baseline-devpanel`)

- [ ] `speech-metrics.js`: normalise, WER, VAD timing, rate, pause ratio + unit tests.
- [ ] `speech.js` + `speech-worker.js` (Transformers.js Whisper, WebGPU→WASM), Web Speech fallback
      (Telugu), `dev/speech.html`, S11 screen.
- [ ] `baseline.js` + S6 flow (two runs averaged); tests use baseline-plus-margin when present.
- [ ] `calibration.js` + S18 developer panel: raw metrics, editable thresholds, tagged runs,
      CSV export, "LLM off" switch.

## 5. M6 — Calibration and submission

- [ ] **Owner:** calibration protocol (PRD §19): 5 normal + 5 simulated runs per teammate per test;
      export CSV → **Claude:** update defaults in `thresholds.js`.
- [ ] **Owner:** right-hand check in the face test (label must say "right").
- [ ] **Owner:** demo video (60–90 s), deck (9 slides), submit early on the dashboard.

## 6. M7 — P2 features (only after P0 + P1 are stable AND the owner says yes)

- [ ] Eyes test (F17), Balance test (F18), nearest hospital (F19).

## Owner tasks that can run in parallel (WS7)

- [ ] Native-speaker review of `src/i18n/hi.json` and `te.json`, incl. the speech-test sentences (C17).
- [ ] Decide who is the demo emergency number and primary contact (a teammate, on a different phone).
- [ ] Get a free Gemini key (AI Studio) and an OpenRouter `:free` model id — typed into Settings only.
- [ ] Mentor/doctor review of the "while waiting for the ambulance" text before the final demo (C18).
- [ ] Verify 5–10 Hyderabad hospitals for `hospitals.json` (only if F19 is built, C16).
- [ ] Check the Hyderabad submission deadline and team category on the dashboard (C25).
- [ ] Install and practise iQOO Office Kit before 26 Sep (C26).

## Known small issues

- [ ] App icon is simple in-house artwork — replace `public/icons/*.png` if you want a designed one.
- [ ] `theme_color` is PRD red; the status bar looks red above the warm UI. Change only if the PRD is updated.
