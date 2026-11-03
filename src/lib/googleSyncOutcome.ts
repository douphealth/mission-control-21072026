import type { GoogleSyncStatus } from "@/lib/googleSyncState";

/** The sync request resolves even when the provider fails; read its recorded outcome before claiming success. */
export function googleSyncFailure(status: GoogleSyncStatus, requireHeldCleared = false): string | null {
  if (status.state === "error" || status.state === "reconnect") {
    return status.lastError || "Google Tasks / Calendar needs attention. Reconnect or retry the synchronization.";
  }
  if (status.state === "disconnected") return "Google Tasks / Calendar is not connected on this device.";
  if (status.state === "syncing") return "Google Tasks / Calendar is still synchronizing. Completion has not been confirmed.";
  if (requireHeldCleared && status.heldDeletions > 0) {
    return `${status.heldDeletions} deletion${status.heldDeletions === 1 ? " is" : "s are"} still held for review. No completed deletion is being assumed.`;
  }
  return null;
}
