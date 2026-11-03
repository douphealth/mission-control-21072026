import { db, type Task } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { markCloudRecordsDirty } from "@/lib/cloudSync";
import { useDataStore } from "@/stores/dataStore";

type CaptureMode = "accept" | "today" | "archive";
type CapturePatch = Pick<
  Partial<Task>,
  "inbox" | "archived" | "archivedAt" | "scheduledAt" | "committedOn" | "notBefore" | "touchedAt"
>;
export interface CaptureUndo {
  id: string;
  before: CapturePatch;
  after: CapturePatch;
  status: Task["status"];
  archived: boolean;
}

function capturePatch(mode: CaptureMode, today: string): CapturePatch {
  if (mode === "archive")
    return { archived: true, archivedAt: today, inbox: false, touchedAt: today };
  if (mode === "today")
    return {
      inbox: false,
      scheduledAt: today,
      committedOn: today,
      notBefore: undefined,
      touchedAt: today,
    };
  return { inbox: false, touchedAt: today };
}

/** Restore only our own fields, and only while they still contain our applied values. */
export function captureUndoPatch(
  current: Task | undefined,
  change: CaptureUndo,
): CapturePatch | null {
  if (
    !current ||
    current.deletedAt ||
    current.status !== change.status ||
    Boolean(current.archived) !== change.archived
  )
    return null;
  const keys = Object.keys(change.after) as Array<keyof CapturePatch>;
  if (!keys.every((key) => Object.is(current[key], change.after[key]))) return null;
  return change.before;
}

async function recordChanges(changed: Task[], detail: string): Promise<string | null> {
  if (!changed.length) return null;
  let syncError: string | null = null;
  try {
    markCloudRecordsDirty(
      "tasks",
      changed.map((task) => task.id),
    );
    useDataStore.getState()._schedulePush();
  } catch (error) {
    syncError =
      error instanceof Error ? error.message : "Cloud synchronization could not be queued.";
  }
  await Promise.all(
    changed.map((task) =>
      logAudit({
        action: "update",
        collection: "tasks",
        recordId: task.id,
        label: task.title,
        detail,
        before: task,
      }),
    ),
  );
  return syncError;
}

/** Read and patch under one write lock so stale selections cannot overwrite completed work. */
export async function processCaptures(ids: string[], mode: CaptureMode, today: string) {
  const after = capturePatch(mode, today);
  const result = await db.transaction("rw", db.tasks, async () => {
    const changed: Task[] = [];
    const undo: CaptureUndo[] = [];
    const conflicts: string[] = [];
    for (const id of new Set(ids)) {
      const current = await db.tasks.get(id);
      if (
        !current ||
        !current.inbox ||
        current.archived ||
        current.deletedAt ||
        current.status === "done"
      ) {
        conflicts.push(id);
        continue;
      }
      await db.tasks.update(id, after);
      changed.push(current);
      undo.push({
        id,
        before: Object.fromEntries(
          Object.keys(after).map((key) => [key, current[key as keyof Task]]),
        ),
        after: { ...after },
        status: current.status,
        archived: mode === "archive",
      });
    }
    return { changed, undo, conflicts };
  });
  const syncError = await recordChanges(result.changed, `Capture triage: ${mode}`);
  return { undo: result.undo, conflicts: result.conflicts, syncError };
}

/** Conflicting/deleted rows are left untouched; independent title or context edits survive. */
export async function undoCaptures(changes: CaptureUndo[]) {
  const result = await db.transaction("rw", db.tasks, async () => {
    const changed: Task[] = [];
    const conflicts: string[] = [];
    const seen = new Set<string>();
    for (const change of changes) {
      if (seen.has(change.id)) continue;
      seen.add(change.id);
      const current = await db.tasks.get(change.id);
      const patch = captureUndoPatch(current, change);
      if (!current || !patch) {
        conflicts.push(change.id);
        continue;
      }
      await db.tasks.update(change.id, patch);
      changed.push(current);
    }
    return { changed, conflicts };
  });
  const syncError = await recordChanges(
    result.changed,
    "Capture triage undone; concurrent edits preserved",
  );
  return { restored: result.changed.length, conflicts: result.conflicts, syncError };
}
