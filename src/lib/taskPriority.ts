import type { Task } from '@/lib/db';

const WEIGHTS: Record<Task['priority'], number> = {
  critical: 60,
  high: 40,
  medium: 20,
  low: 5,
};

export type RankedTask = Task & { score: number; reasons: string[] };

export function rankTasks(tasks: Task[], now = new Date()): RankedTask[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  return tasks
    .filter(task => task.status !== 'done')
    .map(task => {
      let score = WEIGHTS[task.priority];
      const reasons = [`${task.priority} priority`];
      const due = task.dueDate ? new Date(`${task.dueDate}T00:00:00`) : null;

      if (due && !Number.isNaN(due.getTime())) {
        const days = Math.ceil((due.getTime() - today.getTime()) / 86400000);
        if (days < 0) {
          score += 100 + Math.min(Math.abs(days) * 4, 40);
          reasons.push(`${Math.abs(days)} day(s) overdue`);
        } else if (days === 0) {
          score += 75;
          reasons.push('due today');
        } else if (days <= 3) {
          score += 45 - days * 5;
          reasons.push(`due in ${days} day(s)`);
        } else if (days <= 7) {
          score += 15;
          reasons.push('due this week');
        }
      }

      if (task.status === 'in-progress') {
        score += 18;
        reasons.push('already in progress');
      }

      if (task.status === 'blocked') {
        score -= 35;
        reasons.push('blocked');
      }

      const remaining = task.subtasks?.filter(item => !item.done).length ?? 0;
      if (remaining > 0 && remaining <= 2) {
        score += 8;
        reasons.push('close to completion');
      }

      return { ...task, score, reasons };
    })
    .sort((a, b) => b.score - a.score || a.dueDate.localeCompare(b.dueDate));
}
