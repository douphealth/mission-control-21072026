// ─── Mission Control — Editorial Dashboard ────────────────────────────────────
// First viewport: greeting hero, stat tiles, plan + timeline.
// Capture is one keystroke away. Everything staggers in beautifully.
// Desktop: plan beside the day's timeline. Mobile: agenda first.

import { Suspense, lazy, useEffect, useState } from "react";
import {
  TriangleAlert as AlertTriangle,
  ChartBar as BarChart3,
  CalendarClock,
  CircleCheck as CheckCircle2,
  ChevronDown,
  Inbox,
  Moon,
  Zap,
  CheckSquare,
  PanelsTopLeft,
  Globe,
  Github,
  Search,
  ArrowUpRight,
  AppWindow,
  Command,
  Mail,
} from "lucide-react";
import TodayPlan from "@/components/dashboard/TodayPlan";
import TodayTimeline from "@/components/dashboard/TodayTimeline";
import InboxStrip from "@/components/dashboard/InboxStrip";
import FocusDock from "@/components/dashboard/FocusDock";
import QuickCaptureBar from "@/components/dashboard/QuickCaptureBar";
import FirstRunExperience from "@/components/dashboard/FirstRunExperience";
import HeroNowBand from "@/components/dashboard/HeroNowBand";
import ShortcutsOverlay from "@/components/dashboard/ShortcutsOverlay";
import AreaSwitch from "@/components/AreaSwitch";
import DayClose from "@/components/DayClose";
import type { WorkItem } from "@/lib/workQueue";
import { useDailyOps } from "@/hooks/useDailyOps";
import { useIsMobile } from "@/hooks/use-mobile";
import { hhmmNow } from "@/lib/timeline";
import { usePlanStore } from "@/stores/planStore";
import { useNavigationStore } from "@/stores/navigationStore";
import {
  isGmailDeliverySetupError,
  syncDailyDigestSnapshot,
} from "@/lib/dailyDigestSync";
import { toast } from "sonner";

const InsightsPanel = lazy(() => import("@/components/dashboard/InsightsPanel"));
const BelowFold = lazy(() => import("@/components/dashboard/BelowFold"));
const LifeBusinessControlTower = lazy(
  () => import("@/components/dashboard/LifeBusinessControlTower"),
);

