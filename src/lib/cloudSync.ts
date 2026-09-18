/**
 * Account-scoped, provider-independent backup through Google Drive appData.
 *
 * The file is private to Mission Control, invisible in the user's normal Drive,
 * and only accessible after the user grants this app permission. Local IndexedDB
 * remains authoritative while offline; a durable per-record journal prevents a
 * stale remote copy from overwriting newer local edits.
 */
import { db } from "@/lib/db";
import {
  GDRIVE_APPDATA_SCOPE,
  GOOGLE_SCOPES,
  clearGoogleToken,
  ensureGoogleToken,
  fetchGoogleEmail,
  googleTokenHasScopes,
  readGoogleToken,
  requestGoogleToken,
} from "@/lib/googleDirectAuth";

export type CloudStatus = "signed-out" | "connecting" | "syncing" | "synced" | "offline" | "error";
export type RecordSyncState = "saved" | "pending" | "failed" | "local-only";
type DirtyOperation = "put" | "delete";
type DirtyRecord = { operation: DirtyOperation; changedAt: string };
type DirtyRecordMap = Record<string, DirtyRecord>;
type RemoteRecord = { data: Record<string, unknown> | null; deleted: boolean; updatedAt: string };
type RemoteBackup = { version: 1; updatedAt: string; records: Record<string, RemoteRecord> };

const FILE_NAME = "mission-control-sync-v1.json";
const DRIVE_FILES = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const LAST_SYNC_KEY = "mc-cloud-last-sync";
const USER_EMAIL_KEY = "mc-cloud-user-email";
const DIRTY_KEY = "mc-cloud-dirty-records-v3";
const REQUIRED_FIELDS: Record<string, string[]> = {
  tasks: ["title"], websites: ["name"], notes: ["title"], links: ["title"], repos: ["name"],
  buildProjects: ["name"], ideas: ["title"], credentials: ["label"], customModules: ["name"],
  habits: ["name"], feedSources: ["name"], streamItems: ["title"], watchTerms: ["term"],
  audienceAccounts: ["platform"], reminders: ["title"], decisions: ["title"], validations: ["title"],
};
const COLLECTIONS: Record<string, any> = {
  websites: db.websites, seoProfiles: db.seoProfiles, seoSnapshots: db.seoSnapshots,
  seoQueryObservations: db.seoQueryObservations, seoIssues: db.seoIssues, seoActions: db.seoActions,
  seoChanges: db.seoChanges, seoVisibilityChecks: db.seoVisibilityChecks, tasks: db.tasks,
  repos: db.repos, buildProjects: db.buildProjects, links: db.links, notes: db.notes,
  payments: db.payments, ideas: db.ideas, credentials: db.credentials, customModules: db.customModules,
  habits: db.habits, feedSources: db.feedSources, streamItems: db.streamItems,
  watchTerms: db.watchTerms, audienceAccounts: db.audienceAccounts,
  audienceReadings: db.audienceReadings, reminders: db.reminders, decisions: db.decisions,
  auditLog: db.auditLog, settings: db.settings, validations: db.validations,
};

const listeners = new Set<(status: CloudStatus, error: string | null) => void>();
const dirtyListeners = new Set<() => void>();
let status: CloudStatus = "signed-out";
let lastError: string | null = null;
let userEmail: string | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushing = false;
let pushAgain = false;
let started = false;
let retryAttempt = 0;

