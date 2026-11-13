/**
 * Device-local "last good view" cache so heavy provider sections (Cloudflare,
 * GitHub) paint instantly on every open and refresh in the background.
 *
 * Lives in its own IndexedDB database, separate from user records: it only
 * holds re-fetchable provider observations, never user-entered data, so it is
 * never synced or exported. Keys starting with "private:" hold owner-only
 * inventory and are wiped when the owner locks live data on this device.
 */
const DB_NAME = "mc-view-cache";
const STORE = "snapshots";
const VERSION = 1;

export type CachedSnapshot<T> = { at: number; value: T };

let dbPromise: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, VERSION);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
        request.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest | void): Promise<T | undefined> {
  return open().then(
    (db) =>
      new Promise<T | undefined>((resolve) => {
        if (!db) return resolve(undefined);
        try {
          const tx = db.transaction(STORE, mode);
          const request = work(tx.objectStore(STORE));
          tx.oncomplete = () => resolve(request ? (request.result as T) : undefined);
          tx.onerror = () => resolve(undefined);
          tx.onabort = () => resolve(undefined);
        } catch {
          resolve(undefined);
        }
      }),
  );
}

export async function readSnapshot<T>(key: string): Promise<CachedSnapshot<T> | null> {
  const row = await run<CachedSnapshot<T>>("readonly", (store) => store.get(key));
  return row && typeof row.at === "number" && row.value !== undefined ? row : null;
}

export async function writeSnapshot<T>(key: string, value: T, at = Date.now()): Promise<void> {
  await run("readwrite", (store) => store.put({ at, value } satisfies CachedSnapshot<T>, key));
}

/** Removes owner-only snapshots (called when live data is locked). */
export async function clearPrivateSnapshots(): Promise<void> {
  await run("readwrite", (store) => store.delete(IDBKeyRange.bound("private:", "private:\uffff")));
}

const privateListeners = new Set<() => void>();
/** In-memory caches register here so Lock also empties them. */
export function onPrivateSnapshotsCleared(listener: () => void): () => void {
  privateListeners.add(listener);
  return () => privateListeners.delete(listener);
}
export function notifyPrivateSnapshotsCleared() {
  privateListeners.forEach((listener) => listener());
  void clearPrivateSnapshots();
}

/** "3 min ago" style age for "showing saved copy" hints. */
export function snapshotAge(at: number | string | undefined, now = Date.now()): string {
  const time = typeof at === "string" ? Date.parse(at) : at;
  if (!time || !Number.isFinite(time)) return "";
  const minutes = Math.max(0, Math.floor((now - time) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return minutes + " min ago";
  const hours = Math.round(minutes / 60);
  if (hours < 48) return hours + " h ago";
  return Math.round(hours / 24) + " days ago";
}
