import { useState, type ReactNode } from "react";
import { ArrowUpRight, Loader2, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ActivityBand, CiState, PagesHealth } from "@/lib/estate/types";
import type { RepoPriority } from "@/lib/estate/model";
import { cn } from "@/lib/utils";

/* ---------------- Formatting ---------------- */

export function ago(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "never";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "unknown";
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return m + "m ago";
  const h = Math.round(m / 60);
  if (h < 36) return h + "h ago";
  const d = Math.round(h / 24);
  if (d < 45) return d + "d ago";
  const mo = Math.round(d / 30);
  if (mo < 18) return mo + "mo ago";
  return Math.round(d / 365) + "y ago";
}

export const fullDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

/* ---------------- Pills ---------------- */

const TONES = {
  good: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  bad: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  info: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  violet: "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  muted: "border-border/70 bg-muted/40 text-muted-foreground",
} as const;
export type Tone = keyof typeof TONES;

export function Pill({
  tone = "muted",
  children,
  title,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold leading-4",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const Dot = ({ className }: { className?: string }) => (
  <span aria-hidden className={cn("inline-block h-1.5 w-1.5 rounded-full bg-current", className)} />
);

export function CiPill({ state }: { state: CiState }) {
  if (state === "SUCCESS")
    return (
      <Pill tone="good">
        <Dot />
        CI passing
      </Pill>
    );
  if (state === "FAILURE" || state === "ERROR")
    return (
      <Pill tone="bad">
        <Dot />
        CI failing
      </Pill>
    );
  if (state === "PENDING" || state === "EXPECTED")
    return (
      <Pill tone="info">
        <Dot className="animate-pulse" />
        CI running
      </Pill>
    );
  return <Pill tone="muted">No CI</Pill>;
}

const ACTIVITY: Record<ActivityBand, { tone: Tone; label: string }> = {
  hot: { tone: "good", label: "Hot" },
  active: { tone: "info", label: "Active" },
  quiet: { tone: "muted", label: "Quiet" },
  stale: { tone: "warn", label: "Stale" },
  dormant: { tone: "warn", label: "Dormant" },
};
export function ActivityPill({ band }: { band: ActivityBand }) {
  const a = ACTIVITY[band];
  return <Pill tone={a.tone}>{a.label}</Pill>;
}

const PAGES: Record<PagesHealth, { tone: Tone; label: string }> = {
  healthy: { tone: "good", label: "Healthy" },
  failing: { tone: "bad", label: "Failing" },
  building: { tone: "info", label: "Building" },
  unknown: { tone: "muted", label: "No deploys" },
};
export function PagesHealthPill({ health }: { health: PagesHealth }) {
  const p = PAGES[health];
  return (
    <Pill tone={p.tone}>
      <Dot className={health === "building" ? "animate-pulse" : undefined} />
      {p.label}
    </Pill>
  );
}

export function DeployStatusPill({ status, stage }: { status: string; stage?: string }) {
  const tone: Tone =
    status === "success"
      ? "good"
      : status === "failure"
        ? "bad"
        : status === "active" || status === "idle"
          ? "info"
          : "muted";
  return (
    <Pill tone={tone}>
      {stage && stage !== "deploy" && status !== "success" ? stage + " · " : ""}
      {status}
    </Pill>
  );
}

const PRIORITY: Record<RepoPriority, Tone> = {
  critical: "bad",
  high: "warn",
  medium: "info",
  low: "muted",
};
export function PriorityPill({ priority }: { priority: RepoPriority | null }) {
  if (!priority) return null;
  return (
    <Pill tone={PRIORITY[priority]} className="capitalize">
      {priority}
    </Pill>
  );
}

export function HealthMeter({ score, compact = false }: { score: number; compact?: boolean }) {
  const tone = score >= 85 ? "bg-emerald-500" : score >= 65 ? "bg-amber-500" : "bg-red-500";
  return (
    <span className="inline-flex items-center gap-1.5" title={"Health " + score + "/100"}>
      <span
        className={cn(
          "relative h-1.5 overflow-hidden rounded-full bg-muted",
          compact ? "w-10" : "w-16",
        )}
      >
        <span
          className={cn("absolute inset-y-0 left-0 rounded-full", tone)}
          style={{ width: score + "%" }}
        />
      </span>
      <span className="text-[11px] font-bold tabular-nums text-foreground">{score}</span>
    </span>
  );
}

export function LangDot({ name, color }: { name: string | null; color?: string | null }) {
  if (!name) return <span className="text-[11px] text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span
        aria-hidden
        className="h-2 w-2 rounded-full"
        style={{ background: color ?? "hsl(var(--muted-foreground))" }}
      />
      {name}
    </span>
  );
}

export function ExtLink({
  href,
  children,
  className,
}: {
  href: string | null | undefined;
  children: ReactNode;
  className?: string;
}) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "inline-flex min-w-0 items-center gap-1 text-primary hover:underline",
        className,
      )}
    >
      <span className="truncate">{children}</span>
      <ArrowUpRight size={11} className="shrink-0" />
    </a>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-border/80 bg-muted/60 px-1.5 py-px font-mono text-[10px] font-semibold text-muted-foreground">
      {children}
    </kbd>
  );
}

export function Panel({
  title,
  icon,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 px-4 py-2.5">
          <h2 className="flex items-center gap-2 text-[13px] font-bold text-foreground">
            {icon}
            {title}
          </h2>
          {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
        </header>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "muted",
  onClick,
  active,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
  onClick?: () => void;
  active?: boolean;
}) {
  const accent: Record<Tone, string> = {
    good: "text-emerald-600 dark:text-emerald-400",
    bad: "text-red-600 dark:text-red-400",
    warn: "text-amber-600 dark:text-amber-400",
    info: "text-sky-600 dark:text-sky-400",
    violet: "text-violet-600 dark:text-violet-400",
    muted: "text-foreground",
  };
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex min-w-0 flex-col items-start rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-left transition",
        onClick && "hover:border-primary/40 hover:bg-primary/5",
        active && "border-primary/50 bg-primary/10",
      )}
    >
      <span className={cn("text-xl font-extrabold tabular-nums leading-tight", accent[tone])}>
        {value}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </span>
      {hint && <span className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</span>}
    </Comp>
  );
}

export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="h-11 animate-pulse rounded-xl bg-muted/50"
          style={{ opacity: 1 - i * 0.12 }}
        />
      ))}
    </div>
  );
}

/**
 * Confirmation for production actions. The operator must type the exact
 * resource name; the server re-checks the same name before acting.
 */
export function TypedConfirm({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  actionLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmText: string;
  actionLabel: string;
  onConfirm: (typed: string) => Promise<void>;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const close = (o: boolean) => {
    if (busy) return;
    if (!o) setTyped("");
    onOpenChange(o);
  };
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShieldAlert size={18} className="text-amber-500" /> {title}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">{description}</div>
          </DialogDescription>
        </DialogHeader>
        <label className="block text-xs font-semibold text-muted-foreground">
          Type <span className="font-mono text-foreground">{confirmText}</span> to confirm
          <input
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary"
            aria-label={"Type " + confirmText + " to confirm"}
          />
        </label>
        <DialogFooter className="gap-2">
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => close(false)}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={typed !== confirmText || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm(typed);
                setTyped("");
                onOpenChange(false);
              } catch {
                /* the caller already reported the failure; keep the dialog open */
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 size={12} className="animate-spin" />} {actionLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
