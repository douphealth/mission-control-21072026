// ─── Canonical daily operating logic ─────────────────────────────────────────
// One source of truth for the Daily Mission Control home. Both the canonical
// home and any compatibility route consume this — no duplicated business logic.

import { useMemo } from "react";
import { toast } from "sonner";
import {
  useTasks,
  useReminders,
  usePayments,
  useDecisions,
  useSyncHealth,
  useUpdateItem,
  useWebsites,
  useNotes,
  useSEOProfiles,
  useSEOIssues,
  useSEOSnapshots,
  useStreamItems,
  useValidations,
} from "@/hooks/useTableData";
import { buildWorkQueue, splitQueue, type WorkItem } from "@/lib/workQueue";
import { buildAttention } from "@/lib/whyNow";
import { buildSitePulse } from "@/lib/sitePulse";
import { pendingValidations } from "@/lib/validations";
import { selectIntelligence } from "@/lib/intelligence";
import { todayISO, addDaysLocal, buildBriefing } from "@/lib/overdue";
import { actOnDecision, deferDecision } from "@/lib/decisions";
import { buildTimeline, hhmmNow, type Timeline } from "@/lib/timeline";
import type { Task } from "@/lib/db";
import { computeCapacity, fixedEventsFor, isPlannedToday, suggestOutcomes } from "@/lib/planning";
import { usePlanStore, inArea } from "@/stores/planStore";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { isGCalConnected } from "@/lib/googleCalendar";

