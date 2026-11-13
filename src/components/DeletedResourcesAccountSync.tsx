import { useEffect } from "react";
import { liveQuery } from "dexie";
import { db, type UserSettings } from "@/lib/db";
import {
  applyRemoteDeleted,
  getDeletedState,
  mergeDeletedStates,
  onDeletedChange,
  sameDeletedState,
  type DeletedState,
} from "@/lib/deletedResources";

const ROW_ID = "deleted-resources";

/**
 * Carries confirmed provider deletes to every device through the synced
 * settings row. Each side merges newest-per-key, then writes the union back
 * only when this device knows something the shared copy does not.
 */
export default function DeletedResourcesAccountSync() {
  useEffect(() => {
    let remote: DeletedState = { marks: {}, cleared: {} };
    let timer: ReturnType<typeof setTimeout> | undefined;
    let ready = false;
    const save = () => {
      const merged = mergeDeletedStates(getDeletedState(), remote);
      if (sameDeletedState(merged, remote)) return;
      remote = merged;
      void db.settings
        .put({
          id: ROW_ID,
          deletedResources: { ...merged, changedAt: new Date().toISOString() },
        } as UserSettings)
        .catch(() => undefined);
    };
    const schedule = () => {
      if (!ready) return;
      clearTimeout(timer);
      timer = setTimeout(save, 500);
    };
    const sub = liveQuery(() => db.settings.get(ROW_ID)).subscribe({
      next: (row) => {
        const value = row?.deletedResources;
        remote = value
          ? { marks: value.marks || {}, cleared: value.cleared || {} }
          : { marks: {}, cleared: {} };
        applyRemoteDeleted(remote);
        ready = true;
        schedule();
      },
      error: () => undefined,
    });
    const off = onDeletedChange(schedule);
    return () => {
      sub.unsubscribe();
      off();
      clearTimeout(timer);
    };
  }, []);
  return null;
}
