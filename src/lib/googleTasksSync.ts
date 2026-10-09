/**
 * Two-way synchronisation between Mission Control tasks and Google Tasks (which is also what
 * Google Calendar shows in its Tasks panel).
 *
 * The decisions live in `googleTasksPlanner.ts` and are unit tested. This file does the I/O:
 * it reads every Google task list in full, asks the planner what each side needs, and applies
 * the result. A change made on one side reaches the other side, including deletes, edits, new
 * tasks and due dates, and it reaches other devices through the app's own cloud sync.
 */

import { db, genId, type Task } from "@/lib/db";
import { markCloudRecordDirty, queueCloudPush } from "@/lib/cloudSync";
import {
  GoogleTasksError,
  createTask as gCreateTask,
  deleteTask as gDeleteTask,
  isSignedIn,
  listTaskLists,
  listTasksForSync,
  updateTask as gUpdateTask,
  type GTask,
} from "@/lib/googleTasks";
import { clearTombstonePart, readTombstones } from "@/lib/googleSyncState";
import {
  hashContent,
  isSuspiciousMassDelete,
  planGoogleTasksSync,
  type PlannerLocalTask,
  type PlannerRemoteTask,
  type SyncAction,
} from "@/lib/googleTasksPlanner";

const LIST_KEY = "mc_gtasks_list_id_v1";
const LAST_SYNC_KEY = "mc_gtasks_last_sync_v1";
const LIST_TITLE = "Mission Control";
/** Finished tasks older than this are history: not imported from Google, not pushed to it. */
const HISTORY_DAYS = 30;
/** Writes to Google run a few at a time: fast enough for a first sync, gentle on the rate limit. */
const POOL_SIZE = 4;

let running = false;

function readLastSync(): number {
  try {
    const raw = localStorage.getItem(LAST_SYNC_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function getGoogleTasksLastSync(): string | null {
  const n = readLastSync();
  return n ? new Date(n).toISOString() : null;
}

export interface GoogleTasksSyncResult {
  /** Tasks created or updated in Google. */
  pushed: number;
  /** Tasks in Mission Control updated from Google. */
  pulled: number;
  /** Tasks that were new in Google and are now here. */
  imported: number;
  /** Tasks removed on either side to match the other. */
  deleted: number;
  /** Actions that failed this pass. They are retried on the next one. */
  errors: number;
  firstError?: string;
  /** Deletions held back because Google returned far fewer tasks than expected. */
  held: number;
}

export interface SyncOptions {
  /** Apply deletions that were held back as suspicious. Only the user's explicit action sets this. */
  confirmDeletions?: boolean;
}

function toRemote(task: GTask, listId: string): PlannerRemoteTask {
  return {
    listId,
    id: task.id,
    title: task.title ?? "",
    notes: task.notes ?? "",
    due: task.due ? task.due.slice(0, 10) : "",
    done: task.status === "completed",
    updated: task.updated ?? "",
    deleted: !!task.deleted,
  };
}

function toPlannerLocal(task: Task): PlannerLocalTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    dueDate: task.dueDate,
    status: task.status,
    deletedAt: task.deletedAt,
    archived: task.archived,
    updatedAt: task.updatedAt,
    createdAt: task.createdAt,
    completedAt: task.completedAt,
    touchedAt: task.touchedAt,
    gtaskId: task.gtaskId,
    gtaskListId: task.gtaskListId,
    gtaskUpdated: task.gtaskUpdated,
    gtaskHash: task.gtaskHash,
  };
}

/** Which list new Mission Control tasks go to: the one chosen before, else "Mission Control", else the first. */
function chooseDefaultList(lists: { id: string; title: string }[]): string {
  let cached: string | null = null;
  try {
    cached = localStorage.getItem(LIST_KEY);
  } catch {
    /* privacy mode */
  }
  const chosen =
    (cached && lists.find((list) => list.id === cached)) ||
    lists.find((list) => list.title === LIST_TITLE) ||
    lists[0];
  if (!chosen) throw new Error("No Google Tasks list available on this account");
  try {
    localStorage.setItem(LIST_KEY, chosen.id);
  } catch {
    /* non-fatal */
  }
  return chosen.id;
}

/** Writes to a task row and marks it for cloud sync, so the change reaches other devices. */
async function writeTask(id: string, changes: Partial<Task>): Promise<void> {
  const updated = await db.tasks.update(id, changes as Parameters<typeof db.tasks.update>[1]);
  if (updated) markCloudRecordDirty("tasks", id);
}

const UNLINK: Partial<Task> = {
  gtaskId: undefined,
  gtaskListId: undefined,
  gtaskUpdated: undefined,
  gtaskHash: undefined,
};

const linkFields = (remote: PlannerRemoteTask, hash: string): Partial<Task> => ({
  gtaskId: remote.id,
  gtaskListId: remote.listId,
  gtaskUpdated: remote.updated,
  gtaskHash: hash,
});

/** Run `items` through `worker`, at most `size` at a time. Order does not matter between items. */
async function runPool<T>(
  items: T[],
  size: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const lanes = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      await worker(item);
    }
  });
  await Promise.all(lanes);
}

