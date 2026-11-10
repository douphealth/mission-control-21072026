import Dexie, { type Table } from "dexie";
import type { UserSettings } from "./db";
import { decrypt, encrypt, generateStrongKey, setVaultSessionKey, vaultSessionActive, vaultSessionKeys } from "./encryption";
import { applyFamilyPatch, validateFamilyRecord, type FamilyPatch } from "./familyBulk";

export const VAULT_IDLE_MS = 5 * 60 * 1000;
const ENVELOPE = "mc-private-vault-envelope-v1";
type Envelope = { version: 1; salt: string; iv: string; data: string };
export type FamilyRecord = { id: string; member: string; category: string; label: string; value: string; notes: string };
type StoredFamilyRecord = { id: string; payload: string };
class FamilyDatabase extends Dexie {
  records!: Table<StoredFamilyRecord, string>;
  constructor() { super("MissionControlPrivateFamily"); this.version(1).stores({ records: "id" }); }
}
export const familyDb = new FamilyDatabase();
const encode = (bytes: Uint8Array) => btoa(Array.from(bytes, n => String.fromCharCode(n)).join(""));
const decode = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));
async function wrappingKey(passphrase: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt as BufferSource, iterations: 600_000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
export function vaultConfigured() { return !!localStorage.getItem(ENVELOPE); }

// ─── Cross-device keyring ────────────────────────────────────────────────────
// Each device publishes its passphrase-wrapped envelope to its own synced
// settings row (never overwriting another device's row). Unlocking tries every
// envelope, so passwords saved on any device decrypt everywhere.
const ACCOUNT_PREFIX = "private-vault-";
const DEVICE_SLOT = "mc-vault-device-id";
type AccountEnvelope = { envelope: Envelope; createdAt: string; updatedAt: string; device: string };
const createdSlot = "mc-private-vault-created-at";
function deviceId() {
  let id = localStorage.getItem(DEVICE_SLOT);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_SLOT, id); }
  return id;
}
async function settingsTable() {
  try { const { db } = await import("./db"); return db.settings; } catch { return null; }
}
export async function readAccountEnvelopes(): Promise<AccountEnvelope[]> {
  try {
    const table = await settingsTable(); if (!table) return [];
    const rows = await table.where("id").startsWith(ACCOUNT_PREFIX).toArray();
    return rows.map(r => (r as { vaultEnvelope?: AccountEnvelope }).vaultEnvelope).filter((e): e is AccountEnvelope => !!e?.envelope?.data);
  } catch { return []; }
}
/** Publish this device's wrapped key (safe: it only opens with the master passphrase). */
export async function publishVaultEnvelope() {
  const saved = localStorage.getItem(ENVELOPE); if (!saved) return;
  try {
    const table = await settingsTable(); if (!table) return;
    const id = ACCOUNT_PREFIX + deviceId();
    const current = (await table.get(id)) as { vaultEnvelope?: AccountEnvelope } | undefined;
    if (current?.vaultEnvelope && JSON.stringify(current.vaultEnvelope.envelope) === saved) return;
    const now = new Date().toISOString();
    const createdAt = localStorage.getItem(createdSlot) || current?.vaultEnvelope?.createdAt || now;
    localStorage.setItem(createdSlot, createdAt);
    await table.put({ id, vaultEnvelope: { envelope: JSON.parse(saved), createdAt, updatedAt: now, device: id } } as UserSettings);
  } catch { /* sync is best effort; the local envelope remains authoritative */ }
}
function parseKeyring(plain: string): string[] {
  if (plain.startsWith("{")) { try { const keys = JSON.parse(plain).keys; if (Array.isArray(keys)) return keys.filter((k: unknown) => typeof k === "string" && k); } catch { /* legacy */ } }
  return [plain];
}
async function unwrap(envelope: Envelope, passphrase: string): Promise<string[] | null> {
  try {
    const key = await wrappingKey(passphrase, decode(envelope.salt));
    const data = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(envelope.iv) as BufferSource, additionalData: new TextEncoder().encode(ENVELOPE) }, key, decode(envelope.data) as BufferSource);
    return parseKeyring(new TextDecoder().decode(data));
  } catch { return null; }
}
async function wrap(passphrase: string, keys: string[]): Promise<Envelope> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await wrappingKey(passphrase, salt);
  // A single key keeps the original envelope format readable by older builds.
  const plain = keys.length === 1 ? keys[0] : JSON.stringify({ keys });
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(ENVELOPE) }, key, new TextEncoder().encode(plain));
  return { version: 1, salt: encode(salt), iv: encode(iv), data: encode(new Uint8Array(data)) };
}
let lockedDevices = 0;
// Passphrase kept in memory only (never storage) so keys from devices that sync
// in later are merged automatically while this tab stays unlocked.
let memoryPassphrase: string | null = null;
const MERGED_SLOT = "mc-vault-merged-envelopes";
const sig = (e: Envelope) => e.data.slice(0, 48);
function mergedSigs(): Set<string> { try { return new Set(JSON.parse(sessionStorage.getItem(MERGED_SLOT) || "[]")); } catch { return new Set(); } }
function rememberSigs(list: string[]) { try { sessionStorage.setItem(MERGED_SLOT, JSON.stringify([...new Set([...mergedSigs(), ...list])])); } catch { /* ignore */ } }
async function otherEnvelopes() {
  const own = ACCOUNT_PREFIX + (localStorage.getItem(DEVICE_SLOT) || "");
  return (await readAccountEnvelopes()).filter(e => e.device !== own);
}
/** Other devices' keyrings that synced in after this tab was unlocked. */
export async function pendingDeviceKeyrings() {
  if (!vaultSessionActive()) return 0;
  const seen = mergedSigs();
  return (await otherEnvelopes()).filter(e => !seen.has(sig(e.envelope))).length;
}
/** Silently merge newly synced device keys when the passphrase is still in memory. Returns keys added. */
export async function refreshDeviceKeyrings(): Promise<number> {
  if (!vaultSessionActive() || !memoryPassphrase) return 0;
  const seen = mergedSigs();
  const fresh = (await otherEnvelopes()).filter(e => !seen.has(sig(e.envelope)));
  if (!fresh.length) return 0;
  const keys: string[] = []; const opened: string[] = [];
  for (const e of fresh) { const k = await unwrap(e.envelope, memoryPassphrase); if (k) { keys.push(...k); opened.push(sig(e.envelope)); } }
  rememberSigs(opened);
  lockedDevices = Math.max(lockedDevices, fresh.length - opened.length);
  const before = new Set(vaultSessionKeys());
  const added = keys.filter(k => !before.has(k));
  if (added.length) await adopt(memoryPassphrase, [...keys, ...vaultSessionKeys()], vaultSessionKeys());
  if (added.length) notifyKeys();
  return new Set(added).size;
}
/** Number of other devices whose saved passwords need that device's passphrase. */
export function lockedDeviceVaults() { return lockedDevices; }
/** How many other devices have shared a wrapped key with this account. */
export async function otherDeviceKeyCount() { return (await otherEnvelopes()).length; }
export async function accountVaultExists() { return (await readAccountEnvelopes()).length > 0; }

