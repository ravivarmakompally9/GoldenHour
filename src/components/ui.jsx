// Shared UI building blocks (PRD Section 9 global UI rules). Plain CSS classes from
// src/css/styles.css + tokens.css; no UI kit.
//
// React escapes all text it renders, so names, allergies and contact details typed by the user
// can never run as HTML.

import { useId } from "react";
import { useAppState } from "../state/AppState.jsx";
import { isDemoReady } from "../lib/settings.js";
import { IconAlert, IconBack, IconLock } from "./icons.jsx";

// ---------- Background + glass ----------

/** The golden-hour backdrop: soft colour orbs drifting slowly behind every screen. */
export function Backdrop() {
  return (
    <div className="bg" aria-hidden="true">
      <span className="orb orb-1" /><span className="orb orb-2" /><span className="orb orb-3" /><span className="orb orb-4" />
    </div>
  );
}

/** A frosted-glass card. Use a FEW per screen: each one is a real backdrop blur (GPU cost). */
export function Card({ title, icon, children, className = "" }) {
  return (
    <section className={"glass card " + className}>
      {title && <h2 className="card-title">{icon}{title}</h2>}
      {children}
    </section>
  );
}

// ---------- Demo banner (every screen) ----------

/** Yellow banner. Demo Mode is locked on in Part 1, so it is ALWAYS shown. */
export function DemoBanner() {
  const { settings, t } = useAppState();
  const text = isDemoReady(settings)
    ? t("banner.demo", { name: settings.demoEmergencyName })
    : t("banner.demoNotSet");
  return <div className="demo-banner" role="status">{text}</div>;
}

// ---------- Headers and buttons ----------

export function Header({ title, onBack, right }) {
  const { t } = useAppState();
  return (
    <header className="screen-header">
      {onBack && (
        <button className="icon-btn glass" type="button" aria-label={t("common.back")} onClick={onBack}><IconBack /></button>
      )}
      <h1>{title}</h1>
      {right}
    </header>
  );
}

/** Full-width pill button. variant: "primary" | "danger" | "quiet"; size: "huge" | "tall". */
export function Button({ label, sub, icon, top, variant = "", size = "", className = "", onClick, disabled = false }) {
  const classes = ["btn", variant && "btn-" + variant, size && "btn-" + size, className].filter(Boolean).join(" ");
  return (
    <button className={classes} type="button" onClick={onClick} disabled={disabled}>
      {top}
      <span className="btn-row">{icon}{label}</span>
      {sub && <small>{sub}</small>}
    </button>
  );
}

/**
 * The red EMERGENCY NOW button (PRD: on Home and on every screen of the check).
 * It lives here so every workstream uses the same one.
 */
export function EmergencyNowButton({ onClick }) {
  const { t } = useAppState();
  return <Button label={t("home.emergencyNow")} icon={<IconAlert />} variant="danger" size="tall" onClick={onClick} />;
}

// ---------- Form fields (all controlled: value + onChange) ----------

function FieldError({ message }) {
  return <span className="field-error" role="alert">{message || ""}</span>;
}

export function TextField({ label, value, onChange, error, hint, type = "text", inputMode, placeholder, multiline = false, hidden = false }) {
  const id = useId();
  const shared = {
    id, value: value ?? "", placeholder, autoComplete: "off",
    "aria-invalid": error ? true : undefined,
    onChange: (event) => onChange(event.target.value)
  };
  return (
    <div className={"field" + (error ? " has-error" : "")} hidden={hidden}>
      <label className="field-label" htmlFor={id}>{label}</label>
      {multiline ? <textarea rows={2} {...shared} /> : <input type={type} inputMode={inputMode} {...shared} />}
      {hint && <span className="field-hint">{hint}</span>}
      <FieldError message={error} />
    </div>
  );
}

export function SelectField({ label, value, onChange, options, hint }) {
  const id = useId();
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

/** Big radio "pills", e.g. Yes / No / Unknown. Easier to hit than a dropdown when stressed. */
export function ChoiceField({ label, value, onChange, options }) {
  const name = useId();
  return (
    <fieldset className="field choice-group">
      <legend className="field-label">{label}</legend>
      <div className="choices">
        {options.map((o) => (
          <label className="choice" key={o.value}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** A switch (a real checkbox underneath). The state is also written as a word: ON / OFF. */
export function ToggleField({ label, hint, checked, onChange, disabled = false, locked = false, error }) {
  const { t } = useAppState();
  return (
    <div className="field">
      <label className={"toggle" + (locked ? " is-locked" : "")}>
        <span className="toggle-text">
          <strong>{label}</strong>
          {hint && <span className="field-hint">{hint}</span>}
        </span>
        <span className="toggle-state">{locked && <IconLock />}{checked ? t("common.on") : t("common.off")}</span>
        <input type="checkbox" role="switch" checked={checked} disabled={disabled || locked} onChange={(event) => onChange && onChange(event.target.checked)} />
      </label>
      <FieldError message={error} />
    </div>
  );
}

// ---------- Small pieces ----------

/** A status WORD with a colour class. Never colour alone (PRD Section 9). */
export function StatusWord({ text, done }) {
  return <span className={"status " + (done ? "status-ok" : "status-todo")}>{text}</span>;
}

export function Toast() {
  const { toastMessage } = useAppState();
  if (!toastMessage) return null;
  return <div className="toast" role="status">{toastMessage}</div>;
}

/** Scroll to and focus the first field that shows an error, so the helper sees what to fix. */
export function focusFirstError() {
  // Wait one frame so React has drawn the error messages first.
  requestAnimationFrame(() => {
    const bad = document.querySelector(".has-error input, .has-error select, .has-error textarea, .field-error:not(:empty)");
    if (!bad) return;
    if (typeof bad.focus === "function") bad.focus();
    bad.scrollIntoView({ block: "center" });
  });
}
