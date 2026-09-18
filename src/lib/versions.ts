// ─── Mission Control Versions ─────────────────────────────────────────────────
// Local snapshot/version system for standalone operation.
// - Auto snapshots (debounced after edits + every 15 min if dirty)
// - Manual named snapshots ("Save version")
// - One-click restore (always takes a safety snapshot first)
// - Portable: snapshots can be exported and imported between devices

import { db } from "./db";
import { deduplicateAll } from "./dedup";

export const SNAPSHOTS_TABLE = "mc_snapshots";
const LOCAL_FALLBACK_KEY = "mc-snapshots-local-v1";
const DEVICE_KEY = "mc-device-label";
const AUTO_KEEP = 30; // keep last N auto snapshots
const AUTO_DEBOUNCE_MS = 60_000; // 1 min after last edit
const AUTO_INTERVAL_MS = 15 * 60_000; // safety net every 15 min

export interface SnapshotMeta {
  id: string;
  name: string;
  type: "auto" | "manual" | "safety";
  createdAt: string;
  device: string;
  counts: Record<string, number>;
  sizeBytes: number;
}

export interface Snapshot extends SnapshotMeta {
  payload: Record<string, any[]>;
  settings?: any;
}

// ─── Device label ─────────────────────────────────────────────────────────────

export function getDeviceLabel(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const ua = navigator.userAgent;
    let kind = "Device";
    if (/iPhone|iPad|iPod/i.test(ua)) kind = "iOS";
    else if (/Android/i.test(ua)) kind = "Android";
    else if (/Mac/i.test(ua)) kind = "Mac";
    else if (/Windows/i.test(ua)) kind = "Windows";
    else if (/Linux/i.test(ua)) kind = "Linux";
    const label = `${kind} · ${Math.random().toString(36).slice(2, 6)}`;
    localStorage.setItem(DEVICE_KEY, label);
    return label;
  } catch {
    return "Device";
  }
}

export function setDeviceLabel(label: string) {
  try {
    localStorage.setItem(DEVICE_KEY, label.trim() || "Device");
  } catch {
    /* ignore */
  }
}

// ─── Snapshot capture ─────────────────────────────────────────────────────────

const TABLES = [
  "websites",
  "tasks",
  "repos",
  "buildProjects",
  "links",
  "notes",
  "payments",
  "ideas",
  "credentials",
  "customModules",
  "habits",
] as const;

async function captureLocal(): Promise<{
  payload: Record<string, any[]>;
  settings: any;
  counts: Record<string, number>;
}> {
  const payload: Record<string, any[]> = {};
  const counts: Record<string, number> = {};
  for (const t of TABLES) {
    const arr = await (db as any)[t].toArray();
    payload[t] = arr;
    counts[t] = arr.length;
  }
  const settings = await db.settings.get("default");
  return { payload, settings, counts };
}

// ─── Local fallback storage ───────────────────────────────────────────────────

