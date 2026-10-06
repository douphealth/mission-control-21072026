/**
 * Local-first, account-bound sync. Each writer owns its remote snapshot so a
 * phone upload cannot overwrite a desktop upload. All legacy and v2 files are
 * merged before applying records; absence is never a deletion instruction.
 */
import { db } from '@/lib/db';
import { GDRIVE_APPDATA_SCOPE, GOOGLE_SCOPES, clearGoogleToken, fetchGoogleEmail,
  getGoogleClientId, googleTokenHasScopes, readGoogleToken, requestGoogleToken } from '@/lib/googleDirectAuth';
import { compareRemote, mergeRemoteRecords, parseBackup, rebaseLocalPending, revisionOf,
  type RemoteBackup, type RemoteRecords } from '@/lib/cloudSyncProtocol';

export type CloudStatus = 'signed-out' | 'connecting' | 'syncing' | 'synced' | 'offline' | 'error';
export type RecordSyncState = 'saved' | 'pending' | 'failed' | 'local-only';
type DirtyOperation = 'put' | 'delete';
type DirtyRecord = { operation: DirtyOperation; changedAt: string; revision?: string };
type DirtyRecordMap = Record<string, DirtyRecord>;
type SyncResult = {
  ok: boolean;
  restored: number;
  remoteRows: number;
  repairedQueueEntries?: number;
  error?: string;
};
type DriveFile = { id: string; name: string; modifiedTime: string };
const LEGACY_NAME = 'mission-control-sync-v1.json';
const PREFIX = 'mission-control-sync-v2-';
const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const LAST_SYNC_KEY = 'mc-cloud-last-sync';
const USER_EMAIL_KEY = 'mc-cloud-user-email';
const OWNER_KEY = 'mc-cloud-local-owner-v2';
const DIRTY_KEY = 'mc-cloud-dirty-records-v3';
const LEGACY_RECEIPTS_KEY = 'mc-cloud-confirmed-v2';
const DEVICE_KEY = 'mc-cloud-device-v2';
const REQUIRED_FIELDS: Record<string, string[]> = {
  tasks: ['title'], websites: ['name'], notes: ['title'], links: ['title'], repos: ['name'],
  buildProjects: ['name'], ideas: ['title'], credentials: ['label'], customModules: ['name'],
  habits: ['name'], feedSources: ['name'], streamItems: ['title'], watchTerms: ['term'],
  audienceAccounts: ['platform'], reminders: ['title'], decisions: ['title'], validations: ['title'],
};
const COLLECTIONS: Record<string, any> = {
  websites: db.websites, seoProfiles: db.seoProfiles, seoSnapshots: db.seoSnapshots,
  seoQueryObservations: db.seoQueryObservations, seoIssues: db.seoIssues, seoActions: db.seoActions,
  seoChanges: db.seoChanges, seoVisibilityChecks: db.seoVisibilityChecks, tasks: db.tasks,
  repos: db.repos, buildProjects: db.buildProjects, links: db.links, notes: db.notes,
  payments: db.payments, ideas: db.ideas, credentials: db.credentials, customModules: db.customModules,
  habits: db.habits, feedSources: db.feedSources, streamItems: db.streamItems,
  watchTerms: db.watchTerms, audienceAccounts: db.audienceAccounts, audienceReadings: db.audienceReadings,
  reminders: db.reminders, decisions: db.decisions, auditLog: db.auditLog, settings: db.settings,
  validations: db.validations,
};
const listeners = new Set<(status: CloudStatus, error: string | null) => void>();
const dirtyListeners = new Set<() => void>();
let status: CloudStatus = 'signed-out';
let lastError: string | null = null;
let userEmail: string | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let activeSync: Promise<SyncResult> | null = null;
let started = false;
let epoch = 0;
let retryAttempt = 0;
let journalError = false;
let verifiedToken = '';
let tabWriter = '';
let logicalTime = 0;
let localSeedChecked = false;
let mutationJournalInstalled = false;
let suppressMutationJournal = 0;
let firstQueuedAt = 0;
const MAX_PUSH_LATENCY_MS = 4_000;
const JOURNAL_EXCLUDED = new Set(['auditLog', 'syncHealth']);
const remoteCache = new Map<string, { modifiedTime: string; backup: RemoteBackup }>();
// Confirmed revisions are a performance cache, not durable user data.
// Keeping them in localStorage caused an unbounded mc-cloud-confirmed-v2 payload
// that could exhaust the origin quota and break synchronization entirely.
const receiptCache = new Map<string, string>();
function key(collection: string, id: string) { return `${collection}::${id}`; }
function readObject<T>(name: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(name) || 'null') ?? fallback; } catch { return fallback; }
}
function readDirty(): DirtyRecordMap { return readObject(DIRTY_KEY, {}); }

