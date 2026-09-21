// Entry point. installPrompt.js is imported FIRST so Chrome's install event is never missed.
import "./pwa/installPrompt.js";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./css/tokens.css";
import "./css/styles.css";
import { AppStateProvider } from "./state/AppState.jsx";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppStateProvider>
      <App />
    </AppStateProvider>
  </StrictMode>
);
