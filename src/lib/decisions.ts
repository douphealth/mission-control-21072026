// ─── Decision Center ─────────────────────────────────────────────────────────
// Findings from every module are converted into decisions. A decision always
// ends: Act (creates a linked task), Ignore (with a reason), or Later (dated).

import {
  db,
  genId,
  type Decision,
  type DecisionSource,
  type SEOIssue,
  type StreamItem,
  type Task,
  type SyncHealth,
  type Payment,
} from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { todayISO, addDaysLocal } from "@/lib/overdue";
import { isRotten } from "@/lib/triage";
import { isRecentIso } from "@/lib/intelligenceQuality";
import { dueState } from "@/lib/financeLedger";
import { markCloudRecordDirty, queueCloudPush } from "@/lib/cloudSync";
import { fingerprint, isSuppressed, isRegression, cooldownFrom } from "@/lib/fingerprint";

function nowISO() {
  return new Date().toISOString();
}

async function persist(d: Decision) {
  await db.decisions.put(d);
  try {
    markCloudRecordDirty("decisions", d.id);
    queueCloudPush();
  } catch {
    /* offline-safe */
  }
}

/**
 * Create or merge a finding into a decision.
 *
 * Identity is the fingerprint (`groupKey`), so the same underlying problem
 * seen by ten scans stays exactly one decision. Resolved decisions stay quiet
 * during their cooldown and only reopen as an explicit regression.
 */
