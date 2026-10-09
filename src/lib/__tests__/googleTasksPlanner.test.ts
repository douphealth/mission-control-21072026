import { describe, expect, it } from "vitest";
import {
  countActions,
  hashContent,
  isSuspiciousMassDelete,
  localContent,
  patchFromRemote,
  planGoogleTasksSync,
  remoteContent,
  toGoogleBody,
  type PlannerInput,
  type PlannerLocalTask,
  type PlannerRemoteTask,
  type SyncAction,
} from "@/lib/googleTasksPlanner";

const NOW = "2026-10-09T10:00:00.000Z";
const LIST = "list-main";

function local(over: Partial<PlannerLocalTask> = {}): PlannerLocalTask {
  return { id: "t1", title: "Write report", dueDate: "2026-10-12", status: "todo", ...over };
}
function remote(over: Partial<PlannerRemoteTask> = {}): PlannerRemoteTask {
  return {
    listId: LIST,
    id: "g1",
    title: "Write report",
    notes: "",
    due: "2026-10-12",
    done: false,
    updated: "2026-10-09T09:00:00.000Z",
    deleted: false,
    ...over,
  };
}
/** A task that both sides agreed on at some earlier time. */
function linked(over: Partial<PlannerLocalTask> = {}, remoteOver: Partial<PlannerRemoteTask> = {}) {
  const agreed = remote(remoteOver);
  const task = local({
    gtaskId: agreed.id,
    gtaskListId: agreed.listId,
    gtaskUpdated: agreed.updated,
    gtaskHash: hashContent(remoteContent(agreed)),
    ...over,
  });
  return { task, agreed };
}

function plan(over: Partial<PlannerInput>) {
  return planGoogleTasksSync({
    locals: [],
    remotes: [],
    completeLists: new Set([LIST]),
    defaultListId: LIST,
    tombstones: [],
    importCompletedSince: "2026-09-09T00:00:00.000Z",
    now: NOW,
    ...over,
  }).actions;
}
const kinds = (actions: SyncAction[]) => actions.map((a) => a.kind);

describe("nothing to do", () => {
  it("emits no actions when both sides already agree and the bookkeeping is current", () => {
    const { task, agreed } = linked();
    expect(plan({ locals: [task], remotes: [agreed] })).toEqual([]);
  });

  it("only refreshes stale bookkeeping when content is identical", () => {
    const { task, agreed } = linked({ gtaskHash: "stale000" });
    expect(kinds(plan({ locals: [task], remotes: [agreed] }))).toEqual(["stamp"]);
  });
});

describe("edits", () => {
  it("pushes a local edit to Google", () => {
    const { task, agreed } = linked({ title: "Write the annual report" });
    const actions = plan({ locals: [task], remotes: [agreed] });
    expect(kinds(actions)).toEqual(["updateRemote"]);
    const action = actions[0] as Extract<SyncAction, { kind: "updateRemote" }>;
    expect(action.body.title).toBe("Write the annual report");
    expect(action.remoteId).toBe("g1");
  });

  it("pulls an edit made in Google", () => {
    const { task, agreed } = linked({}, {});
    const edited = { ...agreed, title: "Write report v2", updated: "2026-10-09T09:30:00.000Z" };
    const actions = plan({ locals: [task], remotes: [edited] });
    expect(kinds(actions)).toEqual(["updateLocal"]);
    expect((actions[0] as Extract<SyncAction, { kind: "updateLocal" }>).patch.title).toBe(
      "Write report v2",
    );
  });

  it("pushes a new due date, and a new start of notes, to Google", () => {
    const { task, agreed } = linked({ dueDate: "2026-10-20", description: "Draft first" });
    const action = plan({ locals: [task], remotes: [agreed] })[0] as Extract<
      SyncAction,
      { kind: "updateRemote" }
    >;
    expect(action.body.due).toBe("2026-10-20T00:00:00.000Z");
    expect(action.body.notes).toBe("Draft first");
  });

  it("pulls a due date moved in Google", () => {
    const { task, agreed } = linked();
    const moved = { ...agreed, due: "2026-10-30", updated: "2026-10-09T09:40:00.000Z" };
    const action = plan({ locals: [task], remotes: [moved] })[0] as Extract<
      SyncAction,
      { kind: "updateLocal" }
    >;
    expect(action.patch.dueDate).toBe("2026-10-30");
  });

  it("when both sides changed, the later edit wins (local later)", () => {
    const { task, agreed } = linked({
      title: "Local title",
      updatedAt: "2026-10-09T09:50:00.000Z",
    });
    const edited = { ...agreed, title: "Google title", updated: "2026-10-09T09:20:00.000Z" };
    expect(kinds(plan({ locals: [task], remotes: [edited] }))).toEqual(["updateRemote"]);
  });

  it("when both sides changed, the later edit wins (Google later)", () => {
    const { task, agreed } = linked({
      title: "Local title",
      updatedAt: "2026-10-09T09:10:00.000Z",
    });
    const edited = { ...agreed, title: "Google title", updated: "2026-10-09T09:55:00.000Z" };
    expect(kinds(plan({ locals: [task], remotes: [edited] }))).toEqual(["updateLocal"]);
  });
});

