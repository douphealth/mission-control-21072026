// One entry point for keeping tasks in step with Google Tasks and Google Calendar.
//
//   requestGoogleSync()      run a pass now (or after the one in progress)
//   startGoogleAutoSync()    run passes by themselves: soon after an edit, when the app opens or
//                            regains focus, when the network returns, and every couple of minutes
//
// Passes never overlap. A request that arrives mid-pass makes one more pass afterwards, so an edit
// made while syncing is never skipped.

import { isGCalConnected } from "@/lib/googleCalendar";
import { isSignedIn, signedInEmail } from "@/lib/googleTasks";
import { syncGoogleTasks, type GoogleTasksSyncResult } from "@/lib/googleTasksSync";
import { syncTaskCalendarMirror, type CalendarMirrorResult } from "@/lib/taskCalendarMirror";
import {
  EMPTY_COUNTS,
  getGoogleSyncStatus,
  onTaskMutation,
  setGoogleSyncStatus,
} from "@/lib/googleSyncState";

const EDIT_DEBOUNCE_MS = 1500;
const POLL_MS = 2 * 60_000;
const FOCUS_MIN_GAP_MS = 20_000;
const MAX_PASSES_PER_REQUEST = 3;

interface RequestOptions {
  reason?: string;
  /** Apply deletions that were held back as suspicious. Only an explicit user action sets this. */
  confirmDeletions?: boolean;
}

let inFlight: Promise<void> | null = null;
let again = false;
let pendingOptions: RequestOptions = {};
let lastFinishedAt = 0;

function isAuthProblem(message: string): boolean {
  return /session expired|not connected|sign in again|reconnect|401/i.test(message);
}

async function onePass(options: RequestOptions): Promise<void> {
  const tasksReady = isSignedIn();
  const calendarReady = isGCalConnected();

  if (!tasksReady && !calendarReady) {
    // Never connected on this device, or the one-hour sign-in ran out.
    const wasConnected = !!signedInEmail();
    setGoogleSyncStatus({
      state: wasConnected ? "reconnect" : "disconnected",
      lastError: wasConnected ? "Google sign-in expired. Reconnect to keep syncing." : null,
    });
    return;
  }

  setGoogleSyncStatus({ state: "syncing" });
  let tasks: GoogleTasksSyncResult | null = null;
  let calendar: CalendarMirrorResult | null = null;
  let firstError: string | undefined;

  if (tasksReady) {
    try {
      tasks = await syncGoogleTasks({ confirmDeletions: options.confirmDeletions });
      if (tasks?.firstError) firstError ??= tasks.firstError;
    } catch (error) {
      firstError ??= error instanceof Error ? error.message : String(error);
    }
  }

  // The calendar half runs even if Google Tasks failed: they are independent services.
  if (calendarReady) {
    try {
      calendar = await syncTaskCalendarMirror();
      if (calendar.firstError) firstError ??= calendar.firstError;
    } catch (error) {
      firstError ??= error instanceof Error ? error.message : String(error);
    }
  }

  const failed = !!firstError;
  setGoogleSyncStatus({
    state: failed ? (isAuthProblem(firstError!) ? "reconnect" : "error") : "idle",
    lastSyncAt: failed ? getGoogleSyncStatus().lastSyncAt : new Date().toISOString(),
    lastError: firstError ?? null,
    heldDeletions: tasks?.held ?? 0,
    lastCounts: {
      ...EMPTY_COUNTS,
      tasksPushed: tasks?.pushed ?? 0,
      tasksPulled: tasks?.pulled ?? 0,
      tasksImported: tasks?.imported ?? 0,
      tasksDeleted: tasks?.deleted ?? 0,
      eventsPushed: calendar?.written ?? 0,
      eventsPulled: 0,
    },
  });
}

/** Run a sync pass now, or right after the one already running. Resolves when the work is done. */
export function requestGoogleSync(options: RequestOptions = {}): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  pendingOptions = {
    ...pendingOptions,
    ...options,
    confirmDeletions: pendingOptions.confirmDeletions || options.confirmDeletions,
  };
  if (inFlight) {
    again = true;
    return inFlight;
  }
  inFlight = (async () => {
    try {
      for (let pass = 0; pass < MAX_PASSES_PER_REQUEST; pass++) {
        again = false;
        const options = pendingOptions;
        pendingOptions = {};
        await onePass(options);
        if (!again) break;
      }
    } catch (error) {
      setGoogleSyncStatus({
        state: "error",
        lastError: error instanceof Error ? error.message : String(error),
      });
    } finally {
      lastFinishedAt = Date.now();
      inFlight = null;
    }
  })();
  return inFlight;
}

let autoStop: (() => void) | null = null;

/** Start background syncing. Safe to call more than once; returns a function that stops it. */
export function startGoogleAutoSync(): () => void {
  if (typeof window === "undefined") return () => {};
  if (autoStop) return autoStop;

  let editTimer: ReturnType<typeof setTimeout> | undefined;
  const afterEdit = () => {
    if (editTimer) clearTimeout(editTimer);
    editTimer = setTimeout(() => void requestGoogleSync({ reason: "edit" }), EDIT_DEBOUNCE_MS);
  };

  const unsubscribe = onTaskMutation(afterEdit);
  const onVisible = () => {
    if (document.visibilityState !== "visible") return;
    if (Date.now() - lastFinishedAt < FOCUS_MIN_GAP_MS) return;
    void requestGoogleSync({ reason: "focus" });
  };
  const onOnline = () => void requestGoogleSync({ reason: "online" });
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onVisible);
  window.addEventListener("online", onOnline);

  const poll = setInterval(() => {
    if (document.visibilityState === "visible") void requestGoogleSync({ reason: "timer" });
  }, POLL_MS);
  const first = setTimeout(() => void requestGoogleSync({ reason: "start" }), 2000);

  autoStop = () => {
    unsubscribe();
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("focus", onVisible);
    window.removeEventListener("online", onOnline);
    clearInterval(poll);
    clearTimeout(first);
    if (editTimer) clearTimeout(editTimer);
    autoStop = null;
  };
  return autoStop;
}
