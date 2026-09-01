// ─── Priority Engine v2 — explainable scoring ────────────────────────────────
// One transparent function: score = sum of named dimensions. Every score
// carries its reasons so the UI can always answer "why is this first?".
// Magic constants are banned; every weight has a name and a comment.

import type { WorkKind } from '@/lib/workQueue';

export interface ScoreInput {
  priority: 'critical' | 'high' | 'medium' | 'low' | string;
  overdueDays: number;
  staleDays: number;
  due?: string;      // YYYY-MM-DD
  today: string;     // YYYY-MM-DD
  kind: WorkKind;
  pinned?: boolean;   // committedOn === today
}

export interface ScoreDimension {
  name: string;
  points: number;
  reason: string;
}

export interface ScoreResult {
  score: number;
  dimensions: ScoreDimension[];
}

/** How much the user's own priority label matters. Half the ceiling by design:
 *  deadline reality must be able to outrank a label. */
export const PRIORITY_POINTS: Record<string, number> = {
  critical: 60,
  high: 42,
  medium: 24,
  low: 10,
};

/** Lateness pressure per overdue day, capped at 30 days (a 300-day-old task
 *  is not 10× more urgent than a 30-day-old one — it is rot, handled by review). */
export const OVERDUE_PER_DAY = 3.2;
export const OVERDUE_CAP_DAYS = 30;

/** Untouched decay per day. Deliberately gentle: staleness resurfaces work,
 *  it never outweighs a real deadline. */
export const STALE_PER_DAY = 0.6;
export const STALE_CAP_DAYS = 30;

/** Fixed boosts for due-today and approaching deadlines. */
export const DUE_TODAY_BONUS = 22;
export const APPROACHING_WINDOW_DAYS = 14; // full bonus at 0 days out
export const APPROACHING_MAX_BONUS = 14;   // fades linearly to 0 at window edge

/** Kind biases — certain kinds block more value than others. */
export const KIND_BONUS: Record<WorkKind, number> = {
  decision: 12,  // undecided findings block downstream work
  payment: 8,    // money has hard consequences
  task: 0,
  reminder: 0,
};

/** A pinned item ("committed today") is a promise — it outranks everything
 *  except another pinned item. Must exceed MAX_ENGINE_SCORE; asserted in
 *  tests so nobody can silently break the invariant. */
export const PINNED_BONUS = 500;

export const MAX_ENGINE_SCORE =
  Math.max(...Object.values(PRIORITY_POINTS)) +
  OVERDUE_PER_DAY * OVERDUE_CAP_DAYS +
  DUE_TODAY_BONUS +
  APPROACHING_MAX_BONUS +
  STALE_PER_DAY * STALE_CAP_DAYS +
  KIND_BONUS.decision; // largest kind bias

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round(
    (new Date(`${toIso}T00:00:00`).getTime() - new Date(`${fromIso}T00:00:00`).getTime()) /
      86_400_000,
  );
}

/** The one scoring function. Deterministic, pure, unit-testable. */
export function scoreItem(input: ScoreInput): ScoreResult {
  const dims: ScoreDimension[] = [];

  const base = PRIORITY_POINTS[input.priority];
  if (base > 0) {
    dims.push({
      name: 'priority',
      points: base,
      reason: `${input.priority} priority`,
    });
  }

  if (input.overdueDays > 0) {
    const capped = Math.min(input.overdueDays, OVERDUE_CAP_DAYS);
    dims.push({
      name: 'lateness',
      points: capped * OVERDUE_PER_DAY,
      reason:
        input.overdueDays === 1
          ? 'overdue since yesterday'
          : `${input.overdueDays} days overdue`,
    });
  }

  if (input.due === input.today) {
    dims.push({ name: 'dueToday', points: DUE_TODAY_BONUS, reason: 'due today' });
  } else if (input.due && input.due > input.today) {
    const daysOut = daysBetween(input.today, input.due);
    if (daysOut <= APPROACHING_WINDOW_DAYS) {
      const pts = Math.round(((APPROACHING_WINDOW_DAYS - daysOut) / APPROACHING_WINDOW_DAYS) * APPROACHING_MAX_BONUS);
      if (pts > 0) {
        dims.push({
          name: 'approaching',
          points: pts,
          reason: daysOut === 1 ? 'due tomorrow' : `due in ${daysOut} days`,
        });
      }
    }
  }

  if (input.staleDays > 0) {
    const capped = Math.min(input.staleDays, STALE_CAP_DAYS);
    dims.push({
      name: 'decay',
      points: capped * STALE_PER_DAY,
      reason: `untouched for ${input.staleDays} days`,
    });
  }

  const kindPts = KIND_BONUS[input.kind] ?? 0;
  if (kindPts > 0) {
    dims.push({
      name: 'kind',
      points: kindPts,
      reason: input.kind === 'decision' ? 'blocks other work until decided' : 'money has a hard deadline',
    });
  }

  if (input.pinned) {
    dims.push({ name: 'pinned', points: PINNED_BONUS, reason: 'you committed to this today' });
  }

  const score = dims.reduce((s, d) => s + d.points, 0);
  return { score: Math.round(score * 10) / 10, dimensions: dims };
}

/** Human "why now" lines for the UI — derived from the same dimensions so
 *  the explanation can never drift from the score. Order is semantic, not
 *  by points: deadlines lead, then the user's own commitment, then labels. */
const REASON_RANK: Record<string, number> = {
  lateness: 0,
  dueToday: 1,
  approaching: 2,
  pinned: 3,
  priority: 4,
  kind: 5,
  decay: 6,
};

export function reasonsOf(result: ScoreResult): string[] {
  const ordered = [...result.dimensions].sort(
    (a, b) => (REASON_RANK[a.name] ?? 9) - (REASON_RANK[b.name] ?? 9),
  );
  const out = ordered.map((d) => d.reason);
  return out.length > 0 ? out.slice(0, 3) : ['top of your queue right now'];
}
