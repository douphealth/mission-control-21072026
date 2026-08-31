import { useState } from "react";
import { CalendarClock, Check, ChevronDown, Pin } from "lucide-react";
import type { WorkItem } from "@/lib/workQueue";
import { whyNow } from "@/lib/whyNow";

const KIND_TONE: Record<string, string> = {
  task: "bg-primary/10 text-primary",
  reminder: "bg-info/10 text-info",
  payment: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  decision: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
};

function Row({
  item,
  today,
  onComplete,
  onPlan,
  onCommit,
  compact,
}: {
  item: WorkItem;
  today: string;
  onComplete: (i: WorkItem) => void;
  onPlan: (i: WorkItem, d: number) => void;
  onCommit?: (i: WorkItem) => void;
  compact?: boolean;
}) {
  return (
    <div className="group flex items-start gap-3 rounded-2xl border border-border/60 bg-background/60 p-3 transition hover:border-primary/30 hover:shadow-[0_16px_36px_-28px_hsl(var(--primary)/0.8)] sm:p-4">
      <button
        onClick={() => onComplete(item)}
        aria-label="Complete"
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border transition hover:border-primary hover:bg-primary/10"
      >
        <Check size={12} className="text-muted-foreground group-hover:text-primary" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${KIND_TONE[item.kind]}`}>
            {item.kind}
          </span>
          {item.overdueDays > 0 && (
            <span className="rounded-full bg-destructive/12 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-destructive">
              {item.overdueDays}d late
            </span>
          )}
        </div>
        <div className="mt-1 text-[13px] font-semibold leading-snug text-foreground">{item.title}</div>
        {!compact && (
          <div className="mt-1 text-[11px] text-muted-foreground">{whyNow(item, today).join(" · ")}</div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onCommit && (
          <button
            onClick={() => onCommit(item)}
            title="Pin to today"
            className="rounded-xl p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <Pin size={13} />
          </button>
        )}
        <button
          onClick={() => onPlan(item, 1)}
          title="Plan for tomorrow (deadline unchanged)"
          className="rounded-xl p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <CalendarClock size={13} />
        </button>
      </div>
    </div>
  );
}

export default function TodayCommitments({
  commitments,
  upNext,
  today,
  onComplete,
  onPlan,
  onCommit,
}: {
  commitments: WorkItem[];
  upNext: WorkItem[];
  today: string;
  onComplete: (i: WorkItem) => void;
  onPlan: (i: WorkItem, d: number) => void;
  onCommit: (i: WorkItem) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="enterprise-card rounded-[28px] p-5 sm:p-6">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Today</div>
          <h3 className="font-display text-[19px] font-extrabold tracking-tight text-foreground sm:text-[22px]">
            Your three commitments
          </h3>
        </div>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold tabular-nums text-muted-foreground">
          {commitments.length}/3
        </span>
      </div>

      {commitments.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-[12px] text-muted-foreground">
          No commitments for today. Pin something from Up next to make the day real.
        </p>
      ) : (
        <div className="space-y-2.5">
          {commitments.map((item) => (
            <Row key={item.id} item={item} today={today} onComplete={onComplete} onPlan={onPlan} />
          ))}
        </div>
      )}

      {upNext.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-2xl bg-secondary/60 px-4 py-3 text-[12px] font-bold text-foreground transition hover:bg-secondary"
          >
            Up next · {upNext.length}
            <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <div className="mt-2.5 space-y-2.5">
              {upNext.slice(0, 8).map((item) => (
                <Row
                  key={item.id}
                  item={item}
                  today={today}
                  compact
                  onComplete={onComplete}
                  onPlan={onPlan}
                  onCommit={onCommit}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
