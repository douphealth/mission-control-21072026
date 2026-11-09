import Dexie, { type Table } from "dexie";
import { db, type EncryptedFamilyRecordRow } from "./db";
import { decrypt, encrypt, generateStrongKey, setVaultSessionKey, vaultSessionActive } from "./encryption";
import { applyFamilyPatch, validateFamilyRecord, type FamilyPatch } from "./familyBulk";

export const VAULT_IDLE_MS = 5 * 60 * 1000;
const ENVELOPE = "mc-private-vault-envelope-v1";
const META_ID = "primary";
type Envelope = { version: 1; salt: string; iv: string; data: string };
export type FamilyRecord = { id: string; member: string; category: string; label: string; value: string; notes: string };
type StoredFamilyRecord = { id: string; payload: string };

/** Pre-v9 local database is retained as a read-only migration source. */
class LegacyFamilyDatabase extends Dexie {
  records!: Table<StoredFamilyRecord, string>;
  constructor() { super("MissionControlPrivateFamily"); this.version(1).stores({ records: "id" }); }
}
const legacyFamilyDb = new LegacyFamilyDatabase();
/** Kept for existing clients and backup helpers; the canonical table now participates in cloud sync. */
export const familyDb = { records: db.familyRecords };

const encode = (bytes: Uint8Array) => btoa(Array.from(bytes, n => String.fromCharCode(n)).join(""));
const decode = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));
async function wrappingKey(passphrase: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt as BufferSource, iterations: 600_000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
function parseEnvelope(value: string): Envelope {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object") throw new Error("Vault key envelope is damaged; local data was preserved.");
  const obj = parsed as Record<string, unknown>;
  if (obj.version !== 1 || typeof obj.salt !== "string" || typeof obj.iv !== "string" || typeof obj.data !== "string") throw new Error("Invalid vault key envelope.");
  return obj as Envelope;
}
export function vaultConfigured() { return !!localStorage.getItem(ENVELOPE); }
export async function vaultConfigurationExists() {
  return vaultConfigured() || !!(await db.vaultMeta.get(META_ID));
}
async function readEnvelope(): Promise<string | null> {
  const local = localStorage.getItem(ENVELOPE);
  const remote = (await db.vaultMeta.get(META_ID))?.envelope;
  if (local && remote && local !== remote) {
    throw new Error("This device and the cloud use different vault keys. No family data was overwritten. Export an encrypted backup before reconciling.");
  }
  return local || remote || null;
}

/**
 * Moves old local family rows into the synchronized encrypted store.
 * Never deletes legacy rows. Existing IDs with different ciphertexts are
 * checked by plaintext and imported as new copies rather than overwritten.
 */
async function migrateLegacyFamilyRecords(): Promise<number> {
  const legacy = await legacyFamilyDb.records.toArray();
  if (!legacy.length) return 0;
  let added = 0;
  for (const row of legacy) {
    const existing = await db.familyRecords.get(row.id);
    if (existing) {
      const oldValue = await decrypt(row.payload);
      const currentValue = await decrypt(existing.payload);
      if (oldValue === currentValue) continue;
      const copy = JSON.parse(oldValue) as FamilyRecord;
      copy.id = crypto.randomUUID();
      validateFamilyRecord(copy);
      await db.familyRecords.add({ id: copy.id, payload: await encrypt(JSON.stringify(copy)) });
    } else {
      // Verify every row decrypts before allowing it into the synchronized inventory.
      const decoded = JSON.parse(await decrypt(row.payload)) as FamilyRecord;
      if (decoded.id !== row.id) throw new Error("Legacy vault record ID mismatch. No source records were removed.");
      validateFamilyRecord(decoded);
      await db.familyRecords.add({ id: row.id, payload: row.payload });
    }
    added++;
  }
  return added;
}
export async function unlockPrivateVault(passphrase: string) {
  const saved = await readEnvelope();
  if (!saved) {
    if (passphrase.length < 12) throw new Error("Choose a master passphrase of at least 12 characters.");
    // Do not create a new master key if synchronized encrypted records are already present.
    if (await db.familyRecords.count()) throw new Error("Encrypted family records exist without a vault key. Restore the original envelope before proceeding.");
    const deviceKey = localStorage.getItem("mc-encryption-key") || generateStrongKey();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await wrappingKey(passphrase, salt);
    const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(ENVELOPE) }, key, new TextEncoder().encode(deviceKey));
    const envelope: Envelope = { version: 1, salt: encode(salt), iv: encode(iv), data: encode(new Uint8Array(data)) };
    const serialized = JSON.stringify(envelope);
    // Commit synchronizable key metadata before removing the legacy device key.
    await db.vaultMeta.put({ id: META_ID, envelope: serialized });
    localStorage.setItem(ENVELOPE, serialized);
    setVaultSessionKey(deviceKey);
    localStorage.removeItem("mc-encryption-key");
  } else {
    let deviceKey: string;
    try {
      const envelope = parseEnvelope(saved);
      const key = await wrappingKey(passphrase, decode(envelope.salt));
      const data = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(envelope.iv) as BufferSource, additionalData: new TextEncoder().encode(ENVELOPE) }, key, decode(envelope.data) as BufferSource);
      deviceKey = new TextDecoder().decode(data);
    } catch { throw new Error("Incorrect passphrase or damaged vault. No records were changed."); }
    setVaultSessionKey(deviceKey);
    if (!localStorage.getItem(ENVELOPE)) localStorage.setItem(ENVELOPE, saved);
    if (!(await db.vaultMeta.get(META_ID))) await db.vaultMeta.put({ id: META_ID, envelope: saved });
    localStorage.removeItem("mc-encryption-key");
  }
  // Deliberately non-destructive: the pre-upgrade database remains intact as a recovery copy.
  await migrateLegacyFamilyRecords();
}
export function lockPrivateVault() { setVaultSessionKey(null); }