export async function upsertDecision(input: {
  title: string;
  context: string;
  source: DecisionSource;
  /** Pass either a precomputed groupKey or the parts to fingerprint. */
  groupKey?: string;
  fingerprintParts?: unknown[];
  severity?: Decision["severity"];
  recommendation?: string;
  options?: string[];
  websiteId?: string;
  sourceRef?: string;
  /** Days of silence after this decision is resolved. */
  cooldownDays?: number;
}): Promise<string> {
  const groupKey =
    input.groupKey ??
    fingerprint(input.source, input.fingerprintParts ?? [input.title, input.websiteId]);
  const existing = await db.decisions.where("groupKey").equals(groupKey).first();

  if (existing) {
    // Suppressed: still counted, never re-surfaced.
    if (isSuppressed(existing) && !isRegression(existing, input.severity)) {
      await persist({ ...existing, occurrences: existing.occurrences + 1, updatedAt: nowISO() });
      return existing.id;
    }

    const resolved = existing.status === "acted" || existing.status === "ignored";
    const regression = resolved && isRegression(existing, input.severity);
    if (resolved && !regression) {
      await persist({ ...existing, occurrences: existing.occurrences + 1, updatedAt: nowISO() });
      return existing.id;
    }

    const merged: Decision = {
      ...existing,
      status: "open",
      occurrences: existing.occurrences + 1,
      regressions: (existing.regressions ?? 0) + (regression ? 1 : 0),
      context: input.context || existing.context,
      recommendation: input.recommendation ?? existing.recommendation,
      severity: input.severity ?? existing.severity,
      cooldownUntil: undefined,
      deferUntil: undefined,
      resolvedAt: undefined,
      updatedAt: nowISO(),
    };
    await persist(merged);
    if (regression) {
      await logAudit({
        action: "decision",
        collection: "decisions",
        recordId: merged.id,
        label: `Regression: ${merged.title}`,
        detail: `Seen again after being resolved (${merged.occurrences}x)`,
      });
    }
    return merged.id;
  }

  const d: Decision = {
    id: genId(),
    title: input.title,
    context: input.context,
    source: input.source,
    sourceRef: input.sourceRef,
    websiteId: input.websiteId,
    severity: input.severity ?? "medium",
    recommendation: input.recommendation,
    options: input.options,
    status: "open",
    groupKey,
    occurrences: 1,
    regressions: 0,
    cooldownDays: input.cooldownDays,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  await persist(d);
  await logAudit({
    action: "decision",
    collection: "decisions",
    recordId: d.id,
    label: `New decision: ${d.title}`,
  });
  return d.id;
}

/** Act: turns the decision into a real, dated, linked task. */
export async function actOnDecision(
  decision: Decision,
  opts?: { dueInDays?: number },
): Promise<string> {
  const due = addDaysLocal(todayISO(), opts?.dueInDays ?? 1);
  const result = await db.transaction("rw", db.decisions, db.tasks, async () => {
    const current = await db.decisions.get(decision.id);
    if (!current) throw new Error("This finding no longer exists. Refresh the findings list.");
    const linked = current.linkedTaskId ? await db.tasks.get(current.linkedTaskId) : undefined;
    if (linked && !linked.deletedAt && current.status === "acted")
      return { id: linked.id, changed: false };
    if (current.status !== "open")
      throw new Error("This finding has already changed. Review its current status before acting.");
    const taskId =
      linked && !linked.deletedAt && !linked.archived && linked.status !== "done"
        ? linked.id
        : linked
          ? `finding-task-${current.id}-${fingerprint("followup", [linked.id, linked.completedAt || linked.createdAt])}`
          : `finding-task-${current.id}-${current.regressions || 0}`;
    if (!linked || taskId !== linked.id) {
      const task: Task = {
        id: taskId,
        title: current.recommendation?.slice(0, 140) || current.title,
        priority: current.severity,
        status: "todo",
        dueDate: "",
        scheduledAt: due,
        reviewAt: due,
        category: current.source,
        description: `${current.context}\n\nFrom Findings (${current.source}). Planned for ${due}; confirm any real deadline separately.`,
        linkedProject: current.websiteId ?? "",
        subtasks: [],
        createdAt: nowISO(),
        touchedAt: todayISO(),
      };
      await db.tasks.put(task);
    }
    await db.decisions.put({
      ...current,
      status: "acted",
      linkedTaskId: taskId,
      resolvedAt: nowISO(),
      cooldownUntil: cooldownFrom(current.cooldownDays ?? 7),
      updatedAt: nowISO(),
    });
    return { id: taskId, changed: true };
  });
  if (result.changed) {
    markCloudRecordDirty("tasks", result.id);
    markCloudRecordDirty("decisions", decision.id);
    queueCloudPush();
    await logAudit({
      action: "decision",
      collection: "decisions",
      recordId: decision.id,
      label: `Acted: ${decision.title}`,
      detail: `Task linked and planned for ${due}`,
    });
  }
  return result.id;
}

export async function ignoreDecision(decision: Decision, reason: string): Promise<void> {
  if (!reason.trim()) throw new Error("Add a reason before dismissing this finding.");
  const current = await db.decisions.get(decision.id);
  if (!current || current.status !== "open")
    throw new Error("This finding has already changed. Review its current status.");
  await persist({
    ...current,
    status: "ignored",
    resolutionNote: reason,
    resolvedAt: nowISO(),
    cooldownUntil: cooldownFrom(decision.cooldownDays ?? 30),
    updatedAt: nowISO(),
  });
  await logAudit({
    action: "decision",
    collection: "decisions",
    recordId: decision.id,
    label: `Ignored: ${decision.title}`,
    detail: reason,
  });
}

export async function deferDecision(decision: Decision, days = 7): Promise<void> {
  const current = await db.decisions.get(decision.id);
  if (!current || current.status !== "open")
    throw new Error("This finding has already changed. Review its current status.");
  if (!Number.isInteger(days) || days < 1 || days > 365)
    throw new Error("Choose a deferral between 1 and 365 days.");
  const until = addDaysLocal(todayISO(), days);
  await persist({ ...current, status: "later", deferUntil: until, updatedAt: nowISO() });
  await logAudit({
    action: "decision",
    collection: "decisions",
    recordId: decision.id,
    label: `Deferred: ${decision.title}`,
    detail: `Until ${until}`,
  });
}

/** Deferred decisions come back on their date — nothing disappears quietly. */
export async function reopenDueDecisions(): Promise<number> {
  const today = todayISO();
  const later = await db.decisions.where("status").equals("later").toArray();
  const due = later.filter((d) => (d.deferUntil ?? today) <= today);
  for (const d of due) await persist({ ...d, status: "open", updatedAt: nowISO() });
  return due.length;
}

// ─── Finding → decision generators ───────────────────────────────────────────

export async function generateDecisions(input: {
  seoIssues?: SEOIssue[];
  mentions?: StreamItem[];
  tasks?: Task[];
  health?: SyncHealth[];
  payments?: Payment[];
}): Promise<number> {
  let created = 0;
  const before = await db.decisions.count();

  for (const issue of input.seoIssues ?? []) {
    if (issue.status !== "open") continue;
    await upsertDecision({
      title: issue.title,
      context: `SEO ${issue.category} issue observed ${(issue.observedAt || "date not recorded").slice(0, 19)}${issue.url ? ` on ${issue.url}` : ""}.`,
      source: "seo",
      severity: issue.severity,
      websiteId: issue.websiteId,
      sourceRef: issue.id,
      groupKey: `seo|${issue.websiteId}|${issue.category}|${issue.title.toLowerCase().slice(0, 60)}`,
      recommendation: `Fix ${issue.category} issue: ${issue.title}`,
      options: ["Fix now", "Schedule for this week", "Accept as-is"],
    });
  }

  const actionableMentions = (input.mentions ?? [])
    .filter(
      (m) =>
        m.kind === "mention" &&
        m.status === "active" &&
        ["exact-domain", "exact-handle", "anchored-name", "exact-brand"].includes(
          m.verification || "",
        ) &&
        isRecentIso(m.dateBasis === "published" ? m.publishedAt : m.discoveredAt, 30),
    )
    .sort((a, b) => b.discoveredAt.localeCompare(a.discoveredAt))
    .slice(0, 40);
  for (const m of actionableMentions) {
    await upsertDecision({
      title: `Respond to mention: ${m.title.slice(0, 80)}`,
      context: `${m.source ?? "Web"} — ${m.url ?? ""}`,
      source: "mention",
      severity: "medium",
      sourceRef: m.id,
      groupKey: `mention|${m.url ?? m.id}`,
      recommendation: "Review the mention and decide whether to reply, amplify, or ignore.",
      options: ["Reply", "Amplify", "Ignore"],
    });
  }

  for (const t of (input.tasks ?? []).filter((x) => isRotten(x))) {
    await upsertDecision({
      title: `Review overdue task: ${t.title.slice(0, 80)}`,
      context: `The recorded deadline was ${t.dueDate}. Confirm whether to recommit, rewrite, or archive this task.`,
      source: "task",
      severity: t.priority,
      sourceRef: t.id,
      groupKey: `task-rot|${t.id}`,
      recommendation: `Re-plan or drop "${t.title}"`,
      options: ["Re-schedule", "Break into smaller task", "Drop it"],
    });
  }

  for (const h of input.health ?? []) {
    if (h.status !== "error") continue;
    await upsertDecision({
      title: `${h.label} is failing to sync`,
      context: h.error ?? "The last sync attempt failed.",
      source: "sync",
      severity: "high",
      sourceRef: h.id,
      groupKey: `sync|${h.id}`,
      recommendation: `Reconnect ${h.label} or stop relying on its data`,
      options: ["Reconnect", "Retry", "Disable source"],
    });
  }

  for (const payment of input.payments ?? []) {
    if (dueState(payment, todayISO()) !== "overdue") continue;
    await upsertDecision({
      title: `Review overdue payment: ${payment.title.slice(0, 80)}`,
      context: `Your recorded ${payment.type} was due ${payment.dueDate || "on an unspecified date"}. This is a ledger observation, not a bank-confirmed payment failure.`,
      source: "payment",
      severity: "medium",
      sourceRef: payment.id,
      groupKey: `payment-overdue|${payment.id}`,
      recommendation: `Verify payment status and update the record for “${payment.title}”.`,
    });
  }

  created = (await db.decisions.count()) - before;
  return created;
}

export const SEVERITY_STYLE: Record<Decision["severity"], string> = {
  critical: "text-red-600 bg-red-500/10 border-red-500/20",
  high: "text-orange-600 bg-orange-500/10 border-orange-500/20",
  medium: "text-amber-600 bg-amber-500/10 border-amber-500/20",
  low: "text-muted-foreground bg-secondary/60 border-border/40",
};
