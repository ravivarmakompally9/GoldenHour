// S7 Home — one huge EMERGENCY CHECK button, the red EMERGENCY NOW button, the setup checklist
// and the Settings button. Designed so a panicking helper cannot miss the main action.

import { t } from "../i18n.js";
import { isDemoReady } from "../settings.js";
import { getProfile, isProfileDone } from "../profile.js";
import { getContacts } from "../contacts.js";
import * as storage from "../storage.js";
import { el, button, emergencyNowButton, statusWord } from "../ui/components.js";

/** One row of the setup checklist: label on the left, status WORD on the right, tap to open. */
function checklistRow({ label, statusText, done, onclick }) {
  return el("li", {},
    el("button", { class: "row-btn", type: "button", onclick },
      el("span", { class: "row-main" }, el("strong", { text: label })),
      statusWord(statusText, done),
      el("span", { class: "row-go", "aria-hidden": "true", text: "›" })
    )
  );
}

export function render(container, ctx) {
  const { settings, navigate } = ctx;
  const profile = getProfile();
  const contacts = getContacts();
  const baseline = storage.get("gh_baseline", null);

  const done = t("home.status.done");
  const notSet = t("home.status.notSet");

  container.append(
    el("div", { class: "stack" },
      el("header", { class: "screen-header" },
        el("h1", { text: t("app.name") }),
        el("button", { class: "icon-btn", type: "button", "aria-label": t("home.settings"), onclick: () => navigate("settings") }, "⚙")
      ),

      // The emergency check itself (S8–S14) arrives in milestone M2. Until then the button opens
      // an honest "not built yet" screen — it never pretends to test anything.
      button({
        label: t("home.emergencyCheck"),
        sub: t("home.emergencyCheckHint"),
        variant: "primary",
        size: "huge",
        onclick: () => navigate("soon/check")
      }),
      emergencyNowButton(() => navigate("soon/check")),

      el("h2", { text: t("home.setup") }),
      el("ul", { class: "list" },
        checklistRow({
          label: t("home.check.demo"),
          statusText: isDemoReady(settings) ? done : notSet,
          done: isDemoReady(settings),
          onclick: () => navigate("settings")
        }),
        checklistRow({
          label: t("home.check.profile"),
          statusText: isProfileDone(profile) ? done : notSet,
          done: isProfileDone(profile),
          onclick: () => navigate("profile")
        }),
        checklistRow({
          label: t("home.check.contacts"),
          statusText: contacts.length > 0 ? t("home.status.contactsCount", { count: contacts.length }) : notSet,
          done: contacts.length > 0,
          onclick: () => navigate("contacts")
        }),
        checklistRow({
          label: t("home.check.baseline"),
          statusText: baseline ? done : t("home.status.notRecorded"),
          done: Boolean(baseline),
          onclick: () => navigate("soon/baseline")
        })
      ),

      // Required on the Home screen by PRD Section 18.
      el("p", { class: "disclaimer", text: t("app.disclaimer") })
    )
  );
}
