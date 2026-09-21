# GoldenHour — guide for Claude Code sessions

GoldenHour is an offline AI stroke-screening app (BE-FAST check: Face, Speech, Arm) for the
iQOO Hackathon 2026, Hyderabad City Battle. **Read `docs/PRD.md` fully before writing code.**
The PRD is the source of truth; the owner's scope instructions (below) win on SCOPE only.
Open questions and resolved conflicts live in `docs/DECISIONS.md` — read it too.

## 1. Scope: PART 1 ONLY (installable PWA prototype)

- Build only the Part 1 PWA. Part 2 (native Kotlin app) is background context.
- Do NOT create Kotlin, Gradle, Android Studio or any native files. Do NOT build F20 or F21.
- Do NOT build: backend servers, user accounts, cloud storage of health data, family guardian
  app, hospital dashboard, ABHA, Play Store release, APK packaging (PWABuilder), WebLLM or any
  in-browser LLM.
- If a task seems to need Part 2, stop and tell the owner instead of building it.
- Build order: P0 (F1, F2, F3, F4, F6, F7, F9, F10, F11, F12, F13) → P1 (F5, F8, F14, F15, F16)
  → P2 (F17, F18, F19) only when P0+P1 are stable AND the owner says yes.
- Milestones, in order: M1 install + Settings/Profile/Contacts save (WS0) · M2 Arm test → HIGH
  ALERT → call/SMS links (first demoable) · M3 Face · M4 Doctor Card + LLM + voice ·
  M5 Speech + baseline + dev panel · M6 calibration + demo video · M7 P2 features.

## 2. Non-negotiable safety rules

1. **THE 108 RULE.** Part 1 never dials 108, 112 or any real emergency number, in any code path.
   Demo Mode is always on and cannot be switched off. The CALL button label reads "Call 108" but
   its `tel:` link uses ONLY the demo emergency number from Settings, with "(demo: [name])" under
   it. The string `tel:108` must not exist anywhere in Part 1 code. `validatePhone()` rejects
   108, 112, 100, 101, 102 and every 3–4 digit number; accepts only 10-digit Indian mobiles
   starting 6–9; stores `+91XXXXXXXXXX`.
2. No real phone numbers, API keys or real health data anywhere: code, tests, fixtures, comments,
   commits, screenshots. Placeholders only (`+91XXXXXXXXXX`). API keys are typed into Settings on
   the phone and live only in localStorage (`gh_key_<provider>`).
3. Demo/test data is fictional only (e.g. "Lakshmi, 68"; contact "Ravi (son)").
4. The alert decision is rule-based: `decide()` (PRD §11). It is computed BEFORE the LLM is
   called. The LLM never makes or changes the decision. The patient's name is never sent to the LLM.
5. The app never says "you are fine", "no stroke", "normal person", or gives a diagnosis. The
   normal result text is exactly **"No clear warning signs found."** Apply the LLM guardrails and
   template fallback from PRD §12.
6. CALL and EMERGENCY NOW are visible on every check screen. A core test the patient cannot
   complete is `NOT_COMPLETED` → HIGH ALERT. (`NOT_TESTED` = technical problem, not a patient sign.)
7. Everything except the LLM works offline after the first online load. The LLM call has an
   8-second timeout and falls back to templates on any error — the screen never waits or goes empty.
8. Never fake results. No hardcoded/simulated outputs in the app. Every result comes from real
   camera, microphone or sensor data. Synthetic data only inside unit tests.
9. At most one LLM request per completed check; none during calibration runs.
10. Show the exact disclaimer from PRD §18 on the Home screen and Doctor Card: "GoldenHour is a
    screening aid that prompts people to seek emergency care. It is not a diagnostic device and
    does not replace a doctor." The app never recommends any medicine, including aspirin.
11. Balance test (P2) only with someone standing beside the patient. No hospital labelled
    stroke-ready unless the team verified it.

## 3. Tech rules

- Plain HTML, CSS, JavaScript ES modules. No framework, bundler, build step, TypeScript, or npm
  runtime dependencies. Must run as static files on GitHub Pages (HTTPS). Use relative paths
  (`./…`) everywhere — the site is served from a sub-path.
- Only Part 1 technologies from PRD §14.
- Vendor every library into `/vendor` and every model into `/models` at pinned versions; record
  name, version, source URL in `vendor/VERSIONS.md`. Only allowed runtime download: Whisper
  weights fetched by Transformers.js from Hugging Face (browser-cached).
- If a download is blocked, give the owner exact file names + URLs and carry on.
- Target: Chrome for Android, portrait phones. UI rules (PRD §9): body ≥ 20px, headings ≥ 28px,
  test instructions ≥ 24px, buttons ≥ 56px tall, touch targets ≥ 48×48, WCAG AA, red `#D32F2F`,
  never colour alone (always a word), yellow DEMO MODE banner on every screen.
- Every threshold lives in `js/thresholds.js`. Never hardcode thresholds in test modules.
- Every user-facing string lives in `i18n/en.json`, `i18n/hi.json`, `i18n/te.json`. Hindi/Telugu
  files start with a "NEEDS NATIVE SPEAKER REVIEW" note (constraint C17).
