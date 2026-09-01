// ─── FirstRunExperience — the gorgeous empty state ───────────────────────────
// Zero data ≠ dead dashboard. A new device shows: what Mission Control does,
// 3 real ways to get value in the next 30 seconds, and an honest "no data yet"
// that never fabricates rows (no-demo-data rule respected).

import { ArrowRight, Cloud, Keyboard, Mic, Sparkles, Timer, Zap } from "lucide-react";
import { useNavigationStore } from "@/stores/navigationStore";

const STARTERS = [
  {
    icon: Zap,
    title: "Capture your first task",
    hint: "Type anything in the bar above — “fix sitemap tomorrow urgent” lands as a task with a date and priority.",
    action: "Try the capture bar",
  },
  {
    icon: Mic,
    title: "Or just talk",
    hint: "The floating mic turns speech into structured items — tasks, notes, ideas, links.",
    action: "Tap the mic",
  },
  {
    icon: Cloud,
    title: "Bring your data back",
    hint: "Already using Mission Control elsewhere? Sign in and this device fills itself from your private backup.",
    action: "Back up now",
  },
];

export default function FirstRunExperience() {
  const setActiveSection = useNavigationStore((s) => s.setActiveSection);

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-border/60 bg-card p-6 sm:p-10">
      <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-primary/[0.07] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-accent/[0.06] blur-3xl" />

      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          <Sparkles size={11} /> First run
        </div>

        <h2 className="font-display mt-4 max-w-lg text-[26px] font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-[34px]">
          This system tells you what matters — the moment it knows your work.
        </h2>
        <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-muted-foreground">
          No data on this device yet — and that is stated honestly, never faked.
          One capture is all it takes: the timeline, the NOW marker, and the
          priority engine turn on with the first item you add.
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          {STARTERS.map((s) => (
            <div
              key={s.title}
              className="group flex flex-col rounded-[22px] border border-border/60 bg-background/70 p-4 transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_48px_-32px_hsl(var(--primary)/0.7)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                <s.icon size={17} />
              </span>
              <h3 className="font-display mt-3 text-[14.5px] font-bold leading-snug tracking-tight text-foreground">
                {s.title}
              </h3>
              <p className="mt-1.5 flex-1 text-[11.5px] leading-relaxed text-muted-foreground">{s.hint}</p>
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setActiveSection("tasks")}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-[12.5px] font-bold text-primary-foreground transition active:scale-[0.97]"
          >
            Open Tasks <ArrowRight size={14} />
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-2xl border border-border/60 bg-secondary/50 px-3.5 py-2.5 text-[11.5px] font-semibold text-muted-foreground">
            <Keyboard size={13} /> ⌘K anywhere
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-2xl border border-border/60 bg-secondary/50 px-3.5 py-2.5 text-[11.5px] font-semibold text-muted-foreground">
            <Timer size={13} /> Focus dock on the hero
          </span>
        </div>
      </div>
    </section>
  );
}
