import { test } from "node:test";
import assert from "node:assert/strict";
import { sampleMobile, useFakeStorage } from "./helpers.js";
import { validateProfile, getProfile, saveProfile, isProfileDone, DEFAULT_PROFILE } from "../src/lib/profile.js";
import {
  upsertContact, removeContact, enforceOnePrimary, getPrimary, getContacts, saveContacts, MAX_CONTACTS
} from "../src/lib/contacts.js";

// Fictional demo data only (PRD constraint C3).
const lakshmi = {
  name: " Lakshmi ", age: "68", sex: "F", bloodGroup: "B+", diabetic: "yes", bpMedicine: "yes",
  bloodThinners: "no", bloodThinnerName: "should be dropped", allergies: "none", consent: true
};

test("a complete fictional profile is valid and cleaned up", () => {
  const r = validateProfile(lakshmi);
  assert.equal(r.ok, true);
  assert.equal(r.value.name, "Lakshmi");
  assert.equal(r.value.age, 68);
  assert.equal(r.value.bloodThinnerName, "", "medicine name is kept only when blood thinners = yes");
  assert.equal(isProfileDone(r.value), true);
});

test("only name and consent are required", () => {
  assert.equal(validateProfile({ name: "Lakshmi", consent: true }).ok, true);
  assert.deepEqual(validateProfile({ consent: true }).errors, { name: "error.nameRequired" });
  assert.deepEqual(validateProfile({ name: "Lakshmi" }).errors, { consent: "error.consentRequired" });
});

test("bad age is rejected; unknown choices fall back to safe defaults", () => {
  assert.equal(validateProfile({ name: "L", consent: true, age: "abc" }).errors.age, "error.ageInvalid");
  assert.equal(validateProfile({ name: "L", consent: true, age: "130" }).errors.age, "error.ageInvalid");
  const r = validateProfile({ name: "L", consent: true, diabetic: "maybe", bloodGroup: "Z", sex: "?" });
  assert.equal(r.value.diabetic, "unknown");
  assert.equal(r.value.bloodGroup, "unknown");
  assert.equal(r.value.sex, "");
});

test("profile saves and reloads (survives an app restart)", () => {
  useFakeStorage();
  assert.deepEqual(getProfile(), DEFAULT_PROFILE);
  saveProfile(validateProfile(lakshmi).value);
  assert.equal(getProfile().name, "Lakshmi");
  assert.equal(getProfile().diabetic, "yes");
});

// ---------- contacts ----------

const ravi = () => ({ name: "Ravi", relation: "son", phone: sampleMobile("9"), primary: false, role: "family", livesNearby: false, language: "en" });

test("the first contact becomes primary automatically", () => {
  const r = upsertContact([], ravi());
  assert.equal(r.ok, true);
  assert.equal(r.list.length, 1);
  assert.equal(r.list[0].id, "c1");
  assert.equal(r.list[0].primary, true);
  assert.equal(r.list[0].phone, "+91" + sampleMobile("9"));
});

test("exactly one contact is primary at all times", () => {
  let list = upsertContact([], ravi()).list;
  list = upsertContact(list, { ...ravi(), name: "Teammate B", phone: sampleMobile("8"), primary: true }).list;
  assert.equal(list.filter((c) => c.primary).length, 1);
  assert.equal(getPrimary(list).name, "Teammate B");

  list = removeContact(list, getPrimary(list).id);
  assert.equal(list.length, 1);
  assert.equal(getPrimary(list).name, "Ravi", "a remaining contact is promoted to primary");

  assert.deepEqual(enforceOnePrimary([]), []);
});

test("editing keeps the id and does not add a new contact", () => {
  let list = upsertContact([], ravi()).list;
  const r = upsertContact(list, { ...list[0], relation: "brother" });
  assert.equal(r.ok, true);
  assert.equal(r.list.length, 1);
  assert.equal(r.list[0].id, "c1");
  assert.equal(r.list[0].relation, "brother");
});

test("contacts refuse emergency numbers, missing names and a 6th contact", () => {
  assert.equal(upsertContact([], { ...ravi(), phone: "108" }).errors.phone, "error.phone_emergency_blocked");
  assert.equal(upsertContact([], { ...ravi(), phone: "12345" + "6".repeat(5) }).errors.phone, "error.phone_invalid");
  assert.equal(upsertContact([], { ...ravi(), name: " " }).errors.name, "error.nameRequired");

  let list = [];
  for (let i = 0; i < MAX_CONTACTS; i++) list = upsertContact(list, { ...ravi(), name: "T" + i, phone: sampleMobile("7", String(i)) }).list;
  assert.equal(list.length, MAX_CONTACTS);
  const sixth = upsertContact(list, ravi());
  assert.equal(sixth.ok, false);
  assert.equal(sixth.errors.list, "error.maxContacts");
  assert.equal(sixth.list.length, MAX_CONTACTS);
});

test("contacts save and reload; hand-edited bad records are dropped", () => {
  const fake = useFakeStorage();
  assert.deepEqual(getContacts(), []);
  saveContacts(upsertContact([], ravi()).list);
  assert.equal(getContacts()[0].name, "Ravi");

  fake.setItem("gh_contacts", JSON.stringify([{ id: "c1", name: "Bad", phone: "112", primary: true }, { id: "c2", name: "Good", phone: "+91" + sampleMobile("6") }]));
  const list = getContacts();
  assert.equal(list.length, 1);
  assert.equal(list[0].name, "Good");
  assert.equal(list[0].primary, true);

  fake.setItem("gh_contacts", JSON.stringify({ not: "an array" }));
  assert.deepEqual(getContacts(), []);
});