async function asEncryptedRow(record: FamilyRecord): Promise<EncryptedFamilyRecordRow> {
  validateFamilyRecord(record);
  return { id: record.id, payload: await encrypt(JSON.stringify(record)) };
}

export async function saveFamilyRecord(record: FamilyRecord, expectedPayload?: string) {
  if (!vaultSessionActive()) throw new Error("Unlock your private vault first.");
  const next = await asEncryptedRow(record);
  await db.transaction("rw", db.familyRecords, async () => {
    const previous = await db.familyRecords.get(record.id);
    if (expectedPayload !== undefined && previous?.payload !== expectedPayload) throw new Error("This record was edited elsewhere. Reload before saving; your draft was not overwritten.");
    await db.familyRecords.put(next);
  });
}
export async function addFamilyRecords(records: FamilyRecord[]) {
  if (!vaultSessionActive()) throw new Error("Unlock your private vault first.");
  records.forEach(validateFamilyRecord);
  const stored = await Promise.all(records.map(async record => {
    const id = crypto.randomUUID();
    return asEncryptedRow({ ...record, id });
  }));
  await db.transaction("rw", db.familyRecords, () => db.familyRecords.bulkAdd(stored));
}
export async function editFamilyRecords(ids: string[], patch: FamilyPatch) {
  if (!vaultSessionActive()) throw new Error("Unlock your private vault first.");
  const unique = [...new Set(ids)];
  const saved = await db.familyRecords.bulkGet(unique);
  if (saved.some(record => !record)) throw new Error("A selected record is no longer available. Refresh before editing.");
  const updated = await Promise.all(saved.map(async record => {
    if (!record) throw new Error("Record unavailable.");
    return asEncryptedRow(applyFamilyPatch(JSON.parse(await decrypt(record.payload)), patch));
  }));
  await db.transaction("rw", db.familyRecords, async () => {
    const current = await db.familyRecords.bulkGet(unique);
    if (current.some((record, i) => record?.payload !== saved[i]?.payload)) throw new Error("Records changed in another tab. Refresh before editing.");
    await db.familyRecords.bulkPut(updated);
  });
}
export async function deleteFamilyRecords(ids: string[]) {
  // Fail closed while locked, including bulk operations.
  if (!vaultSessionActive()) throw new Error("Unlock your private vault first.");
  await db.transaction("rw", db.familyRecords, () => db.familyRecords.bulkDelete([...new Set(ids)]));
}
export async function readFamilyRecords(): Promise<FamilyRecord[]> {
  if (!vaultSessionActive()) throw new Error("Unlock your private vault first.");
  return Promise.all((await db.familyRecords.toArray()).map(async row => {
    const record = JSON.parse(await decrypt(row.payload)) as FamilyRecord;
    if (record.id !== row.id) throw new Error("Vault record mismatch. The encrypted row was not changed.");
    return record;
  }));
}
export async function familyRecordCiphertext(id: string) {
  return (await db.familyRecords.get(id))?.payload;
}
export async function exportPrivateVault(credentials: unknown[]) {
  const envelope = await readEnvelope();
  if (!envelope || !vaultSessionActive()) throw new Error("Protect and unlock the vault first.");
  return JSON.stringify({ format: "mc-private-backup-v1", envelope: parseEnvelope(envelope), payload: await encrypt(JSON.stringify({ credentials, family: await db.familyRecords.toArray() })) });
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