describe("tasks linked by the older sync (no stored baseline)", () => {
  const legacy = (
    over: Partial<PlannerLocalTask> = {},
    remoteOver: Partial<PlannerRemoteTask> = {},
  ) => ({
    task: local({ gtaskId: "g1", gtaskListId: LIST, ...over }),
    google: remote(remoteOver),
  });

  it("keeps a local edit made after Google last changed", () => {
    const { task, google } = legacy(
      { title: "Edited here", touchedAt: "2026-10-09" },
      { updated: "2026-10-05T08:00:00.000Z" },
    );
    expect(kinds(plan({ locals: [task], remotes: [google] }))).toEqual(["updateRemote"]);
  });

  it("takes Google's edit when it is newer than anything done here", () => {
    const { task, google } = legacy(
      { title: "Old title", touchedAt: "2026-10-01" },
      { title: "Newer in Google", updated: "2026-10-07T08:00:00.000Z" },
    );
    expect(kinds(plan({ locals: [task], remotes: [google] }))).toEqual(["updateLocal"]);
  });

  it("with no record of when it was edited here, Google's stamp decides only if later than updatedAt", () => {
    const { task, google } = legacy(
      { title: "Local", updatedAt: "2026-10-09T09:55:00.000Z" },
      { updated: "2026-10-09T09:00:00.000Z" },
    );
    expect(kinds(plan({ locals: [task], remotes: [google] }))).toEqual(["updateRemote"]);
  });

  it("counts a same-day edit as local, because the day is only known to the day", () => {
    const { task, google } = legacy(
      { title: "Edited here", touchedAt: "2026-10-09" },
      { updated: "2026-10-09T22:00:00.000Z" },
    );
    expect(kinds(plan({ locals: [task], remotes: [google] }))).toEqual(["updateRemote"]);
  });
});

describe("completion", () => {
  it("completing here completes it in Google", () => {
    const { task, agreed } = linked({ status: "done" });
    const action = plan({ locals: [task], remotes: [agreed] })[0] as Extract<
      SyncAction,
      { kind: "updateRemote" }
    >;
    expect(action.body.status).toBe("completed");
  });

  it("reopening here clears the completed time in Google", () => {
    const { task, agreed } = linked({ status: "todo" }, { done: true });
    const action = plan({ locals: [task], remotes: [agreed] })[0] as Extract<
      SyncAction,
      { kind: "updateRemote" }
    >;
    expect(action.body.status).toBe("needsAction");
    expect(action.body).toHaveProperty("completed", null);
  });

  it("completing in Google completes it here", () => {
    const { task, agreed } = linked();
    const done = { ...agreed, done: true, updated: "2026-10-09T09:45:00.000Z" };
    const action = plan({ locals: [task], remotes: [done] })[0] as Extract<
      SyncAction,
      { kind: "updateLocal" }
    >;
    expect(action.patch.status).toBe("done");
    expect(action.patch.completedAt).toBe(NOW);
  });
});

