// ─── V10 HeroNowBand — the command-deck hero strip ────────────────────────────
// The first viewport answers three questions in one glance:
//   1. What is happening RIGHT NOW (live clock + next up)
//   2. How far through the day's committed work am I (progress)
//   3. What is the very next action (one-tap Start / Done)
// Read-only: consumes WorkItem data passed in; writes only via callbacks.

import { useEffect, useState } from "react";
import { ChevronRight, CheckCircle2, Clock, Sparkles, Timer } from "lucide-react";
import type { WorkItem } from "@/lib/workQueue";
import { estimateOf, fmtMinutes } from "@/lib/planning";
import type { Task } from "@/lib/db";

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

export default function HeroNowBand({
  nextAction,
  commitmentsTotal,
  commitmentsDone,
  plannedMin,
  availableMin,
  onFocus,
  onComplete,
}: {
  nextAction: WorkItem | null;
  commitmentsTotal: number;
  commitmentsDone: number;
  plannedMin: number;
  availableMin: number;
  onFocus: (item: WorkItem) => void;
  onComplete: (item: WorkItem) => void;
}) {
  const now = useClock();
  const hhmm = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const greeting =
    now.getHours() < 5
      ? "Deep night"
      : now.getHours() < 12
        ? "Good morning"
        : now.getHours() < 18
          ? "Good afternoon"
          : "Good evening";

  const donePct =
    commitmentsTotal > 0 ? Math.round((commitmentsDone / commitmentsTotal) * 100) : null;

  return (
    <section
      className="v10-hero v10-card zen-card enterprise-card rounded-[28px] p-4 sm:p-6"
      aria-label="Now and day progress"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Live NOW chip */}
        <div className="flex items-center gap-3">
          <span className="v10-now-chip inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            Now
          </span>
          <span className="font-mono text-[15px] font-bold tabular-nums text-foreground">
            {hhmm}
          </span>
          <span className="hidden text-[12px] font-semibold text-muted-foreground sm:inline">
            {greeting}
          </span>
        </div>

        {/* Day progress */}
        {donePct !== null && (
          <div className="flex min-w-[190px] items-center gap-2.5" role="status">
            <div className="v10-progress-track flex-1">
              <div className="v10-progress-fill relative" style={{ width: `${donePct}%` }} />
            </div>
            <span className="font-mono text-[11.5px] font-bold tabular-nums text-muted-foreground">
              {commitmentsDone}/{commitmentsTotal} · {donePct}%
            </span>
          </div>
        )}
      </div>

      {/* Next action row */}
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {nextAction ? (
            <>
              <p className="zen-label text-[10px] font-bold uppercase tracking-[0.16em]">Next up</p>
              <h1 className="mt-1 truncate font-display text-[20px] font-extrabold leading-tight tracking-tight text-foreground sm:text-[24px]">
                {nextAction.title}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
                {nextAction.kind === "task" && (
                  <span className="inline-flex items-center gap-1">
                    <Timer size={11} aria-hidden /> {fmtMinutes(estimateOf(nextAction.raw as Task))}
                  </span>
                )}
                {nextAction.due && (
                  <span className="inline-flex items-center gap-1">
                    <Clock size={11} aria-hidden /> due {nextAction.due.slice(5)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-primary">
                  <Sparkles size={11} aria-hidden />{" "}
                  {plannedMin > 0 ? fmtMinutes(plannedMin) : "0 min"} planned ·{" "}
                  {fmtMinutes(Math.max(0, availableMin))} free
                </span>
              </div>
            </>
          ) : (
            <>
              <p className="zen-label text-[10px] font-bold uppercase tracking-[0.16em]">Next up</p>
              <h1 className="mt-1 font-display text-[20px] font-extrabold tracking-tight text-foreground sm:text-[24px]">
                Nothing queued — capture something
              </h1>
              <p className="mt-1 text-[11.5px] text-muted-foreground">
                Press <kbd className="rounded border border-border/60 px-1 text-[10px]">N</kbd> to
                capture, or{" "}
                <kbd className="rounded border border-border/60 px-1 text-[10px]">?</kbd> for
                shortcuts.
              </p>
            </>
          )}
        </div>

        {nextAction && (
          <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
            <button
              onClick={() => onFocus(nextAction)}
              className="v10-btn-sheen flex h-10 items-center gap-1.5 rounded-2xl bg-primary px-4 text-[12.5px] font-bold text-primary-foreground shadow-[var(--shadow-primary)] transition hover:opacity-95 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              Start <ChevronRight size={14} />
            </button>
            <button
              onClick={() => onComplete(nextAction)}
              aria-label="Mark done"
              className="flex h-10 items-center gap-1.5 rounded-2xl border border-border/60 bg-background/60 px-3 text-[12.5px] font-semibold text-foreground transition hover:border-emerald-500/40 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <CheckCircle2 size={14} /> Done
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
