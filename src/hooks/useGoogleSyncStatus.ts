import { useSyncExternalStore } from "react";
import {
  getGoogleSyncStatus,
  onGoogleSyncStatus,
  type GoogleSyncStatus,
} from "@/lib/googleSyncState";

/** The live status of the Google Tasks and Calendar sync. Re-renders whenever it changes. */
export function useGoogleSyncStatus(): GoogleSyncStatus {
  return useSyncExternalStore(
    (notify) => onGoogleSyncStatus(() => notify()),
    getGoogleSyncStatus,
    getGoogleSyncStatus,
  );
}
