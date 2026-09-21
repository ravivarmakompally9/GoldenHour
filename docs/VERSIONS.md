# Third-party versions

Every third-party library, model and binary asset used by GoldenHour, with its exact version and
source (PRD constraint C20). Nothing is loaded from a CDN at runtime. The only runtime download
allowed is the Whisper model weights that Transformers.js fetches from Hugging Face and the
browser caches.

## npm packages (pinned in package.json, locked in package-lock.json, bundled by Vite)

| Package | Version | Used for | Added in |
| --- | --- | --- | --- |
| react, react-dom | 18.3.1 | UI | WS0 |
| vite | 8.3.0 | dev server + build (dev only) | WS0 |
| @vitejs/plugin-react | 6.1.1 | JSX (dev only) | WS0 |
| vite-plugin-pwa | 1.3.0 | manifest + Workbox service worker (dev only) | WS0 |
| workbox-window | 7.4.1 | service-worker registration / update prompt | WS0 |
| chart.js | 4.5.1 | F9 live tilt graph (only line chart parts registered) | WS2 |

## Binary assets in public/ (copied as-is, precached by Workbox)

| File(s) | What | Version | Source URL | Added in |
| --- | --- | --- | --- | --- |
| `public/icons/icon-*.png` | App icons | own artwork | generated in-house | WS0 |
| `public/fonts/plus-jakarta-sans-latin-wght-normal.woff2` (+ `PlusJakartaSans-LICENSE.txt`) | Plus Jakarta Sans variable font, Latin subset, SIL OFL 1.1 | @fontsource-variable/plus-jakarta-sans 5.3.0 | https://www.npmjs.com/package/@fontsource-variable/plus-jakarta-sans/v/5.3.0 (file `files/plus-jakarta-sans-latin-wght-normal.woff2`) | WS0 redesign |

## Planned (added by the workstream that first needs them)

| Item | Needed for | Workstream |
| --- | --- | --- |
| `@mediapipe/tasks-vision` (npm) + its `wasm/` folder copied to `public/vendor/mediapipe/wasm/` at the SAME version + `public/models/face_landmarker.task` | F7 face test | WS1 (M3) |
| `qrcode-generator`, `html2canvas` (npm) | F13 Doctor Card | WS5 (M4) |
| `@huggingface/transformers` (npm, in a Web Worker) | F8 speech test | WS3 (M5) |
