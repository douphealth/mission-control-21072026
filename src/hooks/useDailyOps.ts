// Shared daily planning logic. Home and compatibility routes use the same data.
import { useMemo, useRef } from "react";
import { toast } from "sonner";
import { celebrate } from "@/lib/celebrate";
import { useTasks, useReminders, usePayments, useDecisions, useSyncHealth, useUpdateItem,
  useWebsites, useNotes, useSEOProfiles, useSEOIssues, useSEOSnapshots, useStreamItems, useValidations } from "@/hooks/useTableData";
import { buildWorkQueue, splitQueue, type WorkItem } from "@/lib/workQueue";
import { buildAttention } from "@/lib/whyNow";
import { buildSitePulse } from "@/lib/sitePulse";
import { pendingValidations } from "@/lib/validations";
import { selectIntelligence } from "@/lib/intelligence";
import { addDaysLocal, buildBriefing, fmtLocal } from "@/lib/overdue";
import { actOnDecision, deferDecision } from "@/lib/decisions";
import { buildTimeline, type Timeline } from "@/lib/timeline";
import type { Task } from "@/lib/db";
import { computeCapacity, fixedEventsFor, isPlannedToday, suggestOutcomes } from "@/lib/planning";
import { usePlanStore, inArea } from "@/stores/planStore";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { isGCalConnected } from "@/lib/googleCalendar";
import { isCurrentSEOIssue } from "@/lib/seoEvidence";
import { useMinuteClock } from "@/hooks/useMinuteClock";
import { selectedDailyOutcomes, outcomeProgress } from "@/lib/dailyOutcomes";

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
  const { today, nowHHMM } = useMinuteClock();
  const inFlight = useRef(new Set<string>());
  const gcal = useGoogleCalendar({ autoFetch: isGCalConnected() });
  const gcalEvents = gcal.rawEvents;
  const tasks = useMemo(() => allTasks.filter(t => inArea(t, area)), [allTasks, area]);
  const queues = useMemo(() => splitQueue(buildWorkQueue({ tasks, reminders, payments, decisions, today })), [tasks, reminders, payments, decisions, today]);
  const attention = useMemo(() => buildAttention({ work: queues.all, decisions, payments, health,
    seoIssues: seoIssues.filter(issue => isCurrentSEOIssue(issue)), validations, today }), [queues.all, decisions, payments, health, seoIssues, validations, today]);
  const sitePulse = useMemo(() => buildSitePulse({ websites, seoProfiles, seoIssues, seoSnapshots, health }), [websites, seoProfiles, seoIssues, seoSnapshots, health]);
  const validationPulse = useMemo(() => pendingValidations(validations, today), [validations, today]);
  const intelligence = useMemo(() => selectIntelligence({ stream, websites, tasks }), [stream, websites, tasks]);
  const briefing = useMemo(() => buildBriefing(tasks, today), [tasks, today]);
  const isEmpty = tasks.length === 0 && reminders.length === 0 && payments.length === 0 && decisions.length === 0 && websites.length === 0 && notes.length === 0;

  // Findings belong in Review until deliberately turned into scheduled work.
  const dayItems = useMemo(() => queues.all.filter(item => {
    if (item.kind === "decision") return false;
    if (item.kind === "task") {
      const task = item.raw as Task;
      if (task.notBefore && task.notBefore > today && task.committedOn !== today) return false;
      return item.overdueDays > 0 || item.due === today || isPlannedToday(task, today) || (!!item.time && (item.scheduled === today || item.due === today));
    }
    return item.overdueDays > 0 || item.due === today;
  }), [queues.all, today]);

  // Completed selections stay in the day's results. The open work queue alone
  // cannot supply a progress denominator because it removes completed tasks.
  const chosenOutcomes = useMemo(() => selectedDailyOutcomes(tasks, queues.all, today), [tasks, queues.all, today]);
  const commitments = useMemo(() => chosenOutcomes.slice(0, 3), [chosenOutcomes]);
  const outcomesAreChosen = chosenOutcomes.length > 0;
  const upNext = useMemo(() => dayItems.filter(item => !commitments.some(c => c.id === item.id)), [dayItems, commitments]);
  const nextAction = useMemo(() => {
    const actionable = (item: WorkItem) => item.kind === "task" && !["blocked", "done"].includes((item.raw as Task).status);
    return commitments.find(actionable) ?? dayItems.find(actionable) ?? dayItems.find(item => item.kind !== "task") ?? null;
  }, [commitments, dayItems]);
  const timeline = useMemo<Timeline>(() => buildTimeline({ items: dayItems, attention: [], nowTime: nowHHMM, today }), [dayItems, today, nowHHMM]);
  const fixed = useMemo(() => fixedEventsFor(gcalEvents, today), [gcalEvents, today]);
  const capacity = useMemo(() => computeCapacity({ tasks, fixed, today, nowHHMM, workdayStart, workdayEnd }), [tasks, fixed, today, nowHHMM, workdayStart, workdayEnd]);
  const suggestedPlan = useMemo(() => suggestOutcomes(
    queues.today.filter(item => item.kind === "task" && !isPlannedToday(item.raw as Task, today)).map(item => ({
      task: item.raw as Task, score: item.score,
      reasons: [item.overdueDays > 0 ? `${item.overdueDays}d overdue` : item.due === today ? "due today" : item.priority === "critical" || item.priority === "high" ? `${item.priority} priority` : "highest in your queue"],
    })), Math.max(0, capacity.availableMin - capacity.plannedMin), Math.max(0, 3 - chosenOutcomes.length),
  ), [queues.today, today, capacity.availableMin, capacity.plannedMin, chosenOutcomes.length]);
  const waiting = useMemo(() => tasks.filter(t => t.status === "blocked" && !t.archived && !t.deletedAt).length, [tasks]);
  const inboxTasks = useMemo(() => tasks.filter(t => t.status === "todo" && !t.dueDate && !t.scheduledAt && !(t.blocks && t.blocks.length) && !t.archived && !t.deletedAt), [tasks]);
  const openDecisions = useMemo(() => decisions.filter(d => d.status === "open").length, [decisions]);
  const agenda = useMemo(() => {
    const rows: { id: string; time: string; title: string; kind: string; section: string }[] = [];
    for (const t of tasks) {
      if (t.status === "done" || t.archived || t.deletedAt) continue;
      if ((t.scheduledAt || t.dueDate) !== today || !t.startTime) continue;
      rows.push({ id: `t:${t.id}`, time: t.startTime, title: t.title, kind: "Task", section: "tasks" });
    }
    for (const r of reminders) {
      if (r.status !== "pending" || !r.remindAt) continue;
      const date = new Date(r.remindAt);
      if (!Number.isFinite(date.getTime()) || fmtLocal(date) !== today) continue;
      const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
      rows.push({ id: `r:${r.id}`, time, title: r.title, kind: "Reminder", section: "reminders" });
    }
    for (const p of payments) {
      if (!["pending", "overdue"].includes(p.status) || (p.dueDate || "").slice(0, 10) !== today) continue;
      rows.push({ id: `p:${p.id}`, time: "—", title: p.title, kind: "Payment due", section: "payments" });
    }
    return rows.sort((a, b) => a.time.localeCompare(b.time)).slice(0, 6);
  }, [tasks, reminders, payments, today]);

  // An action failure must leave records and the rest of the dashboard usable.
  async function act(item: WorkItem, operation: () => Promise<void>) {
    if (inFlight.current.has(item.id)) return;
    inFlight.current.add(item.id);
    try { await operation(); }
    catch (error) { toast.error("Action was not saved", { description: error instanceof Error ? error.message : String(error) }); }
    finally { inFlight.current.delete(item.id); }
  }
  async function complete(item: WorkItem) {
    return act(item, async () => {
      if (item.kind === "task") {
        if ((item.raw as Task).status === "done") return;
        await updateItem("tasks", item.refId, { status: "done", completedAt: new Date().toISOString(), touchedAt: today } as any);
      } else if (item.kind === "reminder") await updateItem("reminders", item.refId, { status: "done" } as any);
      else if (item.kind === "payment") await updateItem("payments", item.refId, { status: "paid", paidDate: today } as any);
      else { await actOnDecision(item.raw); toast.success("Decision turned into a task"); return; }
      celebrate();
      toast.success("Done — next one is up");
    });
  }
  async function schedule(item: WorkItem, days: number) {
    return act(item, async () => {
      const next = addDaysLocal(today, days);
      if (item.kind === "task") {
        await updateItem("tasks", item.refId, { notBefore: next, scheduledAt: next, reviewAt: next, touchedAt: today, committedOn: undefined } as any);
        toast.success(`Planned for ${next} — deadline unchanged`); return;
      }
      if (item.kind === "reminder") await updateItem("reminders", item.refId, { remindAt: `${next}T09:00:00` } as any);
      else if (item.kind === "decision") await deferDecision(item.raw, days);
      else { toast.warning("Payment deadlines cannot be moved — pay or renegotiate."); return; }
      toast.success(`Planned for ${next}`);
    });
  }
  async function commit(item: WorkItem) {
    if (item.kind !== "task") return;
    return act(item, async () => {
      await updateItem("tasks", item.refId, { committedOn: today, notBefore: undefined } as any);
      toast.success("Pinned to today");
    });
  }
  return { today, queues, now: queues.now, commitments, upNext, timeline, isEmpty, attention, sitePulse, validationPulse, intelligence,
    briefing, agenda, waiting, inbox: inboxTasks.length, inboxTasks, openDecisions, complete, schedule, commit,
    nextAction, outcomesAreChosen, fixed, capacity, suggestedPlan, area, gcalConnected: gcal.connected, allTasks,
    visibleTasks: tasks, progress: outcomeProgress(chosenOutcomes) };
}
export type DailyOps = ReturnType<typeof useDailyOps>;
