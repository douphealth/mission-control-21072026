/**
 * Durable cloud-sync mutation journal.
 *
 * IndexedDB is authoritative. The v3 localStorage journal is imported once,
 * transactionally, and removed only after the import has committed. Never
 * interpret unreadable legacy data as an empty queue.
 */
import { db } from "@/lib/db";

export type JournalOperation = "put" | "delete";
export type JournalChange = { operation: JournalOperation; changedAt: string; revision?: string };
export type JournalMap = Record<string, JournalChange>;
export type JournalRow = JournalChange & { key: string };

const LEGACY_KEY = "mc-cloud-dirty-records-v3";
const MIGRATION_ID = "cloud-sync-journal-v3";
let migration: Promise<void> | null = null;

function validChange(key: string, value: unknown): value is JournalChange {
  if (!key.includes("::") || !value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Partial<JournalChange>;
  return (row.operation === "put" || row.operation === "delete") &&
    typeof row.changedAt === "string" && Number.isFinite(Date.parse(row.changedAt)) &&
    (row.revision === undefined || typeof row.revision === "string");
}

export function parseLegacyJournal(raw: string | null): JournalMap {
  if (raw === null) return {};
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid legacy cloud-sync journal; nothing was discarded.");
  }
  const records = parsed as Record<string, unknown>;
  for (const [key, value] of Object.entries(records)) {
    if (!validChange(key, value)) {
      throw new Error("Invalid legacy cloud-sync journal entry; nothing was discarded.");
    }
  }
  return records as JournalMap;
}

export function sameJournalChange(a?: JournalChange, b?: JournalChange): boolean {
  return !!a && !!b && (a.revision || a.changedAt) === (b.revision || b.changedAt);
}

export function newerJournalChange(a: JournalChange, b: JournalChange): JournalChange {
  const delta = Date.parse(a.changedAt) - Date.parse(b.changedAt);
  if (delta !== 0) return delta > 0 ? a : b;
  return (a.revision || "").localeCompare(b.revision || "") >= 0 ? a : b;
}

/** One-time migration marker and imported rows commit in a single transaction. */
export async function ensureDurableJournal(): Promise<void> {
  if (!migration) {
    migration = (async () => {
      const migrated = await db.syncMeta.get(MIGRATION_ID);
      if (migrated) return;
      // A blocked localStorage read fails closed: it might contain unsent deletes.
      const legacyRaw = typeof window === "undefined" ? null : localStorage.getItem(LEGACY_KEY);
      const legacy = parseLegacyJournal(legacyRaw);
      await db.transaction("rw", db.syncJournal, db.syncMeta, async () => {
        if (await db.syncMeta.get(MIGRATION_ID)) return;
        for (const [key, change] of Object.entries(legacy)) {
          const existing = await db.syncJournal.get(key);
          const value = existing ? newerJournalChange(existing, change) : change;
          await db.syncJournal.put({ key, ...value });
        }
        await db.syncMeta.put({ id: MIGRATION_ID, completedAt: new Date().toISOString() });
      });
      if (legacyRaw !== null) {
        try { localStorage.removeItem(LEGACY_KEY); } catch { /* Marker prevents replay. */ }
      }
    })().catch(error => {
      migration = null; // Repair and retry; do not mark a failed migration complete.
      throw error;
    });
  }
  await migration;
}

export async function readDurableJournal(): Promise<JournalMap> {
  await ensureDurableJournal();
  const rows = await db.syncJournal.toArray();
  return Object.fromEntries(rows.map(({ key, ...change }) => [key, change]));
}

/** Never allow an older tab to replace a newer pending mutation. */
export async function persistJournalChanges(changes: JournalMap): Promise<void> {
  await ensureDurableJournal();
  await db.transaction("rw", db.syncJournal, async () => {
    for (const [key, change] of Object.entries(changes)) {
      if (!validChange(key, change)) throw new Error("Invalid sync operation was not persisted.");
      const previous = await db.syncJournal.get(key);
      await db.syncJournal.put({
        key, ...(previous ? newerJournalChange(previous, change) : change),
      });
    }
  });
}

/** Acknowledgement compares the saved revision *inside* the write transaction. */
export async function acknowledgeJournalChanges(expected: JournalMap): Promise<number> {
  await ensureDurableJournal();
  let removed = 0;
  await db.transaction("rw", db.syncJournal, async () => {
    for (const [key, change] of Object.entries(expected)) {
      const persisted = await db.syncJournal.get(key);
      if (sameJournalChange(persisted, change)) {
        await db.syncJournal.delete(key);
        removed++;
      }
    }
  });
  return removed;
}
