// Recoverable task deletion + Trash. Nothing here hard-deletes unless asked.
import { toast } from "sonner";
import type { Task, WorkBlock } from "@/lib/db";
import { db } from "@/lib/db";
import { useDataStore } from "@/stores/dataStore";
import { deleteGCalEvent } from "@/lib/googleCalendar";
import { todayISO, addDaysLocal } from "@/lib/overdue";

export const TRASH_RETENTION_DAYS = 30;

async function dropCalendarMirror(task: Task | undefined) {
  if (!task?.gcalEventId) return;
  try {
    await deleteGCalEvent(task.gcalEventId);
  } catch (e) {
    console.warn("Calendar mirror not removed", e);
  }
}

/** Move to Trash with an Undo toast. The calendar mirror is removed immediately. */
export async function softDeleteTasks(ids: string[], label?: string): Promise<void> {
  if (!ids.length) return;
  const { updateItem } = useDataStore.getState();
  const deletedAt = new Date().toISOString();
  const tasks = await db.tasks.where("id").anyOf(ids).toArray();
  for (const t of tasks) await dropCalendarMirror(t);
  for (const id of ids) await updateItem<Task>("tasks", id, { deletedAt } as Partial<Task>);
  toast.success(label ?? (ids.length === 1 ? "Moved to Trash" : `${ids.length} moved to Trash`), {
    description: `Recoverable for ${TRASH_RETENTION_DAYS} days`,
    action: { label: "Undo", onClick: () => void restoreTasks(ids) },
  });
}

export async function restoreTasks(ids: string[]): Promise<void> {
  const { updateItem } = useDataStore.getState();
  for (const id of ids)
    await updateItem<Task>("tasks", id, { deletedAt: undefined, touchedAt: todayISO() } as Partial<Task>);
  toast.success(ids.length === 1 ? "Restored" : `${ids.length} restored`);
}

/** Permanent removal — only from the Trash view, after a confirmation. */
export async function purgeTasks(ids: string[]): Promise<void> {
  const { deleteItem } = useDataStore.getState();
  for (const id of ids) await deleteItem("tasks", id);
}

/** Auto-purge anything older than the retention window. Safe to call often. */
export async function purgeExpiredTrash(): Promise<number> {
  const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 86_400_000).toISOString();
  const expired = await db.tasks.filter((t) => !!t.deletedAt && t.deletedAt < cutoff).toArray();
  if (expired.length) await purgeTasks(expired.map((t) => t.id));
  return expired.length;
}

// ─── Work blocks (time allocation, never the deadline) ───────────────────────

export function newBlockId() {
  return `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export async function setBlocks(task: Task, blocks: WorkBlock[]): Promise<void> {
  const { updateItem } = useDataStore.getState();
  const first = [...blocks].sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`))[0];
  await updateItem<Task>("tasks", task.id, {
    blocks,
    // Keep legacy planning fields coherent for older views; dueDate untouched.
    scheduledAt: first?.date ?? task.scheduledAt,
    startTime: first?.start,
    endTime: first?.end,
    inbox: false,
  } as Partial<Task>);
}

export async function addBlock(task: Task, block: Omit<WorkBlock, "id">): Promise<void> {
  await setBlocks(task, [...(task.blocks ?? []), { ...block, id: newBlockId() }]);
}

export async function moveBlock(
  task: Task,
  blockId: string,
  patch: Partial<Pick<WorkBlock, "date" | "start" | "end">>,
): Promise<void> {
  await setBlocks(task, (task.blocks ?? []).map((b) => (b.id === blockId ? { ...b, ...patch } : b)));
}

export async function removeBlock(task: Task, blockId: string): Promise<void> {
  await setBlocks(task, (task.blocks ?? []).filter((b) => b.id !== blockId));
}

/** Completing a block never completes the task — the user decides that. */
export async function completeBlock(task: Task, blockId: string): Promise<void> {
  const { updateItem } = useDataStore.getState();
  await updateItem<Task>("tasks", task.id, {
    blocks: (task.blocks ?? []).map((b) => (b.id === blockId ? { ...b, done: true } : b)),
    status: task.status === "todo" ? "in-progress" : task.status,
  } as Partial<Task>);
}

/** Split remaining estimate in two: today's block stays, the rest goes to tomorrow. */
export async function splitBlockToTomorrow(task: Task, blockId: string, today = todayISO()) {
  const b = (task.blocks ?? []).find((x) => x.id === blockId);
  if (!b) return;
  const { hhmmToMin, minToHHMM } = await import("@/lib/planning");
  const total = hhmmToMin(b.end) - hhmmToMin(b.start);
  if (total < 30) return;
  const half = Math.floor(total / 2 / 5) * 5;
  const kept = { ...b, end: minToHHMM(hhmmToMin(b.start) + half) };
  const moved: WorkBlock = {
    id: newBlockId(),
    date: addDaysLocal(today, 1),
    start: b.start,
    end: minToHHMM(hhmmToMin(b.start) + (total - half)),
  };
  await setBlocks(task, [...(task.blocks ?? []).map((x) => (x.id === blockId ? kept : x)), moved]);
}

// ─── Day-close decisions ─────────────────────────────────────────────────────

export async function sendToInbox(task: Task): Promise<void> {
  const { updateItem } = useDataStore.getState();
  await updateItem<Task>("tasks", task.id, {
    inbox: true,
    committedOn: undefined,
    scheduledAt: undefined,
    notBefore: undefined,
    startTime: undefined,
    endTime: undefined,
    blocks: (task.blocks ?? []).filter((b) => b.done),
  } as Partial<Task>);
}

export async function rescheduleToTomorrow(task: Task, today = todayISO()): Promise<void> {
  const { updateItem } = useDataStore.getState();
  const tomorrow = addDaysLocal(today, 1);
  await updateItem<Task>("tasks", task.id, {
    committedOn: undefined,
    scheduledAt: tomorrow,
    notBefore: tomorrow,
    inbox: false,
    blocks: (task.blocks ?? []).map((b) => (b.date === today && !b.done ? { ...b, date: tomorrow } : b)),
  } as Partial<Task>);
}

export async function reduceScope(task: Task, estimateMin: number): Promise<void> {
  const { updateItem } = useDataStore.getState();
  await updateItem<Task>("tasks", task.id, { estimateMin } as Partial<Task>);
}
