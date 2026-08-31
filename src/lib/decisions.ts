// ─── Decision Center ─────────────────────────────────────────────────────────
// Findings from every module are converted into decisions. A decision always
// ends: Act (creates a linked task), Ignore (with a reason), or Later (dated).

import { db, genId, type Decision, type DecisionSource, type SEOIssue, type StreamItem, type Task, type SyncHealth } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { todayISO, addDaysLocal } from '@/lib/overdue';
import { isRotten } from '@/lib/triage';
import { markCloudRecordDirty, queueCloudPush } from '@/lib/cloudSync';

function nowISO() { return new Date().toISOString(); }

async function persist(d: Decision) {
  await db.decisions.put(d);
  try { markCloudRecordDirty('decisions', d.id); queueCloudPush(); } catch { /* offline-safe */ }
}

/** Create or merge a finding into a decision, grouped by `groupKey`. */
export async function upsertDecision(input: {
  title: string;
  context: string;
  source: DecisionSource;
  groupKey: string;
  severity?: Decision['severity'];
  recommendation?: string;
  options?: string[];
  websiteId?: string;
  sourceRef?: string;
}): Promise<string> {
  const existing = await db.decisions.where('groupKey').equals(input.groupKey).first();

  if (existing) {
    // Resolved decisions stay resolved unless the finding is genuinely new.
    if (existing.status !== 'open') {
      if (existing.status === 'later' && (existing.deferUntil ?? '') > todayISO()) return existing.id;
      if (existing.status === 'ignored') return existing.id;
    }
    const merged: Decision = {
      ...existing,
      status: existing.status === 'later' ? 'open' : existing.status === 'acted' ? existing.status : 'open',
      occurrences: existing.occurrences + 1,
      context: input.context || existing.context,
      recommendation: input.recommendation ?? existing.recommendation,
      severity: input.severity ?? existing.severity,
      updatedAt: nowISO(),
    };
    await persist(merged);
    return merged.id;
  }

  const d: Decision = {
    id: genId(),
    title: input.title,
    context: input.context,
    source: input.source,
    sourceRef: input.sourceRef,
    websiteId: input.websiteId,
    severity: input.severity ?? 'medium',
    recommendation: input.recommendation,
    options: input.options,
    status: 'open',
    groupKey: input.groupKey,
    occurrences: 1,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  await persist(d);
  await logAudit({ action: 'decision', collection: 'decisions', recordId: d.id, label: `New decision: ${d.title}` });
  return d.id;
}

/** Act: turns the decision into a real, dated, linked task. */
export async function actOnDecision(decision: Decision, opts?: { dueInDays?: number }): Promise<string> {
  const due = addDaysLocal(todayISO(), opts?.dueInDays ?? 1);
  const task: Task = {
    id: genId(),
    title: decision.recommendation?.slice(0, 140) || decision.title,
    priority: decision.severity,
    status: 'todo',
    dueDate: due,
    category: decision.source,
    description: `${decision.context}\n\nFrom Decision Center (${decision.source}).`,
    linkedProject: decision.websiteId ?? '',
    subtasks: [],
    createdAt: nowISO(),
    touchedAt: todayISO(),
  };
  await db.tasks.put(task);
  try { markCloudRecordDirty('tasks', task.id); } catch { /* offline-safe */ }

  await persist({
    ...decision,
    status: 'acted',
    linkedTaskId: task.id,
    resolvedAt: nowISO(),
    updatedAt: nowISO(),
  });
  await logAudit({
    action: 'decision', collection: 'decisions', recordId: decision.id,
    label: `Acted: ${decision.title}`, detail: `Task created for ${due}`,
  });
  return task.id;
}

export async function ignoreDecision(decision: Decision, reason: string): Promise<void> {
  await persist({ ...decision, status: 'ignored', resolutionNote: reason, resolvedAt: nowISO(), updatedAt: nowISO() });
  await logAudit({
    action: 'decision', collection: 'decisions', recordId: decision.id,
    label: `Ignored: ${decision.title}`, detail: reason,
  });
}

export async function deferDecision(decision: Decision, days = 7): Promise<void> {
  const until = addDaysLocal(todayISO(), days);
  await persist({ ...decision, status: 'later', deferUntil: until, updatedAt: nowISO() });
  await logAudit({
    action: 'decision', collection: 'decisions', recordId: decision.id,
    label: `Deferred: ${decision.title}`, detail: `Until ${until}`,
  });
}

/** Deferred decisions come back on their date — nothing disappears quietly. */
export async function reopenDueDecisions(): Promise<number> {
  const today = todayISO();
  const later = await db.decisions.where('status').equals('later').toArray();
  const due = later.filter((d) => (d.deferUntil ?? today) <= today);
  for (const d of due) await persist({ ...d, status: 'open', updatedAt: nowISO() });
  return due.length;
}

// ─── Finding → decision generators ───────────────────────────────────────────

export async function generateDecisions(input: {
  seoIssues?: SEOIssue[];
  mentions?: StreamItem[];
  tasks?: Task[];
  health?: SyncHealth[];
}): Promise<number> {
  let created = 0;
  const before = await db.decisions.count();

  for (const issue of input.seoIssues ?? []) {
    if (issue.status !== 'open') continue;
    await upsertDecision({
      title: issue.title,
      context: `SEO ${issue.category} issue observed ${issue.observedAt.slice(0, 10)}${issue.url ? ` on ${issue.url}` : ''}.`,
      source: 'seo',
      severity: issue.severity,
      websiteId: issue.websiteId,
      sourceRef: issue.id,
      groupKey: `seo|${issue.websiteId}|${issue.category}|${issue.title.toLowerCase().slice(0, 60)}`,
      recommendation: `Fix ${issue.category} issue: ${issue.title}`,
      options: ['Fix now', 'Schedule for this week', 'Accept as-is'],
    });
  }

  for (const m of (input.mentions ?? []).slice(0, 40)) {
    if (m.kind !== 'mention' || m.status === 'archived') continue;
    await upsertDecision({
      title: `Respond to mention: ${m.title.slice(0, 80)}`,
      context: `${m.source ?? 'Web'} — ${m.url ?? ''}`,
      source: 'mention',
      severity: 'medium',
      sourceRef: m.id,
      groupKey: `mention|${m.url ?? m.id}`,
      recommendation: 'Review the mention and decide whether to reply, amplify, or ignore.',
      options: ['Reply', 'Amplify', 'Ignore'],
    });
  }

  for (const t of (input.tasks ?? []).filter((x) => isRotten(x))) {
    await upsertDecision({
      title: `Rotten task: ${t.title.slice(0, 80)}`,
      context: `Overdue since ${t.dueDate} and untouched. Keep it honest: re-commit, rewrite, or drop it.`,
      source: 'task',
      severity: t.priority,
      sourceRef: t.id,
      groupKey: `task-rot|${t.id}`,
      recommendation: `Re-plan or drop "${t.title}"`,
      options: ['Re-schedule', 'Break into smaller task', 'Drop it'],
    });
  }

  for (const h of input.health ?? []) {
    if (h.status !== 'error') continue;
    await upsertDecision({
      title: `${h.label} is failing to sync`,
      context: h.error ?? 'The last sync attempt failed.',
      source: 'sync',
      severity: 'high',
      sourceRef: h.id,
      groupKey: `sync|${h.id}`,
      recommendation: `Reconnect ${h.label} or stop relying on its data`,
      options: ['Reconnect', 'Retry', 'Disable source'],
    });
  }

  created = (await db.decisions.count()) - before;
  return created;
}

export const SEVERITY_STYLE: Record<Decision['severity'], string> = {
  critical: 'text-red-600 bg-red-500/10 border-red-500/20',
  high: 'text-orange-600 bg-orange-500/10 border-orange-500/20',
  medium: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
  low: 'text-muted-foreground bg-secondary/60 border-border/40',
};
