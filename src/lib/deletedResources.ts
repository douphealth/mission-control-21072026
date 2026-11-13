/**
 * Device-local list of GitHub repositories / Cloudflare projects the owner
 * deleted from this app. Hides them at once from every list (including the
 * dated catalog and saved plans) without touching saved records. A mark is
 * dropped automatically when fresh provider data newer than the delete shows
 * the same name again (it was recreated).
 */
import { useSyncExternalStore } from "react";

const KEY = "mc.deleted-resources.v1";
type Marks = Record<string, number>;
/** Providers can list a just-deleted item for a few minutes; ignore that echo. */
const RECREATED_AFTER_MS = 15 * 60_000;
const listeners = new Set<() => void>();
let marks: Marks | null = null;

function read(): Marks {
  if (marks) return marks;
  try {
    const raw = JSON.parse(globalThis.localStorage?.getItem(KEY) || "{}");
    marks = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Marks) : {};
  } catch {
    marks = {};
  }
  return marks;
}
function write(next: Marks) {
  marks = next;
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
  } catch {
    /* convenience only */
  }
  listeners.forEach((listener) => listener());
}

export const deletedKey = (key: string) => key.toLowerCase();

export function markDeleted(key: string, at = Date.now()) {
  write({ ...read(), [deletedKey(key)]: at });
}

/** Clears marks for keys seen again in provider data fetched after the delete. */
export function reconcileDeleted(presentKeys: Iterable<string>, fetchedAt: number) {
  const current = read();
  let changed = false;
  const next = { ...current };
  for (const key of presentKeys) {
    const k = deletedKey(key);
    if (next[k] && fetchedAt > next[k] + RECREATED_AFTER_MS) {
      delete next[k];
      changed = true;
    }
  }
  if (changed) write(next);
}

export function filterDeleted<T extends { key: string }>(rows: T[], current: Marks = read()): T[] {
  if (!Object.keys(current).length) return rows;
  return rows.filter((row) => !current[deletedKey(row.key)]);
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const EMPTY: Marks = {};
/** React binding: re-renders when something is deleted. */
export function useDeletedMarks(): Marks {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function resetDeletedForTests() {
  marks = null;
}
