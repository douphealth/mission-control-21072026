/**
 * Standalone persistence compatibility layer.
 *
 * Mission Control stores records directly in IndexedDB. These exports remain
 * so older feature modules can call the same save hooks without initiating
 * authentication, network requests, background retries, or cloud restores.
 */
export type CloudStatus = "signed-out" | "connecting" | "syncing" | "synced" | "offline" | "error";
export type RecordSyncState = "saved" | "pending" | "failed" | "local-only";

type DirtyOperation = "put" | "delete";
const listeners = new Set<(status: CloudStatus, error: string | null) => void>();
const dirtyListeners = new Set<() => void>();

export function onDirtyRecordsChange(callback: () => void) {
  dirtyListeners.add(callback);
  return () => dirtyListeners.delete(callback);
}

export function getRecordSyncState(_collection: string, _recordId: string): RecordSyncState {
  return "local-only";
}

export async function retryCloudPush(): Promise<void> {}

export function markCloudRecordDirty(
  _collection: string,
  _recordId: string,
  _operation: DirtyOperation = "put",
): void {
  dirtyListeners.forEach((callback) => callback());
}

export function markCloudRecordsDirty(
  _collection: string,
  _recordIds: string[],
  _operation: DirtyOperation = "put",
): void {
  dirtyListeners.forEach((callback) => callback());
}

export function getCloudStatus(): CloudStatus {
  return "signed-out";
}

export function getCloudError(): string | null {
  return null;
}

export function getCloudUserId(): string | null {
  return null;
}

export function getLastCloudSync(): string | null {
  return null;
}

export function onCloudStatus(callback: (status: CloudStatus, error: string | null) => void) {
  listeners.add(callback);
  callback("signed-out", null);
  return () => listeners.delete(callback);
}

const standaloneMessage = "Mission Control runs locally and does not require an account.";

export async function signInToCloud(): Promise<void> {}

export async function requestEmailCode(
  _email: string,
): Promise<{ ok: boolean; error?: string }> {
  return { ok: false, error: standaloneMessage };
}

export async function verifyEmailCode(
  _email: string,
  _code: string,
): Promise<{ ok: boolean; error?: string }> {
  return { ok: false, error: standaloneMessage };
}

export async function verifyMagicLink(
  _linkUrl: string,
  _email?: string,
): Promise<{ ok: boolean; error?: string; resent?: boolean; email?: string }> {
  return { ok: false, error: standaloneMessage };
}

export async function signOutOfCloud(): Promise<void> {}

export async function pullFromCloud(): Promise<{
  ok: boolean;
  restored: number;
  remoteRows: number;
  error?: string;
}> {
  return { ok: true, restored: 0, remoteRows: 0 };
}

export function getPendingCloudCount(): number {
  return 0;
}

export function queueCloudPush(_delay = 0): void {}

export async function flushCloudChanges(): Promise<void> {}

export async function forceCloudSync(): Promise<void> {}

export async function startCloudSync(
  _force = false,
): Promise<{ signedIn: boolean; restored: number }> {
  return { signedIn: false, restored: 0 };
}
