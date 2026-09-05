// ─── Unified Today Timeline ──────────────────────────────────────────────────
// The visual core of the unified system: flags → timed (clock) → NOW →
// untimed (engine score). Answers "what now / what next / what needs me"
// in one glance instead of three siloed panels.

import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock, Flag, Timer, Zap } from "lucide-react";
import type { Timeline, TimelineEntry } from "@/lib/timeline";
import type { WorkItem } from "@/lib/workQueue";
import { useNavigationStore } from "@/stores/navigationStore";

const KIND_STYLE: Record<string, { badge: string; dot: string; label: string }> = {
  task: { badge: "bg-primary/10 text-primary", dot: "bg-primary", label: "Task" },
  reminder: { badge: "bg-info/10 text-info", dot: "bg-info", label: "Reminder" },
  payment: {
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
    label: "Payment",
  },
  decision: {
    badge: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
    dot: "bg-violet-500",
    label: "Decision",
  },
  flag: { badge: "bg-destructive/10 text-destructive", dot: "bg-destructive", label: "Attention" },
};

const SEVERITY_RING: Record<string, string> = {
  critical: "border-destructive/30 bg-destructive/[0.05]",
  warning: "border-amber-500/30 bg-amber-500/[0.05]",
  info: "border-border/60 bg-background/60",
};