export default function DashboardHome() {
  const ops = useDailyOps();
  const isMobile = useIsMobile();
  const [showInsights, setShowInsights] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [sendingBriefing, setSendingBriefing] = useState(false);
  const [dockItem, setDockItem] = useState<WorkItem | null>(null);
  const workdayEnd = usePlanStore((s) => s.workdayEnd);
  const setActiveSection = useNavigationStore((s) => s.setActiveSection);
  const setCommandPaletteOpen = useNavigationStore((s) => s.setCommandPaletteOpen);
  const evening = hhmmNow() >= workdayEnd || showClose;

  const sendExecutiveEmail = async () => {
    if (sendingBriefing) return;
    setSendingBriefing(true);
    try {
      const result = await syncDailyDigestSnapshot({ sendNow: true });
      if (!result.ok) throw new Error(result.error || "Could not send the executive briefing.");
      toast.success("Executive briefing sent", {
        description: result.email ? `Delivered to ${result.email}` : "Email delivered.",
      });
    } catch (error) {
      if (isGmailDeliverySetupError(error)) {
        toast.error("Gmail needs one Google-side permission", {
          description: error.message,
          action: {
            label: "Enable Gmail API",
            onClick: () => window.open(error.setupUrl, "_blank", "noopener,noreferrer"),
          },
        });
      } else {
        toast.error("Executive email was not sent", {
          description: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      setSendingBriefing(false);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "?" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const typing =
        !!el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable);
      if (typing) return;
      e.preventDefault();
      setShowShortcuts((v) => !v);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const commitmentsTotal = ops.commitments.length;
  const commitmentsDone = ops.commitments.filter(
    (c) => c.raw && (c.raw as { status?: string }).status === "done",
  ).length;
  const attentionCount = ops.timeline.counts.flags;
  const timedCount = ops.timeline.counts.timed;
  const queuedCount = ops.timeline.counts.untimed;

  const plan = (
    <TodayPlan
      today={ops.today}
      nextAction={ops.nextAction}
      commitments={ops.commitments}
      outcomesAreChosen={ops.outcomesAreChosen}
      suggestedPlan={ops.suggestedPlan}
      capacity={ops.capacity}
      fixed={ops.fixed}
      onComplete={ops.complete}
      onCommit={ops.commit}
      onFocus={(item) => setDockItem(item)}
    />
  );

  const timeline = (
    <TodayTimeline
      timeline={ops.timeline}
      onComplete={ops.complete}
      onPlan={ops.schedule}
      onCommit={ops.commit}
    />
  );

  return (
    <div className="mc16-dashboard flex flex-col gap-4 pb-8 sm:gap-5">
      <div className="mc-home-toolbar ultra-fade">
        <div className="flex min-w-0 items-center gap-2">
          <span className="mc-home-toolbar-label">Today</span>
          <AreaSwitch />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void sendExecutiveEmail()}
            disabled={sendingBriefing}
            className="mc-home-toolbar-action"
            aria-label="Send executive briefing email now"
            title="Generate a fresh Mission Control briefing and email it now"
          >
            <Mail size={13} />
            <span className="hidden sm:inline">{sendingBriefing ? "Sending…" : "Email brief"}</span>
          </button>
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="mc-home-toolbar-action"
            aria-label="Open command search"
            title="Search everything"
          >
            <Command size={13} />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden lg:inline">Ctrl K</kbd>
          </button>
          <button
            onClick={() => setShowClose((v) => !v)}
            className="mc-home-toolbar-action"
            aria-pressed={showClose}
          >
            <Moon size={13} />
            <span>Close day</span>
          </button>
        </div>
      </div>

      <div className="ultra-rise-1">
        <HeroNowBand
          nextAction={ops.nextAction}
          commitmentsTotal={commitmentsTotal}
          commitmentsDone={commitmentsDone}
          plannedMin={ops.capacity.plannedMin}
          availableMin={ops.capacity.availableMin}
          onFocus={(item) => setDockItem(item)}
          onComplete={ops.complete}
        />
      </div>

      <section className="mc21-capture-deck ultra-rise-1" aria-label="Quick capture">
        <div className="mc21-capture-deck-head">
          <div>
            <span>Capture</span>
            <strong>Get it out of your head in seconds.</strong>
          </div>
          <small>N · natural language · Inbox by default</small>
        </div>
        <QuickCaptureBar />
      </section>

      {dockItem && (
        <FocusDock
          item={dockItem}
          onDone={() => setDockItem(null)}
          onClose={() => setDockItem(null)}
        />
      )}

      {ops.isEmpty ? (
        <FirstRunExperience />
      ) : (
        <>
          {isMobile ? (
            <div className="mc21-today-stack ultra-rise-3 flex flex-col gap-4">
              {plan}
              {evening && <DayClose tasks={ops.allTasks} compact />}
              <InboxStrip tasks={ops.inboxTasks} today={ops.today} />
              {timeline}
            </div>
          ) : (
            <div className="mc21-day-grid ultra-rise-3 grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="flex flex-col gap-4 lg:col-span-7">
                {plan}
                {evening && <DayClose tasks={ops.allTasks} />}
                <InboxStrip tasks={ops.inboxTasks} today={ops.today} />
              </div>
              <div className="lg:col-span-5">{timeline}</div>
            </div>
          )}
        </>
      )}

      <section className="mc21-utility-deck ultra-rise-3" aria-label="Today signals and workspaces">
        <div className="mc21-utility-head">
          <div>
            <span>Move faster</span>
            <strong>Signals &amp; workspaces</strong>
          </div>
          <small>Shortcuts only. Portfolio diagnostics stay out of today.</small>
        </div>

        {!ops.isEmpty && (
          <div className="mc-kpi-grid" role="navigation" aria-label="Today at a glance">
            {attentionCount > 0 && (
              <button type="button" onClick={() => setActiveSection("tasks")} className="mc-kpi-card" data-tone="bad">
                <span className="mc-kpi-icon"><AlertTriangle size={15} /></span>
                <span className="mc-kpi-value">{attentionCount}</span>
                <span className="mc-kpi-copy"><strong>Needs attention</strong><small>Open tasks that need a decision</small></span>
                <ArrowUpRight size={13} className="mc-kpi-arrow" />
              </button>
            )}
            <button type="button" onClick={() => setActiveSection("calendar")} className="mc-kpi-card" data-tone="info">
              <span className="mc-kpi-icon"><CalendarClock size={15} /></span>
              <span className="mc-kpi-value">{timedCount}</span>
              <span className="mc-kpi-copy"><strong>Timed today</strong><small>Calendar and scheduled work</small></span>
              <ArrowUpRight size={13} className="mc-kpi-arrow" />
            </button>
            <button type="button" onClick={() => setActiveSection("tasks")} className="mc-kpi-card">
              <span className="mc-kpi-icon"><Zap size={15} /></span>
              <span className="mc-kpi-value">{queuedCount}</span>
              <span className="mc-kpi-copy"><strong>Queued</strong><small>Ready to plan or execute</small></span>
              <ArrowUpRight size={13} className="mc-kpi-arrow" />
            </button>
            {commitmentsTotal > 0 && (
              <button type="button" onClick={() => setActiveSection("tasks")} className="mc-kpi-card" data-tone="good">
                <span className="mc-kpi-icon"><CheckCircle2 size={15} /></span>
                <span className="mc-kpi-value">{commitmentsDone}/{commitmentsTotal}</span>
                <span className="mc-kpi-copy"><strong>Outcomes done</strong><small>Today's committed results</small></span>
                <ArrowUpRight size={13} className="mc-kpi-arrow" />
              </button>
            )}
            {ops.inboxTasks.length > 0 && (
              <button type="button" onClick={() => setActiveSection("tasks")} className="mc-kpi-card" data-tone="violet">
                <span className="mc-kpi-icon"><Inbox size={15} /></span>
                <span className="mc-kpi-value">{ops.inboxTasks.length}</span>
                <span className="mc-kpi-copy"><strong>Inbox</strong><small>Captured, not yet planned</small></span>
                <ArrowUpRight size={13} className="mc-kpi-arrow" />
              </button>
            )}
          </div>
        )}

        <div className="mc-launch-grid" aria-label="Primary workspaces">
          {[
            { id: "tasks", label: "Tasks", detail: "Execute", icon: CheckSquare, tone: "mint" },
            { id: "projects", label: "Projects", detail: "Priorities", icon: PanelsTopLeft, tone: "violet" },
            { id: "websites", label: "Websites", detail: "Growth", icon: Globe, tone: "sky" },
            { id: "seo", label: "SEO / AI", detail: "Visibility", icon: Search, tone: "amber" },
            { id: "apps-funnels", label: "Apps", detail: "Funnels", icon: AppWindow, tone: "rose" },
            { id: "github", label: "GitHub", detail: "Build", icon: Github, tone: "indigo" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              className="mc-launch-card group"
              data-tone={item.tone}
              aria-label={`${item.label}: ${item.detail}`}
            >
              <span className="mc-launch-icon"><item.icon size={16} /></span>
              <span className="mc-launch-copy min-w-0 flex-1 text-left">
                <span className="mc-launch-title block truncate text-[12px] font-extrabold text-foreground">{item.label}</span>
                <span className="mc-launch-detail block text-[9.5px] font-medium text-muted-foreground">{item.detail}</span>
              </span>
              <ArrowUpRight size={13} className="text-muted-foreground/45 transition group-hover:text-primary" />
            </button>
          ))}
        </div>
      </section>

      <section className="ultra-rise-4">
        <button
          onClick={() => setShowOverview((v) => !v)}
          className="se-card flex w-full items-center justify-between p-4 text-left transition hover:-translate-y-0.5 sm:p-5"
          aria-expanded={showOverview}
        >
          <span>
            <span className="block font-display text-[15px] font-extrabold tracking-tight text-foreground">
              Life &amp; business overview
            </span>
            <span className="block text-[11px] text-muted-foreground">
              Portfolio, finance, websites, apps and systems — open when reviewing, not while executing today.
            </span>
          </span>
          <ChevronDown
            size={16}
            className={`text-muted-foreground transition-transform ${showOverview ? "rotate-180" : ""}`}
          />
        </button>
        {showOverview && (
          <div className="mt-4">
            <Suspense fallback={<div className="v10-skeleton h-72" />}>
              <LifeBusinessControlTower />
            </Suspense>
          </div>
        )}
      </section>

      {/* ═══ Everything else — on demand ═══ */}
      {!ops.isEmpty && (
        <section className="ultra-rise-4">
          <button
            onClick={() => setShowMore((v) => !v)}
            className="se-card flex w-full items-center justify-between p-4 text-left transition hover:-translate-y-0.5 sm:p-5"
            aria-expanded={showMore}
          >
            <span>
              <span className="block font-display text-[15px] font-extrabold tracking-tight text-foreground">
                Sites, validations, intelligence &amp; sync
              </span>
              <span className="block text-[11px] text-muted-foreground">
                Operational pulses — not needed to pick your next action
              </span>
            </span>
            <ChevronDown
              size={16}
              className={`text-muted-foreground transition-transform ${showMore ? "rotate-180" : ""}`}
            />
          </button>
          {showMore && (
            <div className="mt-4">
              <Suspense fallback={<div className="v10-skeleton h-40" />}>
                <BelowFold ops={ops} />
              </Suspense>
            </div>
          )}
        </section>
      )}

      <section className="ultra-rise-4">
        <button
          onClick={() => setShowInsights((v) => !v)}
          className="se-card flex w-full items-center justify-between p-4 text-left transition hover:-translate-y-0.5 sm:p-5"
          aria-expanded={showInsights}
        >
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BarChart3 size={16} />
            </span>
            <span>
              <span className="block font-display text-[15px] font-extrabold tracking-tight text-foreground">
                Insights &amp; portfolio
              </span>
              <span className="block text-[11px] text-muted-foreground">
                Momentum, board, finance, sites, notes — the full picture
              </span>
            </span>
          </span>
          <ChevronDown
            size={16}
            className={`text-muted-foreground transition-transform ${showInsights ? "rotate-180" : ""}`}
          />
        </button>
        {showInsights && (
          <div className="mt-4">
            <Suspense fallback={<div className="v10-skeleton h-40" />}>
              <InsightsPanel />
            </Suspense>
          </div>
        )}
      </section>

      <ShortcutsOverlay open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}
