# GoldenHour

Offline, AI-powered stroke screening (BE-FAST: Face, Speech, Arm) as an installable PWA.
Built for the iQOO Hackathon 2026, Hyderabad City Battle. **Part 1 prototype.**

> GoldenHour is a screening aid that prompts people to seek emergency care. It is not a
> diagnostic device and does not replace a doctor.

**DEMO MODE is always on in this prototype.** The app never dials 108, 112 or any real emergency
number. The "Call 108" button dials the demo number saved in Settings (a consenting teammate).

- Product spec: [docs/PRD.md](docs/PRD.md) (source of truth)
- Decisions log: [docs/DECISIONS.md](docs/DECISIONS.md)
- Guide for Claude Code sessions: [CLAUDE.md](CLAUDE.md)

## Tech

Plain HTML, CSS and JavaScript ES modules. No framework, no bundler, no build step, no npm
dependencies. The repo is served as static files by GitHub Pages.

## Run the unit tests

Needs only Node.js 20 or newer (no `npm install`):

```bash
node --test test/
```

## Test a branch on your phone WITHOUT deploying

Camera, sensors, service worker and install all need a secure origin. Chrome treats
`http://localhost` as secure, so forward the phone's localhost to your laptop:

1. On the laptop, in the repo folder:
   ```bash
   python3 -m http.server 8080
   ```
2. On the phone: Settings → Developer options → turn on **USB debugging**. Connect by USB and
   accept the "Allow USB debugging?" prompt.
3. On the laptop, open `chrome://inspect/#devices` in Chrome → **Port forwarding…** → add
   `8080` → `localhost:8080` → tick **Enable port forwarding** → Done.
4. On the phone, open Chrome and go to `http://localhost:8080`.
5. Back in `chrome://inspect`, click **inspect** under the phone's tab to see its console,
   network requests and Application → Service Workers / Local Storage.

Tip: while developing, tick **Application → Service Workers → Update on reload** in the inspector
so you always get your latest files.

## Deploy (GitHub Pages)

One-time setup:

1. Repo **Settings → Pages → Deploy from a branch → `main`, folder `/ (root)`**.
2. After 1–2 minutes the app is live at `https://<user>.github.io/GoldenHour/`
   (the path is case-sensitive and matches the repo name).
3. Share this Chrome-forcing link instead of the plain URL (iQOO phones may default to another
   browser, and the Install button only works in Chrome):
   ```
   intent://<user>.github.io/GoldenHour/#Intent;scheme=https;package=com.android.chrome;end
   ```

Every update:

1. Bump `CACHE_VERSION` in `sw.js` (and add any new files to its `PRECACHE` list — a unit test
   checks the list).
2. Merge to `main` and push.
3. On the phone, tap **"Update available — tap to reload"**.

First run on the phone: open the link → Install → open from the home-screen icon → Settings: enter
the demo emergency number, demo hospital number and (optional) API key → add a teammate as the
primary contact.

## Safety rules (short version)

- Never dial 108/112 or any real hospital. Demo Mode is locked on.
- No real phone numbers, API keys or real health data in code, tests, commits or screenshots.
  API keys are typed into Settings on the phone and stay in that phone's localStorage.
- Demo data is fictional only (for example "Lakshmi, 68").
- Before sharing the repo link, search the code for keys and phone numbers: there must be none.
  `node --test test/` includes a guard test for this.
