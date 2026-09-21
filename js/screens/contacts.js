// S5 Emergency contacts — F4. Up to 5 people alerted during a HIGH ALERT; exactly one is primary.
//   #/contacts          the list
//   #/contacts/new      add a contact
//   #/contacts/<id>     edit a contact
// The list rules (max 5, one primary, phone validation) live in js/contacts.js and are unit-tested.

import { t } from "../i18n.js";
import { LANGUAGES } from "../settings.js";
import { getContacts, saveContacts, upsertContact, removeContact, MAX_CONTACTS, ROLES } from "../contacts.js";
import * as storage from "../storage.js";
import { el, header, button, textField, selectField, choiceField, toggleField, toast, focusFirstError } from "../ui/components.js";

export function render(container, ctx) {
  const which = ctx.params[0];
  if (which) renderForm(container, ctx, which);
  else renderList(container, ctx);
}

// ---------- List ----------

function contactRow(contact, ctx) {
  const title = contact.relation ? contact.name + " (" + contact.relation + ")" : contact.name;
  return el("li", {},
    el("button", { class: "row-btn", type: "button", onclick: () => ctx.navigate("contacts/" + encodeURIComponent(contact.id)) },
      el("span", { class: "row-main" },
        el("strong", { text: title }),
        el("span", { class: "muted", text: contact.phone })
      ),
      contact.primary && el("span", { class: "badge", text: t("contacts.primaryBadge") }),
      el("span", { class: "row-go", "aria-hidden": "true", text: "›" })
    )
  );
}

function renderList(container, ctx) {
  const contacts = getContacts();
  const full = contacts.length >= MAX_CONTACTS;

  container.append(
    el("div", { class: "stack" },
      header({ title: t("contacts.title"), onBack: () => ctx.navigate("home") }),
      el("p", { text: t("contacts.intro") }),
      el("div", { class: "panel panel-warn small", text: t("contacts.demoRule") }),
      contacts.length === 0
        ? el("p", { class: "muted", text: t("contacts.empty") })
        : el("ul", { class: "list" }, contacts.map((c) => contactRow(c, ctx))),
      full && el("p", { class: "muted", text: t("error.maxContacts") }),
      button({ label: t("contacts.add"), variant: "primary", disabled: full, onclick: () => ctx.navigate("contacts/new") })
    )
  );
}

// ---------- Add / edit form ----------

function renderForm(container, ctx, which) {
  const contacts = getContacts();
  const existing = contacts.find((c) => c.id === which) || null;
  const backToList = () => ctx.navigate("contacts");

  // Unknown id in the URL (for example after a reset): just show the list.
  if (which !== "new" && !existing) { backToList(); return; }

  const c = existing || { name: "", relation: "", phone: "", primary: contacts.length === 0, role: "family", livesNearby: false, language: ctx.settings.language };

  const languageNames = { en: t("language.en"), hi: t("language.hi"), te: t("language.te") };
  const roleNames = { family: t("contacts.role.family"), doctor: t("contacts.role.doctor") };

  const name = textField({ label: t("contacts.name"), value: c.name, autocomplete: "off" });
  const relation = textField({ label: t("contacts.relation"), value: c.relation, autocomplete: "off" });
  const phone = textField({ label: t("contacts.phone"), value: c.phone, type: "tel", inputmode: "tel", placeholder: t("settings.phonePlaceholder") });
  const primary = toggleField({ label: t("contacts.primary"), hint: t("contacts.primaryHint"), checked: c.primary });
  const role = choiceField({ label: t("contacts.role"), value: c.role, options: ROLES.map((r) => ({ value: r, label: roleNames[r] })) });
  const livesNearby = toggleField({ label: t("contacts.livesNearby"), hint: t("contacts.livesNearbyHint"), checked: c.livesNearby });
  const language = selectField({ label: t("contacts.language"), value: c.language, options: LANGUAGES.map((l) => ({ value: l, label: languageNames[l] })) });

  function save() {
    const result = upsertContact(contacts, {
      id: existing ? existing.id : null,
      name: name.value, relation: relation.value, phone: phone.value,
      primary: primary.checked, role: role.value, livesNearby: livesNearby.checked, language: language.value
    });

    name.setError(result.errors.name ? t(result.errors.name) : "");
    phone.setError(result.errors.phone ? t(result.errors.phone) : "");
    if (result.errors.list) toast(t(result.errors.list), 4000);
    if (!result.ok) { focusFirstError(container); return; }

    saveContacts(result.list);
    // Read back: only say "Saved" if the phone really stored it.
    if ((storage.get("gh_contacts", []) || []).length !== result.list.length) {
      toast(t("common.saveFailed"), 5000);
      return;
    }
    toast(t("common.saved"));
    backToList();
  }

  function remove() {
    if (!window.confirm(t("contacts.deleteConfirm", { name: existing.name }))) return;
    saveContacts(removeContact(contacts, existing.id));
    backToList();
  }

  container.append(
    el("div", { class: "stack" },
      header({ title: t("contacts.editTitle"), onBack: backToList }),
      el("div", { class: "panel panel-warn small", text: t("contacts.demoRule") }),
      name.node, relation.node, phone.node, primary.node, role.node, livesNearby.node, language.node,
      button({ label: t("common.save"), variant: "primary", onclick: save }),
      existing && button({ label: t("common.delete"), variant: "danger", onclick: remove })
    )
  );
}
