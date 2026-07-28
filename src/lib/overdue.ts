// ─── Overdue / daily-briefing engine ─────────────────────────────────────────
// Single source of truth for "what needs my attention today", used by the
// daily briefing banner, the reminder loop and the email digest.

import type { Task } from '@/lib/db';

export const PRIORITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

export function daysOverdue(task: Task, today = todayISO()): number {
  if (!task.dueDate) return 0;
  const due = new Date(`${task.dueDate}T00:00:00`).getTime();
  const now = new Date(`${today}T00:00:00`).getTime();
  return Math.max(0, Math.round((now - due) / 86_400_000));
}

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const p = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
    if (p !== 0) return p;
    return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
  });
}

export interface DailyBriefing {
  overdue: Task[];
  dueToday: Task[];
  dueTomorrow: Task[];
  completedToday: number;
  total: number;
}

export function buildBriefing(tasks: Task[], today = todayISO()): DailyBriefing {
  const tomorrow = new Date(new Date(`${today}T00:00:00`).getTime() + 86_400_000)
    .toISOString()
    .slice(0, 10);

  const open = tasks.filter((t) => t.status !== 'done');
  const overdue = sortTasks(open.filter((t) => t.dueDate && t.dueDate < today));
  const dueToday = sortTasks(open.filter((t) => t.dueDate === today));
  const dueTomorrow = sortTasks(open.filter((t) => t.dueDate === tomorrow));
  const completedToday = tasks.filter(
    (t) => t.status === 'done' && (t.completedAt || '').slice(0, 10) === today,
  ).length;

  return {
    overdue,
    dueToday,
    dueTomorrow,
    completedToday,
    total: overdue.length + dueToday.length,
  };
}

function line(task: Task, today: string): string {
  const d = daysOverdue(task, today);
  const age = d > 0 ? ` — ${d} day${d === 1 ? '' : 's'} overdue` : '';
  const time = task.startTime ? ` at ${task.startTime}` : '';
  return `• [${task.priority.toUpperCase()}] ${task.title} (due ${task.dueDate}${time})${age}`;
}

/** Plain-text digest — used for the mail body and clipboard copy. */
export function buildDigestText(b: DailyBriefing, today = todayISO()): string {
  const parts: string[] = [
    `MISSION CONTROL — DAILY TASK DIGEST`,
    today,
    '',
    `Overdue: ${b.overdue.length}   Due today: ${b.dueToday.length}   Due tomorrow: ${b.dueTomorrow.length}   Completed today: ${b.completedToday}`,
    '',
  ];

  if (b.overdue.length) {
    parts.push(`OVERDUE (${b.overdue.length})`, '─────────────────────────');
    parts.push(...b.overdue.map((t) => line(t, today)), '');
  }
  if (b.dueToday.length) {
    parts.push(`DUE TODAY (${b.dueToday.length})`, '─────────────────────────');
    parts.push(...b.dueToday.map((t) => line(t, today)), '');
  }
  if (b.dueTomorrow.length) {
    parts.push(`DUE TOMORROW (${b.dueTomorrow.length})`, '─────────────────────────');
    parts.push(...b.dueTomorrow.map((t) => line(t, today)), '');
  }
  if (!b.overdue.length && !b.dueToday.length) {
    parts.push('Nothing overdue and nothing due today. You are clear. ✅', '');
  }

  parts.push('— Sent from Mission Control');
  return parts.join('\n');
}

export function buildDigestSubject(b: DailyBriefing, today = todayISO()): string {
  if (b.overdue.length) {
    return `⚠️ ${b.overdue.length} overdue task${b.overdue.length === 1 ? '' : 's'} — Mission Control ${today}`;
  }
  if (b.dueToday.length) {
    return `${b.dueToday.length} task${b.dueToday.length === 1 ? '' : 's'} due today — Mission Control ${today}`;
  }
  return `All clear — Mission Control ${today}`;
}

/** Opens the user's mail client with a fully formatted digest. */
export function mailDigest(b: DailyBriefing, to: string, today = todayISO()) {
  const href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
    buildDigestSubject(b, today),
  )}&body=${encodeURIComponent(buildDigestText(b, today))}`;
  window.location.href = href;
}