- Every test module gets a standalone page in `dev/` and must work there before being wired in.
- Beginner-readable code: small functions; comments explain the *why* (especially face, speech,
  arm math).
- Keep pure logic (math, decisions, link builders, validators) free of browser APIs so it can be
  unit-tested with `node --test` (no dependencies). Unit tests live in `test/` (note: `js/tests/`
  holds the screening-test modules, not unit tests).
- Storage: localStorage only, keys prefixed `gh_`, every read/write in try/catch with defaults.
  Face snapshot stays in memory only.
- Bump the cache version in `sw.js` on every change that ships, and keep its precache list in
  sync with new files.

## 4. Folder structure (PRD §15 — follow exactly)

```
index.html            app shell, loads js/app.js
manifest.json  sw.js  README.md  CLAUDE.md
css/styles.css        global UI rules
icons/                icon-192.png, icon-512.png
models/               face_landmarker.task
vendor/               mediapipe/ (bundle + wasm/), chart.umd.js, qrcode.js,
                      html2canvas.min.js, transformers.min.js, VERSIONS.md
data/hospitals.json   F19 (verified list only)
i18n/                 en.json, hi.json, te.json
dev/                  face.html, arm.html, speech.html harness pages
docs/                 PRD.md (single source of truth), DECISIONS.md
test/                 node --test unit tests (pure logic only)
js/
  app.js              router, screen switching, current session
  storage.js          gh_* get/set with try/catch
  thresholds.js       default thresholds
  i18n.js  tts.js     strings + voice (F15)
  settings.js         F2 validation, Demo Mode
  ui/components.js    top bar, demo banner, buttons, EMERGENCY NOW
  screens/            one file per screen S1–S18
  tests/              face.js, speech.js, speech-worker.js, arm.js, eyes.js, balance.js
  baseline.js  decision.js  alerts.js  location.js  hospitals.js
  card.js  llm.js  calibration.js
```

## 5. Module contracts (do not change signatures)

| Module | Exports | Returns |
|---|---|---|
| `tests/*.js` | `run({ mode, container, baseline, thresholds, camera })`, `abort()` | `Promise<TestResult>` |
| `decision.js` | `decide(core, extended, emergencyNow)` | `"HIGH_ALERT"` \| `"NO_CLEAR_SIGNS"` \| `"COULD_NOT_TEST"` \| `"INCONCLUSIVE"` |
| `alerts.js` | `startCountdown(seconds, onFire)`, `pause()`, `resume()`, `cancel()`, `buildMessage(session, contact, lang)`, `callLink(settings)`, `smsLink(phone, text)`, `waLink(phone, text)` | link strings; countdown callbacks |
| `location.js` | `getLocation()` | `{ lat, lng, at, source: "live" \| "last" }` or `null` |
| `card.js` | `renderCard(session, profile)`, `cardText(session, profile)`, `shareCard(element)` | Element; plain text (QR); share promise |
| `llm.js` | `getExplanation(session, lang)` | `{ family_message, doctor_summary, source }` |
| `tts.js` | `say(key, vars)`, `stop()` | — |
| `storage.js` | `get(key, fallback)`, `set(key, value)`, `clearAll()` | stored value |
| `settings.js` | `validatePhone(str)` | `{ ok, value, error }` |

`TestResult`: `{ test, status, mode, rule, weakerSide, metrics, engine, message, startedAt, durationMs }`
— status ∈ `NORMAL | ABNORMAL | NOT_COMPLETED | NOT_TESTED | INCONCLUSIVE`; mode ∈
`emergency | baseline | calibration`; rule ∈ `baseline | general`. Session and storage record
shapes: PRD §13.

Storage keys: `gh_settings`, `gh_key_gemini`, `gh_key_openrouter`, `gh_profile`, `gh_contacts`,
`gh_baseline`, `gh_thresholds`, `gh_sessions` (last 20), `gh_calibration`, `gh_last_location`.

## 6. How we work

- One milestone at a time. Show a short plan and wait for the owner's OK before coding a milestone.
- One git branch per workstream: `ws0-foundation`, `ws1-face`, `ws2-arm`, `ws3-speech`,
  `ws4-alerts`, `ws5-card-llm-voice`, `ws6-baseline-devpanel`. Small commits, clear messages.
  **Never push and never merge into `main` without asking.**
- PRD unclear or self-conflicting → pick the safest option, record it in `docs/DECISIONS.md` with
  the reason, and tell the owner.
- Run `node --test` before every commit that touches logic.
- Never write a literal mobile number anywhere, including unit tests — build samples at runtime
  (`"9" + "0".repeat(9)`). `test/guard.test.js` fails the build on `tel:108`-style links or
  phone-like numbers in app code.
- Deploy: GitHub Pages from `main`, root folder. Test a branch without deploying via
  `python3 -m http.server 8080` + chrome://inspect port forwarding (README).
- End of each milestone, report: what was built, which PRD acceptance criteria pass, phone test
  checklist (incl. what to look at in `chrome://inspect`), known issues, what comes next.
