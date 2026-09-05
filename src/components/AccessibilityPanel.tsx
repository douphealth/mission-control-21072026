import {
  Accessibility,
  Contrast,
  Type,
  Zap,
  MousePointerClick,
  Link2,
  RotateCcw,
} from "lucide-react";
import { useA11yStore, type MotionPref } from "@/stores/a11yStore";

function Row({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-border/60 last:border-0">
      <div className="flex items-start gap-3 min-w-0">
        <span className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
          <Icon size={16} className="text-primary" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-14 h-8 min-h-11 min-w-11 rounded-full transition-colors ${checked ? "bg-primary" : "bg-secondary"}`}
    >
      <span
        className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-background shadow transition-transform ${checked ? "translate-x-6" : ""}`}
      />
    </button>
  );
}

const SCALES = [
  { v: 1, label: "100%" },
  { v: 1.125, label: "112%" },
  { v: 1.25, label: "125%" },
  { v: 1.4, label: "140%" },
];

const MOTIONS: { v: MotionPref; label: string }[] = [
  { v: "system", label: "System" },
  { v: "reduced", label: "Reduced" },
  { v: "full", label: "Full" },
];

export default function AccessibilityPanel() {
  const a11y = useA11yStore();

  return (
    <div className="space-y-4">
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Accessibility size={18} className="text-primary" /> Accessibility &amp; inclusivity
          </h2>
          <button
            onClick={a11y.reset}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            <RotateCcw size={13} /> Reset
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          These preferences apply to every page and are saved on this device.
        </p>

        <Row
          icon={Contrast}
          title="High contrast mode"
          hint="Stronger borders, deeper text contrast, less transparency."
        >
          <Toggle
            checked={a11y.highContrast}
            onChange={(v) => a11y.set({ highContrast: v })}
            label="High contrast mode"
          />
        </Row>

        <Row icon={Type} title="Text size" hint="Scales the whole interface, not just body copy.">
          <div className="flex gap-1.5 flex-wrap">
            {SCALES.map((s) => (
              <button
                key={s.v}
                onClick={() => a11y.set({ fontScale: s.v })}
                aria-pressed={a11y.fontScale === s.v}
                className={`px-3 py-2 min-h-11 rounded-xl text-xs font-semibold transition-colors ${
                  a11y.fontScale === s.v
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </Row>

        <Row
          icon={Zap}
          title="Motion"
          hint="Reduce animations and transitions for vestibular comfort."
        >
          <div className="flex gap-1.5 flex-wrap">
            {MOTIONS.map((m) => (
              <button
                key={m.v}
                onClick={() => a11y.set({ motion: m.v })}
                aria-pressed={a11y.motion === m.v}
                className={`px-3 py-2 min-h-11 rounded-xl text-xs font-semibold transition-colors ${
                  a11y.motion === m.v
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </Row>

        <Row
          icon={MousePointerClick}
          title="Always show focus outlines"
          hint="Keyboard-friendly navigation — visible rings on mouse and keyboard alike."
        >
          <Toggle
            checked={a11y.alwaysShowFocus}
            onChange={(v) => a11y.set({ alwaysShowFocus: v })}
            label="Always show focus outlines"
          />
        </Row>

        <Row
          icon={Link2}
          title="Underline links"
          hint="Never rely on colour alone to identify a link."
        >
          <Toggle
            checked={a11y.underlineLinks}
            onChange={(v) => a11y.set({ underlineLinks: v })}
            label="Underline links"
          />
        </Row>
      </div>

      <div className="card-elevated p-6">
        <h3 className="font-semibold text-sm mb-2">Keyboard shortcuts</h3>
        <ul className="text-xs text-muted-foreground space-y-1.5">
          <li>
            <kbd className="px-1.5 py-0.5 rounded bg-secondary text-foreground">Tab</kbd> — move
            focus. A “Skip to content” link appears first on every page.
          </li>
          <li>
            <kbd className="px-1.5 py-0.5 rounded bg-secondary text-foreground">Ctrl/⌘ + K</kbd> —
            command palette, jump to any section.
          </li>
          <li>
            <kbd className="px-1.5 py-0.5 rounded bg-secondary text-foreground">Esc</kbd> — close
            any dialog or menu.
          </li>
        </ul>
      </div>
    </div>
  );
}
