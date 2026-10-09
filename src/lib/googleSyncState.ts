// Shared state for the Google sync engine. Deliberately free of imports from the rest of the
// app, so the database layer, the data store and the engine can all use it without cycles.

// ─── What counts as a change worth syncing ───────────────────────────────────

/** Fields the sync engine writes about itself. Changing only these is bookkeeping, not an edit. */
export const SYNC_ONLY_KEYS: ReadonlySet<string> = new Set([
  "gtaskId",
  "gtaskListId",
  "gtaskUpdated",
  "gtaskHash",
  "gcalEventId",
  "gcalUpdated",
  "gcalHash",
  "touchedAt",
  "reminderFired",
  "remindersFired",
]);

/** True when a set of modified fields contains a real edit, not only sync bookkeeping. */
export function isUserEdit(keys: Iterable<string>): boolean {
  for (const key of keys) if (!SYNC_ONLY_KEYS.has(key)) return true;
  return false;
}

// ─── Tombstones: permanent deletes that Google has not been told about yet ───

const TOMBSTONES_KEY = "mc_google_tombstones_v1";

export interface GoogleTombstone {
  /** `${listId}:${gtaskId}`, or `event:${eventId}` for a calendar-only mirror. */
  key: string;
  taskId: string;
  listId?: string;
  gtaskId?: string;
  eventId?: string;
  at: string;
}

function readStore(): GoogleTombstone[] {
  try {
    const raw = localStorage.getItem(TOMBSTONES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(list: GoogleTombstone[]) {
  try {
    localStorage.setItem(TOMBSTONES_KEY, JSON.stringify(list.slice(-2000)));
  } catch {
    /* quota or privacy mode: the soft-delete path still covers almost every delete */
  }
}

export function readTombstones(): GoogleTombstone[] {
  return typeof localStorage === "undefined" ? [] : readStore();
}

export function addTombstone(tombstone: Omit<GoogleTombstone, "key" | "at">): void {
  if (typeof localStorage === "undefined") return;
  const key = tombstone.gtaskId
    ? `${tombstone.listId ?? ""}:${tombstone.gtaskId}`
    : `event:${tombstone.eventId ?? tombstone.taskId}`;
  const list = readStore().filter((item) => item.key !== key);
  list.push({ ...tombstone, key, at: new Date().toISOString() });
  writeStore(list);
}

/**
 * A tombstone has up to two parts to clear: the Google task and the calendar event. Clearing one
 * keeps the other pending; the record goes away only when nothing is left to delete.
 */
export function clearTombstonePart(key: string, part: "gtask" | "event"): void {
  if (typeof localStorage === "undefined") return;
  const next: GoogleTombstone[] = [];
  for (const item of readStore()) {
    if (item.key !== key) {
      next.push(item);
      continue;
    }
    const rest: GoogleTombstone = { ...item };
    if (part === "gtask") delete rest.gtaskId;
    else delete rest.eventId;
    if (rest.gtaskId || rest.eventId) next.push(rest);
  }
  writeStore(next);
}

export function removeTombstones(keys: Iterable<string>): void {
  if (typeof localStorage === "undefined") return;
  const drop = new Set(keys);
  if (drop.size === 0) return;
  writeStore(readStore().filter((item) => !drop.has(item.key)));
}

// ─── Mutation signal: "a task changed, sync soon" ────────────────────────────

const mutationListeners = new Set<() => void>();

export function onTaskMutation(listener: () => void): () => void {
  mutationListeners.add(listener);
  return () => mutationListeners.delete(listener);
}

export function notifyTaskMutation(): void {
  for (const listener of [...mutationListeners]) {
    try {
      listener();
    } catch {
      /* a listener must never break a write */
    }
  }
}

// ─── Status, for the interface ───────────────────────────────────────────────

export type GoogleSyncState =
  | "disconnected" // never connected on this device
  | "idle" // connected and up to date
  | "syncing"
  | "error" // last pass failed, will retry
  | "reconnect"; // the sign-in expired and could not be renewed quietly

export interface GoogleSyncCounts {
  tasksPushed: number;
  tasksPulled: number;
  tasksImported: number;
  tasksDeleted: number;
  eventsPushed: number;
  eventsPulled: number;
}

export interface GoogleSyncStatus {
  state: GoogleSyncState;
  lastSyncAt: string | null;
  lastError: string | null;
  lastCounts: GoogleSyncCounts | null;
  /** Tasks Google no longer lists that were NOT trashed here, because that many at once looks like a bad response. */
  heldDeletions: number;
}

export const EMPTY_COUNTS: GoogleSyncCounts = {
  tasksPushed: 0,
  tasksPulled: 0,
  tasksImported: 0,
  tasksDeleted: 0,
  eventsPushed: 0,
  eventsPulled: 0,
};

let status: GoogleSyncStatus = {
  state: "disconnected",
  lastSyncAt: null,
  lastError: null,
  lastCounts: null,
  heldDeletions: 0,
};

const statusListeners = new Set<(next: GoogleSyncStatus) => void>();

export function getGoogleSyncStatus(): GoogleSyncStatus {
  return status;
}

export function setGoogleSyncStatus(patch: Partial<GoogleSyncStatus>): void {
  status = { ...status, ...patch };
  for (const listener of [...statusListeners]) listener(status);
}

export function onGoogleSyncStatus(listener: (next: GoogleSyncStatus) => void): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

// ─── A tiny stable hash, for "did this content change since we last agreed?" ─

/** FNV-1a, 32 bit, as 8 hex characters. Not security: only change detection. */
export function contentHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