function key(collection: string, recordId: string) { return `${collection}::${recordId}`; }
function readDirty(): DirtyRecordMap {
  try { return JSON.parse(localStorage.getItem(DIRTY_KEY) || "{}"); } catch { return {}; }
}
function writeDirty(records: DirtyRecordMap) {
  try {
    if (Object.keys(records).length) localStorage.setItem(DIRTY_KEY, JSON.stringify(records));
    else localStorage.removeItem(DIRTY_KEY);
  } catch { /* local writes remain safe even if journaling is unavailable */ }
  dirtyListeners.forEach((callback) => callback());
}
function setStatus(next: CloudStatus, error: string | null = null) {
  status = next;
  lastError = error;
  listeners.forEach((callback) => callback(next, error));
  dirtyListeners.forEach((callback) => callback());
}
function validRecord(collection: string, data: unknown, recordId: string): data is Record<string, unknown> {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const row = data as Record<string, unknown>;
  if (row.id !== recordId) return false;
  return (REQUIRED_FIELDS[collection] || []).every((field) => typeof row[field] === "string");
}
async function driveRequest(path: string, init: RequestInit = {}, interactive = false): Promise<Response> {
  const token = await ensureGoogleToken({ scope: GOOGLE_SCOPES, interactive });
  const response = await fetch(path, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token.access_token}` },
  });
  if (response.status === 401) {
    clearGoogleToken();
    throw new Error("Google session expired — reconnect your account.");
  }
  if (!response.ok) throw new Error(`Google Drive backup failed (${response.status})`);
  return response;
}
async function findBackupFile(): Promise<string | null> {
  const query = new URLSearchParams({
    spaces: "appDataFolder",
    q: `name='${FILE_NAME}' and trashed=false`,
    fields: "files(id,name,modifiedTime)",
    pageSize: "10",
  });
  const response = await driveRequest(`${DRIVE_FILES}?${query}`);
  const body = await response.json() as { files?: Array<{ id: string }> };
  return body.files?.[0]?.id || null;
}
async function readRemote(): Promise<{ fileId: string | null; backup: RemoteBackup }> {
  const fileId = await findBackupFile();
  if (!fileId) return { fileId: null, backup: { version: 1, updatedAt: "", records: {} } };
  const response = await driveRequest(`${DRIVE_FILES}/${encodeURIComponent(fileId)}?alt=media`);
  const parsed = await response.json() as Partial<RemoteBackup>;
  return {
    fileId,
    backup: {
      version: 1,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
      records: parsed.records && typeof parsed.records === "object" ? parsed.records : {},
    },
  };
}
async function writeRemote(fileId: string | null, backup: RemoteBackup): Promise<void> {
  const metadata = fileId ? { name: FILE_NAME } : { name: FILE_NAME, parents: ["appDataFolder"] };
  const boundary = `mc_${crypto.randomUUID()}`;
  const body = [
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(backup)}\r\n`,
    `--${boundary}--`,
  ].join("");
  const target = fileId
    ? `${DRIVE_UPLOAD}/${encodeURIComponent(fileId)}?uploadType=multipart`
    : `${DRIVE_UPLOAD}?uploadType=multipart`;
  await driveRequest(target, {
    method: fileId ? "PATCH" : "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
}

export function onDirtyRecordsChange(callback: () => void) {
  dirtyListeners.add(callback);
  return () => { dirtyListeners.delete(callback); };
}
export function getRecordSyncState(collection: string, recordId: string): RecordSyncState {
  if (!readGoogleToken()) return "local-only";
  if (!readDirty()[key(collection, recordId)]) return "saved";
  return status === "error" ? "failed" : "pending";
}
export function markCloudRecordDirty(collection: string, recordId: string, operation: DirtyOperation = "put") {
  if (!COLLECTIONS[collection] || !recordId) return;
  const dirty = readDirty();
  dirty[key(collection, recordId)] = { operation, changedAt: new Date().toISOString() };
  writeDirty(dirty);
}
export function markCloudRecordsDirty(collection: string, recordIds: string[], operation: DirtyOperation = "put") {
  const dirty = readDirty();
  const changedAt = new Date().toISOString();
  recordIds.forEach((recordId) => { if (COLLECTIONS[collection] && recordId) dirty[key(collection, recordId)] = { operation, changedAt }; });
  writeDirty(dirty);
}
export function getCloudStatus() { return status; }
export function getCloudError() { return lastError; }
export function getCloudUserId() { return userEmail; }
export function getLastCloudSync() { try { return localStorage.getItem(LAST_SYNC_KEY); } catch { return null; } }
export function onCloudStatus(callback: (next: CloudStatus, error: string | null) => void) {
  listeners.add(callback);
  callback(status, lastError);
  return () => { listeners.delete(callback); };
}
export function getPendingCloudCount() { return Object.keys(readDirty()).length; }

export async function pullFromCloud(): Promise<{ ok: boolean; restored: number; remoteRows: number; error?: string }> {
  if (!readGoogleToken()) return { ok: false, restored: 0, remoteRows: 0, error: "Not connected" };
  try {
    setStatus("syncing");
    const { backup } = await readRemote();
    const dirty = readDirty();
    let restored = 0;
    for (const [recordKey, remote] of Object.entries(backup.records)) {
      if (dirty[recordKey]) continue;
      const splitAt = recordKey.indexOf("::");
      if (splitAt < 1) continue;
      const collection = recordKey.slice(0, splitAt);
      const recordId = recordKey.slice(splitAt + 2);
      const table = COLLECTIONS[collection];
      if (!table) continue;
      if (remote.deleted) await table.delete(recordId);
      else if (validRecord(collection, remote.data, recordId)) { await table.put(remote.data); restored++; }
    }
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    setStatus("synced");
    return { ok: true, restored, remoteRows: Object.keys(backup.records).length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Restore failed";
    setStatus(navigator.onLine ? "error" : "offline", message);
    return { ok: false, restored: 0, remoteRows: 0, error: message };
  }
}

async function pushNow(): Promise<void> {
  if (!readGoogleToken()) return;
  if (pushing) { pushAgain = true; return; }
  const captured = readDirty();
  if (!Object.keys(captured).length) { setStatus("synced"); return; }
  pushing = true;
  try {
    setStatus("syncing");
    const { fileId, backup } = await readRemote();
    for (const [recordKey, change] of Object.entries(captured)) {
      const splitAt = recordKey.indexOf("::");
      const collection = recordKey.slice(0, splitAt);
      const recordId = recordKey.slice(splitAt + 2);
      const table = COLLECTIONS[collection];
      if (!table) continue;
      const remote = backup.records[recordKey];
      if (remote && remote.updatedAt > change.changedAt) continue;
      const local = change.operation === "delete" ? null : await table.get(recordId);
      backup.records[recordKey] = { data: local || null, deleted: !local, updatedAt: change.changedAt };
    }
    backup.updatedAt = new Date().toISOString();
    await writeRemote(fileId, backup);
    const current = readDirty();
    for (const [recordKey, change] of Object.entries(captured)) {
      if (current[recordKey]?.changedAt === change.changedAt) delete current[recordKey];
    }
    writeDirty(current);
    retryAttempt = 0;
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    setStatus("synced");
  } catch (error) {
    retryAttempt++;
    const message = error instanceof Error ? error.message : "Backup failed";
    setStatus(navigator.onLine ? "error" : "offline", message);
    if (retryAttempt <= 6) queueCloudPush(Math.min(60_000, 2_000 * 2 ** (retryAttempt - 1)));
  } finally {
    pushing = false;
    if (pushAgain) { pushAgain = false; queueCloudPush(0); }
  }
}

export function queueCloudPush(delay = 1200) {
  if (!readGoogleToken()) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void pushNow(), delay);
}
export async function flushCloudChanges() { if (pushTimer) clearTimeout(pushTimer); pushTimer = null; await pushNow(); }
export async function retryCloudPush() { retryAttempt = 0; await flushCloudChanges(); }
export async function forceCloudSync() { await pullFromCloud(); await flushCloudChanges(); }

async function markExistingLocalRecordsDirty() {
  const dirty = readDirty();
  if (Object.keys(dirty).length) return;
  const changedAt = new Date().toISOString();
  for (const [collection, table] of Object.entries(COLLECTIONS)) {
    for (const row of await table.toArray()) if (row?.id) dirty[key(collection, String(row.id))] = { operation: "put", changedAt };
  }
  writeDirty(dirty);
}
export async function signInToCloud(): Promise<void> {
  try {
    setStatus("connecting");
    const token = await requestGoogleToken({ scope: GOOGLE_SCOPES, prompt: "select_account" });
    userEmail = await fetchGoogleEmail(token.access_token);
    if (userEmail) localStorage.setItem(USER_EMAIL_KEY, userEmail);
    await markExistingLocalRecordsDirty();
    await pullFromCloud();
    await flushCloudChanges();
  } catch (error) {
    setStatus("error", error instanceof Error ? error.message : "Google connection failed");
  }
}
export async function signOutOfCloud() { clearGoogleToken(); userEmail = null; setStatus("signed-out"); }
export async function requestEmailCode(_email: string) { return { ok: false, error: "Connect your Google account instead." }; }
export async function verifyEmailCode(_email: string, _code: string) { return { ok: false, error: "Connect your Google account instead." }; }
export async function verifyMagicLink(_url: string, _email?: string) { return { ok: false, error: "Connect your Google account instead." }; }
export async function startCloudSync(force = false): Promise<{ signedIn: boolean; restored: number }> {
  const token = readGoogleToken();
  if (!token || !googleTokenHasScopes(token, [GDRIVE_APPDATA_SCOPE])) { setStatus("signed-out"); return { signedIn: false, restored: 0 }; }
  userEmail = localStorage.getItem(USER_EMAIL_KEY);
  if (!getLastCloudSync()) await markExistingLocalRecordsDirty();
  const result = await pullFromCloud();
  if (force || getPendingCloudCount()) await flushCloudChanges();
  if (!started) {
    started = true;
    window.addEventListener("focus", () => void pullFromCloud());
    window.addEventListener("online", () => void forceCloudSync());
  }
  return { signedIn: true, restored: result.restored };
}