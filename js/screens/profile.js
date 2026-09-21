// S4 Medical profile — F3. The facts an emergency doctor needs in the first minutes; they feed
// the Doctor Handoff Card (M4). Only the name and the consent tick are required.

import { t } from "../i18n.js";
import { getProfile, saveProfile, validateProfile, SEXES, BLOOD_GROUPS, YES_NO_UNKNOWN } from "../profile.js";
import * as storage from "../storage.js";
import { el, header, button, textField, selectField, choiceField, toggleField, toast, focusFirstError } from "../ui/components.js";

export function render(container, ctx) {
  const profile = getProfile();
  const goHome = () => ctx.navigate("home");

  const yesNoUnknown = [
    { value: "yes", label: t("common.yes") },
    { value: "no", label: t("common.no") },
    { value: "unknown", label: t("common.unknown") }
  ].filter((o) => YES_NO_UNKNOWN.includes(o.value));

  const sexLabels = { F: t("profile.sex.F"), M: t("profile.sex.M"), O: t("profile.sex.O") };

  const name = textField({ label: t("profile.name"), value: profile.name, autocomplete: "off" });
  const age = textField({ label: t("profile.age"), value: profile.age ?? "", type: "number", inputmode: "numeric" });
  const sex = choiceField({ label: t("profile.sex"), value: profile.sex, options: SEXES.map((s) => ({ value: s, label: sexLabels[s] })) });
  const bloodGroup = selectField({
    label: t("profile.bloodGroup"),
    value: profile.bloodGroup,
    // Blood groups are international symbols, so only "unknown" needs translating.
    options: BLOOD_GROUPS.map((g) => ({ value: g, label: g === "unknown" ? t("common.unknown") : g }))
  });
  const diabetic = choiceField({ label: t("profile.diabetic"), value: profile.diabetic, options: yesNoUnknown });
  const bpMedicine = choiceField({ label: t("profile.bpMedicine"), value: profile.bpMedicine, options: yesNoUnknown });

  const thinnerName = textField({ label: t("profile.bloodThinnerName"), value: profile.bloodThinnerName });
  const showThinnerName = (answer) => { thinnerName.node.hidden = answer !== "yes"; };
  const bloodThinners = choiceField({ label: t("profile.bloodThinners"), value: profile.bloodThinners, options: yesNoUnknown, onchange: showThinnerName });
  showThinnerName(profile.bloodThinners);

  const allergies = textField({ label: t("profile.allergies"), value: profile.allergies, multiline: true });
  const otherConditions = textField({ label: t("profile.otherConditions"), value: profile.otherConditions, hint: t("profile.otherConditionsHint"), multiline: true });

  // PRD Section 18 (consent): exact wording, and the Setup User must tick the box.
  const consent = toggleField({ label: t("profile.consent"), checked: profile.consent });

  function save() {
    const result = validateProfile({
      name: name.value, age: age.value, sex: sex.value, bloodGroup: bloodGroup.value,
      diabetic: diabetic.value, bpMedicine: bpMedicine.value,
      bloodThinners: bloodThinners.value, bloodThinnerName: thinnerName.value,
      allergies: allergies.value, otherConditions: otherConditions.value,
      consent: consent.checked
    });

    name.setError(result.errors.name ? t(result.errors.name) : "");
    age.setError(result.errors.age ? t(result.errors.age) : "");
    consent.setError(result.errors.consent ? t(result.errors.consent) : "");
    if (!result.ok) {
      focusFirstError(container);
      if (!result.errors.name && !result.errors.age) consent.node.scrollIntoView({ block: "center" });
      return;
    }

    saveProfile(result.value);
    // Read back: only say "Saved" if the phone really stored it.
    if ((storage.get("gh_profile", null) || {}).name !== result.value.name) {
      toast(t("common.saveFailed"), 5000);
      return;
    }
    toast(t("common.saved"));
    goHome();
  }

  container.append(
    el("div", { class: "stack" },
      header({ title: t("profile.title"), onBack: goHome }),
      el("p", { text: t("profile.intro") }),
      el("div", { class: "panel panel-warn small", text: t("profile.fictional") }),
      name.node, age.node, sex.node, bloodGroup.node,
      diabetic.node, bpMedicine.node, bloodThinners.node, thinnerName.node,
      allergies.node, otherConditions.node,
      el("div", { class: "panel", text: t("profile.privacy") }),
      consent.node,
      button({ label: t("common.save"), variant: "primary", onclick: save })
    )
  );
}
