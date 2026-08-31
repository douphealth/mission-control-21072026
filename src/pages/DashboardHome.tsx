// ─── Mission Control — the one canonical Daily Home ──────────────────────────
// Merges the premium visual DNA of the old dashboard with the operational
// correctness of Now / Today. First viewport = Now, Today, Attention.
// Everything analytical lives below the fold, loaded on demand.

import { Suspense, lazy, useState } from "react";
import { BarChart3, ChevronDown, Inbox, PauseCircle, Scale } from "lucide-react";
import DailyHero from "@/components/dashboard/DailyHero";
import TodayCommitments from "@/components/dashboard/TodayCommitments";
import AttentionFeed from "@/components/dashboard/AttentionFeed";
import DailyAgenda from "@/components/dashboard/DailyAgenda";
import ReliabilityPanel from "@/components/ReliabilityPanel";
import { useDailyOps } from "@/hooks/useDailyOps";
import { useNavigationStore } from "@/stores/navigationStore";

const InsightsPanel = lazy(() => import("@/components/dashboard/InsightsPanel"));

export default function DashboardHome() {
  const ops = useDailyOps();
  const setActiveSection = useNavigationStore((s) => s.setActiveSection);
  const [showInsights, setShowInsights] = useState(false);

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
      />

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
          <TodayCommitments
            commitments={ops.commitments}
            upNext={ops.upNext}
            today={ops.today}
            onComplete={ops.complete}
            onPlan={ops.schedule}
            onCommit={ops.commit}
          />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-5">
          <AttentionFeed items={ops.attention} />
          <DailyAgenda rows={ops.agenda} />
        </div>
      </div>

      <ReliabilityPanel compact />

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