function readLocal(): Snapshot[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_FALLBACK_KEY) || "[]");
  } catch {
    return [];
  }
}
function writeLocal(list: Snapshot[]) {
  try {
    localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function resetVersionsCache() {
  // Kept for compatibility with older callers.
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function listVersions(): Promise<SnapshotMeta[]> {
  return readLocal()
    .map(stripPayload)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function stripPayload(s: Snapshot): SnapshotMeta {
  const { payload: _p, settings: _s, ...meta } = s;
  return meta;
}

export async function saveVersion(
  opts: { name?: string; type?: SnapshotMeta["type"] } = {},
): Promise<SnapshotMeta> {
  const { payload, settings, counts } = await captureLocal();
  const totalItems = Object.values(counts).reduce((a, b) => a + b, 0);
  const createdAt = new Date().toISOString();
  const id = `snap_${createdAt.replace(/[^0-9]/g, "").slice(0, 14)}_${Math.random().toString(36).slice(2, 8)}`;
  const json = JSON.stringify(payload);
  const snap: Snapshot = {
    id,
    name: opts.name?.trim() || defaultName(opts.type ?? "manual", totalItems),
    type: opts.type ?? "manual",
    createdAt,
    device: getDeviceLabel(),
    counts,
    sizeBytes: json.length,
    payload,
    settings,
  };

  const list = readLocal();
  list.unshift(snap);
  writeLocal(list);

  await pruneAuto();
  return stripPayload(snap);
}

function defaultName(type: SnapshotMeta["type"], total: number): string {
  const d = new Date();
  const stamp = d.toLocaleString();
  if (type === "auto") return `Auto · ${stamp}`;
  if (type === "safety") return `Safety · before restore · ${stamp}`;
  return `Manual · ${stamp} · ${total} items`;
}

async function pruneAuto() {
  const all = await listVersions();
  const autos = all.filter((s) => s.type === "auto");
  if (autos.length <= AUTO_KEEP) return;
  const toDelete = autos.slice(AUTO_KEEP);
  for (const v of toDelete) await deleteVersion(v.id);
}

async function fetchFullSnapshot(id: string): Promise<Snapshot | null> {
  return readLocal().find((s) => s.id === id) ?? null;
}

export async function deleteVersion(id: string): Promise<void> {
  writeLocal(readLocal().filter((s) => s.id !== id));
}

export async function renameVersion(id: string, name: string): Promise<void> {
  const snap = await fetchFullSnapshot(id);
  if (!snap) return;
  snap.name = name.trim() || snap.name;
  const list = readLocal().map((s) => (s.id === id ? snap : s));
  writeLocal(list);
}

export async function restoreVersion(
  id: string,
  opts: { safety?: boolean } = {},
): Promise<{ restored: number }> {
  const snap = await fetchFullSnapshot(id);
  if (!snap) throw new Error("Version not found");

  // Always keep both: capture current state as a "safety" snapshot first
  if (opts.safety !== false) {
    try {
      await saveVersion({ type: "safety" });
    } catch (e) {
      console.warn("Safety snapshot failed", e);
    }
  }

  // Replace local data table-by-table (atomic per table)
  let restored = 0;
  for (const t of TABLES) {
    const rows = snap.payload[t] || [];
    await (db as any)[t].clear();
    if (rows.length) await (db as any)[t].bulkPut(rows);
    restored += rows.length;
  }
  if (snap.settings) {
    await db.settings.put({ ...snap.settings, id: "default" });
  }
  await deduplicateAll();
  return { restored };
}

export async function restoreLatestNonEmptyVersion(): Promise<{
  restored: number;
  versionId?: string;
}> {
  const versions = await listVersions();
  const candidate = versions.find((version) =>
    Object.values(version.counts || {}).some((count) => Number(count) > 0),
  );

  if (!candidate) return { restored: 0 };

  const result = await restoreVersion(candidate.id, { safety: false });
  return { restored: result.restored, versionId: candidate.id };
}

export function downloadVersionFile(meta: SnapshotMeta) {
  return fetchFullSnapshot(meta.id).then((snap) => {
    if (!snap) return;
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${snap.name.replace(/[^a-z0-9]+/gi, "-")}.mcversion.json`;
    a.click();
  });
}

export async function importVersionFile(file: File): Promise<SnapshotMeta> {
  const text = await file.text();
  const snap = JSON.parse(text) as Snapshot;
  if (!snap.payload) throw new Error("Not a valid version file");
  snap.id = `snap_imported_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  snap.createdAt = new Date().toISOString();
  snap.type = "manual";
  snap.name = snap.name ? `Imported · ${snap.name}` : `Imported · ${snap.createdAt}`;
  const list = readLocal();
  list.unshift(snap);
  writeLocal(list);
  return stripPayload(snap);
}

// ─── Auto-snapshot loop ───────────────────────────────────────────────────────

let dirty = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let intervalTimer: ReturnType<typeof setInterval> | null = null;

export function markDirty() {
  dirty = true;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (!dirty) return;
    dirty = false;
    saveVersion({ type: "auto" }).catch((e) => console.warn("Auto snapshot failed", e));
  }, AUTO_DEBOUNCE_MS);
}

let visHandler: (() => void) | null = null;
function startTick() {
  if (intervalTimer) return;
  intervalTimer = setInterval(() => {
    if (!dirty) return;
    dirty = false;
    saveVersion({ type: "auto" }).catch((e) => console.warn("Auto snapshot failed", e));
  }, AUTO_INTERVAL_MS);
}
function stopTick() {
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
  }
}

export function startAutoSnapshots() {
  if (typeof document === "undefined" || !document.hidden) startTick();
  if (!visHandler && typeof document !== "undefined") {
    visHandler = () => {
      if (document.hidden) stopTick();
      else startTick();
    };
    document.addEventListener("visibilitychange", visHandler);
  }
}

export function stopAutoSnapshots() {
  stopTick();
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (visHandler && typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", visHandler);
    visHandler = null;
  }
}

export const SNAPSHOTS_SCHEMA_SQL = `
-- Optional: snapshot/version history for Mission Control
CREATE TABLE IF NOT EXISTS mc_snapshots (data jsonb, id text PRIMARY KEY);
ALTER TABLE mc_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_mc" ON mc_snapshots;
CREATE POLICY "allow_all_mc" ON mc_snapshots FOR ALL USING (true) WITH CHECK (true);
`;
