// ─── Task triage / decay engine ──────────────────────────────────────────────
// Implements the review loop: staleness detection, the Eisenhower matrix and
// the archive (instead of an ever-growing overdue graveyard).

import type { Task } from "@/lib/db";
import { todayISO, daysOverdue, addDaysLocal, PRIORITY_RANK } from "@/lib/overdue";

export const STALE_DAYS = 14;
export const ROT_DAYS = 30;

export function isArchived(t: Task): boolean {
  return (t as any).archived === true;
}

export function isOpen(t: Task): boolean {
  return t.status !== "done" && !isArchived(t);
}

export function lastTouched(t: Task): string {
  return (t as any).touchedAt || t.completedAt || t.createdAt || t.dueDate || todayISO();
}

export function daysSinceTouch(t: Task, today = todayISO()): number {
  const then = new Date(`${(lastTouched(t) || today).slice(0, 10)}T00:00:00`).getTime();
  const now = new Date(`${today}T00:00:00`).getTime();
  return Math.max(0, Math.round((now - then) / 86_400_000));
}

/** Untouched for STALE_DAYS+ → needs a decision, not another day of guilt. */
export function isStale(t: Task, today = todayISO()): boolean {
  return isOpen(t) && daysSinceTouch(t, today) >= STALE_DAYS;
}

/** Overdue for ROT_DAYS+ → almost certainly never getting done as written. */
export function isRotten(t: Task, today = todayISO()): boolean {
  return isOpen(t) && daysOverdue(t, today) >= ROT_DAYS;
}

export type Quadrant = "do" | "schedule" | "delegate" | "later";

export const QUADRANTS: { id: Quadrant; label: string; hint: string; accent: string }[] = [
  {
    id: "do",
    label: "Do now",
    hint: "Urgent + Important",
    accent: "text-red-500 bg-red-500/10 border-red-500/20",
  },
  {
    id: "schedule",
    label: "Schedule",
    hint: "Important, not urgent",
    accent: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  },
  {
    id: "delegate",
    label: "Delegate / batch",
    hint: "Urgent, not important",
    accent: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
  {
    id: "later",
    label: "Drop or defer",
    hint: "Neither",
    accent: "text-muted-foreground bg-secondary/60 border-border/30",
  },
];

export function isUrgent(t: Task, today = todayISO()): boolean {
  if (!t.dueDate) return false;
  const due = new Date(`${t.dueDate}T00:00:00`).getTime();
  const now = new Date(`${today}T00:00:00`).getTime();
  return (due - now) / 86_400_000 <= 2;
}

export function isImportant(t: Task): boolean {
  if ((t as any).important === true) return true;
  return t.priority === "critical" || t.priority === "high";
}

export function quadrantOf(t: Task, today = todayISO()): Quadrant {
  const u = isUrgent(t, today);
  const i = isImportant(t);
  if (u && i) return "do";
  if (!u && i) return "schedule";
  if (u && !i) return "delegate";
  return "later";
}

export function sortByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const p = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
    if (p !== 0) return p;
    return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
  });
}

export function addDaysISO(days: number, from = todayISO()): string {
  return addDaysLocal(from, days);
}

export interface ReviewQueues {
  rotten: Task[];
  stale: Task[];
  overdue: Task[];
  matrix: Record<Quadrant, Task[]>;
  openCount: number;
  archivedCount: number;
}

export function buildReviewQueues(tasks: Task[], today = todayISO()): ReviewQueues {
  const open = tasks.filter(isOpen);
  const rotten = sortByPriority(open.filter((t) => isRotten(t, today)));
  const rottenIds = new Set(rotten.map((t) => t.id));
  const stale = sortByPriority(open.filter((t) => isStale(t, today) && !rottenIds.has(t.id)));
  const overdue = sortByPriority(open.filter((t) => t.dueDate && t.dueDate < today));

  const matrix: Record<Quadrant, Task[]> = { do: [], schedule: [], delegate: [], later: [] };
  open.forEach((t) => matrix[quadrantOf(t, today)].push(t));
  (Object.keys(matrix) as Quadrant[]).forEach((k) => {
    matrix[k] = sortByPriority(matrix[k]);
  });

  return {
    rotten,
    stale,
    overdue,
    matrix,
    openCount: open.length,
    archivedCount: tasks.filter(isArchived).length,
  };
}
