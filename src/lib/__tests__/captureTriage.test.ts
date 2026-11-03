import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "../db";

const state = vi.hoisted(() => ({
  tasks: new Map<string, Task>(),
  queue: Promise.resolve() as Promise<unknown>,
  markDirty: vi.fn(),
  schedulePush: vi.fn(),
  logAudit: vi.fn(async () => {}),
}));

vi.mock("@/lib/db", () => ({
  db: {
    tasks: {
      get: async (id: string) => {
        const record = state.tasks.get(id);
        return record ? structuredClone(record) : undefined;
      },
      update: async (id: string, patch: Partial<Task>) => {
        const record = state.tasks.get(id);
        if (!record) return 0;
        state.tasks.set(id, { ...record, ...patch });
        return 1;
      },
    },
    transaction: (...args: unknown[]) => {
      const callback = args.at(-1) as () => Promise<unknown>;
      const next = state.queue.then(callback);
      state.queue = next.catch(() => undefined);
      return next;
    },
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: state.logAudit }));
vi.mock("@/lib/cloudSync", () => ({ markCloudRecordsDirty: state.markDirty }));
vi.mock("@/stores/dataStore", () => ({
  useDataStore: { getState: () => ({ _schedulePush: state.schedulePush }) },
}));

import { processCaptures, undoCaptures } from "../captureTriage";

const TODAY = "2026-11-03";
const capture = (patch: Partial<Task> = {}): Task => ({
  id: "capture-1",
  title: "Prepare the release",
  priority: "high",
  status: "todo",
  dueDate: "2026-11-12",
  category: "Product",
  description: "Keep the evidence and customer context.",
  linkedProject: "Workspace",
  subtasks: [],
  createdAt: "2026-11-01T10:00:00Z",
  inbox: true,
  touchedAt: "2026-11-01",
  ...patch,
});

beforeEach(() => {
  state.tasks.clear();
  state.queue = Promise.resolve();
  state.markDirty.mockReset();
  state.schedulePush.mockReset();
  state.logAudit.mockClear();
});

describe("Capture triage preserves saved work", () => {
  it("plans from the current saved values and restores the previous plan without changing deadlines", async () => {
    const task = capture({ scheduledAt: "2026-11-08", notBefore: "2026-11-06" });
    state.tasks.set(task.id, task);

    const processed = await processCaptures([task.id], "today", TODAY);
    expect(state.tasks.get(task.id)).toMatchObject({
      inbox: false,
      scheduledAt: TODAY,
      committedOn: TODAY,
      dueDate: task.dueDate,
      description: task.description,
    });
    expect(state.tasks.get(task.id)?.notBefore).toBeUndefined();

    expect(await undoCaptures(processed.undo)).toEqual({
      restored: 1,
      conflicts: [],
      syncError: null,
    });
    expect(state.tasks.get(task.id)).toEqual({ ...task, committedOn: undefined });
    expect(state.markDirty).toHaveBeenNthCalledWith(1, "tasks", [task.id]);
    expect(state.markDirty).toHaveBeenNthCalledWith(2, "tasks", [task.id]);
    expect(state.schedulePush).toHaveBeenCalledTimes(2);
    expect(state.logAudit).toHaveBeenCalledWith(expect.objectContaining({ before: task }));
  });

  it("does not overwrite a newer schedule or snooze when Undo is requested", async () => {
    const task = capture();
    state.tasks.set(task.id, task);
    const processed = await processCaptures([task.id], "today", TODAY);
    const newer = {
      ...state.tasks.get(task.id)!,
      scheduledAt: "2026-11-10",
      notBefore: "2026-11-09",
    };
    state.tasks.set(task.id, newer);

    expect(await undoCaptures(processed.undo)).toEqual({
      restored: 0,
      conflicts: [task.id],
      syncError: null,
    });
    expect(state.tasks.get(task.id)).toEqual(newer);
    expect(state.markDirty).toHaveBeenCalledTimes(1);
  });

  it("keeps independent title and context changes while undoing its own fields", async () => {
    const task = capture();
    state.tasks.set(task.id, task);
    const processed = await processCaptures([task.id], "accept", TODAY);
    state.tasks.set(task.id, {
      ...state.tasks.get(task.id)!,
      title: "The updated release plan",
      description: "Additional evidence saved on another device.",
      dueDate: "2026-11-18",
    });

    expect((await undoCaptures(processed.undo)).restored).toBe(1);
    expect(state.tasks.get(task.id)).toMatchObject({
      inbox: true,
      touchedAt: task.touchedAt,
      title: "The updated release plan",
      description: "Additional evidence saved on another device.",
      dueDate: "2026-11-18",
    });
  });

  it("leaves deleted, completed, missing and newly archived captures untouched", async () => {
    for (const id of ["deleted", "completed", "missing", "archived"])
      state.tasks.set(id, capture({ id }));
    const processed = await processCaptures([...state.tasks.keys()], "accept", TODAY);
    state.tasks.set("deleted", {
      ...state.tasks.get("deleted")!,
      deletedAt: "2026-11-03T11:00:00Z",
    });
    state.tasks.set("completed", { ...state.tasks.get("completed")!, status: "done" });
    state.tasks.delete("missing");
    state.tasks.set("archived", { ...state.tasks.get("archived")!, archived: true });
    const current = structuredClone(state.tasks);

    const result = await undoCaptures(processed.undo);
    expect(result.restored).toBe(0);
    expect(result.conflicts).toEqual(["deleted", "completed", "missing", "archived"]);
    expect(state.tasks).toEqual(current);
  });

  it("undoes an archive only while the archived state still matches", async () => {
    const task = capture();
    state.tasks.set(task.id, task);
    const processed = await processCaptures([task.id], "archive", TODAY);
    expect(state.tasks.get(task.id)).toMatchObject({
      archived: true,
      archivedAt: TODAY,
      inbox: false,
    });

    expect((await undoCaptures(processed.undo)).restored).toBe(1);
    expect(state.tasks.get(task.id)).toEqual({
      ...task,
      archived: undefined,
      archivedAt: undefined,
    });
  });

  it("processes a capture once across concurrent clicks and ignores stale selections", async () => {
    const task = capture();
    state.tasks.set(task.id, task);
    state.tasks.set("already-done", capture({ id: "already-done", status: "done" }));
    const [first, second] = await Promise.all([
      processCaptures([task.id, task.id, "already-done"], "accept", TODAY),
      processCaptures([task.id], "archive", TODAY),
    ]);

    expect(first.undo).toHaveLength(1);
    expect(first.conflicts).toEqual(["already-done"]);
    expect(second.undo).toEqual([]);
    expect(second.conflicts).toEqual([task.id]);
    expect(state.tasks.get(task.id)?.archived).toBeUndefined();
    expect(state.logAudit).toHaveBeenCalledTimes(1);
  });

  it("restores unaffected records in a batch while keeping conflicting records intact", async () => {
    const first = capture();
    const second = capture({ id: "capture-2" });
    state.tasks.set(first.id, first);
    state.tasks.set(second.id, second);
    const processed = await processCaptures([first.id, second.id], "today", TODAY);
    const newer = { ...state.tasks.get(second.id)!, committedOn: "2026-11-06" };
    state.tasks.set(second.id, newer);

    expect(await undoCaptures([...processed.undo, processed.undo[0]])).toEqual({
      restored: 1,
      conflicts: [second.id],
      syncError: null,
    });
    expect(state.tasks.get(first.id)?.inbox).toBe(true);
    expect(state.tasks.get(second.id)).toEqual(newer);
    expect(state.markDirty).toHaveBeenLastCalledWith("tasks", [first.id]);
  });

  it("reports a sync queue failure separately after the local change is saved", async () => {
    const task = capture();
    state.tasks.set(task.id, task);
    state.markDirty.mockImplementationOnce(() => {
      throw new Error("Sync is unavailable");
    });

    const result = await processCaptures([task.id], "accept", TODAY);
    expect(result.undo).toHaveLength(1);
    expect(result.syncError).toBe("Sync is unavailable");
    expect(state.tasks.get(task.id)?.inbox).toBe(false);
    expect(state.logAudit).toHaveBeenCalledTimes(1);
  });
});
