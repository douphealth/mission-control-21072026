import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export const nf = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
export const pf = (v: number) => `${(v * 100).toFixed(1)}%`;

export function Delta({ pct, invert = false }: { pct: number | null; invert?: boolean }) {
  if (pct === null || !Number.isFinite(pct)) return <span className="text-[11px] text-muted-foreground">new</span>;
  const good = invert ? pct < 0 : pct > 0;
  const flat = Math.abs(pct) < 0.5;
  const Icon = flat ? Minus : pct > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${flat ? "bg-muted text-muted-foreground" : good ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
      <Icon size={12} />{Math.abs(pct).toFixed(Math.abs(pct) < 10 ? 1 : 0)}%
    </span>
  );
}

export function Kpi({ label, value, delta, hint, accent = "primary" }: { label: string; value: string; delta?: ReactNode; hint?: string; accent?: "primary" | "info" | "warning" | "success" }) {
  const bar = { primary: "bg-primary", info: "bg-info", warning: "bg-warning", success: "bg-success" }[accent];
  return (
    <div className="card-glass relative min-w-0 overflow-hidden p-4">
      <span className={`absolute inset-x-0 top-0 h-0.5 ${bar} opacity-70`} />
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="truncate text-2xl font-extrabold tracking-tight tabular-nums">{value}</div>
        {delta}
      </div>
      {hint && <div className="mt-1 truncate text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
      {options.map((o) => (
        <button key={String(o.value)} type="button" onClick={() => onChange(o.value)}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${o.value === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Spark({ values, className = "text-primary" }: { values: number[]; className?: string }) {
  if (values.length < 2) return <div className="h-8" />;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${30 - ((v - min) / span) * 28}`).join(" ");
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className={`h-8 w-full ${className}`}>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export const chartTooltip = {
  contentStyle: { background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12, color: "hsl(var(--popover-foreground))" },
  labelStyle: { color: "hsl(var(--muted-foreground))" },
};
