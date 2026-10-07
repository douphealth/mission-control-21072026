import type { Task } from "./db";
import type { WorkItem } from "./workQueue";
import { blocksOf } from "./planning";

/** Completed selected work stays selected; it must not turn into a new 0/3 plan. */
export function selectedDailyOutcomes(tasks: Task[], open: WorkItem[], today: string): WorkItem[] {
  const indexed = new Map(open.filter(item => item.kind === "task").map(item => [item.refId, item]));
  return tasks.filter(task => !task.archived && !task.deletedAt && (
    task.committedOn === today || task.scheduledAt === today || blocksOf(task).some(block => block.date === today)
  )).map(task => indexed.get(task.id) ?? {
    id: `task:${task.id}`, kind: "task" as const, refId: task.id, title: task.title,
    priority: task.priority, overdueDays: 0, staleDays: 0, score: 0, bucket: "today" as const,
    source: "Tasks", due: task.dueDate || undefined, scheduled: task.scheduledAt, raw: task,
  }).sort((a, b) => {
    const pinned = Number((b.raw as Task).committedOn === today) - Number((a.raw as Task).committedOn === today);
    return pinned || b.score - a.score || a.refId.localeCompare(b.refId);
  });
}

export function outcomeProgress(items: WorkItem[]) {
  const selected = items.slice(0, 3);
  return { total: selected.length, done: selected.filter(item => (item.raw as Task).status === "done").length };
}
