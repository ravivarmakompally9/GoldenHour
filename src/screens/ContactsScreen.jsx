// S5 Emergency contacts — F4. Up to 5 people alerted during a HIGH ALERT; exactly one is primary.
//   #/contacts          the list
//   #/contacts/new      add a contact
//   #/contacts/<id>     edit a contact
// The list rules (max 5, one primary, phone validation) live in src/lib/contacts.js (unit-tested).

import { useEffect, useState } from "react";
import { useAppState } from "../state/AppState.jsx";
import { LANGUAGES } from "../lib/settings.js";
import { getContacts, saveContacts, upsertContact, removeContact, MAX_CONTACTS, ROLES } from "../lib/contacts.js";
import * as storage from "../lib/storage.js";
import { navigate } from "../hooks/useHashRoute.js";
import { Header, Button, TextField, SelectField, ChoiceField, ToggleField, focusFirstError } from "../components/ui.jsx";

export default function ContactsScreen({ params }) {
  return params[0] ? <ContactForm which={params[0]} /> : <ContactList />;
}

// ---------- List ----------

function ContactList() {
  const { t } = useAppState();
  const contacts = getContacts();
  const full = contacts.length >= MAX_CONTACTS;

  return (
    <div className="stack">
      <Header title={t("contacts.title")} onBack={() => navigate("home")} />
      <p>{t("contacts.intro")}</p>
      <div className="panel panel-warn small">{t("contacts.demoRule")}</div>

      {contacts.length === 0 ? (
        <p className="muted">{t("contacts.empty")}</p>
      ) : (
        <ul className="list">
          {contacts.map((c) => (
            <li key={c.id}>
              <button className="row-btn" type="button" onClick={() => navigate("contacts", [c.id])}>
                <span className="row-main">
                  <strong>{c.relation ? c.name + " (" + c.relation + ")" : c.name}</strong>
                  <span className="muted">{c.phone}</span>
                </span>
                {c.primary && <span className="badge">{t("contacts.primaryBadge")}</span>}
                <span className="row-go" aria-hidden="true">›</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {full && <p className="muted">{t("error.maxContacts")}</p>}
      <Button label={t("contacts.add")} variant="primary" disabled={full} onClick={() => navigate("contacts", ["new"])} />
    </div>
  );
}

// ---------- Add / edit form ----------

function ContactForm({ which }) {
  const { settings, t, toast } = useAppState();
  const [contacts] = useState(() => getContacts());
  const existing = contacts.find((c) => c.id === which) || null;
  const unknownId = which !== "new" && !existing;   // e.g. an old link after "Reset all data"
  const backToList = () => navigate("contacts");

  useEffect(() => { if (unknownId) backToList(); }, [unknownId]);

  const [form, setForm] = useState(() => existing || {
    name: "", relation: "", phone: "",
    primary: contacts.length === 0,   // the first contact is primary by default
    role: "family", livesNearby: false, language: settings.language
  });
  const [errors, setErrors] = useState({});
  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));

  if (unknownId) return null;

  const languageNames = { en: t("language.en"), hi: t("language.hi"), te: t("language.te") };
  const roleNames = { family: t("contacts.role.family"), doctor: t("contacts.role.doctor") };

  function save() {
    const result = upsertContact(contacts, { ...form, id: existing ? existing.id : null });
    setErrors({
      name: result.errors.name ? t(result.errors.name) : "",
      phone: result.errors.phone ? t(result.errors.phone) : ""
    });
    if (result.errors.list) toast(t(result.errors.list), 4000);
    if (!result.ok) { focusFirstError(); return; }

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

  return (
    <div className="stack">
      <Header title={t("contacts.editTitle")} onBack={backToList} />
      <div className="panel panel-warn small">{t("contacts.demoRule")}</div>

      <TextField label={t("contacts.name")} value={form.name} onChange={set("name")} error={errors.name} />
      <TextField label={t("contacts.relation")} value={form.relation} onChange={set("relation")} />
      <TextField
        label={t("contacts.phone")} value={form.phone} onChange={set("phone")} error={errors.phone}
        type="tel" inputMode="tel" placeholder={t("settings.phonePlaceholder")}
      />
      <ToggleField label={t("contacts.primary")} hint={t("contacts.primaryHint")} checked={form.primary} onChange={set("primary")} />
      <ChoiceField label={t("contacts.role")} value={form.role} onChange={set("role")} options={ROLES.map((r) => ({ value: r, label: roleNames[r] }))} />
      <ToggleField label={t("contacts.livesNearby")} hint={t("contacts.livesNearbyHint")} checked={form.livesNearby} onChange={set("livesNearby")} />
      <SelectField label={t("contacts.language")} value={form.language} onChange={set("language")} options={LANGUAGES.map((l) => ({ value: l, label: languageNames[l] }))} />

      <Button label={t("common.save")} variant="primary" onClick={save} />
      {existing && <Button label={t("common.delete")} variant="danger" onClick={remove} />}
    </div>
  );
}