export async function repairStaleCloudJournal(): Promise<number> {
  const dirty = readDirty();
  const next = { ...dirty };
  let repaired = 0;

  for (const [recordKey, change] of Object.entries(dirty)) {
    if (change.operation !== 'put') continue;
    const [collection, id] = recordKey.split('::');
    const table = COLLECTIONS[collection];
    if (!table || !id) continue;
    const local = await table.get(id);
    if (local) continue;

    // This is a stale queue instruction, not a deletion request. Removing only
    // the journal entry allows any real remote copy to be restored during sync.
    delete next[recordKey];
    repaired++;
  }

  if (repaired) {
    writeDirty(next);
    if (/pending .* record is missing locally/i.test(lastError || '')) {
      setStatus(hasSession() ? 'syncing' : 'signed-out', null);
    }
  }

  return repaired;
}
function setStatus(next: CloudStatus, error: string | null = null) {
  status = next; lastError = error;
  listeners.forEach(callback => callback(next, error));
  dirtyListeners.forEach(callback => callback());
}
function writeDirty(records: DirtyRecordMap) {
  try {
    localStorage.setItem(DIRTY_KEY, JSON.stringify(records));
    journalError = false;
  } catch {
    journalError = true;
    setStatus('error', 'Device storage could not retain the sync queue. Your local records have not been deleted.');
  }
  dirtyListeners.forEach(callback => callback());
}
function newChange(operation: DirtyOperation): DirtyRecord {
  logicalTime = Math.max(Date.now(), logicalTime + 1);
  return { operation, changedAt: new Date(logicalTime).toISOString(), revision: crypto.randomUUID() };
}
function sameChange(a?: DirtyRecord, b?: DirtyRecord) {
  return !!a && !!b && (a.revision || a.changedAt) === (b.revision || b.changedAt);
}

function journalCommittedMutation(collection: string, id: string, operation: DirtyOperation) {
  if (suppressMutationJournal || JOURNAL_EXCLUDED.has(collection) || !id) return;
  markCloudRecordDirty(collection, id, operation);
  queueCloudPush(650);
}

