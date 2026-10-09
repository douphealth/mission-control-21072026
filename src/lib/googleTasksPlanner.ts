// Decides what a Google Tasks sync pass must do. Pure: no network, no database, no clock.
// Everything the pass needs is passed in, and everything it wants done comes back as actions,
// so every case below is covered by a unit test.
//
// How "who changed what" is known: each linked task remembers a fingerprint of its content
// (title, notes, due date, done-ness) the last time both sides agreed. Comparing today's
// fingerprint on each side with that one says which side changed, or both.

import { contentHash } from "@/lib/googleSyncState";

// ─── Inputs ──────────────────────────────────────────────────────────────────

export interface PlannerLocalTask {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: "todo" | "in-progress" | "blocked" | "done";
  deletedAt?: string;
  archived?: boolean;
  updatedAt?: string;
  createdAt?: string;
  completedAt?: string;
  /** Last day the task was worked on (YYYY-MM-DD). The only edit clock tasks had before `updatedAt`. */
  touchedAt?: string;
  gtaskId?: string;
  gtaskListId?: string;
  gtaskUpdated?: string;
  gtaskHash?: string;
}

export interface PlannerRemoteTask {
  listId: string;
  id: string;
  title: string;
  notes: string;
  /** YYYY-MM-DD, or "" when Google has no due date. */
  due: string;
  done: boolean;
  /** Google's `updated` stamp (ISO). */
  updated: string;
  deleted: boolean;
}

export interface PlannerTombstone {
  key: string;
  listId?: string;
  gtaskId?: string;
  taskId: string;
}

export interface PlannerInput {
  locals: PlannerLocalTask[];
  remotes: PlannerRemoteTask[];
  /** Lists whose full contents were fetched. A task absent from a list only counts as deleted if its list is here. */
  completeLists: ReadonlySet<string>;
  /** The list that holds tasks created in Mission Control. */
  defaultListId: string;
  /** List a task was linked to before lists were recorded on tasks. */
  legacyListId?: string;
  tombstones: PlannerTombstone[];
  /** Finished Google tasks last updated before this (ISO) are history, not imported. */
  importCompletedSince: string;
  /** Now, as ISO. Used for completion stamps so the planner stays deterministic. */
  now: string;
}

// ─── Content ─────────────────────────────────────────────────────────────────

export interface Content {
  title: string;
  notes: string;
  due: string;
  done: boolean;
}

export function localContent(task: PlannerLocalTask): Content {
  return {
    title: (task.title || "").trim(),
    notes: (task.description || "").trim(),
    due: task.dueDate || "",
    done: task.status === "done",
  };
}

export function remoteContent(remote: PlannerRemoteTask): Content {
  return {
    title: (remote.title || "").trim(),
    notes: (remote.notes || "").trim(),
    due: remote.due || "",
    done: remote.done,
  };
}

export function hashContent(content: Content): string {
  return contentHash(JSON.stringify([content.title, content.notes, content.due, content.done]));
}

/** The request body for Google. Nulls are sent on purpose: they clear a field, an omitted field does not. */
export interface GoogleTaskBody {
  title: string;
  notes: string;
  due: string | null;
  status: "completed" | "needsAction";
  /** Reopening a finished task needs its completion time cleared too. */
  completed?: null;
}

export function toGoogleBody(content: Content): GoogleTaskBody {
  return {
    title: content.title,
    notes: content.notes,
    due: content.due ? `${content.due}T00:00:00.000Z` : null,
    status: content.done ? "completed" : "needsAction",
    ...(content.done ? {} : { completed: null }),
  };
}

export interface LocalPatch {
  title?: string;
  description?: string;
  dueDate?: string;
  status?: "todo" | "done";
  completedAt?: string | undefined;
  /** Clearing a deadline: an undated task belongs in the inbox until it is planned. */
  inbox?: boolean;
}

