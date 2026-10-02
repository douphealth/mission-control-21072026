import { useEffect, useState } from "react";
import {
  ArrowRight,
  CircleCheck as CheckCircle2,
  Clock3,
  Focus,
  Gauge,
  Sparkles,
  Timer,
  Zap,
  ListChecks,
  Plus,
} from "lucide-react";
import type { WorkItem } from "@/lib/workQueue";
import { estimateOf, fmtMinutes } from "@/lib/planning";
import type { Task } from "@/lib/db";
import { useNavigationStore } from "@/stores/navigationStore";
import { CAPTURE_FOCUS_EVENT } from "@/components/dashboard/QuickCaptureBar";

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function ProgressRing({ pct }: { pct: number }) {
  const size = 82;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, pct)) / 100) * circumference;

  return (
    <div className="mc13-ring" aria-label={`${pct}% of today's outcomes complete`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          className="mc13-ring-track"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          stroke="url(#mc13RingGradient)"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="mc13-ring-fill"
        />
        <defs>
          <linearGradient id="mc13RingGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7cf6d3" />
            <stop offset="48%" stopColor="#69b7ff" />
            <stop offset="100%" stopColor="#a98cff" />
          </linearGradient>
        </defs>
      </svg>
      <div className="mc13-ring-value">
        <strong>{pct}%</strong>
        <span>done</span>
      </div>
    </div>
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
  const setActiveSection = useNavigationStore((state) => state.setActiveSection);
  const hour = now.getHours();
  const greeting =
    hour < 5
      ? "Late session"
      : hour < 12
        ? "Good morning"
        : hour < 18
          ? "Good afternoon"
          : "Good evening";
  const time = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const donePct =
    commitmentsTotal > 0 ? Math.round((commitmentsDone / commitmentsTotal) * 100) : 0;

  return (
    <section className="mc13-hero" aria-label="Current priority and day progress">
      <div className="mc13-hero-mesh" aria-hidden />
      <div className="mc13-hero-glow mc13-hero-glow-a" aria-hidden />
      <div className="mc13-hero-glow mc13-hero-glow-b" aria-hidden />

      <div className="mc13-hero-top">
        <div className="mc13-live-pill">
          <span className="mc13-live-dot" />
          Live command deck
        </div>
        <div className="mc13-date">
          <span>{date}</span>
          <strong>{time}</strong>
        </div>
      </div>

      <div className="mc13-hero-grid">
        <div className="mc13-now-panel">
          <div className="mc13-eyebrow">
            <Sparkles size={12} />
            {greeting} · highest-value next action
          </div>

          {nextAction ? (
            <>
              <h1 className="mc13-now-title">{nextAction.title}</h1>

              <div className="mc13-meta-row">
                {nextAction.kind === "task" && (
                  <span>
                    <Timer size={12} />
                    {fmtMinutes(estimateOf(nextAction.raw as Task))}
                  </span>
                )}
                {nextAction.due && (
                  <span>
                    <Clock3 size={12} />
                    due {nextAction.due.slice(5)}
                  </span>
                )}
                <span>
                  <Gauge size={12} />
                  {fmtMinutes(Math.max(0, availableMin))} free
                </span>
              </div>

              <div className="mc13-actions">
                <button type="button" onClick={() => onFocus(nextAction)} className="mc13-primary-action">
                  <Focus size={17} />
                  Start focus
                  <ArrowRight size={16} />
                </button>
                <button type="button" onClick={() => onComplete(nextAction)} className="mc13-secondary-action">
                  <CheckCircle2 size={16} />
                  Mark done
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="mc13-now-title">Clear deck. Choose the next meaningful move.</h1>
              <p className="mc13-now-subtitle">
                Capture what matters or choose one outcome to anchor the day.
              </p>
              <div className="mc13-actions">
                <button
                  type="button"
                  onClick={() => setActiveSection("tasks")}
                  className="mc13-primary-action"
                >
                  <ListChecks size={17} />
                  Choose next action
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(new Event(CAPTURE_FOCUS_EVENT))
                  }
                  className="mc13-secondary-action"
                >
                  <Plus size={16} />
                  Capture
                </button>
              </div>
            </>
          )}
        </div>

        <aside className="mc13-day-panel" aria-label="Day progress">
          <div className="mc13-day-head">
            <div>
              <span className="mc13-day-kicker">Today</span>
              <strong>Execution pulse</strong>
            </div>
            <ProgressRing pct={donePct} />
          </div>

          <div className="mc13-mini-grid">
            <div className="mc13-mini-card">
              <div className="mc16-mini-label"><CheckCircle2 size={12} /><span>Outcomes</span></div>
              <strong>{commitmentsDone}<em>/ {commitmentsTotal}</em></strong>
            </div>
            <div className="mc13-mini-card">
              <div className="mc16-mini-label"><Timer size={12} /><span>Planned</span></div>
              <strong>{fmtMinutes(plannedMin)}</strong>
            </div>
            <div className="mc13-mini-card">
              <div className="mc16-mini-label"><Gauge size={12} /><span>Free</span></div>
              <strong>{fmtMinutes(Math.max(0, availableMin))}</strong>
            </div>
            <div className="mc13-mini-card mc13-mini-card-accent">
              <div className="mc16-mini-label"><Zap size={12} /><span>Mode</span></div>
              <strong>{nextAction ? "Execute" : "Choose"}</strong>
            </div>
          </div>

          <div className="mc13-progress-line" aria-hidden>
            <span style={{ width: `${donePct}%` }} />
          </div>
        </aside>
      </div>
    </section>
  );
}