function installMutationJournal() {
  if (mutationJournalInstalled || typeof window === 'undefined') return;
  mutationJournalInstalled = true;

  for (const [collection, table] of Object.entries(COLLECTIONS)) {
    if (JOURNAL_EXCLUDED.has(collection)) continue;

    table.hook('creating', function (this: any, primKey: unknown, obj: any) {
      if (suppressMutationJournal) return;
      const id = String(primKey ?? obj?.id ?? '');
      this.onsuccess = () => journalCommittedMutation(collection, id, 'put');
    });

    table.hook('updating', function (this: any, _mods: unknown, primKey: unknown) {
      if (suppressMutationJournal) return;
      const id = String(primKey ?? '');
      this.onsuccess = () => journalCommittedMutation(collection, id, 'put');
    });

    table.hook('deleting', function (this: any, primKey: unknown) {
      if (suppressMutationJournal) return;
      const id = String(primKey ?? '');
      this.onsuccess = () => journalCommittedMutation(collection, id, 'delete');
    });
  }
}
function validRecord(collection: string, data: unknown, id: string): data is Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const row = data as Record<string, unknown>;
  return row.id === id && (REQUIRED_FIELDS[collection] || []).every(field => typeof row[field] === 'string');
}
function hasSession() {
  const token = readGoogleToken();
  return !!token && googleTokenHasScopes(token, [GDRIVE_APPDATA_SCOPE]);
}
function writerId() {
  let device = localStorage.getItem(DEVICE_KEY);
  if (!device) { device = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, device); }
  // Web Locks serialize tabs. Without it, separate writer files avoid a tab race.
  if (navigator.locks) return device;
  if (!tabWriter) tabWriter = crypto.randomUUID();
  return `${device}-${tabWriter}`;
}
async function bindIdentity(accessToken: string, currentEpoch: number) {
  if (verifiedToken === accessToken && userEmail) return;
  const email = (await fetchGoogleEmail(accessToken))?.trim().toLowerCase();
  if (epoch !== currentEpoch || readGoogleToken()?.access_token !== accessToken) throw new Error('Account changed during sync; no data was transferred.');
  if (!email) throw new Error('Could not verify the connected Google account. Reconnect before syncing.');
  const clientId = getGoogleClientId();
  const owner = readObject<{ email: string; clientId: string } | null>(OWNER_KEY, null);
  const legacyEmail = localStorage.getItem(USER_EMAIL_KEY)?.toLowerCase();
  if ((owner && (owner.email !== email || owner.clientId !== clientId)) || (!owner && legacyEmail && legacyEmail !== email)) {
    throw new Error(`This browser contains data for ${owner?.email || legacyEmail}. Reconnect that account with the original Google app. Account mixing was blocked; local data is preserved.`);
  }
  localStorage.setItem(OWNER_KEY, JSON.stringify({ email, clientId }));
  localStorage.setItem(USER_EMAIL_KEY, email);
  userEmail = email; verifiedToken = accessToken;
}
async function driveJson<T>(url: string, accessToken: string, currentEpoch: number, init: RequestInit = {}): Promise<T> {
  if (epoch !== currentEpoch || readGoogleToken()?.access_token !== accessToken) throw new Error('Google session changed. Reconnect to sync.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, { ...init, cache: 'no-store', signal: controller.signal,
      headers: { ...init.headers, Authorization: `Bearer ${accessToken}` } });
    if (response.status === 401) throw new Error('Google session expired. Reconnect on this device; local changes are retained.');
    if (!response.ok) throw new Error(`Google Drive sync failed (${response.status}). Local changes remain queued.`);
    const data = await response.json() as T;
    if (epoch !== currentEpoch || readGoogleToken()?.access_token !== accessToken) throw new Error('Account changed while syncing. Local data was preserved.');
    return data;
  } finally { clearTimeout(timer); }
}
async function readRemote(accessToken: string, currentEpoch: number) {
  const files: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({ spaces: 'appDataFolder',
      q: `trashed=false and (name='${LEGACY_NAME}' or name contains '${PREFIX}')`,
      fields: 'nextPageToken,files(id,name,modifiedTime)', pageSize: '100' });
    if (pageToken) params.set('pageToken', pageToken);
    const page = await driveJson<{ files?: DriveFile[]; nextPageToken?: string }>(`${DRIVE_FILES}?${params}`, accessToken, currentEpoch);
    files.push(...(page.files || [])); pageToken = page.nextPageToken;
  } while (pageToken);
  const snapshots: RemoteRecords[] = [];
  for (let offset = 0; offset < files.length; offset += 4) {
    const group = await Promise.all(files.slice(offset, offset + 4).map(async file => {
      const cached = remoteCache.get(file.id);
      if (cached?.modifiedTime === file.modifiedTime) return cached.backup.records;
      const raw = await driveJson<unknown>(`${DRIVE_FILES}/${encodeURIComponent(file.id)}?alt=media`, accessToken, currentEpoch);
      const backup = parseBackup(raw);
      remoteCache.set(file.id, { modifiedTime: file.modifiedTime, backup });
      return backup.records;
    }));
    snapshots.push(...group);
  }
  return { files, records: mergeRemoteRecords(...snapshots) };
}
async function writeRemote(fileId: string | undefined, backup: RemoteBackup, accessToken: string, currentEpoch: number): Promise<string> {
  const name = `${PREFIX}${backup.writerId}.json`;
  const metadata = fileId ? { name } : { name, parents: ["appDataFolder"] };
  const boundary = `mc_${crypto.randomUUID()}`;
  const body = [
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(backup)}\r\n`, `--${boundary}--`,
  ].join('');
  const target = fileId ? `${DRIVE_UPLOAD}/${encodeURIComponent(fileId)}?uploadType=multipart&fields=id` : `${DRIVE_UPLOAD}?uploadType=multipart&fields=id`;
  const saved = await driveJson<{ id: string }>(target, accessToken, currentEpoch, {
    method: fileId ? 'PATCH' : 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body,
  });
  if (!saved.id) throw new Error('Google Drive backup failed: Drive did not acknowledge the write. Changes remain queued.');
  remoteCache.delete(saved.id);
  return saved.id;
}
async function seedMissingRecords(remote: RemoteRecords) {
  // Do not stop because one dirty row exists: older code left every other local
  // task stranded on that device. Only genuinely absent IDs are imported.
  for (const [collection, table] of Object.entries(COLLECTIONS)) {
    const rows = await table.toArray();
    const dirty = readDirty();
    for (const row of rows) {
      if (!row?.id) continue;
      const recordKey = key(collection, String(row.id));
      if (!dirty[recordKey] && !remote[recordKey]) dirty[recordKey] = newChange('put');
    }
    writeDirty(dirty);
  }
  if (journalError) throw new Error('Sync queue storage failed. Free device storage before reconnecting.');
}
async function syncCycle(): Promise<SyncResult> {
  const token = readGoogleToken();
  if (!token || !googleTokenHasScopes(token, [GDRIVE_APPDATA_SCOPE])) {
    setStatus('signed-out', 'Connect the same Google account on both devices to synchronize tasks.');
    return { ok: false, restored: 0, remoteRows: 0, error: lastError || undefined };
  }
  if (!navigator.onLine) { setStatus('offline', 'Offline: changes are saved on this device and queued.'); return { ok: false, restored: 0, remoteRows: 0, error: lastError || undefined }; }
  const currentEpoch = epoch;
  setStatus('syncing');
  try {
    await bindIdentity(token.access_token, currentEpoch);
    await repairStaleCloudJournal();
    const remote = await readRemote(token.access_token, currentEpoch);
    if (!localSeedChecked) await seedMissingRecords(remote.records);
    const captured = readDirty();
    const merged = mergeRemoteRecords(remote.records);
    const repairedQueueEntries = new Set<string>();

    for (const [recordKey, change] of Object.entries(captured)) {
      const [collection, id] = recordKey.split('::');
      const table = COLLECTIONS[collection];
      if (!table || !id) continue;
      const data = change.operation === 'delete' ? null : await table.get(id);
      if (!sameChange(readDirty()[recordKey], change)) continue;
      // A stale pending "put" must never block the whole queue. This can happen
      // after an older app version deleted/replaced a row without rewriting the
      // journal. Preserve remote data if it exists; otherwise discard only the
      // stale journal entry. Never reinterpret this as a destructive delete.
      if (!data && change.operation !== 'delete') {
        repairedQueueEntries.add(recordKey);
        continue;
      }

      const remoteRecord = merged[recordKey];
      const originalCandidate = {
        data: data || null,
        deleted: change.operation === 'delete',
        updatedAt: change.changedAt,
        revision: change.revision,
      };
      const differsFromRemote =
        !!remoteRecord &&
        (remoteRecord.deleted !== originalCandidate.deleted ||
          JSON.stringify(remoteRecord.data) !== JSON.stringify(originalCandidate.data));

      if (differsFromRemote) {
        const conflictId = `sync-conflict-${change.revision || `${collection}-${id}-${change.changedAt}`}`;
        const conflict = {
          id: conflictId,
          at: new Date().toISOString(),
          action: 'sync',
          collection,
          recordId: id,
          label: 'Remote version preserved before applying pending local edit',
          before: remoteRecord?.data ?? null,
        };
        await db.auditLog.put(conflict as any);
        merged[key('auditLog', conflictId)] = {
          data: conflict,
          deleted: false,
          updatedAt: change.changedAt,
          revision: conflictId,
        };
      }

      // A pending local mutation is explicit user intent. Rebase it above the
      // newest remote clock instead of letting device clock skew silently erase
      // the change. Other devices will then pull this exact confirmed revision.
      const candidate = rebaseLocalPending(originalCandidate, remoteRecord);
      merged[recordKey] = candidate;
    }
    const outboundKeys = Object.keys(captured).filter(
      recordKey => !repairedQueueEntries.has(recordKey),
    );

    if (outboundKeys.length) {
      const writer = writerId();
      const file = remote.files.filter(f => f.name === `${PREFIX}${writer}.json`).sort((a, b) => b.modifiedTime.localeCompare(a.modifiedTime) || a.id.localeCompare(b.id))[0];
      const backup: RemoteBackup = { version: 2, writerId: writer, updatedAt: new Date().toISOString(), records: merged };
      const fileId = await writeRemote(file?.id, backup, token.access_token, currentEpoch);
      const verified = parseBackup(await driveJson<unknown>(`${DRIVE_FILES}/${encodeURIComponent(fileId)}?alt=media`, token.access_token, currentEpoch));
      for (const recordKey of outboundKeys) {
        if (
          merged[recordKey] &&
          (!verified.records[recordKey] ||
            revisionOf(verified.records[recordKey]) !== revisionOf(merged[recordKey]))
        ) {
          throw new Error('Cloud read-back did not match the write. Changes remain queued.');
        }
      }
    }
    if (epoch !== currentEpoch || readGoogleToken()?.access_token !== token.access_token) throw new Error('Account changed before applying sync.');
    // Keep confirmation receipts only for this browser session. A cold start may
    // compare more rows once, but it avoids an unbounded localStorage payload.
    for (const cachedKey of receiptCache.keys()) {
      if (!merged[cachedKey]) receiptCache.delete(cachedKey);
    }
    let restored = 0;
    suppressMutationJournal++;
    try {
      await db.transaction('rw', Object.values(COLLECTIONS), async () => {
        for (const [recordKey, record] of Object.entries(merged)) {
          const [collection, id] = recordKey.split('::');
          const table = COLLECTIONS[collection];
          if (!table || !id) continue;
          const dirty = readDirty()[recordKey];
          if (!dirty && receiptCache.get(recordKey) === revisionOf(record)) continue;
          if (dirty && !sameChange(dirty, captured[recordKey])) continue;
          if (epoch !== currentEpoch) throw new Error('Sync cancelled.');
          if (record.deleted) await table.delete(id);
          else if (validRecord(collection, record.data, id)) {
            const local = await table.get(id);
            if (JSON.stringify(local) !== JSON.stringify(record.data)) {
              await table.put(record.data);
              restored++;
            }
          } else {
            throw new Error(`Invalid ${collection} record. No local records were overwritten.`);
          }
          receiptCache.set(recordKey, revisionOf(record));
        }
      });
    } finally {
      suppressMutationJournal = Math.max(0, suppressMutationJournal - 1);
    }
    const current = readDirty();
    for (const [recordKey, change] of Object.entries(captured)) {
      if (
        sameChange(current[recordKey], change) &&
        (merged[recordKey] || repairedQueueEntries.has(recordKey))
      ) {
        delete current[recordKey];
      }
    }
    writeDirty(current);
    if (journalError) throw new Error('Cloud write completed but the device queue could not be acknowledged.');
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    retryAttempt = 0;
    localSeedChecked = true;
    setStatus(Object.keys(current).length ? 'syncing' : 'synced');
    if (Object.keys(current).length) queueCloudPush(250);
    if (typeof window !== 'undefined') {
      void import('@/lib/dailyDigestSync')
        .then(({ syncDailyDigestSnapshot }) => syncDailyDigestSnapshot({ silent: true }))
        .catch(() => undefined);
    }
    return {
      ok: true,
      restored,
      remoteRows: Object.keys(merged).length,
      repairedQueueEntries: repairedQueueEntries.size,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Synchronization failed';
    if (epoch === currentEpoch) {
      setStatus(navigator.onLine ? 'error' : 'offline', message);
      if (++retryAttempt <= 4 && hasSession()) queueCloudPush(Math.min(60_000, 3_000 * 2 ** retryAttempt));
    }
    return { ok: false, restored: 0, remoteRows: 0, error: message };
  }
}
function synchronize(): Promise<SyncResult> {
  if (activeSync) return activeSync;
  const run = () => syncCycle();
  const operation: Promise<SyncResult> = Promise.resolve().then(async () => {
    if (typeof navigator !== 'undefined' && navigator.locks) return await navigator.locks.request('mc-cloud-sync-v2', run);
    return await run();
  }).finally(() => { activeSync = null; });
  activeSync = operation;
  return operation;
}
export function onDirtyRecordsChange(callback: () => void) { dirtyListeners.add(callback); return () => { dirtyListeners.delete(callback); }; }
export function getRecordSyncState(collection: string, id: string): RecordSyncState {
  if (!hasSession() || status === 'signed-out') return 'local-only';
  if (readDirty()[key(collection, id)]) return status === 'error' ? 'failed' : 'pending';
  return receiptCache.has(key(collection, id)) || status === 'synced' ? 'saved' : 'pending';
}
export function markCloudRecordDirty(collection: string, id: string, operation: DirtyOperation = 'put') {
  if (!COLLECTIONS[collection] || !id) return;
  const dirty = readDirty(); dirty[key(collection, id)] = newChange(operation); writeDirty(dirty);
}
export function markCloudRecordsDirty(collection: string, ids: string[], operation: DirtyOperation = 'put') {
  const dirty = readDirty();
  ids.forEach(id => { if (COLLECTIONS[collection] && id) dirty[key(collection, id)] = newChange(operation); });
  writeDirty(dirty);
}
export function getCloudStatus() { return status; }
export function getCloudError() { return lastError; }
export function getCloudUserId() { return userEmail; }
export function getLastCloudSync() { try { return localStorage.getItem(LAST_SYNC_KEY); } catch { return null; } }
export function getPendingCloudCount() { return Object.keys(readDirty()).length; }
export function onCloudStatus(callback: (next: CloudStatus, error: string | null) => void) {
  listeners.add(callback); callback(status, lastError); return () => { listeners.delete(callback); };
}
export function queueCloudPush(delay = 900) {
  if (!hasSession()) {
    setStatus('signed-out', 'Saved on this device. Connect Google to sync with your other device.');
    return;
  }

  const now = Date.now();
  if (!firstQueuedAt) firstQueuedAt = now;
  const remaining = Math.max(0, MAX_PUSH_LATENCY_MS - (now - firstQueuedAt));
  const wait = Math.min(Math.max(0, delay), remaining);

  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    firstQueuedAt = 0;
    void synchronize();
  }, wait);
}
export async function flushCloudChanges() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = null;
  firstQueuedAt = 0;
  let result = await synchronize();
  if (result.ok && getPendingCloudCount()) result = await synchronize();
  return result;
}
export const pullFromCloud = () => synchronize();
export async function retryCloudPush() { retryAttempt = 0; return flushCloudChanges(); }
export const forceCloudSync = () => flushCloudChanges();
function installRefreshListeners() {
  if (started || typeof window === 'undefined') return;
  started = true;

  const refresh = () => {
    if (document.visibilityState !== 'hidden') void synchronize();
  };
  const flushBeforeBackground = () => {
    if (getPendingCloudCount() > 0 && hasSession() && navigator.onLine) {
      void flushCloudChanges();
    }
  };

  window.addEventListener('focus', refresh);
  window.addEventListener('online', refresh);
  window.addEventListener('pagehide', flushBeforeBackground);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushBeforeBackground();
    else refresh();
  });
  window.addEventListener('storage', event => {
    if ([DIRTY_KEY, USER_EMAIL_KEY, 'mc_google_access_token_v1'].includes(event.key || '')) {
      queueCloudPush(250);
    }
  });
  setInterval(refresh, 15_000);
}
export async function signInToCloud(): Promise<void> {
  try {
    setStatus('connecting');
    const token = await requestGoogleToken({ scope: GOOGLE_SCOPES, prompt: 'select_account' });
    epoch++; verifiedToken = ''; remoteCache.clear(); retryAttempt = 0; localSeedChecked = false;
    await bindIdentity(token.access_token, epoch);
    installRefreshListeners();
    if (activeSync) await activeSync;
    const result = await flushCloudChanges();
    if (!result.ok) throw new Error(result.error || 'Sync did not complete');
  } catch (error) { setStatus('error', error instanceof Error ? error.message : 'Google connection failed'); throw error; }
}
export async function signOutOfCloud() {
  epoch++; verifiedToken = ''; remoteCache.clear();
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = null;
  firstQueuedAt = 0;
  clearGoogleToken(); userEmail = null; setStatus('signed-out');
}
export async function requestEmailCode(_email: string) { return { ok: false, error: 'Connect your Google account instead.' }; }
export async function verifyEmailCode(_email: string, _code: string) { return { ok: false, error: 'Connect your Google account instead.' }; }
export async function verifyMagicLink(_url: string, _email?: string) { return { ok: false, error: 'Connect your Google account instead.' }; }
export async function startCloudSync(_force = false): Promise<{ signedIn: boolean; restored: number }> {
  installMutationJournal();
  installRefreshListeners();
  const result = await synchronize();
  return { signedIn: hasSession() && result.ok, restored: result.restored };
}


if (typeof window !== 'undefined') {
  // One-time cleanup of the legacy unbounded receipt payload. This key is only
  // cache data; removing it cannot delete tasks or any other Mission Control data.
  try { localStorage.removeItem(LEGACY_RECEIPTS_KEY); } catch { /* restricted storage */ }
  installMutationJournal();
}
