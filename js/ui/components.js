// components.js — shared UI building blocks (PRD Section 9 global UI rules).
//
// Screens build their DOM with el() instead of innerHTML. Why: names, allergies and contact
// details are typed by the user; createElement + textContent can never run them as HTML.

import { t } from "../i18n.js";
import { isDemoReady } from "../settings.js";

/**
 * Tiny DOM helper: el("button", { class: "btn", onclick: fn }, "Save")
 * attrs: `class`, `text`, on<event> functions; everything else becomes an attribute.
 * A value of false/null/undefined skips the attribute (handy for `disabled`, `checked`).
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    if (name === "class") node.className = value;
    else if (name === "text") node.textContent = value;
    else if (name.startsWith("on") && typeof value === "function") node.addEventListener(name.slice(2), value);
    else if (value === true) node.setAttribute(name, "");
    else node.setAttribute(name, String(value));
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

// ---------- Demo banner (every screen) ----------

/** Text of the yellow banner. Pure, so it is easy to reason about. */
export function demoBannerText(settings) {
  return isDemoReady(settings)
    ? t("banner.demo", { name: settings.demoEmergencyName })
    : t("banner.demoNotSet");
}

export function renderDemoBanner(bannerEl, settings) {
  // Demo Mode is locked on in Part 1, so the banner is ALWAYS shown.
  bannerEl.textContent = demoBannerText(settings);
}

// ---------- Headers and buttons ----------

/** Screen header: optional back arrow + title (+ optional extra button on the right). */
export function header({ title, onBack = null, right = null }) {
  return el("header", { class: "screen-header" },
    onBack && el("button", { class: "icon-btn", type: "button", "aria-label": t("common.back"), onclick: onBack }, "←"),
    el("h1", { text: title }),
    right
  );
}

/** Full-width button. variant: "primary" | "danger" | "quiet" | "" ; size: "huge" | "tall" | "" */
export function button({ label, sub = "", variant = "", size = "", onclick, disabled = false }) {
  const classes = ["btn", variant && "btn-" + variant, size && "btn-" + size].filter(Boolean).join(" ");
  return el("button", { class: classes, type: "button", onclick, disabled }, label, sub && el("small", { text: sub }));
}

/**
 * The red EMERGENCY NOW button (PRD: visible on Home and on every screen of the check).
 * It lives here so every workstream uses the same one.
 */
export function emergencyNowButton(onclick) {
  return button({ label: t("home.emergencyNow"), variant: "danger", size: "tall", onclick });
}

// ---------- Form fields ----------
// Each helper returns { node, ...accessors } so screens can read values and show errors.

function wrapField(labelText, control, hint) {
  const error = el("span", { class: "field-error", role: "alert" });
  const node = el("label", { class: "field" },
    el("span", { class: "field-label", text: labelText }),
    control,
    hint && el("span", { class: "field-hint", text: hint }),
    error
  );
  const setError = (message) => {
    error.textContent = message || "";
    node.classList.toggle("has-error", Boolean(message));
  };
  return { node, setError };
}

export function textField({ label, value = "", type = "text", hint = "", placeholder = "", inputmode = null, autocomplete = "off", multiline = false }) {
  const input = multiline
    ? el("textarea", { rows: 2, placeholder })
    : el("input", { type, placeholder, inputmode, autocomplete });
  input.value = value ?? "";
  const { node, setError } = wrapField(label, input, hint);
  return { node, input, setError, get value() { return input.value; } };
}

export function selectField({ label, value, options, hint = "" }) {
  const select = el("select", {}, options.map((o) => el("option", { value: o.value, text: o.label })));
  select.value = value;
  const { node, setError } = wrapField(label, select, hint);
  return { node, input: select, setError, get value() { return select.value; } };
}

let choiceGroupCount = 0;

/** Big radio "pills", e.g. Yes / No / Unknown. Easier to hit than a dropdown when stressed. */
export function choiceField({ label, value, options, onchange = null }) {
  const groupName = "choice-" + ++choiceGroupCount;
  const inputs = [];
  const pills = options.map((o) => {
    const input = el("input", { type: "radio", name: groupName, value: o.value, checked: o.value === value });
    if (onchange) input.addEventListener("change", () => onchange(o.value));
    inputs.push(input);
    return el("label", { class: "choice" }, input, el("span", { text: o.label }));
  });
  const node = el("fieldset", { class: "field", style: "border:0;padding:0;margin:0" },
    el("legend", { class: "field-label", text: label }),
    el("div", { class: "choices" }, pills)
  );
  return { node, get value() { return (inputs.find((i) => i.checked) || {}).value ?? ""; } };
}

export function toggleField({ label, hint = "", checked = false, disabled = false, onchange = null }) {
  const input = el("input", { type: "checkbox", checked, disabled });
  if (onchange) input.addEventListener("change", () => onchange(input.checked));
  const error = el("span", { class: "field-error", role: "alert" });
  const node = el("div", { class: "field" },
    el("label", { class: "toggle" },
      el("span", { class: "toggle-text" }, el("strong", { text: label }), hint && el("span", { class: "field-hint", text: hint })),
      input
    ),
    error
  );
  const setError = (message) => { error.textContent = message || ""; };
  return { node, input, setError, get checked() { return input.checked; } };
}

// ---------- Small helpers ----------

/** A status WORD with a colour class. Never colour alone (PRD Section 9). */
export function statusWord(text, done) {
  return el("span", { class: "status " + (done ? "status-ok" : "status-todo"), text });
}

let toastTimer = null;

/** Short message at the bottom of the screen ("Saved"). */
export function toast(message, ms = 2500) {
  document.querySelectorAll(".toast").forEach((n) => n.remove());
  clearTimeout(toastTimer);
  const node = el("div", { class: "toast", role: "status", text: message });
  document.body.append(node);
  toastTimer = setTimeout(() => node.remove(), ms);
}

/** Scroll to and focus the first field that shows an error, so the helper sees what to fix. */
export function focusFirstError(container) {
  const bad = container.querySelector(".has-error input, .has-error select, .has-error textarea");
  if (bad) { bad.focus(); bad.scrollIntoView({ block: "center" }); }
}