async function openKeyring(passphrase: string, includeLocal: boolean) {
  const account = await otherEnvelopes();
  const keys: string[] = []; let failed = 0; const opened: string[] = [];
  for (const e of account) { const k = await unwrap(e.envelope, passphrase); if (k) { keys.push(...k); opened.push(sig(e.envelope)); } else failed++; }
  rememberSigs(opened);
  const saved = includeLocal ? localStorage.getItem(ENVELOPE) : null;
  let localKeys: string[] | null = null;
  if (saved) { localKeys = await unwrap(JSON.parse(saved), passphrase); if (localKeys) keys.push(...localKeys); }
  return { keys, failed, localKeys, accountCount: account.length, hadLocal: !!saved };
}
async function adopt(passphrase: string, keys: string[], previous: string[] | null) {
  // Sorted so every device independently picks the same primary key for new data.
  const merged = [...new Set([...keys, ...vaultSessionKeys()])].sort();
  if (!previous || merged.join() !== [...previous].sort().join()) localStorage.setItem(ENVELOPE, JSON.stringify(await wrap(passphrase, merged)));
  setVaultSessionKey(merged[0], merged.slice(1));
  memoryPassphrase = passphrase;
  localStorage.removeItem("mc-encryption-key");
  await publishVaultEnvelope();
}
export async function unlockPrivateVault(passphrase: string) {
  const legacy = localStorage.getItem("mc-encryption-key");
  const opened = await openKeyring(passphrase, true);
  if (!opened.hadLocal && !opened.accountCount) {
    if (passphrase.length < 12) throw new Error("Choose a master passphrase of at least 12 characters.");
    await adopt(passphrase, [legacy || generateStrongKey()], null);
    notifyKeys();
    lockedDevices = 0;
    return;
  }
  if (opened.hadLocal && !opened.localKeys) throw new Error("Incorrect passphrase or damaged vault. No records were changed.");
  if (!opened.keys.length) throw new Error("Incorrect passphrase. Use the master passphrase you created on your other device. No records were changed.");
  // Keep a pre-vault device key too: older rows on this device may use it.
  await adopt(passphrase, legacy ? [...opened.keys, legacy] : opened.keys, opened.localKeys);
  lockedDevices = opened.failed;
  notifyKeys();
}
/** Tells open pages to retry secrets they could not open before. */
export const VAULT_KEYS_EVENT = "mc-vault-keys-changed";
function notifyKeys() { if (typeof window !== "undefined") window.dispatchEvent(new Event(VAULT_KEYS_EVENT)); }
/** Unlock passwords saved on another device that used a different passphrase; this device then uses that passphrase. */
export async function addOtherDevicePassphrase(passphrase: string) {
  if (!vaultSessionActive()) throw new Error("Unlock your private vault first.");
  const opened = await openKeyring(passphrase, false);
  if (!opened.accountCount) throw new Error("None of your other devices has shared its key yet, so there is nothing for a passphrase to open. Nothing was changed.");
  if (!opened.keys.length) throw new Error("That passphrase doesn't match your other device. Nothing was changed.");
  await adopt(passphrase, [...opened.keys, ...vaultSessionKeys()], null);
  lockedDevices = opened.failed;
  notifyKeys();
}
// ─── Recovery code ───────────────────────────────────────────────────────────
// A random code (shown once) wraps a copy of the keyring. It syncs like the
// device envelopes and lets the owner set a new passphrase if they forget it.
const RECOVERY_ROW = "vault-recovery";
const RECOVERY_LOCAL = "mc-private-vault-recovery-v1";
type RecoveryEnvelope = NonNullable<UserSettings["vaultRecovery"]>;
const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const normalizeRecoveryCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, "");
async function keyTag(key: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`mc-vault-tag:${key}`));
  return encode(new Uint8Array(digest)).slice(0, 12);
}
async function readRecovery(): Promise<RecoveryEnvelope | null> {
  try {
    const table = await settingsTable();
    const row = table ? ((await table.get(RECOVERY_ROW)) as { vaultRecovery?: RecoveryEnvelope } | undefined) : undefined;
    if (row?.vaultRecovery?.envelope?.data) return row.vaultRecovery;
  } catch { /* fall back to the local copy */ }
  try { const local = localStorage.getItem(RECOVERY_LOCAL); return local ? JSON.parse(local) : null; } catch { return null; }
}
/** "none" | "current" | "outdated" (a key was added after the code was made). */
export async function recoveryCodeStatus(): Promise<"none" | "current" | "outdated"> {
  const rec = await readRecovery(); if (!rec) return "none";
  if (!vaultSessionActive()) return "current";
  const covered = new Set(rec.covers);
  const tags = await Promise.all(vaultSessionKeys().map(keyTag));
  return tags.every(t => covered.has(t)) ? "current" : "outdated";
}
/** Create (or replace) the recovery code for every key this unlocked session holds. Show it once. */
export async function createRecoveryCode(): Promise<string> {
  if (!vaultSessionActive()) throw new Error("Unlock your private vault first.");
  const bytes = crypto.getRandomValues(new Uint8Array(25));
  const raw = Array.from(bytes, b => RECOVERY_ALPHABET[b % 32]).join("");
  const code = raw.match(/.{5}/g)!.join("-");
  const keys = vaultSessionKeys();
  const rec: RecoveryEnvelope = { envelope: await wrap(normalizeRecoveryCode(code), keys), createdAt: new Date().toISOString(), covers: await Promise.all(keys.map(keyTag)) };
  localStorage.setItem(RECOVERY_LOCAL, JSON.stringify(rec));
  try { const table = await settingsTable(); await table?.put({ id: RECOVERY_ROW, vaultRecovery: rec } as UserSettings); } catch { /* local copy remains */ }
  return code;
}
/** Forgotten passphrase: open the keyring with the recovery code and protect it with a new passphrase. */
export async function recoverVaultWithCode(code: string, newPassphrase: string) {
  if (newPassphrase.length < 12) throw new Error("Choose a new master passphrase of at least 12 characters.");
  const rec = await readRecovery();
  if (!rec) throw new Error("No recovery code was created for this vault yet. Create one in Credentials while the vault is unlocked.");
  const keys = await unwrap(rec.envelope, normalizeRecoveryCode(code));
  if (!keys?.length) throw new Error("That recovery code is not correct. Nothing was changed.");
  const legacy = localStorage.getItem("mc-encryption-key");
  await adopt(newPassphrase, legacy ? [...keys, legacy] : keys, null);
  rememberSigs((await otherEnvelopes()).map(e => sig(e.envelope)));
  lockedDevices = 0;
  notifyKeys();
}
export async function recoveryAvailable() { return !!(await readRecovery()); }
export function lockPrivateVault() { setVaultSessionKey(null); memoryPassphrase = null; try { sessionStorage.removeItem(MERGED_SLOT); } catch { /* ignore */ } }
export async function saveFamilyRecord(record: FamilyRecord) {
  validateFamilyRecord(record);
  await familyDb.records.put({ id: record.id, payload: await encrypt(JSON.stringify(record)) });
}
export async function addFamilyRecords(records: FamilyRecord[]) {
  records.forEach(validateFamilyRecord);
  // Use fresh IDs even if an imported file carries IDs; existing records are never overwritten.
  const stored = await Promise.all(records.map(async record => {
    const id = crypto.randomUUID();
    return { id, payload: await encrypt(JSON.stringify({ ...record, id })) };
  }));
  await familyDb.transaction("rw", familyDb.records, () => familyDb.records.bulkAdd(stored));
}
export async function editFamilyRecords(ids: string[], patch: FamilyPatch) {
  const unique = [...new Set(ids)];
  const saved = await familyDb.records.bulkGet(unique);
  if (saved.some(record => !record)) throw new Error("A selected record is no longer available. Refresh before editing.");
  const updated = await Promise.all(saved.map(async record => {
    if (!record) throw new Error("Record unavailable.");
    const value = applyFamilyPatch(JSON.parse(await decrypt(record.payload)), patch);
    return { id: record.id, payload: await encrypt(JSON.stringify(value)) };
  }));
  await familyDb.transaction("rw", familyDb.records, async () => {
    const current = await familyDb.records.bulkGet(unique);
    if (current.some((record, i) => record?.payload !== saved[i]?.payload)) throw new Error("Records changed in another tab. Refresh before editing.");
    await familyDb.records.bulkPut(updated);
  });
}
export async function deleteFamilyRecords(ids: string[]) {
  // Require an unlocked session for destructive bulk operations too.
  await encrypt("family-vault-delete");
  await familyDb.transaction("rw", familyDb.records, () => familyDb.records.bulkDelete([...new Set(ids)]));
}
export async function readFamilyRecords(): Promise<FamilyRecord[]> {
  return Promise.all((await familyDb.records.toArray()).map(async record => JSON.parse(await decrypt(record.payload)) as FamilyRecord));
}
export async function exportPrivateVault(credentials: unknown[]) {
  const envelope = localStorage.getItem(ENVELOPE);
  if (!envelope) throw new Error("Protect and unlock the vault first.");
  // Encrypt the complete inventory, including legacy metadata and plaintext rows.
  return JSON.stringify({ format: "mc-private-backup-v1", envelope: JSON.parse(envelope), payload: await encrypt(JSON.stringify({ credentials, family: await familyDb.records.toArray() })) });
}
export async function decodePrivateBackup(input: string, passphrase: string) {
  const backup = JSON.parse(input);
  if (backup.format !== "mc-private-backup-v1" || !backup.envelope || typeof backup.payload !== "string") throw new Error("Choose a Mission Control encrypted vault backup.");
  const envelope: Envelope = backup.envelope;
  const deviceKey = await unwrap(envelope, passphrase);
  if (!deviceKey) throw new Error("Backup passphrase is incorrect. Nothing was imported.");
  return { data: JSON.parse(await decrypt(backup.payload, deviceKey)), deviceKey };
}