export function useDailyOps() {
  const allTasks = useTasks();
  const reminders = useReminders();
  const payments = usePayments();
  const decisions = useDecisions();
  const health = useSyncHealth();
  const updateItem = useUpdateItem();
  const websites = useWebsites();
  const notes = useNotes();
  const seoProfiles = useSEOProfiles();
  const seoIssues = useSEOIssues();
  const seoSnapshots = useSEOSnapshots();
  const stream = useStreamItems();
  const validations = useValidations();
  const { area, workdayStart, workdayEnd } = usePlanStore();
  const gcal = useGoogleCalendar({ autoFetch: isGCalConnected() });
  const gcalEvents = gcal.rawEvents;

  /** Area is a visibility filter, never a permission. */
  const tasks = useMemo(() => allTasks.filter((t) => inArea(t, area)), [allTasks, area]);

  const today = todayISO();

  const queues = useMemo(
    () => splitQueue(buildWorkQueue({ tasks, reminders, payments, decisions, today })),
    [tasks, reminders, payments, decisions, today],
  );

  const attention = useMemo(
    () =>
      buildAttention({
        work: queues.all,
        decisions,
        payments,
        health,
        seoIssues,
        validations,
        today,
      }),
    [queues.all, decisions, payments, health, seoIssues, validations, today],
  );

  const sitePulse = useMemo(
    () => buildSitePulse({ websites, seoProfiles, seoIssues, seoSnapshots, health }),
    [websites, seoProfiles, seoIssues, seoSnapshots, health],
  );

  const validationPulse = useMemo(
    () => pendingValidations(validations, today),
    [validations, today],
  );

  const intelligence = useMemo(
    () => selectIntelligence({ stream, websites, tasks }),
    [stream, websites, tasks],
  );

  const briefing = useMemo(() => buildBriefing(tasks as Task[], today), [tasks, today]);

  /** True first-run: zero rows in every core table. Drives the gorgeous
   *  empty state instead of a dead dashboard. Never fabricated rows. */
  const isEmpty = useMemo(
    () =>
      tasks.length === 0 &&
      reminders.length === 0 &&
      payments.length === 0 &&
      decisions.length === 0 &&
      websites.length === 0 &&
      notes.length === 0,
    [tasks, reminders, payments, decisions, websites, notes],
  );

  /** Outcomes = tasks explicitly chosen for today (pinned or with a block/plan
   *  for today). The engine fills in when nothing has been chosen yet. */
  const dayItems = useMemo(
    () => (queues.now ? [queues.now, ...queues.today] : queues.today),
    [queues.now, queues.today],
  );
  const chosenOutcomes = useMemo(
    () => dayItems.filter((i) => i.kind === "task" && isPlannedToday(i.raw as Task, today)),
    [dayItems, today],
  );
  const commitments = useMemo(
    () => (chosenOutcomes.length ? chosenOutcomes.slice(0, 5) : queues.today.slice(0, 3)),
    [chosenOutcomes, queues.today],
  );
  const outcomesAreChosen = chosenOutcomes.length > 0;
  const upNext = useMemo(
    () => queues.today.filter((i) => !commitments.some((c) => c.id === i.id)),
    [queues.today, commitments],
  );
  /** One clear next action: the top of what was chosen, else the engine's #1. */
  const nextAction = useMemo(
    () => commitments.find((i) => i.kind === "task" && (i.raw as Task).status !== "blocked") ?? queues.now ?? null,
    [commitments, queues.now],
  );

  /** The unified Today timeline: attention flags + timed commitments + the
   *  engine-ordered queue, one chronology with a NOW marker. Replaces the
   *  siloed agenda / commitments / attention trio. */
  const timeline = useMemo<Timeline>(
    () =>
      buildTimeline({
        // The whole day, including the item promoted to "next action".
        items: dayItems,
        attention,
        nowTime: hhmmNow(),
        today,
      }),
    [dayItems, attention, today],
  );

  /** Fixed commitments from Google Calendar (read-only, never tasks). */
  const fixed = useMemo(() => fixedEventsFor(gcalEvents, today), [gcalEvents, today]);

  /** Available time vs selected work — the "is this realistic?" answer. */
  const capacity = useMemo(
    () =>
      computeCapacity({
        tasks,
        fixed,
        today,
        nowHHMM: hhmmNow(),
        workdayStart,
        workdayEnd,
      }),
    [tasks, fixed, today, workdayStart, workdayEnd],
  );

  /** Deterministic plan suggestion — preview only, applied on confirmation. */
  const suggestedPlan = useMemo(
    () =>
      suggestOutcomes(
        queues.today
          .filter((i) => i.kind === "task" && !isPlannedToday(i.raw as Task, today))
          .map((i) => ({
            task: i.raw as Task,
            score: i.score,
            reasons: [
              i.overdueDays > 0
                ? `${i.overdueDays}d overdue`
                : i.due === today
                  ? "due today"
                  : i.priority === "critical" || i.priority === "high"
                    ? `${i.priority} priority`
                    : "highest in your queue",
            ],
          })),
        Math.max(0, capacity.availableMin - capacity.plannedMin),
        Math.max(0, 3 - chosenOutcomes.length),
      ),
    [queues.today, today, capacity.availableMin, capacity.plannedMin, chosenOutcomes.length],
  );

  const waiting = useMemo(() => tasks.filter((t) => t.status === "blocked").length, [tasks]);
  /** Inbox: captured but undecided — no deadline, no plan, no block. */
  const inboxTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.status === "todo" &&
          !t.dueDate &&
          !t.scheduledAt &&
          !(t.blocks && t.blocks.length) &&
          !t.archived,
      ),
    [tasks],
  );
  const inbox = inboxTasks.length;
  const openDecisions = useMemo(
    () => decisions.filter((d) => d.status === "open").length,
    [decisions],
  );

  /** Agenda: only real, time-stamped commitments. Never fabricated. */
  const agenda = useMemo(() => {
    const rows: { id: string; time: string; title: string; kind: string; section: string }[] = [];
    for (const t of tasks) {
      if (t.status === "done") continue;
      const day = t.scheduledAt || t.dueDate;
      if (day !== today || !t.startTime) continue;
      rows.push({
        id: `t:${t.id}`,
        time: t.startTime,
        title: t.title,
        kind: "Task",
        section: "tasks",
      });
    }
    for (const r of reminders) {
      if (r.status !== "pending" || !r.remindAt) continue;
      if (r.remindAt.slice(0, 10) !== today) continue;
      rows.push({
        id: `r:${r.id}`,
        time: r.remindAt.slice(11, 16),
        title: r.title,
        kind: "Reminder",
        section: "reminders",
      });
    }
    for (const p of payments) {
      if (p.status !== "pending" && p.status !== "overdue") continue;
      if ((p.dueDate || "").slice(0, 10) !== today) continue;
      rows.push({
        id: `p:${p.id}`,
        time: "—",
        title: p.title,
        kind: "Payment due",
        section: "payments",
      });
    }
    return rows.sort((a, b) => a.time.localeCompare(b.time)).slice(0, 6);
  }, [tasks, reminders, payments, today]);

  async function complete(item: WorkItem) {
    if (item.kind === "task") {
      await updateItem("tasks", item.refId, {
        status: "done",
        completedAt: new Date().toISOString(),
        touchedAt: today,
      } as any);
    } else if (item.kind === "reminder") {
      await updateItem("reminders", item.refId, { status: "done" } as any);
    } else if (item.kind === "payment") {
      await updateItem("payments", item.refId, { status: "paid", paidDate: today } as any);
    } else {
      await actOnDecision(item.raw);
      toast.success("Decision turned into a task");
      return;
    }
    toast.success("Done — next one is up");
  }

  /** Planning, not deadline mutation: the real dueDate is never touched. */
  async function schedule(item: WorkItem, days: number) {
    const next = addDaysLocal(today, days);
    if (item.kind === "task") {
      await updateItem("tasks", item.refId, {
        notBefore: next,
        scheduledAt: next,
        reviewAt: next,
        touchedAt: today,
        committedOn: undefined,
      } as any);
      toast.success(`Planned for ${next} — deadline unchanged`);
      return;
    }
    if (item.kind === "reminder") {
      await updateItem("reminders", item.refId, { remindAt: `${next}T09:00:00` } as any);
    } else if (item.kind === "decision") {
      await deferDecision(item.raw, days);
    } else {
      toast.warning("Payment deadlines cannot be moved — pay or renegotiate.");
      return;
    }
    toast.success(`Planned for ${next}`);
  }

  async function commit(item: WorkItem) {
    if (item.kind !== "task") return;
    await updateItem("tasks", item.refId, { committedOn: today, notBefore: undefined } as any);
    toast.success("Pinned to today");
  }

  return {
    today,
    queues,
    now: queues.now,
    commitments,
    upNext,
    timeline,
    isEmpty,
    attention,
    sitePulse,
    validationPulse,
    intelligence,

    briefing,
    agenda,
    waiting,
    inbox,
    inboxTasks,
    openDecisions,
    complete,
    schedule,
    commit,
    // Today-centred additions
    nextAction,
    outcomesAreChosen,
    fixed,
    capacity,
    suggestedPlan,
    area,
    gcalConnected: gcal.connected,
    allTasks,
  };
}

export type DailyOps = ReturnType<typeof useDailyOps>;
