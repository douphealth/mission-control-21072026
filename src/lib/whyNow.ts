// ─── Human explanations for the work queue ───────────────────────────────────
// The scoring engine stays internal. The user only ever sees plain reasoning.

import type { WorkItem } from '@/lib/workQueue';
import type { SyncHealth, Decision, Payment } from '@/lib/db';
import { SYNC_SOURCES, effectiveStatus, ageLabel } from '@/lib/reliability';
import { todayISO } from '@/lib/overdue';

/** Short, human "why now" reasons — never a raw score. */
export function whyNow(item: WorkItem, today = todayISO()): string[] {
  const out: string[] = [];
  if (item.overdueDays > 0) {
    out.push(item.overdueDays === 1 ? 'overdue since yesterday' : `${item.overdueDays} days overdue`);
  } else if (item.due === today) {
    out.push('due today');
  } else if (item.due) {
    const days = Math.round(
      (new Date(`${item.due}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000,
    );
    if (days === 1) out.push('due tomorrow');
    else if (days > 1 && days <= 7) out.push(`due in ${days} days`);
  }
  if (item.priority === 'critical') out.push('critical priority');
  else if (item.priority === 'high') out.push('high impact');
  if (item.kind === 'payment') out.push('money has a hard deadline');
  if (item.kind === 'decision') out.push('blocks other work until decided');
  if (item.staleDays >= 14) out.push(`untouched for ${item.staleDays} days`);
  if (out.length === 0) out.push('top of your queue right now');
  return out.slice(0, 3);
}

export type AttentionSeverity = 'critical' | 'warning' | 'info';

export interface AttentionItem {
  id: string;
  title: string;
  detail: string;
  severity: AttentionSeverity;
  /** Where clicking takes the user. */
  section: string;
  actionLabel: string;
  /** Provenance: source · freshness. Never fabricated. */
  provenance?: string;
}

export function buildAttention(input: {
  work: WorkItem[];
  decisions: Decision[];
  payments: Payment[];
  health: SyncHealth[];
  today?: string;
}): AttentionItem[] {
  const today = input.today ?? todayISO();
  const out: AttentionItem[] = [];

  const overdue = input.work.filter((i) => i.overdueDays > 0);
  if (overdue.length > 0) {
    out.push({
      id: 'attn:overdue',
      title: `${overdue.length} item${overdue.length === 1 ? '' : 's'} past their deadline`,
      detail: overdue
        .slice(0, 3)
        .map((i) => i.title)
        .join(' · '),
      severity: 'critical',
      section: 'tasks',
      actionLabel: 'Triage',
      provenance: 'Mission Control · live',
    });
  }

  const duePayments = input.payments.filter(
    (p) => (p.status === 'pending' || p.status === 'overdue') && p.dueDate && p.dueDate.slice(0, 10) <= addDays(today, 2),
  );
  if (duePayments.length > 0) {
    out.push({
      id: 'attn:payments',
      title: `${duePayments.length} payment${duePayments.length === 1 ? '' : 's'} due within 48 hours`,
      detail: duePayments.slice(0, 3).map((p) => p.title).join(' · '),
      severity: 'warning',
      section: 'payments',
      actionLabel: 'Open finance',
      provenance: 'Manual · live',
    });
  }

  const open = input.decisions.filter((d) => d.status === 'open');
  if (open.length > 0) {
    out.push({
      id: 'attn:decisions',
      title: `${open.length} finding${open.length === 1 ? '' : 's'} waiting on a decision`,
      detail: open.slice(0, 3).map((d) => d.title).join(' · '),
      severity: open.some((d) => d.severity === 'critical') ? 'critical' : 'warning',
      section: 'decisions',
      actionLabel: 'Decide',
    });
  }

  for (const src of SYNC_SOURCES) {
    const row = input.health.find((h) => h.id === src.id);
    const status = effectiveStatus(row);
    if (status === 'error' || status === 'stale') {
      out.push({
        id: `attn:sync:${src.id}`,
        title: `${src.label} ${status === 'error' ? 'is failing' : 'data is stale'}`,
        detail: row?.error || `Last successful sync ${ageLabel(row?.lastSuccessAt)}`,
        severity: status === 'error' ? 'critical' : 'warning',
        section: 'settings',
        actionLabel: 'Inspect',
        provenance: `${src.label} · ${ageLabel(row?.lastSuccessAt)}`,
      });
    }
  }

  const rank: Record<AttentionSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
