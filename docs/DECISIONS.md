# Decisions log

When the PRD is unclear, incomplete or self-conflicting, we pick the safest option and record it
here. Newest at the bottom. Status: OPEN (needs owner input) or SETTLED.

## D1 — Supplied PRD PDF ends at page 45 (Sections 17–21 missing) — OPEN

**Found:** The PDF given on 2026-09-21 stops part-way through Section 16 (constraint C26).
Missing: Section 17, Section 18 (disclaimer wording), Section 19 (calibration, threshold table,
phone test checklists), Section 20 (demo/submission), Section 21 (roadmap/on-site plan) and the
"Setup and deployment steps (Part 1)" referenced for Section 15.

**Safest option taken until the full PRD arrives:**
- Thresholds in `js/thresholds.js` use the "starting values" given inside F7, F8, F9, F17, F18
  (these are what Section 19 is said to collect).
- Disclaimer text uses the mandatory wording from Section 6: "A screening aid that prompts people
  to seek emergency care. Not a diagnostic device." and the Doctor Card footer from F13:
  "Screening aid only, not a diagnosis".
- Deployment follows F1 + the Section 15 working rules: GitHub Pages from `main`, relative paths,
  bump the `sw.js` cache version on every deploy.
- Manual phone checklists are derived from each feature's acceptance criteria.

**Owner action:** re-export the full PDF (or paste Sections 17–21) so this can be checked.

## D2 — Hindi and Telugu test sentences not recoverable from the PDF text — OPEN

**Found:** The F8 sentence table and the S2 language-button labels lost their Hindi/Telugu glyphs
in text extraction. **Safest option:** language buttons use the standard native names (हिन्दी,
తెలుగు). The speech test sentences are needed only in M5 (WS3); the owner must supply the exact
Hindi (6 words) and Telugu (5 words) sentences. We will not invent medical test sentences.

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

## D6 — Demo numbers missing → CALL button must not dial anything — SETTLED

If no demo emergency number has been saved yet, `callLink(settings)` returns `null` and the CALL
button opens Settings with the message to enter a teammate's mobile. It never falls back to a real
emergency number (108 rule). The Home checklist shows "Demo numbers: not set" until fixed.
