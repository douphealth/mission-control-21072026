/**
 * List of GitHub repositories / Cloudflare projects the owner deleted from
 * this app (only after the provider confirmed the delete). Hides them at once
 * from every list (including the dated catalog and saved plans) without
 * touching saved records.
 *
 * State = `marks` (key -> deletedAt) + `cleared` (key -> clearedAt). A key is
 * hidden while its mark is newer than its clear. Both maps merge across
 * devices by keeping the newest time per key, so every device converges on the
 * same answer and a cleared mark is never resurrected by an older copy. A mark
 * is cleared when provider data fetched 15+ minutes after the delete shows the
 * same name again (it was recreated).
 */
import { useSyncExternalStore } from "react";

const MARKS_KEY = "mc.deleted-resources.v1"; // unchanged legacy format: key -> deletedAt
const CLEARED_KEY = "mc.deleted-resources.cleared.v1";
type Marks = Record<string, number>;
export type DeletedState = { marks: Marks; cleared: Marks };
/** Providers can list a just-deleted item for a few minutes; ignore that echo. */
const RECREATED_AFTER_MS = 15 * 60_000;
/** Entries older than this are dropped from storage and sync. */
const KEEP_MS = 180 * 24 * 60 * 60_000;
const listeners = new Set<() => void>();
let state: DeletedState | null = null;
let active: Marks = {};

function clean(raw: unknown): Marks {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Marks = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>))
    if (typeof v === "number" && Number.isFinite(v) && v > 0 && k.length <= 260)
      out[k.toLowerCase()] = v;
  return out;
}
function load(key: string): Marks {
  try {
    return clean(JSON.parse(globalThis.localStorage?.getItem(key) || "{}"));
  } catch {
    return {};
  }
}
function computeActive(s: DeletedState): Marks {
  const out: Marks = {};
  for (const [k, at] of Object.entries(s.marks)) if (at > (s.cleared[k] || 0)) out[k] = at;
  return out;
}
function read(): DeletedState {
  if (!state) {
    state = { marks: load(MARKS_KEY), cleared: load(CLEARED_KEY) };
    active = computeActive(state);
  }
  return state;
}
function write(next: DeletedState) {
  state = next;
  active = computeActive(next);
  try {
    globalThis.localStorage?.setItem(MARKS_KEY, JSON.stringify(next.marks));
    globalThis.localStorage?.setItem(CLEARED_KEY, JSON.stringify(next.cleared));
  } catch {
    /* convenience only */
  }
  listeners.forEach((listener) => listener());
}

export const deletedKey = (key: string) => key.toLowerCase();

/** Call only after the provider confirmed the delete. */
export function markDeleted(key: string, at = Date.now()) {
  const s = read();
  const k = deletedKey(key);
  write({ marks: { ...s.marks, [k]: Math.max(at, s.marks[k] || 0) }, cleared: s.cleared });
}

/** Clears marks for keys seen again in provider data fetched 15+ minutes after the delete. */
export function reconcileDeleted(presentKeys: Iterable<string>, fetchedAt: number) {
  const s = read();
  let cleared: Marks | null = null;
  for (const key of presentKeys) {
    const k = deletedKey(key);
    const at = s.marks[k];
    if (at && at > (s.cleared[k] || 0) && fetchedAt > at + RECREATED_AFTER_MS) {
      cleared = cleared || { ...s.cleared };
      cleared[k] = fetchedAt;
    }
  }
  if (cleared) write({ marks: s.marks, cleared });
}

export function filterDeleted<T extends { key: string }>(
  rows: T[],
  current: Marks = (read(), active),
): T[] {
  if (!Object.keys(current).length) return rows;
  return rows.filter((row) => !current[deletedKey(row.key)]);
}

const newest = (a: Marks, b: Marks): Marks => {
  const out: Marks = { ...a };
  for (const [k, v] of Object.entries(b)) if (v > (out[k] || 0)) out[k] = v;
  return out;
};
const prune = (m: Marks, now: number): Marks =>
  Object.fromEntries(Object.entries(m).filter(([, at]) => now - at < KEEP_MS));
const same = (a: Marks, b: Marks) => {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
};

/** Pure merge used for cross-device sync: newest time per key wins in both maps. */
export function mergeDeletedStates(
  a: DeletedState,
  b: DeletedState,
  now = Date.now(),
): DeletedState {
  return {
    marks: prune(newest(a.marks, b.marks), now),
    cleared: prune(newest(a.cleared, b.cleared), now),
  };
}
export function sameDeletedState(a: DeletedState, b: DeletedState) {
  return same(a.marks, b.marks) && same(a.cleared, b.cleared);
}

/** Merges another device's copy into this device. Returns the merged state. */
export function applyRemoteDeleted(remote: unknown, now = Date.now()): DeletedState {
  const r = remote && typeof remote === "object" ? (remote as Partial<DeletedState>) : {};
  const local = read();
  const merged = mergeDeletedStates(
    local,
    { marks: clean(r.marks), cleared: clean(r.cleared) },
    now,
  );
  if (!sameDeletedState(merged, local)) write(merged);
  return merged;
}
export function getDeletedState(): DeletedState {
  return read();
}
export function onDeletedChange(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getActive = () => (read(), active);
const EMPTY: Marks = {};
/** React binding: re-renders when something is deleted (only currently hidden keys). */
export function useDeletedMarks(): Marks {
  return useSyncExternalStore(onDeletedChange, getActive, () => EMPTY);
}

export function resetDeletedForTests() {
  state = null;
  active = {};
}
