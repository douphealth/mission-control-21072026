import type { Task } from "./db";
import { isPlannedToday } from "./planning";

export type TaskPreset = "inbox" | "today" | "upcoming" | "important" | "all" | "done";

export function matchesTaskView(task: Task, preset: TaskPreset, today: string): boolean {
  if (task.archived) return false;
  const open = task.status !== "done";
  const inbox = task.inbox || (!task.dueDate && !task.scheduledAt && !task.committedOn && !task.blocks?.some(block => !block.done));
  const next = task.scheduledAt || task.dueDate;
  switch (preset) {
    case "inbox": return open && Boolean(inbox);
    case "today": return open && Boolean((task.dueDate && task.dueDate <= today) || isPlannedToday(task, today));
    case "upcoming": return open && Boolean(next && next > today);
    case "important": return open && ["critical", "high"].includes(task.priority);
    case "done": return !open && (task.completedAt || "").slice(0, 10) === today;
    case "all": return open;
  }
}

export function taskMatchesSearch(task: Task, query: string): boolean {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const text = [task.title, task.description, task.linkedProject, task.category, ...(task.tags || []), ...(task.subtasks || []).map(item => item.title)].join(" ").toLocaleLowerCase();
  return words.every(word => text.includes(word));
}

export function visibleSelection(ids: ReadonlySet<string>, tasks: Pick<Task, "id">[]): Set<string> {
  return new Set(tasks.filter(task => ids.has(task.id)).map(task => task.id));
}