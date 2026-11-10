import Dexie, { type Table } from "dexie";
import { decrypt, encrypt, generateStrongKey, setVaultSessionKey } from "./encryption";
import { applyFamilyPatch, validateFamilyRecord, type FamilyPatch } from "./familyBulk";

export const VAULT_IDLE_MS = 5 * 60 * 1000;
const ENVELOPE = "mc-private-vault-envelope-v1";
type Envelope = { version: 1; salt: string; iv: string; data: string };
export type FamilyRecord = { id: string; member: string; category: string; label: string; value: string; notes: string };
/** All metadata and Markdown stay inside the encrypted payload; only opaque IDs are indexed. */
export type FamilyMarkdownNote = { id: string; title: string; member: string; markdown: string; createdAt: string; updatedAt: string };
export const FAMILY_MARKDOWN_MAX_BYTES = 1024 * 1024;
export function validateFamilyMarkdownNote(note: FamilyMarkdownNote) {
  if (!note || typeof note.id !== "string" || !/^[a-zA-Z0-9-]{8,128}$/.test(note.id)) throw new Error("Invalid private note ID.");
  if (typeof note.title !== "string" || !note.title.trim() || note.title.length > 160) throw new Error("Enter a note title (up to 160 characters).");
  if (typeof note.member !== "string" || note.member.length > 160 || typeof note.markdown !== "string") throw new Error("Invalid family note.");
  if (!Number.isFinite(Date.parse(note.createdAt)) || !Number.isFinite(Date.parse(note.updatedAt))) throw new Error("Invalid note dates.");
  if (new TextEncoder().encode(note.markdown).byteLength > FAMILY_MARKDOWN_MAX_BYTES) throw new Error("Markdown notes must be smaller than 1 MB.");
}
type StoredFamilyRecord = { id: string; payload: string };
class FamilyDatabase extends Dexie {
  records!: Table<StoredFamilyRecord, string>;
  documents!: Table<StoredFamilyRecord, string>;
  constructor() {
    super("MissionControlPrivateFamily");
    this.version(1).stores({ records: "id" });
    // Add a separate encrypted notebook without changing any existing family record.
    this.version(2).stores({ records: "id", documents: "id" });
  }
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
/**
 * Compare the encrypted row before writing, so another tab cannot silently replace a newer note.
 * expectedUpdatedAt=null means this is a new document and must not overwrite one.
 */
export async function saveFamilyMarkdownNote(note: FamilyMarkdownNote, expectedUpdatedAt?: string | null) {
  validateFamilyMarkdownNote(note);
  const previous = await familyDb.documents.get(note.id);
  if (expectedUpdatedAt !== undefined) {
    if (expectedUpdatedAt === null && previous) throw new Error("This note already exists. Refresh before saving.");
    if (expectedUpdatedAt !== null && (!previous || (JSON.parse(await decrypt(previous.payload)) as FamilyMarkdownNote).updatedAt !== expectedUpdatedAt))
      throw new Error("This note changed in another tab. Copy your changes and reload before editing.");
  }
  const payload = await encrypt(JSON.stringify(note));
  await familyDb.transaction("rw", familyDb.documents, async () => {
    const latest = await familyDb.documents.get(note.id);
    if (latest?.payload !== previous?.payload) throw new Error("This note changed in another tab. Your draft was not overwritten.");
    await familyDb.documents.put({ id: note.id, payload });
  });
}
export async function readFamilyMarkdownNotes(): Promise<FamilyMarkdownNote[]> {
  const records = await familyDb.documents.toArray();
  return Promise.all(records.map(async ({ payload }) => {
    const note = JSON.parse(await decrypt(payload)) as FamilyMarkdownNote;
    validateFamilyMarkdownNote(note);
    return note;
  }));
}
export async function deleteFamilyMarkdownNote(id: string, expectedUpdatedAt: string) {
  // Require an unlocked session, and preserve any changes made in another tab.
  await encrypt("family-markdown-delete");
  const previous = await familyDb.documents.get(id);
  if (!previous) throw new Error("Note no longer exists. Refresh first.");
  if ((JSON.parse(await decrypt(previous.payload)) as FamilyMarkdownNote).updatedAt !== expectedUpdatedAt)
    throw new Error("This note was updated in another tab. Refresh before deleting.");
  await familyDb.transaction("rw", familyDb.documents, async () => {
    const latest = await familyDb.documents.get(id);
    if (latest?.payload !== previous.payload) throw new Error("Note changed in another tab.");
    await familyDb.documents.delete(id);
  });
}
export async function exportPrivateVault(credentials: unknown[]) {
  const envelope = localStorage.getItem(ENVELOPE);
  if (!envelope) throw new Error("Protect and unlock the vault first.");
  // Encrypt the complete inventory, including legacy metadata and plaintext rows.
  return JSON.stringify({ format: "mc-private-backup-v1", envelope: JSON.parse(envelope), payload: await encrypt(JSON.stringify({ credentials, family: await familyDb.records.toArray(), familyMarkdown: await familyDb.documents.toArray() })) });
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