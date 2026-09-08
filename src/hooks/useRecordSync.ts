import { useSyncExternalStore } from "react";
import {
  getRecordSyncState,
  onDirtyRecordsChange,
  getPendingCloudCount,
  type RecordSyncState,
} from "@/lib/cloudSync";

const subscribe = (cb: () => void) => onDirtyRecordsChange(cb);

/** Live saved / pending / failed state for one record. */
export function useRecordSync(collection: string, recordId: string): RecordSyncState {
  return useSyncExternalStore(
    subscribe,
    () => getRecordSyncState(collection, recordId),
    () => "saved" as RecordSyncState,
  );
}

export function usePendingCloudCount(): number {
  return useSyncExternalStore(
    subscribe,
    () => getPendingCloudCount(),
    () => 0,
  );
}
