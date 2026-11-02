/**
 * Device-local cache of the last estate snapshot, so the GitHub and Cloudflare
 * sections paint instantly on the next visit and refresh in the background.
 *
 * Deliberately a separate tiny IndexedDB database: the snapshot is a derived,
 * replaceable cache, so it must never enter the main store, its migrations,
 * backups or cloud sync. Failures (private mode, quota) degrade to "no cache".
 */
import Dexie, { type Table } from "dexie";
import type { EstateSnapshot } from "@/lib/estate/types";

interface Row {
  key: string;
  savedAt: string;
  snapshot: EstateSnapshot;
}

class EstateCacheDB extends Dexie {
  snapshots!: Table<Row, string>;
  constructor() {
    super("mc-estate-cache");
    this.version(1).stores({ snapshots: "key" });
  }
}

let instance: EstateCacheDB | null = null;
function cacheDb(): EstateCacheDB | null {
  if (typeof indexedDB === "undefined") return null;
  instance ??= new EstateCacheDB();
  return instance;
}

const KEY = "estate";

export async function loadCachedSnapshot(): Promise<EstateSnapshot | null> {
  try {
    const row = await cacheDb()?.snapshots.get(KEY);
    return row?.snapshot?.version === 1 ? row.snapshot : null;
  } catch {
    return null;
  }
}

export async function saveCachedSnapshot(snapshot: EstateSnapshot): Promise<void> {
  try {
    await cacheDb()?.snapshots.put({ key: KEY, savedAt: new Date().toISOString(), snapshot });
  } catch {
    /* cache is best effort */
  }
}

export async function clearCachedSnapshot(): Promise<void> {
  try {
    await cacheDb()?.snapshots.clear();
  } catch {
    /* cache is best effort */
  }
}
