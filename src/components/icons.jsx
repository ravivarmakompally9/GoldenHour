// Inline SVG icons (own artwork, simple strokes). No icon library and no network: they ship inside
// the bundle, so they work offline. All icons are decorative: the text next to them carries the
// meaning, so they are hidden from screen readers.

function Svg({ children }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export const IconBack = () => <Svg><path d="M15 5l-7 7 7 7" /></Svg>;
export const IconChevron = () => <Svg><path d="M9 5l7 7-7 7" /></Svg>;
export const IconSettings = () => (
  <Svg>
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10M4 12h4M12 12h8" />
    <circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /><circle cx="10" cy="12" r="2" />
  </Svg>
);
export const IconPulse = () => <Svg><path d="M3 12h4l2.5-6 4 12 2.5-6H21" /></Svg>;
export const IconAlert = () => <Svg><path d="M12 3l9.5 16.5h-19z" /><path d="M12 10v4M12 17.2v.3" /></Svg>;
export const IconPhone = () => (
  <Svg><path d="M6 3h3l1.5 5-2 1.5a12 12 0 0 0 6 6l1.5-2 5 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z" /></Svg>
);
export const IconUser = () => <Svg><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Svg>;
export const IconUsers = () => (
  <Svg><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></Svg>
);
export const IconWave = () => <Svg><path d="M3 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0" /></Svg>;
export const IconShield = () => <Svg><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2.2 2.2L15.5 10" /></Svg>;
export const IconDownload = () => <Svg><path d="M12 4v11M7 11l5 5 5-5M5 20h14" /></Svg>;
export const IconPlus = () => <Svg><path d="M12 5v14M5 12h14" /></Svg>;
export const IconCheck = () => <Svg><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>;
export const IconTrash = () => <Svg><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></Svg>;
export const IconLock = () => <Svg><rect x="5" y="11" width="14" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Svg>;
export const IconPin = () => <Svg><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></Svg>;
export const IconInfo = () => <Svg><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.3" /></Svg>;

/** The heartbeat line that draws itself inside the EMERGENCY CHECK hero. */
export function PulseLine() {
  return (
    <svg className="pulse-line" viewBox="0 0 260 28" aria-hidden="true" focusable="false">
      <path d="M2 14h70l10-10 14 20 12-16 8 6h60l10-10 14 20 12-16 8 6h38" />
    </svg>
  );
}
