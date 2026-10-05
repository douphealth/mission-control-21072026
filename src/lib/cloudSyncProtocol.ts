/** Deterministic merge of independent device snapshots. Never delete an absent row. */
export interface RemoteRecord {
  data: Record<string, unknown> | null;
  deleted: boolean;
  updatedAt: string;
  revision?: string;
}
export type RemoteRecords = Record<string, RemoteRecord>;
export interface RemoteBackup {
  version: 1 | 2;
  updatedAt: string;
  records: RemoteRecords;
  writerId?: string;
}
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable((value as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
export function revisionOf(record: RemoteRecord): string {
  return record.revision || `${record.updatedAt}:${record.deleted ? 'deleted' : stable(record.data)}`;
}
export function compareRemote(left: RemoteRecord, right: RemoteRecord): number {
  const time = Date.parse(left.updatedAt) - Date.parse(right.updatedAt);
  if (time) return time;
  if (left.deleted !== right.deleted) return left.deleted ? 1 : -1;
  const a = revisionOf(left), b = revisionOf(right);
  return a < b ? -1 : a > b ? 1 : 0;
}
export function mergeRemoteRecords(...snapshots: RemoteRecords[]): RemoteRecords {
  const result: RemoteRecords = Object.create(null);
  for (const snapshot of snapshots) for (const [key, record] of Object.entries(snapshot)) {
    if (!result[key] || compareRemote(record, result[key]) > 0) result[key] = record;
  }
  return result;
}
export function parseBackup(value: unknown): RemoteBackup {
  if (!value || typeof value !== 'object') throw new Error('Invalid cloud backup; no data was overwritten.');
  const b = value as Partial<RemoteBackup>;
  if (![1, 2].includes(b.version as number) || !b.records || typeof b.records !== 'object' || Array.isArray(b.records)) throw new Error('Unsupported cloud backup; no data was overwritten.');
  for (const [key, record] of Object.entries(b.records)) {
    if (!key.includes('::') || !record || typeof record.deleted !== 'boolean' || !Number.isFinite(Date.parse(record.updatedAt)) || (!record.deleted && (!record.data || typeof record.data !== 'object' || Array.isArray(record.data)))) throw new Error('Invalid cloud record; local data was preserved.');
  }
  return b as RemoteBackup;
}


/**
 * A record in the local dirty journal represents explicit user intent on this
 * device. Rebase that intent above the newest remote timestamp so wall-clock
 * skew or a stale remote writer can never silently erase a pending local edit.
 * The revision remains the local mutation's revision for read-back verification.
 */
export function rebaseLocalPending(
  local: RemoteRecord,
  remote?: RemoteRecord,
  nowMs = Date.now(),
): RemoteRecord {
  const localMs = Number.isFinite(Date.parse(local.updatedAt)) ? Date.parse(local.updatedAt) : 0;
  const remoteMs =
    remote && Number.isFinite(Date.parse(remote.updatedAt)) ? Date.parse(remote.updatedAt) : 0;
  const rebasedMs = Math.max(nowMs, localMs, remoteMs + (remote ? 1 : 0));
  return { ...local, updatedAt: new Date(rebasedMs).toISOString() };
}
