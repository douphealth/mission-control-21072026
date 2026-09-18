/**
 * Two-way synchronisation between Mission Control tasks and Google Tasks.
 *
 * A dedicated "Mission Control" Google Tasks list holds the mirror, so the
 * user's other Google lists are never touched. Local IndexedDB stays
 * authoritative; remote edits made in Google (title, notes, due date,
 * completion) flow back when they are newer than the last successful sync.
 */

import { db, type Task } from "@/lib/db";
import { useDataStore } from "@/stores/dataStore";
import {
  createTask as gCreateTask,
  deleteTask as gDeleteTask,
  isSignedIn,
  listTaskLists,
  listTasks,
  updateTask as gUpdateTask,
  type GTask,
} from "@/lib/googleTasks";

const LIST_KEY = "mc_gtasks_list_id_v1";
const LAST_SYNC_KEY = "mc_gtasks_last_sync_v1";
const LIST_TITLE = "Mission Control";

let running = false;

function readLastSync(): number {
  const raw = localStorage.getItem(LAST_SYNC_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function getGoogleTasksLastSync(): string | null {
  const n = readLastSync();
  return n ? new Date(n).toISOString() : null;
}

async function ensureList(): Promise<string> {
  const cached = localStorage.getItem(LIST_KEY);
  const lists = await listTaskLists();
  if (cached && lists.some((l) => l.id === cached)) return cached;
  const existing = lists.find((l) => l.title === LIST_TITLE);
  if (existing) {
    localStorage.setItem(LIST_KEY, existing.id);
    return existing.id;
  }
  // Google Tasks has no "create list" helper in our client — fall back to the
  // user's default (first) list so sync still works out of the box.
  const fallback = lists[0];
  if (!fallback) throw new Error("No Google Tasks list available on this account");
  localStorage.setItem(LIST_KEY, fallback.id);
  return fallback.id;
}

/** YYYY-MM-DD → RFC3339 (Google Tasks stores date-only, at UTC midnight). */
function toGoogleDue(due?: string): string | undefined {
  if (!due) return undefined;
  return `${due}T00:00:00.000Z`;
}

function fromGoogleDue(due?: string): string | undefined {
  if (!due) return undefined;
  return due.slice(0, 10);
}

function localToBody(task: Task): Partial<GTask> {
  return {
    title: task.title,
    notes: task.description || undefined,
    due: toGoogleDue(task.dueDate),
    status: task.status === "done" ? "completed" : "needsAction",
  };
}

function differs(task: Task, remote: GTask): boolean {
  const body = localToBody(task);
  return (
    (body.title || "") !== (remote.title || "") ||
    (body.notes || "") !== (remote.notes || "") ||
    (fromGoogleDue(body.due) || "") !== (fromGoogleDue(remote.due) || "") ||
    body.status !== remote.status
  );
}

export interface GoogleTasksSyncResult {
  pushed: number;
  pulled: number;
  imported: number;
}

/**
 * Run one full two-way pass. Safe to call repeatedly; it self-locks.
 */
export async function syncGoogleTasks(): Promise<GoogleTasksSyncResult | null> {
  if (typeof window === "undefined" || !isSignedIn() || running) return null;
  running = true;
  const result: GoogleTasksSyncResult = { pushed: 0, pulled: 0, imported: 0 };
  const lastSync = readLastSync();
  const { addItem, updateItem } = useDataStore.getState();

  try {
    const listId = await ensureList();
    const remoteTasks = await listTasks(listId, true);
    const remoteById = new Map(remoteTasks.map((t) => [t.id, t]));

    const localTasks = (await db.tasks.toArray()).filter((t) => !t.archived && !(t as any).deleted);
    const localByRemoteId = new Map<string, Task>();
    for (const t of localTasks) if (t.gtaskId) localByRemoteId.set(t.gtaskId, t);

    // 1. Local → Google (create or update)
    for (const task of localTasks) {
      const remote = task.gtaskId ? remoteById.get(task.gtaskId) : undefined;
      if (!remote) {
        const created = await gCreateTask(listId, localToBody(task));
        await updateItem<Task>("tasks", task.id, { gtaskId: created.id } as Partial<Task>);
        result.pushed++;
        continue;
      }
      const remoteUpdated = remote.updated ? Date.parse(remote.updated) : 0;
      if (remoteUpdated > lastSync) continue; // remote is newer — handled below
      if (differs(task, remote)) {
        await gUpdateTask(listId, remote.id, localToBody(task));
        result.pushed++;
      }
    }

    // 2. Google → Local
    for (const remote of remoteTasks) {
      const remoteUpdated = remote.updated ? Date.parse(remote.updated) : 0;
      const local = localByRemoteId.get(remote.id);

      if (local) {
        if (remoteUpdated <= lastSync) continue;
        const patch: Partial<Task> = {};
        if (remote.title && remote.title !== local.title) patch.title = remote.title;
        const notes = remote.notes || "";
        if (notes !== (local.description || "")) patch.description = notes;
        const due = fromGoogleDue(remote.due);
        if (due && due !== local.dueDate) patch.dueDate = due;
        const remoteDone = remote.status === "completed";
        if (remoteDone !== (local.status === "done")) {
          patch.status = remoteDone ? "done" : "todo";
          patch.completedAt = remoteDone ? new Date().toISOString() : undefined;
        }
        if (Object.keys(patch).length > 0) {
          await updateItem<Task>("tasks", local.id, patch);
          result.pulled++;
        }
        continue;
      }

      // New task created directly in Google → import it
      if (!remote.title?.trim()) continue;
      if (remote.status === "completed") continue; // don't import finished history
      const today = new Date();
      const fallbackDue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      await addItem<Task>("tasks", {
        title: remote.title.trim(),
        priority: "medium",
        status: "todo",
        dueDate: fromGoogleDue(remote.due) || fallbackDue,
        category: "General",
        description: remote.notes || "",
        linkedProject: "",
        subtasks: [],
        createdAt: new Date().toISOString(),
        gtaskId: remote.id,
      } as Omit<Task, "id">);
      result.imported++;
    }

    localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
    return result;
  } finally {
    running = false;
  }
}

/** Remove a task's mirror from Google Tasks (best-effort). */
export async function removeGoogleTaskMirror(task: Task): Promise<void> {
  if (!task.gtaskId || !isSignedIn()) return;
  try {
    const listId = localStorage.getItem(LIST_KEY);
    if (listId) await gDeleteTask(listId, task.gtaskId);
  } catch {
    /* best-effort */
  }
}
