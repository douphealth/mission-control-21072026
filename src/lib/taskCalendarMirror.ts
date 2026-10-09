// Keeps one Google Calendar event per task in step with the task:
//
//  - a new or edited task writes its event (title, dates, colour, notes),
//  - a trashed task, or one deleted for good, removes its event,
//  - an event is rewritten only when its content changed, not on every pass.
//
// Events are created with a deterministic id derived from the task id, so a retry or a second
// device writes to the same event instead of making a duplicate.

import { db, type Task } from "@/lib/db";
import { markCloudRecordDirty, queueCloudPush } from "@/lib/cloudSync";
import {
  buildTaskEventBody,
  createGCalEvent,
  deleteGCalEvent,
  isGCalConnected,
  taskIdToGCalId,
} from "@/lib/googleCalendar";
import { clearTombstonePart, contentHash, readTombstones } from "@/lib/googleSyncState";

const POOL_SIZE = 4;

export interface CalendarMirrorResult {
  written: number;
  removed: number;
  errors: number;
  firstError?: string;
}

function localToday(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

async function runPool<T>(items: T[], worker: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const lanes = Array.from({ length: Math.min(POOL_SIZE, items.length) }, async () => {
    while (next < items.length) await worker(items[next++]);
  });
  await Promise.all(lanes);
}

async function patchTask(id: string, changes: Partial<Task>): Promise<void> {
  const updated = await db.tasks.update(id, changes as Parameters<typeof db.tasks.update>[1]);
  if (updated) markCloudRecordDirty("tasks", id);
}

export async function syncTaskCalendarMirror(): Promise<CalendarMirrorResult> {
  const result: CalendarMirrorResult = { written: 0, removed: 0, errors: 0 };
  if (!isGCalConnected()) return result;

  const fail = (error: unknown) => {
    result.errors++;
    result.firstError ??= error instanceof Error ? error.message : String(error);
  };

  const { toRRule } = await import("@/lib/recurrence");
  const rows = await db.tasks.toArray();

  // 1. Events of tasks deleted for good. Their rows are gone, so the tombstone is all that is left.
  for (const tombstone of readTombstones()) {
    if (!tombstone.eventId) continue;
    if (await deleteGCalEvent(tombstone.eventId)) {
      clearTombstonePart(tombstone.key, "event");
      result.removed++;
    } else {
      fail(new Error("Could not remove a deleted task from Google Calendar"));
    }
  }

  // 2. Events of tasks in the Trash. Once removed, the link is cleared so a restore writes a new one.
  const trashed = rows.filter((task) => task.deletedAt && task.gcalEventId);
  await runPool(trashed, async (task) => {
    if (await deleteGCalEvent(task.gcalEventId!)) {
      await patchTask(task.id, {
        gcalEventId: undefined,
        gcalHash: undefined,
        gcalUpdated: undefined,
      });
      result.removed++;
    } else {
      fail(new Error(`Could not remove "${task.title}" from Google Calendar`));
    }
  });

  // 3. Live tasks. An event linked to a pre-existing calendar entry (an id not made by this app) is
  //    never rewritten.
  const today = localToday();
  const stale = rows.filter((task) => {
    if (task.deletedAt) return false;
    if (task.gcalEventId && !task.gcalEventId.startsWith("mc")) return false;
    return true;
  });

  const jobs: { task: Task; body: ReturnType<typeof buildTaskEventBody>; hash: string }[] = [];
  for (const task of stale) {
    try {
      const rrule = task.recurring && task.recurringInterval ? toRRule(task as never) : null;
      const body = buildTaskEventBody(task, today, rrule);
      const hash = contentHash(JSON.stringify(body));
      if (task.gcalEventId && task.gcalHash === hash) continue; // already up to date
      jobs.push({ task, body, hash });
    } catch (error) {
      fail(error);
    }
  }

  await runPool(jobs, async ({ task, body, hash }) => {
    try {
      const created = await createGCalEvent("primary", body, taskIdToGCalId(task.id));
      await patchTask(task.id, {
        gcalEventId: created?.id || taskIdToGCalId(task.id),
        gcalHash: hash,
        gcalUpdated: (created as { updated?: string } | undefined)?.updated,
      });
      result.written++;
    } catch (error) {
      fail(error);
    }
  });

  if (result.written || result.removed) queueCloudPush();
  return result;
}
