// Placeholder for screens that arrive in later milestones (#/soon/check, #/soon/baseline).
//
// SAFETY RULE 8 ("never fake results"): until the real emergency check exists, the buttons lead
// here and the screen says plainly that nothing was tested and no alert was sent. It also tells
// a helper in a REAL emergency what to do. It is plain text on purpose — Part 1 contains no link
// that could dial a real emergency number.
//
// This file is deleted when M2 (check flow) and M5 (baseline) replace both routes.

import { t } from "../i18n.js";
import { el, header, button } from "../ui/components.js";

export function render(container, ctx) {
  const isBaseline = ctx.params[0] === "baseline";
  const goHome = () => ctx.navigate("home");

  container.append(
    el("div", { class: "stack" },
      header({ title: t("placeholder.title"), onBack: goHome }),
      el("p", { class: "instruction", text: isBaseline ? t("placeholder.baseline") : t("placeholder.check") }),
      !isBaseline && el("div", { class: "panel panel-warn" }, el("strong", { text: t("placeholder.realEmergency") })),
      button({ label: t("placeholder.backHome"), variant: "primary", onclick: goHome })
    )
  );
}
