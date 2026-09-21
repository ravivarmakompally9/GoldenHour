# GoldenHour

Offline, AI-powered stroke screening (BE-FAST: Face, Speech, Arm) as an installable PWA.
Built for the iQOO Hackathon 2026, Hyderabad City Battle. **Part 1 prototype.**

> GoldenHour is a screening aid that prompts people to seek emergency care. It is not a
> diagnostic device and does not replace a doctor.

**DEMO MODE is always on in this prototype.** The app never dials 108, 112 or any real emergency
number. The "Call 108" button dials the demo number saved in Settings (a consenting teammate).

- Product spec: [docs/PRD.md](docs/PRD.md) (source of truth)
- Decisions log: [docs/DECISIONS.md](docs/DECISIONS.md) — D14 explains the move to React + Vite
- Third-party versions: [docs/VERSIONS.md](docs/VERSIONS.md)
- Guide for Claude Code sessions: [CLAUDE.md](CLAUDE.md)

## Tech

React 18 + Vite, JavaScript, plain CSS (no UI kit). vite-plugin-pwa (Workbox `generateSW`) builds
the manifest and the offline service worker. All decision logic, validation and test maths are
framework-free modules in `src/lib/`, unit-tested with Node's built-in test runner.

## Commands

Needs Node.js 20 or newer.

```bash
npm ci
```

```bash
npm run dev
```

Dev server with hot reload at `http://localhost:8080/goldenhour/` (no service worker in dev).

```bash
npm test
```

Unit tests + guard test. They need no `npm ci` — plain `node --test` works on a fresh clone.

```bash
npm run check
```

Tests, production build, then `scripts/check-dist.mjs`, which fails if any shipped file (model,
WASM, font…) is missing from the offline precache. Run this before every merge.

## Test a branch on your phone WITHOUT deploying

Camera, sensors, service worker and install all need a secure origin. Chrome treats
`http://localhost` as secure, so forward the phone's localhost to your laptop:

1. On the laptop, in the repo folder, build and serve the real production build (this is the
   only mode that includes the service worker and install prompt):
   ```bash
   npm run build && npm run preview
   ```
2. On the phone: Settings → Developer options → turn on **USB debugging**. Connect by USB and
   accept the "Allow USB debugging?" prompt.
3. On the laptop, open `chrome://inspect/#devices` in Chrome → **Port forwarding…** → add
   `8080` → `localhost:8080` → tick **Enable port forwarding** → Done.
4. On the phone, open Chrome and go to `http://localhost:8080/goldenhour/`.
5. Back in `chrome://inspect`, click **inspect** under the phone's tab to see its console,
   network requests and Application → Manifest / Service Workers / Cache Storage / Local Storage.

After changing code, run step 1 again; on the phone the blue **"Update available — tap to
reload"** bar appears (or tick Application → Service Workers → *Update on reload* while developing).
For quick UI work use `npm run dev` with the same port forwarding — hot reload, but no offline.

## Setup and deployment steps (Part 1)

The app goes live when `main` is pushed: GitHub Actions runs the tests, builds `dist/` and
publishes it to GitHub Pages ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)).
Follow steps 1–4 once, then only steps 5–6 on each update.

1. **Repo.** A public GitHub repository. The PRD names it `goldenhour`; any name works, because
   the workflow builds with `base = /<repository name>/` (Pages paths are case-sensitive).
2. **Offline files.** JS libraries are pinned npm packages, bundled by Vite. Binary assets —
   `face_landmarker.task`, the MediaPipe `wasm/` folder, fonts — go in `public/` at pinned
   versions and are listed in [docs/VERSIONS.md](docs/VERSIONS.md). Never rely on a CDN (C20).
3. **Turn on hosting.** Repo **Settings → Pages → Build and deployment → Source: "GitHub
   Actions"** (not "Deploy from a branch"). Push to `main`; after the workflow's two jobs go green
   (Actions tab, about 1–2 minutes) the app is at `https://<user>.github.io/<repo>/`.
4. **Get a free LLM key (optional, for F14).** Gemini: Google AI Studio → Get API key. Backup:
   openrouter.ai → Keys → Create key, and pick a model whose ID ends in `:free`. Never paste keys
   into code (C5) — they are typed into Settings on the phone.
5. **First run on the phone.** Share the Chrome-forcing link instead of the plain URL (iQOO
   phones may default to another browser, and the Install button only works in Chrome):
   ```
   intent://<user>.github.io/<repo>/#Intent;scheme=https;package=com.android.chrome;end
   ```
   Install → open from the home-screen icon → choose language → Settings: enter the demo
   emergency number, demo hospital number and (optional) API key → add a teammate as the primary
   contact.
6. **Every update.** Merge to `main` and push. No cache version to bump — Workbox revisions every
   file. On the phone, tap **"Update available — tap to reload"**.
7. **Debugging.** USB debugging + `chrome://inspect` shows the phone's console and errors.
8. **Before sharing the repo link** (deck or judges): search the code for keys and phone numbers;
   there must be none (C2, C5). `npm test` includes a guard test for this, and the deploy stops
   if it fails.

## Safety rules (short version)

- Never dial 108/112 or any real hospital. Demo Mode is locked on.
- No real phone numbers, API keys or real health data in code, tests, commits or screenshots.
  API keys are typed into Settings on the phone and stay in that phone's localStorage.
- Demo data is fictional only (for example "Lakshmi, 68").
- Results are never faked: every result comes from real camera, microphone or sensor data.