function EntryRow({
  entry,
  onComplete,
  onPlan,
  onCommit,
  isNow,
}: {
  entry: TimelineEntry;
  onComplete?: (i: WorkItem) => void;
  onPlan?: (i: WorkItem, d: number) => void;
  onCommit?: (i: WorkItem) => void;
  isNow: boolean;
}) {
  const setActiveSection = useNavigationStore((s) => s.setActiveSection);
  const setFocusTaskId = useNavigationStore((s) => s.setFocusTaskId);
  const ks = KIND_STYLE[entry.kind] ?? KIND_STYLE.task;

  if (entry.kind === "flag") {
    const sev = entry.severity ?? "warning";
    return (
      <button
        onClick={() => setActiveSection(entry.flag?.section ?? entry.section)}
        className={`group relative flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition hover:-translate-y-0.5 ${SEVERITY_RING[sev]}`}
      >
        <span
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${sev === "critical" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-500"}`}
        >
          <AlertTriangle size={14} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-bold leading-snug text-foreground">
            {entry.title}
          </span>
          {entry.reasons[0] && (
            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
              {entry.reasons[0]}
            </span>
          )}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 text-[10px] font-bold text-foreground">
          {entry.flag?.actionLabel ?? "Open"} <ArrowUpRight size={10} />
        </span>
      </button>
    );
  }

  const w = entry.workItem;
  return (
    <div
      className={`group relative flex items-start gap-3 rounded-2xl border p-3.5 transition hover:border-primary/30 hover:shadow-[0_16px_36px_-28px_hsl(var(--primary)/0.8)] ${
        isNow ? "border-primary/40 bg-primary/[0.04]" : "border-border/60 bg-background/60"
      }`}
    >
      {/* time gutter */}
      <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded-xl bg-secondary text-[11px] font-extrabold tabular-nums text-foreground">
        {entry.time ?? <Zap size={12} className="text-primary" />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${ks.badge}`}
          >
            {ks.label}
          </span>
          {isNow && (
            <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary-foreground">
              <span className="h-1 w-1 animate-pulse rounded-full bg-primary-foreground" /> Now
            </span>
          )}
          {w && w.overdueDays > 0 && (
            <span className="rounded-full bg-destructive/12 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-destructive">
              {w.overdueDays}d late
            </span>
          )}
        </div>
        <button
          onClick={() => setActiveSection(entry.section)}
          className="mt-1 block w-full text-left"
        >
          <span className="block text-[13px] font-semibold leading-snug text-foreground">
            {entry.title}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
            {entry.reasons.join(" · ")}
          </span>
        </button>
      </div>

      {w && (
        <div className="flex shrink-0 items-center gap-1 opacity-60 transition group-hover:opacity-100">
          {w.kind === "task" && (
            <button
              onClick={() => {
                setFocusTaskId(w.refId);
                setActiveSection("focus");
              }}
              title="Start a focus session"
              className="rounded-xl p-2 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
            >
              <Timer size={13} />
            </button>
          )}
          <button
            onClick={() => onPlan?.(w, 1)}
            title="Plan for tomorrow (deadline unchanged)"
            className="rounded-xl p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <Clock size={13} />
          </button>
          <button
            onClick={() => onComplete?.(w)}
            title="Complete"
            className="rounded-xl p-2 text-muted-foreground transition hover:bg-emerald-500/10 hover:text-emerald-500"
          >
            <CheckCircle2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function TodayTimeline({
  timeline,
  onComplete,
  onPlan,
  onCommit,
}: {
  timeline: Timeline;
  onComplete?: (i: WorkItem) => void;
  onPlan?: (i: WorkItem, d: number) => void;
  onCommit?: (i: WorkItem) => void;
}) {
  const setActiveSection = useNavigationStore((s) => s.setActiveSection);
  const { entries, nowIndex, counts } = timeline;

  return (
    <section className="enterprise-card rounded-[28px] p-5 sm:p-6">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Today
          </div>
          <h3 className="font-display text-[19px] font-extrabold tracking-tight text-foreground sm:text-[22px]">
            One timeline
          </h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {counts.flags > 0 ? `${counts.flags} needing attention · ` : ""}
            {counts.timed} timed · {counts.untimed} queued
          </p>
        </div>
        <button
          onClick={() => setActiveSection("calendar")}
          className="rounded-full bg-secondary px-3 py-1.5 text-[11px] font-bold text-foreground transition hover:bg-secondary/70"
        >
          Calendar
        </button>
      </div>

      <div className="relative space-y-2.5">
        {/* rail */}
        <div
          className="absolute top-2 bottom-2 left-[27px] w-px bg-border/50 sm:left-[31px]"
          aria-hidden
        />

        {entries.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-[12px] text-muted-foreground">
            Nothing today. Capture something or review what is coming.
          </p>
        )}

        {entries.map((e, i) => (
          <div key={e.id} className="relative">
            {i === nowIndex && (
              <div className="relative z-10 my-2 flex items-center gap-3">
                <span className="flex h-[14px] w-[14px] shrink-0 translate-x-[20px] items-center justify-center sm:translate-x-[24px]">
                  <span className="absolute h-[10px] w-[10px] animate-ping rounded-full bg-primary/60" />
                  <span className="relative h-[8px] w-[8px] rounded-full bg-primary" />
                </span>
                <span className="font-display text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">
                  Now
                </span>
                <span className="h-px flex-1 bg-primary/20" />
              </div>
            )}
            <div className="relative z-10">
              <EntryRow
                entry={e}
                isNow={i === nowIndex && e.kind !== "flag"}
                onComplete={onComplete}
                onPlan={onPlan}
                onCommit={onCommit}
              />
            </div>
          </div>
        ))}

        {nowIndex === entries.length && entries.length > 0 && (
          <div className="relative z-10 mt-2 flex items-center gap-3">
            <span className="flex h-[14px] w-[14px] shrink-0 translate-x-[20px] items-center justify-center sm:translate-x-[24px]">
              <span className="absolute h-[10px] w-[10px] animate-ping rounded-full bg-primary/60" />
              <span className="relative h-[8px] w-[8px] rounded-full bg-primary" />
            </span>
            <span className="font-display text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">
              Now
            </span>
            <span className="h-px flex-1 bg-primary/20" />
          </div>
        )}

        {counts.flags === 0 && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4">
            <Flag size={16} className="text-emerald-500" />
            <p className="text-[12px] text-muted-foreground">
              No exceptions. Deadlines, payments, decisions and syncs are all healthy.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
