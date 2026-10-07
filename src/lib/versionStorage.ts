import Dexie, { type Table } from 'dexie';
import type { Snapshot } from './versions';

export const LEGACY_VERSIONS_KEY = 'mc-snapshots-local-v1';
class VersionsDatabase extends Dexie {
  snapshots!: Table<Snapshot, string>;
  constructor() {
    super('MissionControlVersionsDB');
    this.version(1).stores({ snapshots: 'id, createdAt, type' });
  }
}
export const versionDb = new VersionsDatabase();
export function validateSnapshot(value: unknown): asserts value is Snapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid version file. No data was changed.');
  const snapshot = value as Partial<Snapshot>;
  if (typeof snapshot.id !== 'string' || !snapshot.id || typeof snapshot.createdAt !== 'string' || !Number.isFinite(Date.parse(snapshot.createdAt)) || !snapshot.payload || typeof snapshot.payload !== 'object' || Array.isArray(snapshot.payload)) throw new Error('Invalid version metadata. No data was changed.');
  if (snapshot.settings != null && (typeof snapshot.settings !== 'object' || Array.isArray(snapshot.settings))) throw new Error('Invalid version settings. No data was changed.');
  for (const [table, rows] of Object.entries(snapshot.payload)) {
    if (!Array.isArray(rows)) throw new Error(`Invalid version collection: ${table}. No data was changed.`);
    const ids = new Set<string>();
    for (const row of rows) {
      if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !row.id || ids.has(row.id)) throw new Error(`Invalid or duplicate record in ${table}. No data was changed.`);
      ids.add(row.id);
    }
  }
}
/** Names may change in another tab; the actual backed-up data must not differ. */
export function sameSnapshotData(a: Snapshot, b: Snapshot): boolean {
  return JSON.stringify(a.payload) === JSON.stringify(b.payload) && JSON.stringify(a.settings ?? null) === JSON.stringify(b.settings ?? null);
}
let migration: Promise<void> | null = null;
/** Copy, commit and verify payloads before removing ONLY the unchanged legacy copy. */
export function prepareVersionStorage(): Promise<void> {
  if (migration) return migration;
  migration = (async () => {
    if (typeof window === 'undefined') return;
    let raw: string | null;
    try { raw = window.localStorage.getItem(LEGACY_VERSIONS_KEY); } catch { return; }
    if (!raw) return;
    let values: unknown;
    try { values = JSON.parse(raw); } catch { throw new Error('Legacy version history could not be read. Its original copy was preserved.'); }
    if (!Array.isArray(values)) throw new Error('Legacy version history is invalid. Its original copy was preserved.');
    const snapshots: Snapshot[] = [];
    const ids = new Set<string>();
    for (const value of values) {
      validateSnapshot(value);
      if (ids.has(value.id)) throw new Error('Duplicate legacy snapshot IDs. Original history was preserved.');
      ids.add(value.id); snapshots.push(value);
    }
    await versionDb.transaction('rw', versionDb.snapshots, async () => {
      const existing = await versionDb.snapshots.bulkGet(snapshots.map(snapshot => snapshot.id));
      for (let i = 0; i < existing.length; i++) {
        if (existing[i] && !sameSnapshotData(existing[i]!, snapshots[i])) throw new Error('A stored version conflicts with the legacy history. Both copies were preserved; migration was stopped.');
      }
      const missing = snapshots.filter((_, i) => !existing[i]);
      if (missing.length) await versionDb.snapshots.bulkPut(missing);
      const confirmed = await versionDb.snapshots.bulkGet(snapshots.map(snapshot => snapshot.id));
      if (confirmed.some((value, index) => !value || !sameSnapshotData(value, snapshots[index]))) throw new Error('Version migration did not verify. Original history was preserved.');
    });
    try {
      if (window.localStorage.getItem(LEGACY_VERSIONS_KEY) === raw) window.localStorage.removeItem(LEGACY_VERSIONS_KEY);
    } catch { /* The verified IndexedDB copy remains available. */ }
  })().finally(() => { migration = null; });
  return migration;
}
