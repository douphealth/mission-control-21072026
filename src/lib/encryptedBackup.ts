// Passphrase-encrypted full-app backups (PBKDF2-SHA256 + AES-GCM).
// Format is versioned so older backups always stay readable.

export const BACKUP_FORMAT = "mission-control-encrypted-backup";
const ITERATIONS = 250_000;

export const BACKUP_TABLES = [
  "websites", "seoProfiles", "seoSnapshots", "seoQueryObservations", "seoIssues", "seoActions",
  "seoChanges", "seoVisibilityChecks", "tasks", "repos", "buildProjects", "links", "notes",
  "payments", "ideas", "credentials", "customModules", "habits",
] as const;

export type BackupEnvelope = { format: typeof BACKUP_FORMAT; version: 1; createdAt: string; iterations: number; salt: string; iv: string; data: string };
export type BackupPreviewRow = { table: string; inBackup: number; current: number };
export type BackupPreview = { createdAt: string | null; rows: BackupPreviewRow[]; total: number; problems: string[]; hasSettings: boolean };

const b64 = (bytes: Uint8Array) => { let s = ""; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); };
const unb64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function encryptBackup(json: string, passphrase: string): Promise<string> {
  if (passphrase.length < 8) throw new Error("Use a backup passphrase of at least 8 characters.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, ITERATIONS);
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(json)));
  const envelope: BackupEnvelope = { format: BACKUP_FORMAT, version: 1, createdAt: new Date().toISOString(), iterations: ITERATIONS, salt: b64(salt), iv: b64(iv), data: b64(data) };
  return JSON.stringify(envelope);
}

export function parseEnvelope(text: string): BackupEnvelope {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error("This file is not a Mission Control backup."); }
  const e = parsed as Partial<BackupEnvelope>;
  if (!e || e.format !== BACKUP_FORMAT || e.version !== 1 || !e.salt || !e.iv || !e.data) throw new Error("This file is not an encrypted Mission Control backup.");
  if (!Number.isInteger(e.iterations) || (e.iterations as number) < 100_000 || (e.iterations as number) > 5_000_000) throw new Error("Backup settings are invalid.");
  return e as BackupEnvelope;
}

export async function decryptBackup(text: string, passphrase: string): Promise<{ json: string; createdAt: string }> {
  const e = parseEnvelope(text);
  const key = await deriveKey(passphrase, unb64(e.salt), e.iterations);
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(e.iv) as BufferSource }, key, unb64(e.data) as BufferSource);
    return { json: new TextDecoder().decode(plain), createdAt: e.createdAt };
  } catch { throw new Error("Wrong passphrase, or the backup file is damaged."); }
}

/** Validates every table without touching data and compares with current counts. */
export function previewBackup(json: string, current: Record<string, number>): BackupPreview {
  const problems: string[] = [];
  let data: Record<string, unknown>;
  try { data = JSON.parse(json); } catch { return { createdAt: null, rows: [], total: 0, problems: ["Backup content is not readable."], hasSettings: false }; }
  const rows: BackupPreviewRow[] = [];
  for (const table of BACKUP_TABLES) {
    const list = data[table];
    if (list == null) continue;
    if (!Array.isArray(list)) { problems.push(`${table} is not a list`); continue; }
    const bad = list.findIndex(r => !r || typeof r !== "object" || typeof (r as { id?: unknown }).id !== "string" || !(r as { id: string }).id);
    if (bad !== -1) problems.push(`${table} row ${bad + 1} has no valid id`);
    rows.push({ table, inBackup: list.length, current: current[table] ?? 0 });
  }
  if (!rows.length) problems.push("No Mission Control data found in the backup.");
  const meta = data._meta as { exportedAt?: string } | undefined;
  return { createdAt: meta?.exportedAt ?? null, rows, total: rows.reduce((n, r) => n + r.inBackup, 0), problems, hasSettings: !!data.settings };
}
