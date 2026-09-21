# Decisions log

When the PRD is unclear, incomplete or self-conflicting, we pick the safest option and record it
here. Newest at the bottom. Status: OPEN (needs owner input) or SETTLED.

## D1 — First PRD PDF was truncated at page 45 — SETTLED (2026-09-21)

The first PDF stopped inside Section 16. The owner then supplied the complete Markdown PRD
(Sections 1–22), now saved as `docs/PRD.md` — the single source of truth. `docs/PRD.pdf` was
deleted. We use: the exact disclaimer from Section 18, the threshold table from Section 19, and
the "Setup and deployment steps (Part 1)" at the end of Section 15.

## D2 — Hindi and Telugu test sentences — SETTLED (2026-09-21)

The sentences are in the F8 table of `docs/PRD.md` and are used as written. The Hindi and Telugu
language files keep the "NEEDS NATIVE SPEAKER REVIEW" note until a native speaker signs off (C17).

## D3 — Repository name vs PRD folder name — SETTLED

PRD uses `goldenhour/` and `<user>.github.io/goldenhour/`; the GitHub repo is `GoldenHour`.
GitHub Pages paths are case-sensitive, so the live URL is `…github.io/GoldenHour/`. All app paths
are relative (`./`), so either name works. The intent link in the README uses the real repo name.

## D4 — Unit-test folder name — SETTLED

PRD reserves `js/tests/` for the screening-test modules (face.js, arm.js…). Node unit tests go in
a top-level `test/` folder to avoid confusion. They are not precached by the service worker.

## D5 — "Reset all data" clears only `gh_` keys — SETTLED

PRD §13 says Reset deletes every `gh_` key. `storage.clearAll()` removes only keys starting with
`gh_` (not `localStorage.clear()`), so it cannot wipe the Transformers.js model cache bookkeeping
or anything else on the same GitHub Pages origin.

## D6 — Demo numbers missing → CALL button must not dial anything — SETTLED (owner approved)

If no demo emergency number has been saved yet, `callLink(settings)` returns `null` and the CALL
button opens Settings with the message "Add a demo emergency number to enable calling." It never
dials anything and never falls back to a real emergency number (108 rule). The Home checklist
shows "Demo numbers: not set" until fixed.

## D7 — F9 arm "no baseline" rule — SETTLED (2026-09-21)

The cell was incomplete in the PRD itself; the owner fixed it. Rule: either arm `A` > 12°, OR the
left–right difference > 8°. `thresholds.js` ships `arm.generalMaxA = 12` and
`arm.generalMaxDiff = 8` (the interim 6° is gone). Matches the Section 19 table.

## D8 — Guard test scope — SETTLED (owner specified)

`docs/PRD.md` legitimately mentions `tel:108` when describing Part 2, so docs are not scanned.
The guard unit test scans app code only: `index.html`, `sw.js`, `manifest.json`, `css/`, `js/`,
`ui/`, `i18n/`, `dev/`. It excludes `docs/`, `vendor/`, `models/` and unit tests. Phone numbers
are matched with digit boundaries — `(?<!\d)(\+91)?[6-9]\d{9}(?!\d)` — so long numbers inside
URLs or IDs are not flagged. Unit tests never contain a literal mobile number; sample numbers are
built at runtime (e.g. `"9" + "0".repeat(9)`).

## D9 — Three small helper modules beyond the PRD folder list — SETTLED

`js/profile.js` and `js/contacts.js` hold the pure rules for F3/F4 (required fields, max 5
contacts, exactly one primary) so they can be unit-tested without a browser. `js/pwa.js` registers
the service worker and drives the "Update available" bar. `js/screens/placeholder.js` is a
temporary honest "not built yet" screen, deleted when M2/M5 replace its routes. The PRD's contract
modules and signatures are unchanged; the screens stay in `js/screens/`. `package.json` exists only
to mark `.js` files as ES modules for `node --test` — it has no dependencies and no build step.

## D10 — Short-code blocking is wider than the PRD minimum — SETTLED

PRD F2 blocks 108, 112, 100, 101, 102 and every 3–4 digit number. `validatePhone()` blocks every
number of 6 digits or fewer (5–6 digit helplines exist too). Wider blocking cannot break a valid
10-digit mobile, so it is the safer reading.

## D11 — "Continue in the browser" on the install page — SETTLED

