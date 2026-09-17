// ─── FirstRunExperience — the gorgeous empty state ───────────────────────────
// Zero data != dead dashboard. Editorial cards with clear onboarding steps.

import { ArrowRight, Cloud, Keyboard, Mic, Sparkles, Timer, Zap } from "lucide-react";
import { useNavigationStore } from "@/stores/navigationStore";

const STARTERS = [
  {
    icon: Zap,
    title: "Capture your first task",
    hint: 'Type anything in the bar above — "fix sitemap tomorrow urgent" lands as a task with a date and priority.',
  },
  {
    icon: Mic,
    title: "Or just talk",
    hint: "The floating mic turns speech into structured items — tasks, notes, ideas, links.",
  },
  {
    icon: Cloud,
    title: "Bring your data back",
    hint: "Already using Mission Control elsewhere? Sign in and this device fills itself from your private backup.",
  },
];

export default function FirstRunExperience() {
  const setActiveSection = useNavigationStore((s) => s.setActiveSection);

  return (
    <section className="se-card ultra-rise relative overflow-hidden p-6 sm:p-10">
      <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-primary/[0.06] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-accent/[0.05] blur-3xl" />

      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
          <Sparkles size={11} /> First run
        </div>

        <h2 className="mt-4 max-w-lg font-display text-[26px] font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-[34px]">
          This system tells you what matters — the moment it knows your work.
        </h2>
        <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-muted-foreground">
          No data on this device yet — and that is stated honestly, never faked. One capture is all
          it takes: the timeline, the NOW marker, and the priority engine turn on with the first
          item you add.
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          {STARTERS.map((s) => (
            <div
              key={s.title}
              className="se-empty-card group flex flex-col rounded-[22px] border border-border/50 bg-background/60 p-4 transition hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_24px_48px_-32px_hsl(var(--primary)/0.6)]"
            >
              <span className="se-empty-action">
                <s.icon size={18} />
              </span>
              <h3 className="mt-3 font-display text-[14.5px] font-bold leading-snug tracking-tight text-foreground">
                {s.title}
              </h3>
              <p className="mt-1.5 flex-1 text-[11.5px] leading-relaxed text-muted-foreground">
                {s.hint}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setActiveSection("tasks")}
            className="se-btn se-btn-primary h-10 px-4 text-[12.5px]"
          >
            Open Tasks <ArrowRight size={14} />
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-2xl border border-border/50 bg-secondary/40 px-3.5 py-2.5 text-[11.5px] font-semibold text-muted-foreground">
            <Keyboard size={13} /> Cmd+K anywhere
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-2xl border border-border/50 bg-secondary/40 px-3.5 py-2.5 text-[11.5px] font-semibold text-muted-foreground">
            <Timer size={13} /> Focus dock on the hero
          </span>
        </div>
      </div>
    </section>
  );
}
