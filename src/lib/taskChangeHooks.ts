// Database-level hooks on the tasks table. They run for every write, wherever it came from
// (the data store, an import, the seed, a restore), so no path can skip them.
//
//  - Stamp `updatedAt` on every real edit, so a conflict can be settled by who edited last.
//  - Leave a tombstone when a task that is linked to Google is permanently deleted, so the
//    deletion can still reach Google and the task cannot be re-imported.
//  - Tell the sync engine a task changed, so it can run soon.
//
// Sync bookkeeping fields never count as an edit. Without that rule the engine's own stamps
// would trigger another sync, which would stamp again, forever.

import type { Table } from "dexie";
import { addTombstone, isUserEdit, notifyTaskMutation } from "@/lib/googleSyncState";

const NOTIFY_MARK = "__mcTaskMutationQueued";

/** Notify once per transaction, after it commits, however many rows it touched. */
function notifyAfterCommit(transaction: any): void {
  if (!transaction || transaction[NOTIFY_MARK]) return;
  transaction[NOTIFY_MARK] = true;
  transaction.on("complete", () => notifyTaskMutation());
}

export function installTaskChangeHooks(table: Table<any, string>): void {
  table.hook("creating", function (_primKey, obj, transaction) {
    if (!obj.updatedAt) obj.updatedAt = new Date().toISOString();
    notifyAfterCommit(transaction);
  });

  table.hook("updating", function (modifications, _primKey, _obj, transaction) {
    if (!isUserEdit(Object.keys(modifications))) return undefined;
    notifyAfterCommit(transaction);
    // A write that brings its own timestamp (a record arriving from another device) keeps it.
    if ("updatedAt" in modifications) return undefined;
    return { updatedAt: new Date().toISOString() };
  });

  table.hook("deleting", function (_primKey, obj, transaction) {
    if (obj?.gtaskId || obj?.gcalEventId) {
      addTombstone({
        taskId: obj.id,
        listId: obj.gtaskListId,
        gtaskId: obj.gtaskId,
        eventId: obj.gcalEventId,
      });
    }
    notifyAfterCommit(transaction);
  });
}
