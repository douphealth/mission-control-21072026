import { useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Command,
  Focus,
  Globe2,
  Layers3,
  Lightbulb,
  ListChecks,
  Radar,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  TrendingUp,
  WandSparkles,
} from "lucide-react";
import { useNavigationStore } from "@/stores/navigationStore";

const steps = [
  {
    id: "capture",
    eyebrow: "01 · Capture",
    title: "Get everything out of your head in seconds",
    copy: "Use Quick Capture for tasks, reminders, ideas, links and notes. Capture first; classify later. This keeps the system frictionless.",
    icon: WandSparkles,
    section: "dashboard",
    cta: "Open Quick Capture",
    accent: "primary",
  },
  {
    id: "triage",
    eyebrow: "02 · Triage",
    title: "Turn raw inputs into explicit decisions",
    copy: "Review the inbox, decide what matters, schedule only what deserves attention, and archive the rest. No invisible backlog.",
    icon: Radar,
    section: "review",
    cta: "Open Review",
    accent: "info",
  },
  {
    id: "commit",
    eyebrow: "03 · Commit",
    title: "Choose three outcomes, not thirty tasks",
    copy: "Today is for commitments. Pick the highest-leverage outcomes and preserve real deadlines while using planning dates for execution.",
    icon: Target,
    section: "dashboard",
    cta: "Open Today",
    accent: "violet",
  },
  {
    id: "focus",
    eyebrow: "04 · Focus",
    title: "Lock one task and remove context switching",
    copy: "Start a focused session only after attaching it to one real task. Mission Control keeps the same priority engine across Today and Focus.",
    icon: Focus,
    section: "focus",
    cta: "Start Focus",
    accent: "success",
  },
  {
    id: "operate",
    eyebrow: "05 · Operate",
    title: "Check systems by exception, not by habit",
    copy: "Use Findings, WordPress, Cloudflare, Vercel, SEO, Trends and Mentions only when something needs attention. Healthy systems stay quiet.",
    icon: ShieldCheck,
    section: "decisions",
    cta: "Open Findings",
    accent: "warning",
  },
  {
    id: "close",
    eyebrow: "06 · Close",
    title: "End the day with a clean handoff to tomorrow",
    copy: "Complete what shipped, reschedule intentionally, capture loose ends and finish with a short review so tomorrow starts clear.",
    icon: RefreshCcw,
    section: "review",
    cta: "Run Review",
    accent: "rose",
  },
] as const;

const sampleAgenda = [
  { time: "08:30", title: "Review overnight website alerts", type: "System check", done: true },
  { time: "09:00", title: "GearUpToFit indexation recovery batch", type: "Deep work", done: false },
  { time: "11:00", title: "Verify app funnel conversions", type: "Revenue", done: false },
  { time: "13:00", title: "Lunch / reset", type: "Personal", done: false },
  { time: "14:00", title: "Mission Control product improvements", type: "Build", done: false },
];

const samplePortfolio = [
  { label: "Websites", value: "10", detail: "all portfolio properties", icon: Globe2 },
  { label: "Open priorities", value: "7", detail: "high-leverage items only", icon: ListChecks },
  { label: "Revenue assets", value: "8", detail: "apps and funnels", icon: Layers3 },
  { label: "System alerts", value: "2", detail: "exception-driven", icon: Bell },
];

