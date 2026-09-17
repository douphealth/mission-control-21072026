// ─── SAGE HeroNowBand — editorial command-deck hero ───────────────────────────
// Greeting + live clock + day progress arc + next action in one beautiful band.
// Dark surface with floating orbs, dot grid, and gradient progress arc.

import { useEffect, useState } from "react";
import {
  ChevronRight,
  CircleCheck as CheckCircle2,
  Clock,
  Sparkles,
  Timer,
  Zap,
} from "lucide-react";
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

function ProgressArc({
  pct,
  size = 72,
  stroke = 6,
}: {
  pct: number;
  size?: number;
  stroke?: number;
}) {
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
        className="se-arc-track"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        stroke="url(#seArcGrad)"
        strokeDasharray={c}
        strokeDashoffset={offset}
        className="se-arc-fill"
      />
      <defs>
        <linearGradient id="seArcGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="45%" stopColor="#38bdf8" />
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
  const hour = now.getHours();
  const greeting =
    hour < 5
      ? "Still up"
      : hour < 12
        ? "Good morning"
        : hour < 18
          ? "Good afternoon"
          : "Good evening";
  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const donePct = commitmentsTotal > 0 ? Math.round((commitmentsDone / commitmentsTotal) * 100) : 0;

  return (
    <section className="se-hero ultra-rise text-white" aria-label="Now and day progress">
      <div className="se-hero-orb se-hero-orb--1" aria-hidden />
      <div className="se-hero-orb se-hero-orb--2" aria-hidden />
      <div className="se-hero-grid" aria-hidden />
      <div className="se-hero-glow" aria-hidden />

      <div className="se-hero-content p-5 sm:p-8">
        {/* Top: greeting + date + progress arc */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/70 backdrop-blur">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              {dateLabel}
            </div>

            <h1 className="mt-4 font-display text-[30px] font-extrabold leading-[1.02] tracking-tighter text-white sm:text-[42px]">
              {greeting}
            </h1>
            <p className="mt-1.5 text-[13px] text-white/45 sm:text-[14px]">
              {commitmentsTotal > 0
                ? `${commitmentsDone} of ${commitmentsTotal} outcomes complete · ${fmtMinutes(Math.max(0, availableMin))} free today`
                : "Capture something to get started"}
            </p>

            {/* Day progress bar */}
            {commitmentsTotal > 0 && (
              <div className="mt-4 max-w-xs">
                <div className="se-bar">
                  <div className="se-bar-fill" style={{ width: `${donePct}%` }} />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10.5px] font-semibold text-white/40">
                  <span>{donePct}% done</span>
                  <span className="font-mono tabular-nums text-white/60">{hhmm}</span>
                </div>
              </div>
            )}
          </div>

          {/* Progress arc */}
          {commitmentsTotal > 0 && (
            <div className="relative shrink-0" role="status">
              <ProgressArc pct={donePct} size={80} stroke={7} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-[18px] font-extrabold tabular-nums text-white">
                  {donePct}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Next action card */}
        <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl sm:p-5">
          <div className="relative mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.16em] text-emerald-300">
            <Sparkles size={10} /> Do this now
          </div>

          {nextAction ? (
            <>
              <h2 className="font-display text-[19px] font-bold leading-snug tracking-tight text-white sm:text-[24px]">
                {nextAction.title}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-white/45">
                {nextAction.kind === "task" && (
                  <span className="inline-flex items-center gap-1">
                    <Timer size={11} /> {fmtMinutes(estimateOf(nextAction.raw as Task))}
                  </span>
                )}
                {nextAction.due && (
                  <span className="inline-flex items-center gap-1">
                    <Clock size={11} /> due {nextAction.due.slice(5)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-emerald-300/60">
                  {plannedMin > 0 ? fmtMinutes(plannedMin) : "0 min"} planned ·{" "}
                  {fmtMinutes(Math.max(0, availableMin))} free
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => onFocus(nextAction)}
                  className="se-btn se-btn-primary h-10 px-4 text-[12.5px]"
                >
                  <Zap size={14} /> Start
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => onComplete(nextAction)}
                  className="se-btn h-10 border border-white/15 bg-white/8 px-4 text-[12.5px] font-semibold text-white backdrop-blur hover:bg-white/15"
                >
                  <CheckCircle2 size={14} /> Done
                </button>
              </div>
            </>
          ) : (
            <div className="py-2">
              <h2 className="font-display text-[19px] font-bold tracking-tight text-white sm:text-[22px]">
                Nothing is demanding your attention
              </h2>
              <p className="mt-1 text-[12px] text-white/45">
                Press <kbd className="rounded border border-white/20 px-1 text-[10px]">N</kbd> to
                capture, or <kbd className="rounded border border-white/20 px-1 text-[10px]">?</kbd>{" "}
                for shortcuts.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