/** A request body for creating: Google rejects explicit nulls there, so drop them. */
function forCreate(body: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== null && value !== undefined),
  );
}

/**
 * Run one full two-way pass. Safe to call repeatedly; it serialises itself.
 * Returns null when Google is not connected or a pass is already running.
 */
export async function syncGoogleTasks(
  options: SyncOptions = {},
): Promise<GoogleTasksSyncResult | null> {
  if (typeof window === "undefined" || !isSignedIn() || running) return null;
  running = true;
  const result: GoogleTasksSyncResult = {
    pushed: 0,
    pulled: 0,
    imported: 0,
    deleted: 0,
    errors: 0,
    held: 0,
  };

  try {
    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Read Google in full. A list that fails to read is left out of "complete lists", so nothing
    //    in it is ever mistaken for deleted.
    const lists = await listTaskLists();
    const defaultListId = chooseDefaultList(lists);
    const remotes: PlannerRemoteTask[] = [];
    const completeLists = new Set<string>();
    let listFailure: string | undefined;
    await runPool(lists, POOL_SIZE, async (list) => {
      try {
        const tasks = await listTasksForSync(list.id);
        for (const task of tasks) remotes.push(toRemote(task, list.id));
        completeLists.add(list.id);
      } catch (error) {
        listFailure ??= error instanceof Error ? error.message : String(error);
      }
    });
    if (completeLists.size === 0) throw new Error(listFailure || "Google Tasks could not be read");

    // 2. Read the app.
    const localRows = await db.tasks.toArray();
    const plannedUpdatedAt = new Map(localRows.map((task) => [task.id, task.updatedAt ?? ""]));
    let legacyListId: string | undefined;
    try {
      legacyListId = localStorage.getItem(LIST_KEY) ?? undefined;
    } catch {
      /* privacy mode */
    }

    // 3. Decide.
    const plan = planGoogleTasksSync({
      locals: localRows.map(toPlannerLocal),
      remotes,
      completeLists,
      defaultListId,
      legacyListId,
      tombstones: readTombstones()
        .filter((item) => item.gtaskId)
        .map((item) => ({
          key: item.key,
          taskId: item.taskId,
          listId: item.listId,
          gtaskId: item.gtaskId,
        })),
      importCompletedSince: new Date(now.getTime() - HISTORY_DAYS * 86_400_000).toISOString(),
      now: nowIso,
    });

    // 4. A short list back from Google can look exactly like "everything was deleted". Do not
    //    trash a big share of the tasks on that evidence alone.
    let actions = plan.actions;
    const missing = actions.filter(
      (a) => a.kind === "softDeleteLocal" && a.reason === "missing-in-google",
    );
    const linkedCount = localRows.filter((task) => task.gtaskId && !task.deletedAt).length;
    if (!options.confirmDeletions && isSuspiciousMassDelete(missing.length, linkedCount)) {
      result.held = missing.length;
      const held = new Set<SyncAction>(missing);
      actions = actions.filter((action) => !held.has(action));
    }

    // 5. Apply. One failed action never stops the rest.
    const fail = (error: unknown) => {
      result.errors++;
      result.firstError ??= error instanceof Error ? error.message : String(error);
    };

    /** A task edited since the plan was made is left for the next pass instead of being overwritten. */
    const changedSincePlan = async (localId: string): Promise<boolean> => {
      const current = await db.tasks.get(localId);
      return !current || (current.updatedAt ?? "") !== (plannedUpdatedAt.get(localId) ?? "");
    };

    const apply = async (action: SyncAction): Promise<void> => {
      try {
        switch (action.kind) {
          case "createRemote": {
            const created = await gCreateTask(
              action.listId,
              forCreate(action.body as unknown as Record<string, unknown>),
            );
            await writeTask(action.localId, {
              gtaskId: created.id,
              gtaskListId: action.listId,
              gtaskUpdated: created.updated,
              gtaskHash: action.hash,
            });
            result.pushed++;
            return;
          }
          case "updateRemote": {
            const updated = await gUpdateTask(
              action.listId,
              action.remoteId,
              action.body as unknown as Record<string, unknown>,
            );
            await writeTask(action.localId, {
              gtaskId: action.remoteId,
              gtaskListId: action.listId,
              gtaskUpdated: updated.updated,
              gtaskHash: action.hash,
            });
            result.pushed++;
            return;
          }
          case "deleteRemote": {
            if (action.listId) await gDeleteTask(action.listId, action.remoteId);
            if (action.localId) await writeTask(action.localId, UNLINK);
            if (action.tombstoneKey) clearTombstonePart(action.tombstoneKey, "gtask");
            result.deleted++;
            return;
          }
          case "createLocal": {
            const remote = action.remote;
            const id = genId();
            const hash = hashContent({
              title: remote.title.trim(),
              notes: remote.notes.trim(),
              due: remote.due,
              done: remote.done,
            });
            const task: Task = {
              id,
              title: remote.title.trim(),
              priority: "medium",
              status: remote.done ? "done" : "todo",
              // A Google task with no due date has no deadline here either. It waits in the Inbox
              // for a decision instead of being given today's date and swelling "due today".
              dueDate: remote.due,
              category: "General",
              description: remote.notes,
              linkedProject: "",
              subtasks: [],
              createdAt: nowIso,
              completedAt: remote.done ? remote.updated || nowIso : undefined,
              inbox: remote.due ? undefined : true,
              updatedAt: remote.updated || nowIso,
              ...linkFields(remote, hash),
            };
            await db.tasks.put(task);
            markCloudRecordDirty("tasks", id);
            result.imported++;
            return;
          }
          case "updateLocal": {
            if (await changedSincePlan(action.localId)) return;
            const { patch, remote, hash } = action;
            const changes: Partial<Task> = {
              ...linkFields(remote, hash),
              updatedAt: remote.updated || nowIso,
            };
            if (patch.title !== undefined) changes.title = patch.title;
            if (patch.description !== undefined) changes.description = patch.description;
            if (patch.dueDate !== undefined) changes.dueDate = patch.dueDate;
            if (patch.inbox) changes.inbox = true;
            if (patch.status !== undefined) changes.status = patch.status;
            if ("completedAt" in patch) changes.completedAt = patch.completedAt;
            await writeTask(action.localId, changes);
            result.pulled++;
            return;
          }
          case "softDeleteLocal": {
            if (await changedSincePlan(action.localId)) return;
            await writeTask(action.localId, { deletedAt: nowIso, ...UNLINK });
            result.deleted++;
            return;
          }
          case "unlink":
            await writeTask(action.localId, UNLINK);
            return;
          case "stamp":
          case "link":
            await writeTask(action.localId, linkFields(action.remote, action.hash));
            return;
          case "dropTombstone":
            clearTombstonePart(action.tombstoneKey, "gtask");
            return;
        }
      } catch (error) {
        // Already gone from Google while we were deleting or updating: the next pass settles it.
        if (error instanceof GoogleTasksError && (error.status === 404 || error.status === 410))
          return;
        fail(error);
      }
    };

    // Local-only bookkeeping goes first and in order. Calls to Google then run a few at a time.
    const isRemoteCall = (action: SyncAction) =>
      action.kind === "createRemote" ||
      action.kind === "updateRemote" ||
      action.kind === "deleteRemote";
    for (const action of actions.filter((a) => !isRemoteCall(a))) await apply(action);
    await runPool(actions.filter(isRemoteCall), POOL_SIZE, apply);

    queueCloudPush();
    if (listFailure) fail(new Error(listFailure));
    if (result.errors === 0) {
      try {
        localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
      } catch {
        /* non-fatal */
      }
    }
    return result;
  } finally {
    running = false;
  }
}

/** Remove a task's mirror from Google Tasks. Kept for older callers; deletes now sync on their own. */
export async function removeGoogleTaskMirror(task: Task): Promise<void> {
  if (!task.gtaskId || !isSignedIn()) return;
  const listId =
    task.gtaskListId ||
    (() => {
      try {
        return localStorage.getItem(LIST_KEY) || undefined;
      } catch {
        return undefined;
      }
    })();
  if (!listId) return;
  try {
    await gDeleteTask(listId, task.gtaskId);
  } catch {
    /* the tombstone/trash path retries it */
  }
}
