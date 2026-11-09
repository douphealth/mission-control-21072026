// Per-device sync/backup status, stored in a synced settings row so every
// device can see when the others last synced.
import { db, type UserSettings } from "@/lib/db";

export const DEVICE_ROW_ID = "devices";
const DEVICE_KEY = "mc-cloud-device-v2";
const LAST_BACKUP_KEY = "mc-last-encrypted-backup";
const MIN_WRITE_GAP = 10 * 60_000;

export type DeviceEntry = { label: string; lastSyncAt?: string; lastBackupAt?: string; seenAt: string };
export type DeviceMap = Record<string, DeviceEntry>;

export function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, id); }
    return id;
  } catch { return "this-device"; }
}

export function deviceLabel(ua = typeof navigator === "undefined" ? "" : navigator.userAgent): string {
  const os = /iPad|Tablet/i.test(ua) ? "Tablet" : /iPhone|Android.*Mobile/i.test(ua) ? "Phone" : /Android/i.test(ua) ? "Tablet" : /Mac/i.test(ua) ? "Mac" : /Windows/i.test(ua) ? "Windows PC" : /Linux/i.test(ua) ? "Linux PC" : "Device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return `${os} · ${browser}`;
}

export function lastLocalBackup(): string | null { try { return localStorage.getItem(LAST_BACKUP_KEY); } catch { return null; } }

/** Only write when something meaningful changed, to avoid sync loops. */
export function shouldWrite(prev: DeviceEntry | undefined, next: Partial<DeviceEntry>, now = Date.now()): boolean {
  if (!prev) return true;
  if (next.lastBackupAt && next.lastBackupAt !== prev.lastBackupAt) return true;
  if (!next.lastSyncAt) return false;
  return !prev.lastSyncAt || now - Date.parse(prev.lastSyncAt) >= MIN_WRITE_GAP;
}

export async function recordDevice(next: Partial<DeviceEntry>): Promise<void> {
  const row = await db.settings.get(DEVICE_ROW_ID);
  const devices: DeviceMap = { ...(row?.deviceStatus ?? {}) };
  const id = deviceId();
  if (!shouldWrite(devices[id], next)) return;
  devices[id] = { ...devices[id], label: devices[id]?.label || deviceLabel(), ...next, seenAt: new Date().toISOString() };
  await db.settings.put({ id: DEVICE_ROW_ID, deviceStatus: devices } as UserSettings);
}

export async function recordLocalBackup(): Promise<void> {
  const at = new Date().toISOString();
  try { localStorage.setItem(LAST_BACKUP_KEY, at); } catch { /* ignore */ }
  await recordDevice({ lastBackupAt: at }).catch(() => undefined);
}