PRD S1 lists only the Install button and fallback text. We added a quiet "Continue in the browser"
button so the app can be tested on localhost and used on a phone where install is blocked. It is
remembered per tab (sessionStorage), so the install page returns on the next visit. Installed
(standalone) launches never see S1.

## D12 — Consent tick lives on the Medical Profile screen — SETTLED

PRD Section 18 requires the privacy sentence and the tick "The person being protected agrees to
this setup." during Setup but names no screen. It is on S4 (Medical profile), next to the health
data it covers, and the profile cannot be saved without it. Stored as `gh_profile.consent`.

## D13 — Location permission is asked in M2, not M1 — SETTLED

F12 says to ask for location during Setup. `location.js` belongs to WS4 (M2), so the Setup
permission prompts (camera, microphone, location, each with a one-line reason) arrive with the
features that use them.

## D14 — React 18 + Vite replaces "no framework, no build step" — SETTLED (owner decision, 2026-09-21)

**Decision:** Part 1 is now React 18 + Vite (JavaScript, plain CSS, no UI kit), with
vite-plugin-pwa (`generateSW`) and a GitHub Actions deploy of `dist/` to Pages.
**Reason (owner):** the redesign in `docs/design/` is component-based; React makes the 18 screens
and the shared pieces (demo banner, EMERGENCY NOW, fields) consistent and quicker to build than
hand-written DOM code, and Workbox removes the hand-kept precache list and cache-version bumps,
which were easy to forget. **What it costs:** a build step, `node_modules`, and a CI workflow.
**What does NOT change:** every safety rule in CLAUDE.md; the PRD module contracts; offline-first;
pinned versions (now `package.json` + committed `package-lock.json`, C20). All logic stays in
framework-free modules under `src/lib/`, still covered by `node --test` with no install.
**Supersedes:** the old tech rule "no framework/bundler/build step", D3 (relative paths — now
Vite `base`), D4's note about `js/tests/` (now `src/lib/tests/`), D8's folder list (guard now scans
`index.html`, `vite.config.js`, `src/`, `public/`), and the "bump the cache version" rule.
PRD §14/§15 text still describes the old stack; where they differ on tooling, this decision wins.
**One contract change:** `card.js` `renderCard()` returned a DOM Element; it becomes
`cardModel()` (plain data) rendered by a React screen. `cardText`/`shareCard` are unchanged.

## D15 — Vite `base` is "/goldenhour/" by default, overridden by the repo name in CI — SETTLED

The owner asked for `base: "/goldenhour/"`. The GitHub repo is currently named `GoldenHour`, and
GitHub Pages paths are case-sensitive, so a hard-coded lowercase base would 404 every asset on the
live site. Safest option: `vite.config.js` defaults to `/goldenhour/`, and the deploy workflow sets
`VITE_BASE=/<repository name>/`, so the deployed build always matches the real URL.
**Owner action (optional):** rename the repo to `goldenhour` (as PRD §15 step 1 says) so the local
and live URLs are identical. Nothing in the code needs to change either way.

## D16 — Redesign files were not in the repo; M1 look kept as a stand-in — SUPERSEDED by D19

The owner asked to port M1 "using the redesign from docs/design/" with `css/tokens.css`. Neither
exists in the repo, on the GitHub remote, or elsewhere on the machine (searched 2026-09-21).
Safest option: do the stack migration now (it does not depend on the visuals), keep the M1 look,
and put every colour in `src/css/tokens.css` so the redesign's tokens file can replace it.
**Owner action:** add the redesign to `docs/design/` (tokens.css, fonts, screen mock-ups). Then the
screens get restyled — fonts go in `public/fonts/` and are precached automatically (woff2 is in the
Workbox glob).

## D17 — Guard test scans `src/lib/tests/` — SETTLED

The owner's guard rule excludes "tests/". That means the unit tests in `test/`. The screening-test
MODULES in `src/lib/tests/` (face, arm, speech) are app code that can build links and messages, so
they ARE scanned. Folders named `vendor/` or `models/` anywhere are skipped (third-party files).

## D18 — Service worker does not claim the first page load — SETTLED

With `registerType: "prompt"` Workbox installs and precaches on the first online visit but only
controls the page from the next load. Offline use after "one online load" still works (verified:
server stopped, reload served from cache). We do not add `skipWaiting`/`clientsClaim`, because
swapping the running app mid-check is exactly what the update prompt is there to prevent.

## D19 — Visual design: "golden hour glass" theme — SETTLED (owner request, 2026-09-21)

