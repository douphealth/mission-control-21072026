// Local snapshots are durable IndexedDB records, never a growing localStorage array.
import { db } from './db';
import { versionDb, prepareVersionStorage, validateSnapshot } from './versionStorage';
export const SNAPSHOTS_TABLE = 'mc_snapshots';
const DEVICE_KEY = 'mc-device-label';
const AUTO_KEEP = 30;
const AUTO_DEBOUNCE_MS = 60_000;
const AUTO_INTERVAL_MS = 15 * 60_000;
export interface SnapshotMeta {
  id: string;
  name: string;
  type: 'auto' | 'manual' | 'safety';
  createdAt: string;
  device: string;
  counts: Record<string, number>;
  sizeBytes: number;
}
export interface Snapshot extends SnapshotMeta {
  payload: Record<string, any[]>;
  settings?: any;
}
export function getDeviceLabel(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const ua = navigator.userAgent;
    const kind = /iPhone|iPad|iPod/i.test(ua) ? 'iOS' : /Android/i.test(ua) ? 'Android' : /Mac/i.test(ua) ? 'Mac' : /Windows/i.test(ua) ? 'Windows' : /Linux/i.test(ua) ? 'Linux' : 'Device';
    const label = `${kind} · ${Math.random().toString(36).slice(2, 6)}`;
    localStorage.setItem(DEVICE_KEY, label);
    return label;
  } catch { return 'Device'; }
}
export function setDeviceLabel(label: string) { try { localStorage.setItem(DEVICE_KEY, label.trim() || 'Device'); } catch { /* Nonessential preference. */ } }
const snapshotTables = () => db.tables.filter(table => !['settings', 'syncHealth'].includes(table.name));
async function captureLocal() {
  const tables = snapshotTables();
  const payload: Record<string, any[]> = {};
  const counts: Record<string, number> = {};
  let settings: any;
  await db.transaction('r', [...tables, db.settings], async () => {
    for (const table of tables) { payload[table.name] = await table.toArray(); counts[table.name] = payload[table.name].length; }
    settings = await db.settings.get('default');
  });
  return { payload, counts, settings };
}
export function resetVersionsCache() { /* Compatibility: storage reads are always fresh. */ }
function stripPayload(snapshot: Snapshot): SnapshotMeta {
  const { payload: _payload, settings: _settings, ...meta } = snapshot;
  return meta;
}
export async function listVersions(): Promise<SnapshotMeta[]> {
  await prepareVersionStorage();
  return (await versionDb.snapshots.orderBy('createdAt').reverse().toArray()).map(stripPayload);
}
export async function saveVersion(opts: { name?: string; type?: SnapshotMeta['type'] } = {}): Promise<SnapshotMeta> {
  await prepareVersionStorage();
  const { payload, settings, counts } = await captureLocal();
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const type = opts.type ?? 'manual';
  const stamp = new Date().toLocaleString();
  const name = opts.name?.trim() || (type === 'auto' ? `Auto · ${stamp}` : type === 'safety' ? `Safety · before restore · ${stamp}` : `Manual · ${stamp} · ${total} items`);
  const snapshot: Snapshot = { id: `snap_${crypto.randomUUID()}`, name, type, createdAt: new Date().toISOString(), device: getDeviceLabel(), counts,
    sizeBytes: new Blob([JSON.stringify({ payload, settings })]).size, payload, settings };
  await versionDb.snapshots.add(snapshot);
  if (!await versionDb.snapshots.get(snapshot.id)) throw new Error('The version could not be verified after saving.');
  // Pruning is housekeeping; a failure does not invalidate a committed snapshot.
  try {
    const autos = (await listVersions()).filter(item => item.type === 'auto');
    if (autos.length > AUTO_KEEP) await versionDb.snapshots.bulkDelete(autos.slice(AUTO_KEEP).map(item => item.id));
  } catch (error) { console.warn('Old automatic versions could not be pruned', error); }
  return stripPayload(snapshot);
}
async function fetchFullSnapshot(id: string): Promise<Snapshot | null> {
  await prepareVersionStorage();
  return await versionDb.snapshots.get(id) ?? null;
}
export async function deleteVersion(id: string): Promise<void> { await prepareVersionStorage(); await versionDb.snapshots.delete(id); }
export async function renameVersion(id: string, name: string): Promise<void> {
  await prepareVersionStorage();
  if (!name.trim()) return;
  if (!await versionDb.snapshots.update(id, { name: name.trim() })) throw new Error('Version no longer exists.');
}
export async function restoreVersion(id: string, opts: { safety?: boolean } = {}): Promise<{ restored: number }> {
  const snapshot = await fetchFullSnapshot(id);
  if (!snapshot) throw new Error('Version not found');
  validateSnapshot(snapshot);
  const allowed = new Map(snapshotTables().map(table => [table.name, table]));
  for (const name of Object.keys(snapshot.payload)) if (!allowed.has(name)) throw new Error(`Unsupported version collection: ${name}. No data was changed.`);
  // Never proceed with a destructive restore when its safety copy failed.
  if (opts.safety !== false) await saveVersion({ type:'safety' });
  const tables = Object.keys(snapshot.payload).map(name => allowed.get(name)!);
  let restored = 0;
  await db.transaction('rw', [...tables, db.settings], async () => {
    for (const table of tables) {
      const rows = snapshot.payload[table.name];
      await table.clear();
      if (rows.length) await table.bulkPut(rows);
      restored += rows.length;
    }
    if (snapshot.settings) await db.settings.put({ ...snapshot.settings, id:'default' });
  });
  // Collections absent from an older backup are intentionally not touched.
  return { restored };
}
export async function restoreLatestNonEmptyVersion(): Promise<{ restored: number; versionId?: string }> {
  const versions = await listVersions();
  const candidate = versions.find(version => Object.values(version.counts || {}).some(count => Number(count) > 0));
  if (!candidate) return { restored:0 };
  return { ...await restoreVersion(candidate.id, { safety:false }), versionId:candidate.id };
}
export async function downloadVersionFile(meta: SnapshotMeta) {
  const snapshot = await fetchFullSnapshot(meta.id);
  if (!snapshot) throw new Error('Version not found');
  const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type:'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = `${snapshot.name.replace(/[^a-z0-9]+/gi, '-')}.mcversion.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function importVersionFile(file: File): Promise<SnapshotMeta> {
  const snapshot = JSON.parse(await file.text()) as Snapshot;
  validateSnapshot(snapshot);
  snapshot.id = `snap_imported_${crypto.randomUUID()}`;
  snapshot.createdAt = new Date().toISOString(); snapshot.type = 'manual';
  snapshot.name = snapshot.name ? `Imported · ${snapshot.name}` : `Imported · ${snapshot.createdAt}`;
  snapshot.counts = Object.fromEntries(Object.entries(snapshot.payload).map(([name, rows]) => [name, rows.length]));
  snapshot.sizeBytes = new Blob([JSON.stringify(snapshot.payload)]).size;
  await prepareVersionStorage();
  await versionDb.snapshots.add(snapshot);
  return stripPayload(snapshot);
}
let editRevision = 0;
let savedRevision = 0;
let autoInFlight = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let intervalTimer: ReturnType<typeof setInterval> | null = null;
let visHandler: (() => void) | null = null;
async function saveAutomatic() {
  if (autoInFlight || savedRevision === editRevision) return;
  const capturedRevision = editRevision;
  autoInFlight = true;
  try { await saveVersion({ type:'auto' }); savedRevision = capturedRevision; }
  catch (error) { console.warn('Automatic version was not saved; retry remains pending', error); }
  finally { autoInFlight = false; }
}
export function markDirty() {
  editRevision++;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => { debounceTimer = null; void saveAutomatic(); }, AUTO_DEBOUNCE_MS);
}
function startTick() { if (!intervalTimer) intervalTimer = setInterval(() => { void saveAutomatic(); }, AUTO_INTERVAL_MS); }
function stopTick() { if (intervalTimer) clearInterval(intervalTimer); intervalTimer = null; }
export function startAutoSnapshots() {
  if (typeof document === 'undefined') return;
  void prepareVersionStorage().catch(error => console.warn('Original version history retained; migration needs attention', error));
  if (!document.hidden) startTick();
  if (!visHandler) {
    visHandler = () => { if (document.hidden) stopTick(); else startTick(); };
    document.addEventListener('visibilitychange', visHandler);
  }
}
export function stopAutoSnapshots() {
  stopTick();
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = null;
  if (visHandler && typeof document !== 'undefined') document.removeEventListener('visibilitychange', visHandler);
  visHandler = null;
}
// Retained for compatibility. The standalone app does not use a server SQL table.
export const SNAPSHOTS_SCHEMA_SQL = '';
