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
  ExternalLink,
} from "lucide-react";
import type { WorkItem } from "@/lib/workQueue";
import { estimateOf, fmtMinutes } from "@/lib/planning";
import type { Task } from "@/lib/db";
import { useNavigationStore } from "@/stores/navigationStore";
import { CAPTURE_FOCUS_EVENT } from "@/components/dashboard/QuickCaptureBar";
import type { AreaFilter } from "@/stores/planStore";
import { whyNow } from "@/lib/whyNow";

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function ProgressRing({ pct, planned }: { pct: number; planned: boolean }) {
  const size = 82;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, pct)) / 100) * circumference;

  return (
    <div
      className="mc13-ring"
      aria-label={planned ? `${pct}% of today's outcomes complete` : "No outcomes planned yet"}
    >
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
        <strong>{planned ? `${pct}%` : "—"}</strong>
        <span>{planned ? "done" : "to plan"}</span>
      </div>
    </div>
  );
}

export default function HeroNowBand({
  area,
  nextAction,
  commitmentsTotal,
  commitmentsDone,
  plannedMin,
  availableMin,
  onFocus,
  onComplete,
}: {
  area: AreaFilter;
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
  const setFocusTaskId = useNavigationStore((state) => state.setFocusTaskId);
  const links = [
    ...new Set(
      (nextAction?.title.match(/https?:\/\/[^\s<>]+/gi) ?? []).map((value) => {
        let trimmed = value.replace(/[.,;:!?]+$/, "");
        for (const [open, close] of [
          ["(", ")"],
          ["[", "]"],
          ["{", "}"],
        ]) {
          while (
            trimmed.endsWith(close) &&
            trimmed.split(close).length > trimmed.split(open).length
          )
            trimmed = trimmed.slice(0, -1);
        }
        return trimmed;
      }),
    ),
  ].filter((value) => {
    try {
      const parsed = new URL(value);
      return !parsed.username && !parsed.password;
    } catch {
      return false;
    }
  });
  // Keep the original saved title intact; render URLs as useful links instead of a wall of text.
  const readableTitle =
    nextAction?.title
      .replace(/https?:\/\/[^\s<>]+/gi, "")
      .replace(/\s+/g, " ")
      .trim() || (links[0] ? new URL(links[0]).hostname : nextAction?.title);
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
  const donePct = commitmentsTotal > 0 ? Math.round((commitmentsDone / commitmentsTotal) * 100) : 0;
  const contextLabel =
    area === "personal" ? "Family day" : area === "work" ? "Business day" : "Whole life";
  const contextCopy =
    area === "personal"
      ? "Keep home, school, appointments and routines moving without the work noise."
      : area === "work"
        ? "Protect the highest-leverage work and keep every revenue asset moving."
        : "One calm view across home and business, with only the next useful action promoted.";

  return (
    <section className="mc13-hero mc38-hero" aria-label="Current priority and day progress">
      <div className="mc13-hero-mesh" aria-hidden />
      <div className="mc13-hero-glow mc13-hero-glow-a" aria-hidden />
      <div className="mc13-hero-glow mc13-hero-glow-b" aria-hidden />

      <div className="mc13-hero-top">
        <div className="mc13-live-pill">
          <span className="mc13-live-dot" />
          {contextLabel}
        </div>
        <div className="mc13-date">
          <span>{date}</span>
          <strong>{time}</strong>
        </div>
      </div>

      <div className="mc13-hero-grid">
        <div className="mc13-now-panel">
          <div className="mc37-priority-copy">
            <div className="mc13-eyebrow">
              <Sparkles size={12} />
              {greeting} · your next best move
            </div>

            {nextAction ? (
              <>
                <h1 className="mc13-now-title">{readableTitle}</h1>
                <p className="mc36-context-copy">{whyNow(nextAction).join(" · ")}</p>
                {links.length > 0 && (
                  <div className="mc-priority-links" aria-label="Task links">
                    {links.map((link) => (
                      <a
                        key={link}
                        href={link}
                        title={link}
                        aria-label={`Open ${link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink size={13} />
                        {new URL(link).hostname.replace(/^www\./, "")}
                      </a>
                    ))}
                  </div>
                )}

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
                      Due{" "}
                      {new Date(`${nextAction.due}T12:00:00`).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                  <span>
                    <Gauge size={12} />
                    {fmtMinutes(Math.max(0, availableMin))} free
                  </span>
                </div>

                <div className="mc13-actions">
                  <button
                    type="button"
                    onClick={() => onFocus(nextAction)}
                    className="mc13-primary-action"
                  >
                    <Focus size={17} />
                    Start focus
                    <ArrowRight size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onComplete(nextAction)}
                    className="mc13-secondary-action"
                  >
                    <CheckCircle2 size={16} />
                    Mark done
                  </button>
                  {nextAction.kind === "task" && (
                    <button
                      type="button"
                      className="mc-priority-open"
                      onClick={() => {
                        setFocusTaskId(nextAction.refId);
                        setActiveSection("tasks");
                      }}
                    >
                      View task <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <h1 className="mc13-now-title">Clear deck. Choose the next meaningful move.</h1>
                <p className="mc13-now-subtitle">{contextCopy}</p>
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
                    onClick={() => window.dispatchEvent(new Event(CAPTURE_FOCUS_EVENT))}
                    className="mc13-secondary-action"
                  >
                    <Plus size={16} />
                    Capture
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="mc37-hero-art mc38-hero-art" aria-hidden="true">
            <div className="mc37-hero-art-shade" />
            <div className="mc37-hero-quote">
              <span>Small steps.</span>
              <strong>Bigger freedom.</strong>
              <em>Discipline today creates freedom tomorrow.</em>
            </div>
          </div>
        </div>

        <aside className="mc13-day-panel" aria-label="Day progress">
          <div className="mc13-day-head">
            <div>
              <span className="mc13-day-kicker">Today</span>
              <strong>
                {area === "personal"
                  ? "Family rhythm"
                  : area === "work"
                    ? "Execution pulse"
                    : "Life rhythm"}
              </strong>
            </div>
            <ProgressRing pct={donePct} planned={commitmentsTotal > 0} />
          </div>

          <div className="mc13-mini-grid">
            <div className="mc13-mini-card">
              <div className="mc16-mini-label">
                <CheckCircle2 size={12} />
                <span>Outcomes</span>
              </div>
              <strong>
                {commitmentsDone}
                <em>/ {commitmentsTotal}</em>
              </strong>
            </div>
            <div className="mc13-mini-card">
              <div className="mc16-mini-label">
                <Timer size={12} />
                <span>Planned</span>
              </div>
              <strong>{fmtMinutes(plannedMin)}</strong>
            </div>
            <div className="mc13-mini-card">
              <div className="mc16-mini-label">
                <Gauge size={12} />
                <span>Free</span>
              </div>
              <strong>{fmtMinutes(Math.max(0, availableMin))}</strong>
            </div>
            <div className="mc13-mini-card mc13-mini-card-accent">
              <div className="mc16-mini-label">
                <Zap size={12} />
                <span>Mode</span>
              </div>
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
