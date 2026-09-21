// profile.js — F3 Medical Profile: data shape and validation (pure logic, unit-tested).
// The screen that edits it is js/screens/profile.js.
//
// Hackathon rule (C3): demos and tests use fictional data only, e.g. "Lakshmi, 68".

import * as storage from "./storage.js";

export const PROFILE_KEY = "gh_profile";

export const SEXES = ["F", "M", "O"];
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"];
export const YES_NO_UNKNOWN = ["yes", "no", "unknown"];

export const DEFAULT_PROFILE = {
  name: "",
  age: null,
  sex: "",
  bloodGroup: "unknown",
  diabetic: "unknown",
  bpMedicine: "unknown",
  bloodThinners: "unknown",
  bloodThinnerName: "",
  allergies: "",
  otherConditions: "",
  consent: false // PRD Section 18: "The person being protected agrees to this setup."
};

const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);
const text = (value) => String(value ?? "").trim();

/**
 * Clean up a profile typed into the form and check it.
 * Only the name (and the consent tick) are required; everything else is optional (PRD S4).
 * Returns { ok, value, errors } where errors maps a field name to an i18n error key.
 */
export function validateProfile(raw) {
  const input = raw && typeof raw === "object" ? raw : {};
  const errors = {};

  const value = {
    name: text(input.name),
    age: null,
    sex: pick(input.sex, SEXES, ""),
    bloodGroup: pick(input.bloodGroup, BLOOD_GROUPS, "unknown"),
    diabetic: pick(input.diabetic, YES_NO_UNKNOWN, "unknown"),
    bpMedicine: pick(input.bpMedicine, YES_NO_UNKNOWN, "unknown"),
    bloodThinners: pick(input.bloodThinners, YES_NO_UNKNOWN, "unknown"),
    bloodThinnerName: text(input.bloodThinnerName),
    allergies: text(input.allergies),
    otherConditions: text(input.otherConditions),
    consent: input.consent === true
  };

  if (value.name === "") errors.name = "error.nameRequired";

  // Age is optional, but if something was typed it must be a sensible whole number.
  const ageText = text(input.age);
  if (ageText !== "") {
    const age = Number(ageText);
    if (Number.isInteger(age) && age >= 0 && age <= 120) value.age = age;
    else errors.age = "error.ageInvalid";
  }

  // The medicine name only makes sense when blood thinners = yes.
  if (value.bloodThinners !== "yes") value.bloodThinnerName = "";

  if (!value.consent) errors.consent = "error.consentRequired";

  return { ok: Object.keys(errors).length === 0, value, errors };
}

export function getProfile() {
  return { ...DEFAULT_PROFILE, ...(storage.get(PROFILE_KEY, null) || {}) };
}

export function saveProfile(profile) {
  return storage.set(PROFILE_KEY, profile);
}

/** Used by the Home checklist. */
export function isProfileDone(profile) {
  return Boolean(profile && profile.name && profile.consent);
}
