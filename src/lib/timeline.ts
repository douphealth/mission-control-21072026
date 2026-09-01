// ─── Unified Timeline ────────────────────────────────────────────────────────
// One chronological "Today" that answers the three questions:
//   1. What needs attention → flag cards (pinned to the top, never hidden)
//   2. What am I doing now   → the NOW marker, placed by the wall clock
//   3. What comes next       → timed events, then the score-ordered queue
// Pure and testable: no React, no I/O. The component is a thin view over this.

import type { WorkItem } from '@/lib/workQueue';
import type { AttentionItem } from '@/lib/whyNow';
import { reasonsOf, type ScoreDimension } from '@/lib/priorityEngine';

export type TimelineKind = 'flag' | 'task' | 'reminder' | 'payment' | 'decision';

export interface TimelineEntry {
  id: string;
  /** HH:MM — present only for time-boxed items. Flags and untimed items have none. */
  time?: string;
  title: string;
  kind: TimelineKind;
  severity?: 'critical' | 'warning' | 'info';
  /** Explainable "why is this here" lines — same dimensions the engine scored. */
  reasons: string[];
  section: string;
  workItem?: WorkItem;
  flag?: AttentionItem;
  score?: number;
}

export interface Timeline {
  entries: TimelineEntry[];
  /** Index inside `entries` where the NOW marker belongs. -1 = append at end. */
  nowIndex: number;
  counts: { flags: number; timed: number; untimed: number };
}

/** Current local time as HH:MM — never UTC. */
export function hhmmNow(d: Date = new Date()): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const DEFAULT_FLAG_LIMIT = 4;
const DEFAULT_UNTIMED_LIMIT = 8;

/** Reasons for a work item, preferring the engine's own dimensions when the
 *  item carries them (tasks do), so the explanation never drifts from the score. */
function reasonsFor(item: WorkItem, today: string): string[] {
  const dims = (item as { scoreDimensions?: ScoreDimension[] }).scoreDimensions;
  if (dims && dims.length > 0) {
    return reasonsOf({ score: item.score, dimensions: dims });
  }
  // Fallback for kinds scored without dimensions kept — reuse whyNow semantics.
  const out: string[] = [];
  if (item.overdueDays > 0) {
    out.push(item.overdueDays === 1 ? 'overdue since yesterday' : `${item.overdueDays} days overdue`);
  } else if (item.due === today) {
    out.push('due today');
  }
  if (item.kind === 'decision') out.push('blocks other work until decided');
  if (item.kind === 'payment') out.push('money has a hard deadline');
  return out.length > 0 ? out.slice(0, 3) : ['top of your queue right now'];
}

export function buildTimeline(input: {
  items: WorkItem[];
  attention: AttentionItem[];
  nowTime: string;
  today: string;
  flagLimit?: number;
  untimedLimit?: number;
}): Timeline {
  const flagLimit = input.flagLimit ?? DEFAULT_FLAG_LIMIT;
  const untimedLimit = input.untimedLimit ?? DEFAULT_UNTIMED_LIMIT;

  const flags: TimelineEntry[] = input.attention.slice(0, flagLimit).map((a) => ({
    id: a.id,
    title: a.title,
    kind: 'flag' as const,
    severity: a.severity,
    reasons: a.detail ? [a.detail] : [],
    section: a.section,
    flag: a,
  }));

  const timed = input.items
    .filter((i) => !!i.time)
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
  const untimed = input.items
    .filter((i) => !i.time)
    .sort((a, b) => b.score - a.score)
    .slice(0, untimedLimit);

  const timedEntries: TimelineEntry[] = timed.map((i) => ({
    id: i.id,
    time: i.time,
    title: i.title,
    kind: i.kind,
    severity: i.overdueDays > 0 ? 'critical' : undefined,
    reasons: reasonsFor(i, input.today),
    section: sectionFor(i),
    workItem: i,
    score: i.score,
  }));

  const untimedEntries: TimelineEntry[] = untimed.map((i) => ({
    id: i.id,
    title: i.title,
    kind: i.kind,
    severity: i.overdueDays > 0 ? 'critical' : undefined,
    reasons: reasonsFor(i, input.today),
    section: sectionFor(i),
    workItem: i,
    score: i.score,
  }));

  // Entries order: flags → timed (clock) → NOW marker → untimed (score).
  // The marker always sits between the two blocks: everything above is
  // "the day so far", everything below is "what the engine says is next".
  const entries = [...flags, ...timedEntries, ...untimedEntries];
  const nowIndex = flags.length + timedEntries.length;

  return {
    entries,
    nowIndex,
    counts: {
      flags: flags.length,
      timed: timedEntries.length,
      untimed: untimedEntries.length,
    },
  };
}

function sectionFor(i: WorkItem): string {
  switch (i.kind) {
    case 'task':
      return 'tasks';
    case 'reminder':
      return 'reminders';
    case 'payment':
      return 'payments';
    case 'decision':
      return 'decisions';
    default:
      return 'tasks';
  }
}
