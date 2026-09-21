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

- **Stack (DECISIONS D14): React 18 + Vite, JavaScript (no TypeScript), plain CSS.** No UI kit
  (no MUI, Bootstrap, Tailwind…): styles come from `src/css/tokens.css` + `src/css/styles.css`.
  Every dependency is pinned to an exact version in `package.json`; `package-lock.json` is
  committed; CI uses `npm ci`. Add a dependency only when the PRD §14 stack needs it.
- **Logic stays framework-free.** Everything in `src/lib/` is plain ES modules: no React, no JSX,
  no `import.meta.env`, no `virtual:` imports (`test/pwa.test.js` enforces this). That covers
  `decision.js`, `validatePhone`, the face/speech/arm metric math, link builders, `storage.js`,
  `thresholds.js`, `llm.js` and the screening-test modules. They are unit-tested with
  `node --test` (no `npm install` needed to run the tests).
- **React is only the view.** Screens (`src/screens/*.jsx`) call logic through small hooks:
  `useAppState()` (settings, `t()`, toast), `useHashRoute()`, `useInstallPrompt()`,
  `useScreeningTest(module)` (runs a test module's `run()`/`abort()` with React lifecycle).
- **Routing: hash router** (`src/lib/router.js` + `src/hooks/useHashRoute.js`). GitHub Pages
  cannot serve SPA deep links. Routes look like `#/settings`, `#/contacts/c1`.
- **Base path:** `base` defaults to `/goldenhour/` in `vite.config.js`; the deploy workflow sets
  `VITE_BASE` from the real repo name because Pages paths are case-sensitive (D15). In code use
  `import.meta.env.BASE_URL + "models/…"` for files in `public/` — never a hardcoded `/`.
- **PWA: vite-plugin-pwa, `generateSW`, `registerType: "prompt"`.** Workbox precaches the app,
  fonts, WASM and `face_landmarker.task`; `maximumFileSizeToCacheInBytes` is 30 MB (the 2 MB
  default silently skips the model). `scripts/check-dist.mjs` fails the build if any shipped
  file is missing from the precache. No manual cache-version bump: Workbox revisions every file.
- **Static assets live in `public/`** so their paths stay stable: `public/icons/`,
  `public/fonts/`, `public/models/face_landmarker.task`, `public/vendor/mediapipe/wasm/`,
  `public/data/hospitals.json`. JS libraries (Chart.js, `@mediapipe/tasks-vision`,
  qrcode-generator, html2canvas, `@huggingface/transformers`) are pinned npm packages bundled by
  Vite — never a CDN. Record every library, model and WASM version + source URL in
  `docs/VERSIONS.md`. Only allowed runtime download: Whisper weights fetched by Transformers.js.
- If a download is blocked, give the owner exact file names + URLs and carry on.
- Only Part 1 technologies from PRD §14.
- Target: Chrome for Android, portrait phones. UI rules (PRD §9): body ≥ 20px, headings ≥ 28px,
  test instructions ≥ 24px, buttons ≥ 56px tall, touch targets ≥ 48×48, WCAG AA, red `#D32F2F`,
  never colour alone (always a word), yellow DEMO MODE banner on every screen.
- **Look (D19): "golden hour glass".** Use the tokens in `src/css/tokens.css` and the shared
  pieces in `src/components/ui.jsx` (`Card`, `Button`, `Header`, fields, `StatusWord`) and
  `icons.jsx` — do not invent new colours, radii or one-off components. Glass (`.glass`/`Card`)
  is for setup and home; **emergency and test-instruction screens use solid high-contrast
  surfaces.** Animations: transform/opacity only, decorative only, and they must respect
  `prefers-reduced-motion`. Give every inline SVG an explicit size. Max ~3 glass cards per screen.
- Every threshold lives in `src/lib/thresholds.js`. Never hardcode thresholds in test modules.
- Every user-facing string lives in `src/i18n/en.json`, `hi.json`, `te.json` (bundled, so they
  work offline). Hindi/Telugu files carry a "NEEDS NATIVE SPEAKER REVIEW" note (C17). Use literal
  keys — `t("home.title")` — so `test/i18n.test.js` can check them.
- Every test module gets a standalone harness page in `dev/` (plain JS, no React — it proves the
  module is framework-free) and must work there before being wired into a screen. Open it with
  `npm run dev` at `/goldenhour/dev/<name>.html`. Harness pages are also built and deployed
  (`…/dev/arm.html` on the live site) — add each new one to `build.rollupOptions.input`.
  No simulated-sensor buttons in harness pages: results come from real hardware only.
- Beginner-readable code: small functions and components; comments explain the *why*.
- Storage: localStorage only, keys prefixed `gh_`, every read/write in try/catch with defaults.
  Face snapshot stays in memory only.

## 4. Folder structure

```
index.html              Vite entry (loads src/main.jsx)
vite.config.js          base path, React plugin, PWA (manifest + Workbox)
package.json  package-lock.json      exact pinned versions
.github/workflows/deploy.yml         test -> build -> check-dist -> GitHub Pages
scripts/check-dist.mjs  fails the build if a shipped file is not precached
public/                 copied as-is into dist/ (stable paths)
  icons/                icon-192.png, icon-512.png
  fonts/                redesign fonts (woff2)
  models/               face_landmarker.task                      (M3)
  vendor/mediapipe/wasm/  MediaPipe WASM files                    (M3)
  data/hospitals.json   F19 (verified list only)
dev/                    harness pages: arm.html, face.html, speech.html (plain JS, dev server only)
docs/                   PRD.md (source of truth), DECISIONS.md, VERSIONS.md, design/ (redesign)
test/                   node --test unit tests + guard test (pure logic only)
src/
  main.jsx  App.jsx     entry; route -> screen, demo banner, toast, update bar
  css/                  tokens.css (design tokens), styles.css (global UI rules)
  i18n/                 en.json, hi.json, te.json, index.js (bundles them)
  state/AppState.jsx    settings + t() + toast context
  hooks/                useHashRoute, useInstallPrompt, useScreeningTest
  pwa/                  installPrompt.js (beforeinstallprompt), useAppUpdate.js (update bar)
  components/ui.jsx     DemoBanner, Header, Button, EmergencyNowButton, fields, StatusWord, Toast
  screens/              one .jsx per screen S1–S18
  lib/                  FRAMEWORK-FREE logic (no React) — unit-tested
    storage.js thresholds.js settings.js profile.js contacts.js i18n.js router.js tts.js
    decision.js alerts.js location.js hospitals.js card.js llm.js baseline.js calibration.js
    tests/              face.js, speech.js, speech-worker.js, arm.js, eyes.js, balance.js
```

## 5. Module contracts (do not change signatures)

All of these are plain JS in `src/lib/` (paths relative to it). Unchanged from PRD §15.

| Module | Exports | Returns |
|---|---|---|
| `tests/*.js` | `run({ mode, container, baseline, thresholds, camera, onUpdate })`, `abort()` — the module draws only its preview/graph into `container` and reports `onUpdate(state)`; the screen renders the words (D24). `arm.js` also exports `armPlaced()`, `cannotDo()`. Maths + verdict live in a pure `*-metrics.js` file next to it. | `Promise<TestResult>`; `message` is an i18n KEY + `messageVars`; `series` is never stored |
| `decision.js` | `decide(core, extended, emergencyNow)` | `"HIGH_ALERT"` \| `"NO_CLEAR_SIGNS"` \| `"COULD_NOT_TEST"` \| `"INCONCLUSIVE"` |
| `alerts.js` | `startCountdown(seconds, onFire)`, `pause()`, `resume()`, `cancel()`, `buildMessage(session, contact, lang)`, `callLink(settings)`, `smsLink(phone, text)`, `waLink(phone, text)` | link strings; countdown callbacks |
| `location.js` | `getLocation()` | `{ lat, lng, at, source: "live" \| "last" }` or `null` |
| `card.js` | `cardModel(session, profile)`, `cardText(session, profile)`, `shareCard(element)` | plain data for the card; plain text (QR); share promise |
| `llm.js` | `getExplanation(session, lang)` | `{ family_message, doctor_summary, source }` |
| `tts.js` | `say(key, vars)`, `stop()` | — |
| `storage.js` | `get(key, fallback)`, `set(key, value)`, `clearAll()` (+ `getText`, `setText` for API keys) | stored value |
| `settings.js` | `validatePhone(str)` (+ `getSettings`, `saveSettings`, `isDemoReady`, `getApiKey`, `setApiKey`) | `{ ok, value, error }` |
| `i18n.js` | `format`, `lookup`, `createTranslator(strings, fallback)` | `t(key, vars)` |
| `router.js` | `parseHash`, `buildHash`, `resolveRoute(route, flags)` | `{ name, params }` |

One contract changed with React (D14): PRD `card.js` had `renderCard(session, profile)` returning
a DOM Element. Now `card.js` exports `cardModel(session, profile)` (plain data, unit-testable) and
`src/screens/DoctorCardScreen.jsx` renders it. `cardText` and `shareCard(element)` are unchanged.

React-side contracts:

| Hook / component | Gives you |
|---|---|
| `useAppState()` | `{ settings, saveSettings(changes), resetAll(), t(key, vars), toast(msg, ms) }` |
| `useHashRoute()`, `navigate(name, params)` | current `{ name, params }`; go to `#/name/param…` |
| `useInstallPrompt()` | `{ canInstall, installed, promptInstall() }` |
| `useAppUpdate()` | `{ updateReady, applyUpdate() }` |
| `useScreeningTest(module)` | `{ containerRef, status, result, error, start(options), abort() }` — aborts on unmount; never invents a result (error → the screen records NOT_TESTED) |
| Screen component | `export default function XScreen({ params })` registered in `SCREENS` in `src/App.jsx` |
| `<EmergencyNowButton>`, `<DemoBanner>` | the single shared versions — do not re-implement |

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
- Before every commit: `node --test`. Before every merge: `npm run check`
  (tests + build + offline precache check).
- Never write a literal mobile number anywhere, including unit tests — build samples at runtime
  (`"9" + "0".repeat(9)`). `test/guard.test.js` scans `index.html`, `vite.config.js`, `src/` and
  `public/` (not `docs/`, `test/`, or any `vendor/` / `models/` folder) and fails on emergency
  `tel:` links, phone-like numbers, API-key patterns or `demoMode: false`.
- Commands: `npm ci` · `npm run dev` (http://localhost:8080/goldenhour/) · `npm run build` ·
  `npm run preview` (serves the real build, with service worker) · `npm test`.
- Deploy: push to `main` → GitHub Actions builds and publishes `dist/` to Pages. Test a branch on
  a phone without deploying: `npm run build && npm run preview` + chrome://inspect port
  forwarding 8080 (README).
- End of each milestone, report: what was built, which PRD acceptance criteria pass, phone test
  checklist (incl. what to look at in `chrome://inspect`), known issues, what comes next.
