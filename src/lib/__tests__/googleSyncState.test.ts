import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addTombstone,
  clearTombstonePart,
  contentHash,
  isUserEdit,
  onTaskMutation,
  readTombstones,
  removeTombstones,
} from "@/lib/googleSyncState";
import { installTaskChangeHooks } from "@/lib/taskChangeHooks";

// A minimal localStorage, since the unit tests run in plain Node.
function stubStorage() {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  });
}

beforeEach(() => stubStorage());

describe("what counts as an edit", () => {
  it("treats sync bookkeeping as not an edit", () => {
    expect(
      isUserEdit([
        "gtaskId",
        "gtaskHash",
        "gtaskUpdated",
        "gtaskListId",
        "gcalEventId",
        "gcalHash",
        "touchedAt",
      ]),
    ).toBe(false);
  });
  it("treats any real field as an edit", () => {
    expect(isUserEdit(["gtaskHash", "title"])).toBe(true);
    expect(isUserEdit(["dueDate"])).toBe(true);
    expect(isUserEdit(["deletedAt"])).toBe(true);
    expect(isUserEdit(["status"])).toBe(true);
  });
});

describe("tombstones", () => {
  it("records a permanent delete and forgets it once both parts are cleared", () => {
    addTombstone({ taskId: "t1", listId: "L", gtaskId: "g1", eventId: "mc1" });
    expect(readTombstones()).toHaveLength(1);
    expect(readTombstones()[0].key).toBe("L:g1");

    clearTombstonePart("L:g1", "gtask");
    expect(readTombstones()).toHaveLength(1); // the calendar event is still pending
    expect(readTombstones()[0].gtaskId).toBeUndefined();
    expect(readTombstones()[0].eventId).toBe("mc1");

    clearTombstonePart("L:g1", "event");
    expect(readTombstones()).toHaveLength(0);
  });

  it("keeps a calendar-only tombstone under its own key", () => {
    addTombstone({ taskId: "t2", eventId: "mc2" });
    expect(readTombstones()[0].key).toBe("event:mc2");
    clearTombstonePart("event:mc2", "event");
    expect(readTombstones()).toHaveLength(0);
  });

  it("does not duplicate the same delete recorded twice", () => {
    addTombstone({ taskId: "t1", listId: "L", gtaskId: "g1" });
    addTombstone({ taskId: "t1", listId: "L", gtaskId: "g1" });
    expect(readTombstones()).toHaveLength(1);
  });

  it("removes by key", () => {
    addTombstone({ taskId: "t1", listId: "L", gtaskId: "g1" });
    removeTombstones(["L:g1"]);
    expect(readTombstones()).toHaveLength(0);
  });

  it("survives unreadable storage", () => {
    localStorage.setItem("mc_google_tombstones_v1", "{not json");
    expect(readTombstones()).toEqual([]);
  });
});

describe("content fingerprint", () => {
  it("is stable and sensitive", () => {
    expect(contentHash("a")).toBe(contentHash("a"));
    expect(contentHash("a")).not.toBe(contentHash("b"));
    expect(contentHash("anything")).toMatch(/^[0-9a-f]{8}$/);
  });
});

// ─── The database hooks ──────────────────────────────────────────────────────

type Hook = (...args: any[]) => any;
function recordingTable() {
  const hooks: Record<string, Hook> = {};
  return { table: { hook: (name: string, fn: Hook) => void (hooks[name] = fn) } as never, hooks };
}
function fakeTransaction() {
  const listeners: Record<string, (() => void)[]> = {};
  return {
    on: (event: string, fn: () => void) =>
      void (listeners[event] = [...(listeners[event] ?? []), fn]),
    commit: () => (listeners.complete ?? []).forEach((fn) => fn()),
  };
}

describe("task change hooks", () => {
  it("stamps updatedAt on a real edit and signals a sync after commit", () => {
    const { table, hooks } = recordingTable();
    installTaskChangeHooks(table);
    const seen = vi.fn();
    const off = onTaskMutation(seen);
    const tx = fakeTransaction();

    const result = hooks.updating({ title: "New" }, "id1", {}, tx);
    expect(result).toEqual({ updatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) });
    expect(seen).not.toHaveBeenCalled(); // not before the write is committed
    tx.commit();
    expect(seen).toHaveBeenCalledTimes(1);
    off();
  });

  it("does NOT treat the engine's own bookkeeping as an edit (this is what prevents a sync loop)", () => {
    const { table, hooks } = recordingTable();
    installTaskChangeHooks(table);
    const seen = vi.fn();
    const off = onTaskMutation(seen);
    const tx = fakeTransaction();

    const result = hooks.updating(
      { gtaskId: "g1", gtaskHash: "abc", touchedAt: "2026-10-09" },
      "id1",
      {},
      tx,
    );
    tx.commit();
    expect(result).toBeUndefined();
    expect(seen).not.toHaveBeenCalled();
    off();
  });

  it("keeps a timestamp that arrives with the change (a record from another device)", () => {
    const { table, hooks } = recordingTable();
    installTaskChangeHooks(table);
    const tx = fakeTransaction();
    const result = hooks.updating(
      { title: "From B", updatedAt: "2026-10-01T00:00:00.000Z" },
      "id1",
      {},
      tx,
    );
    expect(result).toBeUndefined();
  });

  it("signals once per transaction however many rows it touches", () => {
    const { table, hooks } = recordingTable();
    installTaskChangeHooks(table);
    const seen = vi.fn();
    const off = onTaskMutation(seen);
    const tx = fakeTransaction();
    for (let i = 0; i < 50; i++) hooks.updating({ title: `t${i}` }, `id${i}`, {}, tx);
    tx.commit();
    expect(seen).toHaveBeenCalledTimes(1);
    off();
  });

  it("stamps new tasks", () => {
    const { table, hooks } = recordingTable();
    installTaskChangeHooks(table);
    const task: Record<string, unknown> = { id: "n1", title: "New" };
    hooks.creating("n1", task, fakeTransaction());
    expect(typeof task.updatedAt).toBe("string");
    const kept: Record<string, unknown> = {
      id: "n2",
      title: "From Google",
      updatedAt: "2026-10-01T00:00:00.000Z",
    };
    hooks.creating("n2", kept, fakeTransaction());
    expect(kept.updatedAt).toBe("2026-10-01T00:00:00.000Z");
  });

  it("leaves a tombstone when a Google-linked task is deleted for good", () => {
    const { table, hooks } = recordingTable();
    installTaskChangeHooks(table);
    hooks.deleting(
      "id1",
      { id: "id1", gtaskId: "g1", gtaskListId: "L", gcalEventId: "mc1" },
      fakeTransaction(),
    );
    expect(readTombstones()).toEqual([
      expect.objectContaining({
        key: "L:g1",
        taskId: "id1",
        gtaskId: "g1",
        listId: "L",
        eventId: "mc1",
      }),
    ]);
  });

  it("leaves nothing behind for a task that never reached Google", () => {
    const { table, hooks } = recordingTable();
    installTaskChangeHooks(table);
    hooks.deleting("id2", { id: "id2" }, fakeTransaction());
    expect(readTombstones()).toEqual([]);
  });
});
