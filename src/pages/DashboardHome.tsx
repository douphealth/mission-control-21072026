// ─── Mission Control — Today is the product's centre ─────────────────────────
// First viewport answers: what matters today, what's fixed, what's next, is it
// realistic. Capture is one keystroke away. Metrics and pulses live below.
// Desktop: plan beside the day's timeline. Mobile: agenda first, capture in reach.
//
// ULTRA: the HeroNowBand (deep-space hero with floating orbs + progress ring)
// leads, then a grid of glass stat tiles, then the plan/timeline pair.

import { Suspense, lazy, useEffect, useState } from "react";
import { TriangleAlert as AlertTriangle, ChartBar as BarChart3, CalendarClock, CircleCheck as CheckCircle2, ChevronDown, Inbox, Moon, Timer, Zap } from "lucide-react";
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

const InsightsPanel = lazy(() => import("@/components/dashboard/InsightsPanel"));
const BelowFold = lazy(() => import("@/components/dashboard/BelowFold"));

export default function DashboardHome() {
  const ops = useDailyOps();
  const isMobile = useIsMobile();
  const [showInsights, setShowInsights] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [dockItem, setDockItem] = useState<WorkItem | null>(null);
  const workdayEnd = usePlanStore((s) => s.workdayEnd);
  const evening = hhmmNow() >= workdayEnd || showClose;

  // "?" opens the shortcuts overlay (when not typing in a field).
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

  // Read-only derived stats for the hero + stat tiles.
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
    <div className="flex flex-col gap-4 pb-8 sm:gap-5">
      {/* Date + area switch + close day */}
      <div className="ultra-fade flex items-center justify-between gap-3">
        <p className="text-[12px] font-semibold text-muted-foreground">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        <div className="flex items-center gap-2">
          <AreaSwitch />
          <button
            onClick={() => setShowClose((v) => !v)}
            className="flex h-8 items-center gap-1.5 rounded-xl border border-border/60 bg-secondary/50 px-2.5 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-pressed={showClose}
          >
            <Moon size={12} /> Close day
          </button>
        </div>
      </div>

      <div className="ultra-rise-1">
        <QuickCaptureBar />
      </div>

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
          {/* ── ULTRA hero: deep-space NOW band ── */}
          <HeroNowBand
            nextAction={ops.nextAction}
            commitmentsTotal={commitmentsTotal}
            commitmentsDone={commitmentsDone}
            plannedMin={ops.capacity.plannedMin}
            availableMin={ops.capacity.availableMin}
            onFocus={(item) => setDockItem(item)}
            onComplete={ops.complete}
          />

          {/* ── ULTRA stat tiles: glass grid ── */}
          <div className="ultra-rise-2 ultra-stat-grid" role="status">
            {attentionCount > 0 && (
              <div className="ultra-stat" data-tone="bad">
                <div className="ultra-stat-icon">
                  <AlertTriangle size={15} />
                </div>
                <div className="ultra-stat-num">{attentionCount}</div>
                <div className="ultra-stat-label">needing attention</div>
              </div>
            )}
            <div className="ultra-stat" data-tone="info">
              <div className="ultra-stat-icon">
                <CalendarClock size={15} />
              </div>
              <div className="ultra-stat-num">{timedCount}</div>
              <div className="ultra-stat-label">timed today</div>
            </div>
            <div className="ultra-stat">
              <div className="ultra-stat-icon">
                <Zap size={15} />
              </div>
              <div className="ultra-stat-num">{queuedCount}</div>
              <div className="ultra-stat-label">queued</div>
            </div>
            {commitmentsTotal > 0 && (
              <div className="ultra-stat" data-tone="good">
                <div className="ultra-stat-icon">
                  <CheckCircle2 size={15} />
                </div>
                <div className="ultra-stat-num">
                  {commitmentsDone}/{commitmentsTotal}
                </div>
                <div className="ultra-stat-label">outcomes done</div>
              </div>
            )}
            {ops.inboxTasks.length > 0 && (
              <div className="ultra-stat" data-tone="violet">
                <div className="ultra-stat-icon">
                  <Inbox size={15} />
                </div>
                <div className="ultra-stat-num">{ops.inboxTasks.length}</div>
                <div className="ultra-stat-label">in inbox</div>
              </div>
            )}
          </div>

          {isMobile ? (
            <div className="ultra-rise-3 flex flex-col gap-4">
              {plan}
              {evening && <DayClose tasks={ops.allTasks} compact />}
              <InboxStrip tasks={ops.inboxTasks} today={ops.today} />
              {timeline}
            </div>
          ) : (
            <div className="ultra-rise-3 grid grid-cols-1 gap-4 lg:grid-cols-12">
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

      {/* ═══ Everything else — on demand ═══ */}
      {!ops.isEmpty && (
        <section className="ultra-rise-4">
          <button
            onClick={() => setShowMore((v) => !v)}
            className="enterprise-card v10-card flex w-full items-center justify-between rounded-[24px] p-4 text-left transition hover:-translate-y-0.5 sm:p-5"
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
          className="enterprise-card v10-card flex w-full items-center justify-between rounded-[24px] p-4 text-left transition hover:-translate-y-0.5 sm:p-5"
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