describe("deleting", () => {
  it("deleting here (Trash) deletes it in Google", () => {
    const { task, agreed } = linked({ deletedAt: NOW });
    const actions = plan({ locals: [task], remotes: [agreed] });
    expect(kinds(actions)).toEqual(["deleteRemote"]);
    expect(actions[0]).toMatchObject({ remoteId: "g1", listId: LIST, localId: "t1" });
  });

  it("does not delete again, and forgets the link, once Google no longer has it", () => {
    const { task } = linked({ deletedAt: NOW });
    expect(kinds(plan({ locals: [task], remotes: [] }))).toEqual(["unlink"]);
    expect(kinds(plan({ locals: [task], remotes: [remote({ deleted: true })] }))).toEqual([
      "unlink",
    ]);
  });

  it("does not guess about a trashed task when its list could not be read", () => {
    const { task } = linked({ deletedAt: NOW });
    expect(plan({ locals: [task], remotes: [], completeLists: new Set() })).toEqual([]);
  });

  it("deleting in Google moves it to Trash here", () => {
    const { task, agreed } = linked();
    const actions = plan({ locals: [task], remotes: [{ ...agreed, deleted: true }] });
    expect(actions).toEqual([
      { kind: "softDeleteLocal", localId: "t1", reason: "deleted-in-google" },
    ]);
  });

  it("a task missing from a fully read list was deleted in Google", () => {
    const { task } = linked();
    expect(plan({ locals: [task], remotes: [] })).toEqual([
      { kind: "softDeleteLocal", localId: "t1", reason: "missing-in-google" },
    ]);
  });

  it("never treats a task as deleted when its list was not fully read", () => {
    const { task } = linked();
    expect(
      plan({ locals: [task], remotes: [], completeLists: new Set(["some-other-list"]) }),
    ).toEqual([]);
  });

  it("a permanently deleted task is still deleted in Google through its tombstone", () => {
    const actions = plan({
      locals: [],
      remotes: [remote()],
      tombstones: [{ key: `${LIST}:g1`, taskId: "t1", listId: LIST, gtaskId: "g1" }],
    });
    // It must be deleted in Google, and must not come back as a new local task.
    expect(kinds(actions)).toEqual(["deleteRemote"]);
    expect(actions[0]).toMatchObject({ remoteId: "g1", tombstoneKey: `${LIST}:g1` });
  });

  it("drops a tombstone once Google no longer has the task", () => {
    const actions = plan({
      remotes: [],
      tombstones: [{ key: `${LIST}:g1`, taskId: "t1", listId: LIST, gtaskId: "g1" }],
    });
    expect(actions).toEqual([{ kind: "dropTombstone", tombstoneKey: `${LIST}:g1` }]);
  });

  it("keeps the tombstone when its list could not be read", () => {
    const actions = plan({
      remotes: [],
      completeLists: new Set(),
      tombstones: [{ key: `${LIST}:g1`, taskId: "t1", listId: LIST, gtaskId: "g1" }],
    });
    expect(actions).toEqual([]);
  });

  it("a task restored from Trash after Google forgot it is created afresh", () => {
    const { task } = linked();
    const unlinkedTask = {
      ...task,
      gtaskId: undefined,
      gtaskListId: undefined,
      gtaskHash: undefined,
      gtaskUpdated: undefined,
    };
    expect(kinds(plan({ locals: [unlinkedTask], remotes: [] }))).toEqual(["createRemote"]);
  });
});

