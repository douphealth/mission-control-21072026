// ─── ULTRA HeroNowBand — the command-deck hero strip ──────────────────────────
// The first viewport answers three questions in one glance:
//   1. What is happening RIGHT NOW (live clock + next up)
//   2. How far through the day's committed work am I (progress ring)
//   3. What is the very next action (one-tap Start / Done)
// Read-only: consumes WorkItem data passed in; writes only via callbacks.

import { useEffect, useState } from "react";
import { ChevronRight, CircleCheck as CheckCircle2, Clock, Sparkles, Timer, Zap } from "lucide-react";
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

function ProgressRing({ pct, size = 56, stroke = 5 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={stroke}
        fill="none"
        className="ultra-ring-track"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        stroke="url(#ultraRingGrad)"
        strokeDasharray={c}
        strokeDashoffset={offset}
        className="ultra-ring-fill"
      />
      <defs>
        <linearGradient id="ultraRingGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
    </svg>
  );
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
    <section className="ultra-hero ultra-rise text-white" aria-label="Now and day progress">
      {/* Floating orbs */}
      <div className="ultra-hero-orb ultra-hero-orb--1" aria-hidden />
      <div className="ultra-hero-orb ultra-hero-orb--2" aria-hidden />
      <div className="ultra-hero-orb ultra-hero-orb--3" aria-hidden />
      {/* Dot matrix */}
      <div className="ultra-hero-dots" aria-hidden />
      {/* Top catch-light */}
      <div className="ultra-hero-toplight" aria-hidden />
      {/* Hover sweep */}
      <div className="ultra-hero-sweep" aria-hidden />

      <div className="ultra-hero-content p-5 sm:p-7">
        {/* Top row: NOW chip + clock + progress ring */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white backdrop-blur">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Now
            </span>
            <span className="font-mono text-[16px] font-bold tabular-nums text-white">
              {hhmm}
            </span>
            <span className="hidden text-[12px] font-semibold text-white/50 sm:inline">
              {greeting}
            </span>
          </div>

          {donePct !== null && (
            <div className="flex items-center gap-2.5" role="status">
              <div className="relative">
                <ProgressRing pct={donePct} size={48} stroke={4.5} />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold tabular-nums text-white">
                  {donePct}%
                </span>
              </div>
              <div className="text-[11px] leading-tight text-white/55">
                <div className="font-bold text-white">{commitmentsDone}/{commitmentsTotal}</div>
                <div>outcomes</div>
              </div>
            </div>
          )}
        </div>

        {/* Next action row */}
        <div className="mt-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {nextAction ? (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300/80">
                  Next up
                </p>
                <h1 className="mt-1.5 truncate font-display text-[22px] font-extrabold leading-tight tracking-tight text-white sm:text-[28px]">
                  {nextAction.title}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-white/50">
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
                  <span className="inline-flex items-center gap-1 text-emerald-300/70">
                    <Sparkles size={11} aria-hidden />{" "}
                    {plannedMin > 0 ? fmtMinutes(plannedMin) : "0 min"} planned ·{" "}
                    {fmtMinutes(Math.max(0, availableMin))} free
                  </span>
                </div>
              </>
            ) : (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300/80">
                  Next up
                </p>
                <h1 className="mt-1.5 font-display text-[22px] font-extrabold leading-tight tracking-tight text-white sm:text-[28px]">
                  Nothing queued — capture something
                </h1>
                <p className="mt-1.5 text-[11.5px] text-white/50">
                  Press <kbd className="rounded border border-white/20 px-1 text-[10px]">N</kbd> to
                  capture, or{" "}
                  <kbd className="rounded border border-white/20 px-1 text-[10px]">?</kbd> for
                  shortcuts.
                </p>
              </>
            )}
          </div>

          {nextAction && (
            <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
              <button
                onClick={() => onFocus(nextAction)}
                className="ultra-btn-sheen flex h-10 items-center gap-1.5 rounded-2xl bg-white px-4 text-[12.5px] font-bold text-slate-900 shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:shadow-emerald-400/30 active:scale-95"
              >
                <Zap size={14} /> Start
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => onComplete(nextAction)}
                aria-label="Mark done"
                className="ultra-btn-ghost flex h-10 items-center gap-1.5 rounded-2xl border border-white/15 bg-white/10 px-3 text-[12.5px] font-semibold text-white backdrop-blur transition hover:border-white/25 hover:bg-white/[0.15] active:scale-95"
              >
                <CheckCircle2 size={14} /> Done
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