**Request:** a modern, trending mobile look — glassmorphism, animation — with Dribbble health-app
shots as the reference for direction (nothing copied: layout, artwork, icons and CSS are our own).
**What was built:** warm sunrise gradient-mesh background with slowly drifting colour orbs;
frosted-glass cards (`.glass`); pill buttons; a dark plum hero for EMERGENCY CHECK with a pulsing
beacon and light sweep; gradient red EMERGENCY NOW; icon bubbles; a setup progress ring; iOS-style
switches; staggered screen entrance, press feedback, toast/update-bar spring, error shake.
Font: Plus Jakarta Sans variable (OFL-1.1) served locally from `public/fonts/` (Latin only; Hindi
and Telugu use the phone's Noto fonts). Everything is driven by `src/css/tokens.css`.

**Safety limits kept (PRD §9 wins over style):**
- Text sizes and button sizes unchanged (20/24/28 px, ≥ 56 px buttons, ≥ 48 px targets).
- Contrast: `--ink` ≈ 15:1 and `--muted` ≈ 8:1 on the lightest glass; white on the hero and red
  gradients ≥ 4.5:1; control borders ≥ 3:1. Status is still a WORD + symbol + colour.
- The DEMO MODE banner stays solid yellow with black text on every screen.
- **Emergency screens (HIGH ALERT S13, and test instructions S10–S12) will use SOLID,
  high-contrast surfaces, not glass.** Glass is for setup and home, where nobody is panicking.
- All animation is decorative, transform/opacity only, and is switched off by
  `prefers-reduced-motion`. Nothing the user must read ever waits for an animation.
- Performance: only a few real `backdrop-filter` surfaces per screen (cards, header buttons);
  rows and inputs are translucent fills without their own blur. `@supports` fallback to a solid
  card where backdrop-filter is missing. To verify on a mid-range phone in M2 (arm test graph must
  stay ≥ 50 samples/s with the background running; if not, the orbs pause during tests).
- PRD F1 manifest colours (`theme_color #d32f2f`, white background) are unchanged.

## D20 — M2 runs only the arm test; face and speech are NOT_TESTED, and the screen says so — SETTLED (owner OK)

Until M3/M5, the check flow records face and speech as `NOT_TESTED` with the reason "not available
in this version" (never NORMAL, never a fake run). Under the PRD rules (R5) a NORMAL arm test then
gives NO_CLEAR_SIGNS, so S14 adds the line "Only the arm test was run. Face and speech were not
checked." next to the fixed PRD wording. No sensors at all → all three NOT_TESTED → amber
COULD_NOT_TEST screen (R4).

## D21 — SMS says "Call 108 if not already called." instead of "108 called." — SETTLED (owner OK)

The PRD SMS template states "108 called." as a fact, but a PWA cannot know whether a call was made.
A wrong "108 called" could make family assume help is coming. The line becomes
"Call 108 if not already called." (plain ASCII, same length class). Deviation from PRD F12.

## D22 — Arm test: the helper taps "Phone is on the palm" before the readiness wait — SETTLED

PRD F9 starts the recording automatically once the phone is flat and steady. A phone lying on a
table while the instructions are read is also flat and steady, so the test would start (and pass)
with nobody holding it. Safest option: the helper taps one button when the phone is on the palm;
the app THEN waits for flat + steady (1 s), vibrates, settles 2 s and records 10 s. One extra tap
per arm; no result can come from a phone on a table unless someone deliberately taps.

## D23 — Arm test ends at once when an arm cannot do it or the phone drops — SETTLED

If the left arm is NOT_COMPLETED (dropped, or helper taps "They cannot do this test"), the right
arm is skipped: the result is already a warning sign and testing must never delay help (C11/C12).

## D24 — Test modules report state; React draws the words — SETTLED

The PRD contract `run({ mode, container, baseline, thresholds, camera })` is kept. Two optional
extras are added: `onUpdate(state)` (phase, arm, seconds left, readiness) and, for the arm module,
the exports `armPlaced()` and `cannotDo()`. The module draws only its live graph into `container`;
instructions are rendered by the screen from i18n, so modules stay free of React AND of strings.
`TestResult.message` holds an i18n KEY (plus `messageVars`), not English text.

## D25 — M2 merge plan — SETTLED (owner OK)

`ws2-arm` is tested alone on the phone via the `dev/arm.html` harness, then `ws4-alerts` is built
on top; one combined merge + deploy at the end of M2.