describe("new tasks", () => {
  it("creates a Google task for a new local task, in the default list", () => {
    const actions = plan({ locals: [local()], remotes: [] });
    expect(kinds(actions)).toEqual(["createRemote"]);
    expect(actions[0]).toMatchObject({ listId: LIST, localId: "t1" });
  });

  it("imports a task created in Google", () => {
    const actions = plan({ locals: [], remotes: [remote()] });
    expect(actions).toEqual([{ kind: "createLocal", remote: remote() }]);
  });

  it("imports from every list, not only the default one", () => {
    const other = remote({ listId: "list-other", id: "g9", title: "Call dentist" });
    const actions = plan({
      locals: [],
      remotes: [remote(), other],
      completeLists: new Set([LIST, "list-other"]),
    });
    expect(kinds(actions)).toEqual(["createLocal", "createLocal"]);
  });

  it("does not import an empty Google task, a deleted one, or old finished history", () => {
    const actions = plan({
      remotes: [
        remote({ id: "a", title: "  " }),
        remote({ id: "b", deleted: true }),
        remote({ id: "c", title: "Old", done: true, updated: "2025-01-01T00:00:00.000Z" }),
      ],
    });
    expect(actions).toEqual([]);
  });

  it("imports recently finished tasks", () => {
    const actions = plan({
      remotes: [remote({ done: true, updated: "2026-10-08T00:00:00.000Z" })],
    });
    expect(kinds(actions)).toEqual(["createLocal"]);
  });

  it("does not push parked, empty, or long-finished local tasks", () => {
    const actions = plan({
      locals: [
        local({ id: "a", archived: true }),
        local({ id: "b", title: " " }),
        local({ id: "c", status: "done", completedAt: "2025-02-01T00:00:00.000Z" }),
      ],
    });
    expect(actions).toEqual([]);
  });

  it("pushes recently finished local tasks", () => {
    const actions = plan({
      locals: [local({ status: "done", completedAt: "2026-10-08T00:00:00.000Z" })],
    });
    expect(kinds(actions)).toEqual(["createRemote"]);
  });
});

describe("never duplicating", () => {
  it("pairs an unlinked local task with the identical Google task instead of creating twice", () => {
    const actions = plan({ locals: [local()], remotes: [remote()] });
    expect(kinds(actions)).toEqual(["link"]);
  });

  it("does not guess when several tasks share a title and date", () => {
    const actions = plan({
      locals: [local({ id: "a" }), local({ id: "b" })],
      remotes: [remote({ id: "g1" }), remote({ id: "g2" })],
    });
    expect(countActions({ actions })).toMatchObject({ link: 0, createRemote: 2, createLocal: 2 });
  });

  it("keeps the oldest copy when two devices both imported the same Google task", () => {
    const first = local({
      id: "a",
      gtaskId: "g1",
      gtaskListId: LIST,
      createdAt: "2026-10-01T00:00:00.000Z",
    });
    const second = local({
      id: "b",
      gtaskId: "g1",
      gtaskListId: LIST,
      createdAt: "2026-10-02T00:00:00.000Z",
    });
    const actions = plan({ locals: [second, first], remotes: [remote()] });
    expect(actions).toContainEqual({ kind: "softDeleteLocal", localId: "b", reason: "duplicate" });
    expect(actions.filter((a) => a.kind === "softDeleteLocal")).toHaveLength(1);
  });

  it("finds a task linked before lists were recorded, through the legacy list", () => {
    const oldLink = local({ gtaskId: "g1", gtaskHash: hashContent(remoteContent(remote())) });
    const actions = plan({ locals: [oldLink], remotes: [remote()], legacyListId: LIST });
    expect(kinds(actions)).toEqual(["stamp"]);
  });
});

describe("conversion", () => {
  it("clears a due date in Google with an explicit null", () => {
    expect(toGoogleBody({ title: "x", notes: "", due: "", done: false }).due).toBeNull();
  });

  it("round-trips content through a hash", () => {
    const a = localContent(local());
    const b = remoteContent(remote());
    expect(hashContent(a)).toBe(hashContent(b));
    expect(hashContent({ ...a, title: "other" })).not.toBe(hashContent(b));
  });

  it("an undated Google task becomes an inbox item, not a task due today", () => {
    const patch = patchFromRemote(local(), remote({ due: "" }), NOW);
    expect(patch).toMatchObject({ dueDate: "", inbox: true });
  });
});

describe("mass-delete guard", () => {
  it("holds back a large share of deletions", () => {
    expect(isSuspiciousMassDelete(40, 50)).toBe(true);
    expect(isSuspiciousMassDelete(12, 12)).toBe(true);
  });
  it("lets ordinary deletions through", () => {
    expect(isSuspiciousMassDelete(3, 50)).toBe(false);
    expect(isSuspiciousMassDelete(10, 400)).toBe(false);
  });
});
