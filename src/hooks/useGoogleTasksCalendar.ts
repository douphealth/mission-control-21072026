/**
 * Google Tasks → Calendar bridge.
 * Fetches the user's task lists, lets them pick which ones to include,
 * and exposes the tasks (with due dates) as CalEvent-shaped objects.
 */
import { useCallback, useEffect, useState } from "react";
import {
  isSignedIn,
  signIn,
  signOut,
  listTaskLists,
  listTasks,
  type GTaskList,
  type GTask,
} from "@/lib/googleTasks";

const SELECTED_KEY = "gtasks_calendar_selected_lists_v1";
const SHOW_DONE_KEY = "gtasks_calendar_show_completed_v1";

function readSelected(): string[] | null {
  try {
    const raw = localStorage.getItem(SELECTED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeSelected(ids: string[]) {
  localStorage.setItem(SELECTED_KEY, JSON.stringify(ids));
}

export interface GTaskCalEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  notes?: string;
  listId: string;
  listTitle: string;
  done: boolean;
}

export function useGoogleTasksCalendar() {
  const [signed, setSigned] = useState<boolean>(() => isSignedIn());
  const [lists, setLists] = useState<GTaskList[]>([]);
  const [selected, setSelected] = useState<string[]>(() => readSelected() || []);
  const [showCompleted, setShowCompleted] = useState<boolean>(
    () => localStorage.getItem(SHOW_DONE_KEY) === "1",
  );
  const [tasksByList, setTasksByList] = useState<Record<string, GTask[]>>({});
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSignedIn()) {
      setSigned(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const ls = await listTaskLists();
      setLists(ls);
      // Default: all lists selected on first run.
      let selIds = readSelected();
      if (selIds === null) {
        selIds = ls.map((l) => l.id);
        writeSelected(selIds);
        setSelected(selIds);
      }
      const activeIds = selIds.filter((id) => ls.some((l) => l.id === id));
      const results = await Promise.all(
        activeIds.map((id) =>
          listTasks(id, showCompleted)
            .then((t) => [id, t] as const)
            .catch(() => [id, [] as GTask[]] as const),
        ),
      );
      const map: Record<string, GTask[]> = {};
      for (const [id, t] of results) map[id] = t;
      setTasksByList(map);
      setLastSync(new Date().toISOString());
    } catch (e: any) {
      setError(e?.message || "Failed to load Google Tasks");
      if (/session expired|Not signed in/i.test(e?.message || "")) setSigned(false);
    } finally {
      setLoading(false);
    }
  }, [showCompleted]);

  useEffect(() => {
    if (signed) refresh();
  }, [signed, refresh]);

  const doSignIn = useCallback(async () => {
    try {
      await signIn();
      setSigned(true);
    } catch (e: any) {
      setError(e?.message || "Sign-in failed");
      throw e;
    }
  }, []);

  const doSignOut = useCallback(() => {
    signOut();
    setSigned(false);
    setLists([]);
    setTasksByList({});
  }, []);

  const toggleList = useCallback((id: string) => {
    setSelected((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      writeSelected(next);
      return next;
    });
  }, []);

  const setShowCompletedPersisted = useCallback((v: boolean) => {
    localStorage.setItem(SHOW_DONE_KEY, v ? "1" : "0");
    setShowCompleted(v);
  }, []);

  // Build CalEvent-shaped objects (date only — Google Tasks 'due' is date-only).
  const events: GTaskCalEvent[] = [];
  for (const list of lists) {
    if (!selected.includes(list.id)) continue;
    const items = tasksByList[list.id] || [];
    for (const t of items) {
      if (!t.due) continue;
      // Google returns RFC3339 like 2026-05-21T00:00:00.000Z — take date part.
      const date = t.due.slice(0, 10);
      events.push({
        id: `gtask-${list.id}-${t.id}`,
        title: t.title || "(untitled)",
        date,
        notes: t.notes,
        listId: list.id,
        listTitle: list.title,
        done: t.status === "completed",
      });
    }
  }

  return {
    signed,
    lists,
    selected,
    showCompleted,
    loading,
    lastSync,
    error,
    events,
    refresh,
    signIn: doSignIn,
    signOut: doSignOut,
    toggleList,
    setShowCompleted: setShowCompletedPersisted,
  };
}
