// ─── Universal Work System ───────────────────────────────────────────────────
// One queue for everything that can demand attention: tasks, reminders,
// payments due, and open decisions. One scoring function, one set of actions.

import type { Task, Reminder, Payment, Decision } from '@/lib/db';
import { todayISO, daysOverdue, PRIORITY_RANK } from '@/lib/overdue';
import { daysSinceTouch, isOpen } from '@/lib/triage';
import { scoreItem, reasonsOf, type ScoreResult } from '@/lib/priorityEngine';

export type { ScoreDimension, ScoreResult } from '@/lib/priorityEngine';
export { reasonsOf as explainScore } from '@/lib/priorityEngine';

export type WorkKind = 'task' | 'reminder' | 'payment' | 'decision';
export type WorkBucket = 'now' | 'today' | 'later';

export interface WorkItem {
  id: string;
  kind: WorkKind;
  refId: string;
  title: string;
  subtitle?: string;
  due?: string;            // YYYY-MM-DD hard deadline
  time?: string;           // HH:MM
  priority: 'critical' | 'high' | 'medium' | 'low';
  context?: string;        // project / website / category
  overdueDays: number;
  staleDays: number;
  score: number;
  bucket: WorkBucket;
  source: string;
  /** Planning date chosen by the user — separate from the real deadline. */
  scheduled?: string;
  /** Hidden from Now/Today until this date. */
  notBefore?: string;
  /** Explainable score breakdown — mirrors the engine dimensions. */
  scoreDimensions?: ScoreResult['dimensions'];
  raw: any;
}

function scoreOf(input: {
  priority: string;
  overdueDays: number;
  staleDays: number;
  due?: string;
  scheduled?: string;
  today: string;
  kind: WorkKind;
  pinned?: boolean;
}): ScoreResult {
  return scoreItem(input);
}

function bucketOf(item: { due?: string; overdueDays: number; today: string; kind: WorkKind }): WorkBucket {
  if (item.overdueDays > 0) return 'today';
  if (item.due && item.due <= item.today) return 'today';
  if (item.kind === 'decision') return 'today';
  return 'later';
}

export function buildWorkQueue(input: {
  tasks: Task[];
  reminders?: Reminder[];
  payments?: Payment[];
  decisions?: Decision[];
  today?: string;
}): WorkItem[] {
  const today = input.today ?? todayISO();
  const items: WorkItem[] = [];

  for (const t of input.tasks) {
    if (!isOpen(t)) continue;
    const overdue = daysOverdue(t, today);
    const stale = daysSinceTouch(t, today);
    const committed = t.committedOn === today;
    const scheduled = t.scheduledAt;
    // A task planned for today — or missed on a prior planned day — must
    // resurface. A planning date is not a deadline, so it affects inclusion,
    // never overdue math.
    const plannedNow = !!scheduled && scheduled <= today;
    const base = {
      priority: t.priority,
      overdueDays: overdue,
      staleDays: stale,
      due: t.dueDate || undefined,
      scheduled,
      today,
      kind: 'task' as const,
      pinned: committed,
    };
    const scored = scoreOf(base);
    const notBefore = t.notBefore;
    const deferred = !!notBefore && notBefore > today;
    items.push({
      id: `task:${t.id}`,
      kind: 'task',
      refId: t.id,
      title: t.title,
      subtitle: t.description?.slice(0, 120) || undefined,
      due: t.dueDate || undefined,
      time: t.startTime,
      priority: t.priority,
      context: t.linkedProject || t.category,
      overdueDays: overdue,
      staleDays: stale,
      score: scored.score,
      scoreDimensions: scored.dimensions,
      bucket: deferred && !committed
        ? 'later'
        : committed || plannedNow
          ? 'today'
          : bucketOf(base),
      source: 'Tasks',
      scheduled,
      notBefore,
      raw: t,
    });
  }

  for (const r of input.reminders ?? []) {
    if (r.status !== 'pending') continue;
    const due = (r.remindAt || '').slice(0, 10);
    const overdue = due && due < today
      ? Math.round((new Date(`${today}T00:00:00`).getTime() - new Date(`${due}T00:00:00`).getTime()) / 86_400_000)
      : 0;
    const base = { priority: 'medium', overdueDays: overdue, staleDays: 0, due, today, kind: 'reminder' as const };
    const scored = scoreOf(base);
    items.push({
      id: `reminder:${r.id}`,
      kind: 'reminder',
      refId: r.id,
      title: r.title,
      subtitle: r.notes,
      due,
      time: (r.remindAt || '').slice(11, 16) || undefined,
      priority: 'medium',
      context: 'Reminder',
      overdueDays: overdue,
      staleDays: 0,
      score: scored.score,
      scoreDimensions: scored.dimensions,
      bucket: bucketOf(base),
      source: 'Reminders',
      raw: r,
    });
  }

  for (const p of input.payments ?? []) {
    if (p.status !== 'pending' && p.status !== 'overdue') continue;
    const due = (p.dueDate || '').slice(0, 10);
    if (!due) continue;
    const overdue = due < today
      ? Math.round((new Date(`${today}T00:00:00`).getTime() - new Date(`${due}T00:00:00`).getTime()) / 86_400_000)
      : 0;
    const base = { priority: overdue > 0 ? 'critical' : 'high', overdueDays: overdue, staleDays: 0, due, today, kind: 'payment' as const };
    const scored = scoreOf(base);
    items.push({
      id: `payment:${p.id}`,
      kind: 'payment',
      refId: p.id,
      title: p.title,
      subtitle: `${p.amount ?? ''} ${(p as any).currency ?? ''}`.trim() || undefined,
      due,
      priority: base.priority as WorkItem['priority'],
      context: p.category || 'Payment',
      overdueDays: overdue,
      staleDays: 0,
      score: scored.score,
      scoreDimensions: scored.dimensions,
      bucket: bucketOf(base),
      source: 'Payments',
      raw: p,
    });
  }

  for (const d of input.decisions ?? []) {
    if (d.status !== 'open') continue;
    const base = { priority: d.severity, overdueDays: 0, staleDays: 0, due: undefined, today, kind: 'decision' as const };
    const scored = scoreOf(base);
    items.push({
      id: `decision:${d.id}`,
      kind: 'decision',
      refId: d.id,
      title: d.title,
      subtitle: d.recommendation || d.context,
      priority: d.severity,
      context: 'Decision',
      overdueDays: 0,
      staleDays: 0,
      score: scored.score,
      scoreDimensions: scored.dimensions,
      bucket: 'today',
      source: 'Decision Center',
      raw: d,
    });
  }

  return items.sort((a, b) => b.score - a.score || (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9));
}

export interface WorkQueues {
  now?: WorkItem;
  today: WorkItem[];
  later: WorkItem[];
  all: WorkItem[];
}

export function splitQueue(items: WorkItem[]): WorkQueues {
  const today = items.filter((i) => i.bucket === 'today');
  const later = items.filter((i) => i.bucket === 'later');
  const now = today[0] ?? later[0];
  return {
    now,
    today: today.filter((i) => i.id !== now?.id),
    later,
    all: items,
  };
}

/** Group near-identical items so repeated work shows once with a count. */
export function groupWork(items: WorkItem[]): { item: WorkItem; count: number }[] {
  const map = new Map<string, { item: WorkItem; count: number }>();
  for (const i of items) {
    const key = `${i.kind}|${i.title.trim().toLowerCase()}`;
    const hit = map.get(key);
    if (hit) hit.count += 1;
    else map.set(key, { item: i, count: 1 });
  }
  return [...map.values()];
}
