import { useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Info, Sparkles } from "lucide-react";
import type { FixItem } from "@/lib/opsBrief";

export function Stat({
  label,
  value,
  hint,
  tone = "default",
  onClick,
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad";
  onClick?: () => void;
}) {
  const toneCls =
    tone === "good"
      ? "text-primary"
      : tone === "warn"
        ? "text-accent-foreground"
        : tone === "bad"
          ? "text-destructive"
          : "text-foreground";
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={
        "rounded-xl border border-border/60 bg-background/60 p-3 text-left transition " +
        (onClick ? "hover:border-primary/50 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" : "")
      }
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={"mt-0.5 text-2xl font-extrabold tabular-nums " + toneCls}>{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </Comp>
  );
}

export function ScoreRing({ score, label }: { score: number; label: string }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-3">
      <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden>
        <circle cx="38" cy="38" r={r} fill="none" stroke="var(--muted)" strokeWidth="8" />
        <circle
          cx="38"
          cy="38"
          r={r}
          fill="none"
          stroke={score >= 80 ? "var(--primary)" : score >= 50 ? "var(--accent)" : "var(--destructive)"}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * score) / 100}
          transform="rotate(-90 38 38)"
        />
        <text x="38" y="43" textAnchor="middle" className="fill-foreground text-[16px] font-extrabold">
          {score}
        </text>
      </svg>
      <div>
        <div className="text-sm font-bold">{label}</div>
        <div className="text-[11px] text-muted-foreground">
          {score >= 80 ? "In good shape" : score >= 50 ? "Needs some attention" : "Needs attention now"}
        </div>
      </div>
    </div>
  );
}

export function FixQueue({ items, empty }: { items: FixItem[]; empty: string }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? items : items.slice(0, 6);
  if (!items.length)
    return (
      <p className="flex items-center gap-2 rounded-xl border border-border/60 p-3 text-sm text-muted-foreground">
        <CheckCircle2 size={15} className="text-primary" /> {empty}
      </p>
    );
  return (
    <div>
      <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60">
        {shown.map((i) => (
          <li key={i.key} className="flex items-center gap-3 px-3 py-2">
            {i.severity === "critical" ? (
              <AlertTriangle size={15} className="shrink-0 text-destructive" />
            ) : i.severity === "warn" ? (
              <AlertTriangle size={15} className="shrink-0 text-accent-foreground" />
            ) : (
              <Info size={15} className="shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{i.title}</div>
              <div className="truncate text-[11px] text-muted-foreground">
                {i.reason}
                {i.sub ? " · " + i.sub : ""}
              </div>
            </div>
            <a
              href={i.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary"
            >
              Open <ExternalLink size={10} />
            </a>
          </li>
        ))}
      </ul>
      {items.length > 6 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-2 text-xs font-semibold text-primary hover:underline"
        >
          {showAll ? "Show fewer" : "Show all " + items.length}
        </button>
      )}
    </div>
  );
}

export function BriefShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="card-glass space-y-4 rounded-2xl border border-border/70 p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <Sparkles size={14} className="text-primary" /> {title}
      </h2>
      {children}
    </section>
  );
}
