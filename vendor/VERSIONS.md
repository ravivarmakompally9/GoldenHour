# Vendored libraries and models

Every third-party file in `/vendor` and `/models` is listed here with its exact version and the
URL it was downloaded from (PRD constraint C20). Nothing is loaded from a CDN at runtime. The only
runtime download allowed is the Whisper model weights that Transformers.js fetches from Hugging
Face and the browser caches.

| File(s) | Library | Version | Source URL | Added in |
| --- | --- | --- | --- | --- |
| _none yet_ | | | | M1 ships no third-party code |

Planned (added by the workstream that first needs them):

| Library | Needed for | Workstream |
| --- | --- | --- |
| Chart.js (`vendor/chart.umd.js`) | F9 live tilt graph | WS2 (M2) |
| MediaPipe Tasks Vision (`vendor/mediapipe/` + `models/face_landmarker.task`) | F7 face test | WS1 (M3) |
| qrcode-generator (`vendor/qrcode.js`), html2canvas (`vendor/html2canvas.min.js`) | F13 Doctor Card | WS5 (M4) |
| Transformers.js (`vendor/transformers.min.js`) | F8 speech test | WS3 (M5) |
