import Dexie, { type Table } from "dexie";
import { decrypt, encrypt, generateStrongKey, setVaultSessionKey } from "./encryption";
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
export async function unlockPrivateVault(passphrase: string) {
  const saved = localStorage.getItem(ENVELOPE);
  if (!saved) {
    if (passphrase.length < 12) throw new Error("Choose a master passphrase of at least 12 characters.");
    const deviceKey = localStorage.getItem("mc-encryption-key") || generateStrongKey();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await wrappingKey(passphrase, salt);
    const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(ENVELOPE) }, key, new TextEncoder().encode(deviceKey));
    const envelope: Envelope = { version: 1, salt: encode(salt), iv: encode(iv), data: encode(new Uint8Array(data)) };
    localStorage.setItem(ENVELOPE, JSON.stringify(envelope));
    setVaultSessionKey(deviceKey);
    localStorage.removeItem("mc-encryption-key");
    return;
  }
  try {
    const envelope: Envelope = JSON.parse(saved);
    const key = await wrappingKey(passphrase, decode(envelope.salt));
    const data = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(envelope.iv) as BufferSource, additionalData: new TextEncoder().encode(ENVELOPE) }, key, decode(envelope.data) as BufferSource);
    setVaultSessionKey(new TextDecoder().decode(data));
    localStorage.removeItem("mc-encryption-key");
  } catch { throw new Error("Incorrect passphrase or damaged vault. No records were changed."); }
}
export function lockPrivateVault() { setVaultSessionKey(null); }
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
  const key = await wrappingKey(passphrase, decode(envelope.salt));
  let deviceKey: string;
  try {
    const data = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(envelope.iv) as BufferSource, additionalData: new TextEncoder().encode(ENVELOPE) }, key, decode(envelope.data) as BufferSource);
    deviceKey = new TextDecoder().decode(data);
  } catch { throw new Error("Backup passphrase is incorrect. Nothing was imported."); }
  return { data: JSON.parse(await decrypt(backup.payload, deviceKey)), deviceKey };
}