export default function DemoPage() {
  const setActiveSection = useNavigationStore((s) => s.setActiveSection);
  const [activeStep, setActiveStep] = useState(0);
  const [showGuide, setShowGuide] = useState(true);

  const current = steps[activeStep];
  const progress = Math.round(((activeStep + 1) / steps.length) * 100);
  const CurrentIcon = current.icon;

  const nextStep = () => setActiveStep((i) => Math.min(steps.length - 1, i + 1));
  const prevStep = () => setActiveStep((i) => Math.max(0, i - 1));

  const demoDayScore = useMemo(() => {
    const completed = sampleAgenda.filter((item) => item.done).length;
    return Math.round((completed / sampleAgenda.length) * 100);
  }, []);

  return (
    <div className="mc-demo-shell space-y-5 pb-10">
      <section className="mc-demo-hero">
        <div className="mc-demo-hero-glow" aria-hidden />
        <div className="relative z-10 grid gap-5 xl:grid-cols-[1.5fr_0.8fr] xl:items-end">
          <div>
            <div className="mc-demo-kicker">
              <Sparkles size={13} />
              Guided demo · read-only sandbox
            </div>
            <h1>See the optimum way to run your entire day from Mission Control.</h1>
            <p>
              This demonstration uses sample data only. It shows the fastest workflow for personal
              execution, business operations, websites, revenue assets, systems and review — without
              changing any of your real records.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowGuide(true)}
                className="btn-primary"
              >
                <WandSparkles size={15} /> Start guided demo
              </button>
              <button
                type="button"
                onClick={() => setActiveSection("dashboard")}
                className="btn-secondary"
              >
                Open real Mission Control <ArrowRight size={14} />
              </button>
            </div>
          </div>
          <div className="mc-demo-score-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="mc-demo-score-label">Sample day readiness</div>
                <div className="mc-demo-score-value">{demoDayScore}%</div>
              </div>
              <div className="mc-demo-score-ring">
                <CheckCircle2 size={24} />
              </div>
            </div>
            <div className="mc-demo-score-track">
              <span style={{ width: `${demoDayScore}%` }} />
            </div>
            <div className="mc-demo-score-foot">
              The demo intentionally shows a day in progress, not fake perfection.
            </div>
          </div>
        </div>
      </section>

      {showGuide && (
        <section className="mc-demo-guide">
          <div className="mc-demo-guide-top">
            <div>
              <div className="mc-demo-kicker">
                <Command size={12} />
                Optimal operating loop
              </div>
              <h2>{current.title}</h2>
              <p>{current.copy}</p>
            </div>
            <div className="mc-demo-progress-pill">{progress}% complete</div>
          </div>

          <div className="mc-demo-stepper">
            {steps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(index)}
                className="mc-demo-step"
                data-active={index === activeStep ? "true" : "false"}
                data-complete={index < activeStep ? "true" : "false"}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <small>{step.id}</small>
              </button>
            ))}
          </div>

          <div className="mc-demo-guide-card" data-accent={current.accent}>
            <div className="mc-demo-guide-icon">
              <CurrentIcon size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mc-demo-guide-eyebrow">{current.eyebrow}</div>
              <div className="mc-demo-guide-title">{current.title}</div>
              <div className="mc-demo-guide-copy">{current.copy}</div>
              <button
                type="button"
                onClick={() => setActiveSection(current.section)}
                className="mc-demo-guide-open"
              >
                {current.cta} <ArrowRight size={12} />
              </button>
            </div>
          </div>

          <div className="mc-demo-guide-nav">
            <button type="button" onClick={prevStep} disabled={activeStep === 0}>
              Previous
            </button>
            <button
              type="button"
              onClick={nextStep}
              disabled={activeStep === steps.length - 1}
              className="primary"
            >
              Next step <ArrowRight size={12} />
            </button>
          </div>
        </section>
      )}

      <section className="mc-demo-grid">
        {samplePortfolio.map((item) => (
          <article key={item.label} className="mc-demo-stat-card">
            <div className="mc-demo-stat-icon">
              <item.icon size={17} />
            </div>
            <div>
              <div className="mc-demo-stat-value">{item.value}</div>
              <div className="mc-demo-stat-label">{item.label}</div>
              <div className="mc-demo-stat-detail">{item.detail}</div>
            </div>
          </article>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="mc-demo-panel">
          <div className="mc-demo-panel-head">
            <div>
              <div className="mc-demo-kicker"><Clock3 size={12} /> Sample day</div>
              <h3>Execution timeline</h3>
            </div>
            <span className="badge badge-primary">Demo data</span>
          </div>
          <div className="mc-demo-agenda">
            {sampleAgenda.map((item) => (
              <div key={item.time + item.title} className="mc-demo-agenda-row" data-done={item.done}>
                <div className="mc-demo-agenda-time">{item.time}</div>
                <div className="mc-demo-agenda-dot" />
                <div className="min-w-0 flex-1">
                  <div className="mc-demo-agenda-title">{item.title}</div>
                  <div className="mc-demo-agenda-type">{item.type}</div>
                </div>
                {item.done && <CheckCircle2 size={15} className="text-success" />}
              </div>
            ))}
          </div>
        </section>

        <section className="mc-demo-panel">
          <div className="mc-demo-panel-head">
            <div>
              <div className="mc-demo-kicker"><TrendingUp size={12} /> Decision surface</div>
              <h3>What deserves attention</h3>
            </div>
          </div>
          <div className="space-y-2.5">
            {[
              {
                title: "Recover indexation before publishing more content",
                detail: "Critical · GearUpToFit",
                icon: Search,
              },
              {
                title: "Verify revenue funnel attribution",
                detail: "High · Apps & Funnels",
                icon: CircleDollarSign,
              },
              {
                title: "Review only failing infrastructure checks",
                detail: "Exception-based operations",
                icon: ShieldCheck,
              },
              {
                title: "Park low-impact ideas until the current build ships",
                detail: "Focus protection",
                icon: Lightbulb,
              },
            ].map((item) => (
              <div key={item.title} className="mc-demo-decision-row">
                <span className="mc-demo-decision-icon"><item.icon size={15} /></span>
                <span className="min-w-0 flex-1">
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mc-demo-panel">
        <div className="mc-demo-panel-head">
          <div>
            <div className="mc-demo-kicker"><BarChart3 size={12} /> Recommended rhythm</div>
            <h3>Use Mission Control by cadence, not by constantly checking everything</h3>
          </div>
        </div>
        <div className="mc-demo-rhythm-grid">
          {[
            ["Morning", "Capture → Review → choose 3 outcomes", TimerReset],
            ["Work blocks", "Focus on one task → mark done → continue", Focus],
            ["Exceptions", "Open systems only when a pulse shows attention", Bell],
            ["End of day", "Close loops → reschedule intentionally → review", RefreshCcw],
          ].map(([label, copy, Icon]) => {
            const Cmp = Icon as typeof TimerReset;
            return (
              <div key={String(label)} className="mc-demo-rhythm-card">
                <Cmp size={16} />
                <strong>{String(label)}</strong>
                <span>{String(copy)}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mc-demo-footer-note">
        <ShieldCheck size={15} />
        <div>
          <strong>Demo safety:</strong> this page is presentation-only. It does not insert sample
          tasks, payments, credentials, analytics, followers or system-health records into your real
          Mission Control database.
        </div>
      </section>
    </div>
  );
}
