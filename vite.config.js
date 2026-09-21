// vite.config.js — build setup for the GoldenHour PWA (React + Vite, DECISIONS D14).
//
// BASE PATH: GitHub Pages serves the app from https://<user>.github.io/<repo>/, and that path is
// CASE-SENSITIVE. The default is "/goldenhour/". The deploy workflow overrides it with the real
// repository name through VITE_BASE, so the build still works if the repo is called "GoldenHour"
// (DECISIONS D15). Local `npm run dev` / `npm run preview` use the same base:
//   http://localhost:8080/goldenhour/

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export const DEFAULT_BASE = "/goldenhour/";

// The default Workbox limit is 2 MB: bigger files are SILENTLY left out of the precache.
// face_landmarker.task and the MediaPipe WASM files are several MB each, so without this the
// face test would work online and break in airplane mode.
export const MAX_PRECACHE_BYTES = 30 * 1024 * 1024;

export default defineConfig(() => {
  const base = process.env.VITE_BASE || DEFAULT_BASE;

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        strategies: "generateSW",
        // "prompt": a new version waits until the user taps "Update available — tap to reload",
        // so the app never changes under the helper's hands in the middle of a check.
        registerType: "prompt",
        injectRegister: false,          // we register it ourselves in src/pwa/useAppUpdate.js
        manifestFilename: "manifest.json",
        includeManifestIcons: false,    // the glob below already precaches icons/ (avoids duplicates)
        manifest: {
          name: "GoldenHour",
          short_name: "GoldenHour",
          description: "Offline stroke warning-sign screening aid. Not a diagnostic device.",
          lang: "en",
          start_url: "./",
          scope: "./",
          display: "standalone",
          orientation: "portrait",
          background_color: "#ffffff",
          theme_color: "#d32f2f",
          categories: ["health", "medical"],
          icons: [
            { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
          ]
        },
        workbox: {
          // Everything the app needs offline: code, styles, strings, icons, fonts, and (from M3)
          // the MediaPipe WASM files and the face model that live in public/.
          globPatterns: ["**/*.{js,css,html,json,png,svg,ico,woff,woff2,ttf,wasm,task,tflite,binarypb}"],
          globIgnores: ["**/manifest.json"], // the plugin adds the manifest itself
          maximumFileSizeToCacheInBytes: MAX_PRECACHE_BYTES,
          navigateFallback: "index.html",
          cleanupOutdatedCaches: true
          // LLM calls (F14) and Hugging Face Whisper downloads (F8) are cross-origin and are not
          // touched by the service worker; Transformers.js keeps its own browser cache.
        }
      })
    ],
    build: {
      target: "es2020",
      sourcemap: false
    }
  };
});
