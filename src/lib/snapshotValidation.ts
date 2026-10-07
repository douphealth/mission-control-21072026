import type { Snapshot } from './versions';

/** Pure validation: safe to use before opening a database or changing records. */
export function validateSnapshot(value: unknown): asserts value is Snapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid version file. No data was changed.');
  const snapshot = value as Partial<Snapshot>;
  if (typeof snapshot.id !== 'string' || !snapshot.id || typeof snapshot.createdAt !== 'string' || !Number.isFinite(Date.parse(snapshot.createdAt)) || !snapshot.payload || typeof snapshot.payload !== 'object' || Array.isArray(snapshot.payload)) throw new Error('Invalid version metadata. No data was changed.');
  if (snapshot.settings != null && (typeof snapshot.settings !== 'object' || Array.isArray(snapshot.settings))) throw new Error('Invalid version settings. No data was changed.');
  if (snapshot.secretPolicy !== undefined && snapshot.secretPolicy !== 'excluded') throw new Error('Unknown version secret policy. No data was changed.');
  for (const [table, rows] of Object.entries(snapshot.payload)) {
    if (!Array.isArray(rows)) throw new Error(`Invalid version collection: ${table}. No data was changed.`);
    const ids = new Set<string>();
    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row) || typeof row.id !== 'string' || !row.id || ids.has(row.id)) throw new Error(`Invalid or duplicate record in ${table}. No data was changed.`);
      ids.add(row.id);
    }
  }
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  }
  return value;
}
/** A cosmetic rename is safe; a conflicting payload is not a verified copy. */
export function sameSnapshotData(a: Snapshot, b: Snapshot): boolean {
  return JSON.stringify(canonical(a.payload)) === JSON.stringify(canonical(b.payload)) &&
    JSON.stringify(canonical(a.settings ?? null)) === JSON.stringify(canonical(b.settings ?? null));
}
