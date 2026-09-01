// ─── Mission Control — the one canonical Daily Home ──────────────────────────
// Merges the premium visual DNA of the old dashboard with the operational
// correctness of Now / Today. First viewport = Now, Today, Attention.
// Everything analytical lives below the fold, loaded on demand.

import { Suspense, lazy, useState } from "react";
import { BarChart3, ChevronDown, Inbox, PauseCircle, Scale } from "lucide-react";
import DailyHero from "@/components/dashboard/DailyHero";
import TodayTimeline from "@/components/dashboard/TodayTimeline";
import FocusDock from "@/components/dashboard/FocusDock";
import QuickCaptureBar from "@/components/dashboard/QuickCaptureBar";
import SitePulse from "@/components/dashboard/SitePulse";
import ValidationPulse from "@/components/dashboard/ValidationPulse";
import IntelligencePulse from "@/components/dashboard/IntelligencePulse";
import type { WorkItem } from "@/lib/workQueue";

import ReliabilityPanel from "@/components/ReliabilityPanel";
import { useDailyOps } from "@/hooks/useDailyOps";
import { useNavigationStore } from "@/stores/navigationStore";

const InsightsPanel = lazy(() => import("@/components/dashboard/InsightsPanel"));

export default function DashboardHome() {
  const ops = useDailyOps();
  const setActiveSection = useNavigationStore((s) => s.setActiveSection);
  const [showInsights, setShowInsights] = useState(false);
  const [dockItem, setDockItem] = useState<WorkItem | null>(null);

  const pills = [
    { label: "Inbox", value: ops.inbox, icon: Inbox, section: "tasks" },
    { label: "Waiting on", value: ops.waiting, icon: PauseCircle, section: "tasks" },
    { label: "Decisions", value: ops.openDecisions, icon: Scale, section: "decisions" },
  ];

  return (
    <div className="flex flex-col gap-5 pb-8 sm:gap-6">
      <DailyHero
        now={ops.now}
        today={ops.today}
        stats={{
          commitments: ops.commitments.length,
          overdue: ops.briefing.overdue.length,
          completedToday: ops.briefing.completedToday,
          inbox: ops.inbox,
        }}
        onComplete={ops.complete}
        onPlan={ops.schedule}
        onDockFocus={ops.now && ops.now.kind === "task" ? () => setDockItem(ops.now!) : undefined}
      />

      <QuickCaptureBar />

      {dockItem && (
        <FocusDock
          item={dockItem}
          onDone={() => setDockItem(null)}
          onClose={() => setDockItem(null)}
        />
      )}

      <div className="grid grid-cols-3 gap-3">
        {pills.map((p) => (
          <button
            key={p.label}
            onClick={() => setActiveSection(p.section)}
            className="enterprise-card flex items-center gap-3 rounded-2xl p-3.5 text-left transition hover:-translate-y-0.5 sm:p-4"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
              <p.icon size={15} />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-[20px] font-extrabold leading-none tabular-nums text-foreground">
                {p.value}
              </span>
              <span className="block truncate text-[11px] font-semibold text-muted-foreground">{p.label}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <TodayTimeline
            timeline={ops.timeline}
            onComplete={ops.complete}
            onPlan={ops.schedule}
            onCommit={ops.commit}
          />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-5">
          <ReliabilityPanel compact />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-7">
          <SitePulse rows={ops.sitePulse} />
          <ValidationPulse items={ops.validationPulse} today={ops.today} />
        </div>
        <div className="lg:col-span-5">
          <IntelligencePulse items={ops.intelligence} />
        </div>
      </div>

      {/* ═══ INSIGHTS — below the fold, loaded only when asked for ═══ */}
      <section>
        <button
          onClick={() => setShowInsights((v) => !v)}
          className="enterprise-card flex w-full items-center justify-between rounded-[24px] p-4 text-left transition hover:-translate-y-0.5 sm:p-5"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BarChart3 size={17} />
            </span>
            <span>
              <span className="block font-display text-[16px] font-extrabold tracking-tight text-foreground">
                Insights &amp; portfolio
              </span>
              <span className="block text-[11px] text-muted-foreground">
                Momentum, board, finance, sites, notes — the full picture
              </span>
            </span>
          </span>
          <ChevronDown size={16} className={`text-muted-foreground transition-transform ${showInsights ? "rotate-180" : ""}`} />
        </button>

        {showInsights && (
          <div className="mt-4">
            <Suspense
              fallback={
                <div className="animate-pulse space-y-4">
                  <div className="h-40 rounded-[28px] bg-muted/30" />
                  <div className="h-64 rounded-[28px] bg-muted/30" />
                </div>
              }
            >
              <InsightsPanel />
            </Suspense>
          </div>
        )}
      </section>
    </div>
  );
}