/** What to change on the local task so it matches Google. Only fields that actually differ. */
export function patchFromRemote(
  local: PlannerLocalTask,
  remote: PlannerRemoteTask,
  now: string,
): LocalPatch {
  const patch: LocalPatch = {};
  const remoteTitle = (remote.title || "").trim();
  if (remoteTitle && remoteTitle !== (local.title || "").trim()) patch.title = remoteTitle;
  if ((remote.notes || "").trim() !== (local.description || "").trim())
    patch.description = remote.notes || "";
  if ((remote.due || "") !== (local.dueDate || "")) {
    patch.dueDate = remote.due || "";
    if (!remote.due) patch.inbox = true;
  }
  const localDone = local.status === "done";
  if (remote.done !== localDone) {
    patch.status = remote.done ? "done" : "todo";
    patch.completedAt = remote.done ? now : undefined;
  }
  return patch;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export type SyncAction =
  | { kind: "createRemote"; localId: string; listId: string; body: GoogleTaskBody; hash: string }
  | {
      kind: "updateRemote";
      localId: string;
      listId: string;
      remoteId: string;
      body: GoogleTaskBody;
      hash: string;
    }
  | {
      kind: "deleteRemote";
      localId?: string;
      listId?: string;
      remoteId: string;
      tombstoneKey?: string;
    }
  | { kind: "createLocal"; remote: PlannerRemoteTask }
  | {
      kind: "updateLocal";
      localId: string;
      patch: LocalPatch;
      remote: PlannerRemoteTask;
      hash: string;
    }
  | {
      kind: "softDeleteLocal";
      localId: string;
      reason: "deleted-in-google" | "missing-in-google" | "duplicate";
    }
  /** The Google side of a trashed task is gone. Forget the link so a restore creates it afresh. */
  | { kind: "unlink"; localId: string }
  | { kind: "stamp"; localId: string; remote: PlannerRemoteTask; hash: string }
  | { kind: "link"; localId: string; remote: PlannerRemoteTask; hash: string }
  | { kind: "dropTombstone"; tombstoneKey: string };

export interface SyncPlan {
  actions: SyncAction[];
}

const fingerprint = (title: string, due: string) =>
  `${title.trim().toLowerCase().replace(/\s+/g, " ")}|${due}`;
const keyOf = (listId: string, id: string) => `${listId}:${id}`;
const time = (iso?: string) => (iso ? Date.parse(iso) || 0 : 0);

// ─── The plan ────────────────────────────────────────────────────────────────

export function planGoogleTasksSync(input: PlannerInput): SyncPlan {
  const actions: SyncAction[] = [];
  const remoteByKey = new Map<string, PlannerRemoteTask>();
  const remotesById = new Map<string, PlannerRemoteTask[]>();
  for (const remote of input.remotes) {
    remoteByKey.set(keyOf(remote.listId, remote.id), remote);
    remotesById.set(remote.id, [...(remotesById.get(remote.id) ?? []), remote]);
  }

  /** Where a linked task lives in Google. Older links did not record the list. */
  const resolveListId = (task: PlannerLocalTask): string | undefined => {
    if (task.gtaskListId) return task.gtaskListId;
    if (input.legacyListId && remoteByKey.has(keyOf(input.legacyListId, task.gtaskId!)))
      return input.legacyListId;
    const matches = remotesById.get(task.gtaskId!) ?? [];
    return matches.length === 1 ? matches[0].listId : input.legacyListId;
  };

  const claimed = new Set<string>(); // remote keys that a local task already owns
  const unlinked: PlannerLocalTask[] = [];

  // Two devices can each import the same Google task before they meet. Keep the oldest copy (every
  // device picks the same one) and send the others to Trash with their link removed.
  const duplicates = new Set<string>();
  const ownersByKey = new Map<string, PlannerLocalTask[]>();
  for (const task of input.locals) {
    if (!task.gtaskId || task.deletedAt) continue;
    const listId = resolveListId(task);
    if (!listId) continue;
    const key = keyOf(listId, task.gtaskId);
    ownersByKey.set(key, [...(ownersByKey.get(key) ?? []), task]);
  }
  for (const owners of ownersByKey.values()) {
    if (owners.length < 2) continue;
    const ordered = [...owners].sort(
      (a, b) => (a.createdAt || "").localeCompare(b.createdAt || "") || a.id.localeCompare(b.id),
    );
    for (const extra of ordered.slice(1)) {
      duplicates.add(extra.id);
      actions.push({ kind: "softDeleteLocal", localId: extra.id, reason: "duplicate" });
    }
  }

  for (const task of input.locals) {
    if (duplicates.has(task.id)) continue;
    if (!task.gtaskId) {
      if (!task.deletedAt) unlinked.push(task);
      continue;
    }

    const listId = resolveListId(task);
    const key = listId ? keyOf(listId, task.gtaskId) : undefined;
    if (key) claimed.add(key);
    const remote = key ? remoteByKey.get(key) : undefined;

    // The user deleted it here: delete it in Google too. Once Google no longer has it, drop the link
    // so restoring it from Trash later creates a fresh copy instead of being undone as "gone".
    if (task.deletedAt) {
      if (remote && !remote.deleted) {
        actions.push({ kind: "deleteRemote", localId: task.id, listId, remoteId: task.gtaskId });
      } else if (remote?.deleted || (listId && input.completeLists.has(listId))) {
        actions.push({ kind: "unlink", localId: task.id });
      }
      continue;
    }

    if (!remote) {
      // Gone from Google. Only believe that when its whole list was read successfully.
      if (listId && input.completeLists.has(listId)) {
        actions.push({ kind: "softDeleteLocal", localId: task.id, reason: "missing-in-google" });
      }
      continue;
    }

    // Deleted in Google: deleted here too (recoverable from Trash).
    if (remote.deleted) {
      actions.push({ kind: "softDeleteLocal", localId: task.id, reason: "deleted-in-google" });
      continue;
    }

    const localSide = localContent(task);
    const remoteSide = remoteContent(remote);
    const localHash = hashContent(localSide);
    const remoteHash = hashContent(remoteSide);

    if (localHash === remoteHash) {
      // Already the same. Refresh the bookkeeping if it is stale, so the next pass sees no change.
      if (
        task.gtaskHash !== localHash ||
        task.gtaskUpdated !== remote.updated ||
        task.gtaskListId !== remote.listId
      ) {
        actions.push({ kind: "stamp", localId: task.id, remote, hash: localHash });
      }
      continue;
    }

    const base = task.gtaskHash;
    let winner: "local" | "remote";
    if (base) {
      const localChanged = localHash !== base;
      const remoteChanged = remoteHash !== base;
      if (localChanged && !remoteChanged) winner = "local";
      else if (remoteChanged && !localChanged) winner = "remote";
      else winner = time(task.updatedAt) > time(remote.updated) ? "local" : "remote"; // both changed: latest edit wins
    } else {
      // Linked by the older sync, before fingerprints existed: nothing says who changed. Anything
      // typed here must not be silently overwritten, so the local copy wins unless Google was
      // edited after the task was last touched here. The day-level `touchedAt` counts to the end
      // of its day, which errs toward keeping local work.
      const touchedEnd = task.touchedAt ? time(`${task.touchedAt}T23:59:59.999Z`) : 0;
      const localStamp = Math.max(time(task.updatedAt), touchedEnd);
      winner = localStamp > time(remote.updated) ? "local" : "remote";
    }

    if (winner === "local") {
      actions.push({
        kind: "updateRemote",
        localId: task.id,
        listId: remote.listId,
        remoteId: remote.id,
        body: toGoogleBody(localSide),
        hash: localHash,
      });
    } else {
      actions.push({
        kind: "updateLocal",
        localId: task.id,
        patch: patchFromRemote(task, remote, input.now),
        remote,
        hash: remoteHash,
      });
    }
  }

  // Tombstones: permanent deletes Google may not know about yet.
  const tombstoned = new Set<string>();
  for (const tombstone of input.tombstones) {
    const listIds = tombstone.listId ? [tombstone.listId] : [...input.completeLists];
    const remotes = tombstone.gtaskId
      ? listIds
          .map((id) => remoteByKey.get(keyOf(id, tombstone.gtaskId!)))
          .filter((r): r is PlannerRemoteTask => !!r)
      : [];
    if (!tombstone.gtaskId) continue; // calendar-only tombstones belong to the calendar mirror
    const live = remotes.filter((remote) => !remote.deleted);
    if (live.length === 0) {
      // Already gone from Google. Nothing left to do but forget it.
      if (!tombstone.listId || input.completeLists.has(tombstone.listId)) {
        actions.push({ kind: "dropTombstone", tombstoneKey: tombstone.key });
      }
      continue;
    }
    for (const remote of live) {
      tombstoned.add(keyOf(remote.listId, remote.id));
      actions.push({
        kind: "deleteRemote",
        listId: remote.listId,
        remoteId: remote.id,
        tombstoneKey: tombstone.key,
      });
    }
  }

  // Google tasks no local task owns.
  const orphans = input.remotes.filter(
    (remote) =>
      !remote.deleted &&
      !claimed.has(keyOf(remote.listId, remote.id)) &&
      !tombstoned.has(keyOf(remote.listId, remote.id)),
  );

  // Before creating anything, pair up identical tasks that were never linked (same title and due
  // date, exactly one on each side), so a second device or a restore never duplicates a task.
  const orphansByPrint = new Map<string, PlannerRemoteTask[]>();
  for (const remote of orphans) {
    const print = fingerprint(remote.title, remote.due);
    orphansByPrint.set(print, [...(orphansByPrint.get(print) ?? []), remote]);
  }
  const unlinkedByPrint = new Map<string, PlannerLocalTask[]>();
  for (const task of unlinked) {
    const print = fingerprint(task.title, task.dueDate || "");
    unlinkedByPrint.set(print, [...(unlinkedByPrint.get(print) ?? []), task]);
  }

  const linkedNow = new Set<string>();
  for (const task of unlinked) {
    const print = fingerprint(task.title, task.dueDate || "");
    const sameRemote = orphansByPrint.get(print) ?? [];
    const sameLocal = unlinkedByPrint.get(print) ?? [];
    if (sameRemote.length === 1 && sameLocal.length === 1) {
      const remote = sameRemote[0];
      linkedNow.add(keyOf(remote.listId, remote.id));
      // The base is Google's version, so any difference in the local copy is treated as a local edit.
      actions.push({
        kind: "link",
        localId: task.id,
        remote,
        hash: hashContent(remoteContent(remote)),
      });
      continue;
    }
    if (task.archived || !(task.title || "").trim()) continue; // parked or empty tasks are not pushed
    if (task.status === "done") {
      const finished = task.completedAt || task.updatedAt || task.createdAt;
      if (time(finished) < time(input.importCompletedSince)) continue; // old finished tasks stay local
    }
    const content = localContent(task);
    actions.push({
      kind: "createRemote",
      localId: task.id,
      listId: input.defaultListId,
      body: toGoogleBody(content),
      hash: hashContent(content),
    });
  }

  for (const remote of orphans) {
    if (linkedNow.has(keyOf(remote.listId, remote.id))) continue;
    if (!(remote.title || "").trim()) continue; // an empty Google task is not worth importing
    if (remote.done && time(remote.updated) < time(input.importCompletedSince)) continue; // old history
    actions.push({ kind: "createLocal", remote });
  }

  return { actions };
}

/** Counts, for the summary line and for the mass-delete guard. */
export function countActions(plan: SyncPlan): Record<SyncAction["kind"], number> {
  const counts = {
    createRemote: 0,
    updateRemote: 0,
    deleteRemote: 0,
    createLocal: 0,
    updateLocal: 0,
    softDeleteLocal: 0,
    unlink: 0,
    stamp: 0,
    link: 0,
    dropTombstone: 0,
  } as Record<SyncAction["kind"], number>;
  for (const action of plan.actions) counts[action.kind] += 1;
  return counts;
}

/**
 * A guard against deleting a lot because Google returned a lot less than usual (a permissions
 * problem or a partial response looks exactly like "everything was deleted"). Deleting many
 * linked tasks at once is held back, never done silently.
 */
export function isSuspiciousMassDelete(deletions: number, linkedTasks: number): boolean {
  return deletions >= 10 && deletions >= linkedTasks * 0.6;
}
