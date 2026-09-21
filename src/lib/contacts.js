// contacts.js — F4 Emergency Contacts: list rules (pure logic, unit-tested).
// The screen that edits them is js/screens/contacts.js.
//
// Rules from the PRD: at most 5 contacts; every phone passes validatePhone(); exactly ONE
// contact is primary (alerted first) whenever the list is not empty.
//
// Demo rule (C2): contacts are teammates or friends who agreed to get test messages.

import * as storage from "./storage.js";
import { validatePhone, LANGUAGES } from "./settings.js";

export const CONTACTS_KEY = "gh_contacts";
export const MAX_CONTACTS = 5;
export const ROLES = ["family", "doctor"];

/** Next free id: "c1", "c2", ... */
export function newContactId(list) {
  let n = 1;
  while (list.some((c) => c.id === "c" + n)) n++;
  return "c" + n;
}

/**
 * Make sure exactly one contact is primary.
 * `preferredId` wins if given (the contact the user just marked as primary);
 * otherwise keep the current primary; otherwise the first contact becomes primary.
 */
export function enforceOnePrimary(list, preferredId = null) {
  if (list.length === 0) return [];
  let primaryId = null;
  if (preferredId && list.some((c) => c.id === preferredId)) primaryId = preferredId;
  if (!primaryId) primaryId = (list.find((c) => c.primary) || list[0]).id;
  return list.map((c) => ({ ...c, primary: c.id === primaryId }));
}

/**
 * Add a new contact (no id) or update an existing one (has id).
 * Returns { ok, list, errors } — errors maps a field name to an i18n error key.
 */
export function upsertContact(list, raw) {
  const errors = {};
  const name = String(raw.name ?? "").trim();
  if (name === "") errors.name = "error.nameRequired";

  const phone = validatePhone(String(raw.phone ?? ""));
  if (!phone.ok) errors.phone = "error." + phone.error;

  const isNew = !raw.id || !list.some((c) => c.id === raw.id);
  if (isNew && list.length >= MAX_CONTACTS) errors.list = "error.maxContacts";

  if (Object.keys(errors).length > 0) return { ok: false, list, errors };

  const contact = {
    id: isNew ? newContactId(list) : raw.id,
    name,
    relation: String(raw.relation ?? "").trim(),
    phone: phone.value,
    primary: raw.primary === true,
    role: ROLES.includes(raw.role) ? raw.role : "family",
    livesNearby: raw.livesNearby === true,
    language: LANGUAGES.includes(raw.language) ? raw.language : "en"
  };

  const next = isNew ? [...list, contact] : list.map((c) => (c.id === contact.id ? contact : c));
  return { ok: true, list: enforceOnePrimary(next, contact.primary ? contact.id : null), errors };
}

export function removeContact(list, id) {
  return enforceOnePrimary(list.filter((c) => c.id !== id));
}

export function getPrimary(list) {
  return list.find((c) => c.primary) || null;
}

/** Read contacts, dropping any broken record (for example a hand-edited emergency number). */
export function getContacts() {
  const saved = storage.get(CONTACTS_KEY, []);
  if (!Array.isArray(saved)) return [];
  const good = saved.filter((c) => c && c.id && c.name && validatePhone(String(c.phone || "")).ok);
  return enforceOnePrimary(good.slice(0, MAX_CONTACTS));
}

export function saveContacts(list) {
  return storage.set(CONTACTS_KEY, list);
}
