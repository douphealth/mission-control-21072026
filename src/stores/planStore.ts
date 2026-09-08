// Planning preferences + private local metrics. Persisted on this device only.
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AreaFilter = "all" | "personal" | "work";

export interface PlanMetrics {
  captures: number;
  captureMsTotal: number;
  morningPlans: number;
  morningPlanMsTotal: number;
  dayCloses: number;
  blockMoves: number;
  syncFailures: number;
}

interface PlanState {
  workdayStart: string; // HH:MM
  workdayEnd: string; // HH:MM
  area: AreaFilter;
  /** Push personal items to Google Calendar as "Busy" without title/notes. */
  personalAsBusy: boolean;
  lastMorningPlan: string | null; // YYYY-MM-DD
  lastDayClose: string | null; // YYYY-MM-DD
  metrics: PlanMetrics;
  setWorkday: (start: string, end: string) => void;
  setArea: (a: AreaFilter) => void;
  setPersonalAsBusy: (v: boolean) => void;
  markMorningPlan: (day: string, ms?: number) => void;
  markDayClose: (day: string) => void;
  bump: (key: keyof PlanMetrics, by?: number) => void;
}

const zeroMetrics: PlanMetrics = {
  captures: 0,
  captureMsTotal: 0,
  morningPlans: 0,
  morningPlanMsTotal: 0,
  dayCloses: 0,
  blockMoves: 0,
  syncFailures: 0,
};

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      workdayStart: "09:00",
      workdayEnd: "18:00",
      area: "all",
      personalAsBusy: true,
      lastMorningPlan: null,
      lastDayClose: null,
      metrics: zeroMetrics,
      setWorkday: (workdayStart, workdayEnd) => set({ workdayStart, workdayEnd }),
      setArea: (area) => set({ area }),
      setPersonalAsBusy: (personalAsBusy) => set({ personalAsBusy }),
      markMorningPlan: (day, ms = 0) =>
        set((s) => ({
          lastMorningPlan: day,
          metrics: {
            ...s.metrics,
            morningPlans: s.metrics.morningPlans + 1,
            morningPlanMsTotal: s.metrics.morningPlanMsTotal + ms,
          },
        })),
      markDayClose: (day) =>
        set((s) => ({
          lastDayClose: day,
          metrics: { ...s.metrics, dayCloses: s.metrics.dayCloses + 1 },
        })),
      bump: (key, by = 1) =>
        set((s) => ({ metrics: { ...s.metrics, [key]: (s.metrics[key] ?? 0) + by } })),
    }),
    { name: "mc-plan-v1" },
  ),
);

/** Visibility filter — never a permission. Tasks without an area count as work. */
export function inArea(task: { area?: string }, area: AreaFilter): boolean {
  if (area === "all") return true;
  return (task.area ?? "work") === area;
}
