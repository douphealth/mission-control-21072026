import { onPrivateSnapshotsCleared } from "@/lib/snapshotCache";

/**
 * Admin passcode for permanent deletes. Kept only in this tab's memory (never
 * in storage), so a reload, closing the tab or pressing Lock forgets it.
 */
let value = "";
export const getAdminPasscode = () => value;
export const setAdminPasscode = (next: string) => {
  value = next;
};
export const clearAdminPasscode = () => {
  value = "";
};
if (typeof window !== "undefined") onPrivateSnapshotsCleared(clearAdminPasscode);
