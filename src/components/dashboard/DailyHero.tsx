import { ArrowRight, CalendarClock, CheckCircle2, Timer, Sparkles } from "lucide-react";
import type { WorkItem } from "@/lib/workQueue";
import { whyNow } from "@/lib/whyNow";
import { useNavigationStore } from "@/stores/navigationStore";
import { useSettingsStore } from "@/stores/settingsStore";

function Ring({ pct, size = 76, stroke = 8 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={stroke}
        className="stroke-white/15"
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        stroke="url(#heroRing)"
        strokeDasharray={c}
        strokeDashoffset={c - (Math.min(100, Math.max(0, pct)) / 100) * c}
        style={{ transition: "stroke-dashoffset 800ms cubic-bezier(0.22,1,0.36,1)" }}
      />
      <defs>
        <linearGradient id="heroRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="60%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function DailyHero({
  now,
  today,
  stats,
  onComplete,
  onPlan,
  onDockFocus,
}: {
  now?: WorkItem;
  today: string;
  stats: { commitments: number; overdue: number; completedToday: number; inbox: number };
  onComplete: (item: WorkItem) => void;
  onPlan: (item: WorkItem, days: number) => void;
  /** Dock a focus session on this page instead of navigating away. */
  onDockFocus?: () => void;
}) {
  const setActiveSection = useNavigationStore((s) => s.setActiveSection);
  const userName = useSettingsStore((s) => s.userName);

  const hour = new Date().getHours();
  const greet =
    hour < 5
      ? "Still up"
      : hour < 12
        ? "Good morning"
        : hour < 18
          ? "Good afternoon"
          : "Good evening";
  const dateLabel = new Date(`${today}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const planned = stats.commitments + stats.completedToday;
  const pct = planned > 0 ? (stats.completedToday / planned) * 100 : 0;

  return (
    <section
      className="relative overflow-hidden rounded-[28px] p-5 text-white sm:rounded-[34px] sm:p-8"
      style={{ background: "linear-gradient(150deg,#0b1220,#0f172a 45%,#0b2b28)" }}
    >
      <div
        className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full opacity-50 blur-2xl"
        style={{ background: "radial-gradient(circle,#10b981,transparent 65%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full opacity-40 blur-2xl"
        style={{ background: "radial-gradient(circle,#6366f1,transparent 65%)" }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-semibold text-white/85 backdrop-blur sm:text-[11px]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            {dateLabel}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Ring pct={pct} size={54} stroke={6} />
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold tabular-nums">
                {Math.round(pct)}%
              </span>
            </div>
            <div className="text-[11px] leading-tight text-white/60">
              <div className="font-bold text-white">{stats.completedToday} done today</div>
              <div>{stats.commitments} committed</div>
            </div>
          </div>
        </div>

        <h1 className="font-display mt-4 text-[28px] font-extrabold leading-[1.02] tracking-tighter min-[380px]:text-[32px] sm:text-[46px]">
          {greet},{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(90deg,#6ee7b7,#38bdf8 55%,#a78bfa)" }}
          >
            {userName}
          </span>
        </h1>
        <p className="mt-2 text-[13px] text-white/60 sm:text-[15px]">
          {stats.overdue > 0 ? (
            <>
              <strong className="text-rose-300">{stats.overdue} past deadline</strong> ·{" "}
            </>
          ) : (
            <>Nothing past deadline · </>
          )}
          {stats.commitments} committed today · {stats.inbox} uncaptured in inbox
        </p>

        {/* NOW — the single most important thing */}
        <div className="mt-5 rounded-[24px] border border-white/15 bg-white/[0.08] p-4 backdrop-blur-xl sm:p-5">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
            <Sparkles size={11} /> Do this now
          </div>

          {now ? (
            <>
              <button
                onClick={() =>
                  setActiveSection(
                    now.kind === "decision"
                      ? "decisions"
                      : now.kind === "payment"
                        ? "payments"
                        : "tasks",
                  )
                }
                className="block w-full text-left"
              >
                <h2 className="font-display text-[19px] font-bold leading-snug tracking-tight sm:text-[24px]">
                  {now.title}
                </h2>
              </button>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {whyNow(now, today).map((r) => (
                  <span
                    key={r}
                    className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/80"
                  >
                    {r}
                  </span>
                ))}
              </div>
              <div className="mobile-rail mt-4 sm:flex sm:flex-wrap sm:gap-2.5 sm:overflow-visible sm:px-0">
                <button
                  onClick={() => onComplete(now)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-[13px] font-bold text-slate-900 shadow-lg transition active:scale-[0.97]"
                >
                  <CheckCircle2 size={15} /> Complete
                </button>
                <button
                  onClick={() => (onDockFocus ? onDockFocus() : setActiveSection("focus"))}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-[13px] font-semibold backdrop-blur transition active:scale-[0.97]"
                >
                  <Timer size={15} /> {onDockFocus ? "Focus here" : "Focus 25m"}
                </button>
                <button
                  onClick={() => onPlan(now, 1)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[13px] font-medium text-white/80 transition active:scale-[0.97]"
                >
                  <CalendarClock size={15} /> Plan tomorrow
                </button>
              </div>
            </>
          ) : (
            <div className="py-3">
              <h2 className="font-display text-[19px] font-bold tracking-tight sm:text-[22px]">
                Nothing is demanding your attention
              </h2>
              <p className="mt-1 text-[12px] text-white/60">
                No deadlines, no overdue work, no open exceptions. Capture the next thing — or, if
                this is a new device, sign in above to restore your data.
              </p>
              <button
                onClick={() => setActiveSection("review")}
                className="mt-3 inline-flex items-center gap-1.5 rounded-2xl bg-white px-4 py-2.5 text-[12px] font-bold text-slate-900"
              >
                Open review <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
