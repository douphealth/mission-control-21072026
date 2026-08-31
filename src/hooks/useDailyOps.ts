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
import type { Task } from "@/lib/db";


export function useDailyOps() {
  const tasks = useTasks();
  const reminders = useReminders();
  const payments = usePayments();
  const decisions = useDecisions();
  const health = useSyncHealth();
  const updateItem = useUpdateItem();
  const websites = useWebsites();
  const seoProfiles = useSEOProfiles();
  const seoIssues = useSEOIssues();
  const seoSnapshots = useSEOSnapshots();
  const stream = useStreamItems();
  const validations = useValidations();

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

  const commitments = useMemo(() => queues.today.slice(0, 3), [queues.today]);
  const upNext = useMemo(() => queues.today.slice(3), [queues.today]);

  const waiting = useMemo(() => tasks.filter((t) => t.status === "blocked").length, [tasks]);
  const inbox = useMemo(
    () => tasks.filter((t) => t.status === "todo" && !t.dueDate).length,
    [tasks],
  );
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
      rows.push({ id: `t:${t.id}`, time: t.startTime, title: t.title, kind: "Task", section: "tasks" });
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
      rows.push({ id: `p:${p.id}`, time: "—", title: p.title, kind: "Payment due", section: "payments" });
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
    attention,
    briefing,
    agenda,
    waiting,
    inbox,
    openDecisions,
    complete,
    schedule,
    commit,
  };
}

export type DailyOps = ReturnType<typeof useDailyOps>;
