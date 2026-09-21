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
