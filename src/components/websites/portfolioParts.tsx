// Small presentational pieces shared by the property cards and WordPress fleet cards.
import { useEffect, useState, type ReactNode } from "react";
import { Copy, Eye, EyeOff, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/components/websites/portfolioConfig";

export function Chip({
  tone = "muted",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn("pf-chip", `pf-chip--${tone}`, className)}>{children}</span>;
}

/** Circular score. A null value renders as "—" and is never drawn as zero. */
export function ScoreRing({
  value,
  label,
  size = "sm",
}: {
  value: number | null;
  label?: string;
  size?: "sm" | "lg";
}) {
  const dimension = size === "lg" ? 76 : 56;
  const stroke = size === "lg" ? 6 : 5;
  const radius = (dimension - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const hasValue = value !== null;
  const clamped = hasValue ? Math.max(0, Math.min(100, value)) : 0;
  const offset = circumference * (1 - clamped / 100);
  const tone = !hasValue
    ? "pf-ring-value--none"
    : clamped >= 80
      ? ""
      : clamped >= 50
        ? "pf-ring-value--warn"
        : "pf-ring-value--bad";

  return (
    <div
      className={cn("pf-ring-wrap", size === "lg" && "pf-ring-wrap--lg")}
      role="img"
      aria-label={`${label ?? "Score"}: ${hasValue ? `${clamped} of 100` : "needs evidence"}`}
    >
      <svg width={dimension} height={dimension} viewBox={`0 0 ${dimension} ${dimension}`}>
        <circle
          className="pf-ring-track"
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className={cn("pf-ring-value", tone)}
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={hasValue ? offset : circumference}
        />
      </svg>
      <div className="pf-ring-label">{hasValue ? clamped : "—"}</div>
    </div>
  );
}

export function Meter({ percent, warn = false }: { percent: number; warn?: boolean }) {
  const safe = Math.max(0, Math.min(100, percent));
  return (
    <div
      className={cn("pf-meter", warn && "pf-meter--warn")}
      role="meter"
      aria-valuenow={safe}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${safe}%` }} />
    </div>
  );
}

export function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: string;
}) {
  return (
    <div className="pf-mini">
      <div className={cn("pf-mini-v", tone)}>{value}</div>
      <div className="pf-mini-l" title={label}>
        {label}
      </div>
    </div>
  );
}

/**
 * Stored credential row. Secrets stay masked; the eye reveals them for 10 seconds,
 * and copy is always one click away.
 */
export function SecretRow({
  label,
  value,
  secret = false,
  onCopy,
}: {
  label: string;
  value: string;
  secret?: boolean;
  onCopy: () => void;
}) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!revealed) return;
    const timer = window.setTimeout(() => setRevealed(false), 10_000);
    return () => window.clearTimeout(timer);
  }, [revealed]);

  return (
    <div className="pf-secret">
      <b>{label}</b>
      <span className="pf-secret-value">{secret && !revealed ? "••••••••••" : value}</span>
      <span className="flex shrink-0 items-center gap-0.5">
        {secret && (
          <button
            type="button"
            className="pf-icon-btn"
            onClick={() => setRevealed((current) => !current)}
            aria-label={revealed ? `Hide ${label}` : `Reveal ${label} for 10 seconds`}
            title={revealed ? "Hide" : "Reveal for 10 seconds"}
          >
            {revealed ? <EyeOff size={12} aria-hidden /> : <Eye size={12} aria-hidden />}
          </button>
        )}
        <button
          type="button"
          className="pf-icon-btn"
          onClick={onCopy}
          aria-label={`Copy ${label}`}
          title={`Copy ${label.toLowerCase()}`}
        >
          <Copy size={12} aria-hidden />
        </button>
      </span>
    </div>
  );
}

export function AccessHint() {
  return (
    <span className="pf-note inline-flex items-center gap-1">
      <KeyRound size={11} aria-hidden /> Stored in this browser only
    </span>
  );
}
