import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Task, Website } from "../db";

const memory = vi.hoisted(() => ({
  websites: new Map<string, Website>(),
  tasks: new Map<string, Task>(),
  active: null as null | { websites: Map<string, Website>; tasks: Map<string, Task> },
  queue: Promise.resolve() as Promise<unknown>,
  failTaskWrite: false,
  dirty: [] as Array<{ collection: string; id: string }>,
}));

vi.mock("@/lib/db", () => {
  function current(collection: "websites" | "tasks") {
    if (!memory.active)
      throw new Error("Seed reads and writes must share the readwrite transaction.");
    return memory.active[collection] as Map<string, Website | Task>;
  }
  function table(collection: "websites" | "tasks") {
    return {
      toArray: async () => [...current(collection).values()].map((row) => structuredClone(row)),
      add: async (record: Website | Task) => {
        if (collection === "tasks" && memory.failTaskWrite)
          throw new Error("Injected task storage failure");
        const rows = current(collection);
        if (rows.has(record.id)) throw new Error("Existing record must not be overwritten");
        rows.set(record.id, structuredClone(record));
        return record.id;
      },
      update: async (id: string, patch: Partial<Website | Task>) => {
        const rows = current(collection),
          prior = rows.get(id);
        if (!prior) return 0;
        rows.set(id, { ...prior, ...structuredClone(patch) } as Website | Task);
        return 1;
      },
    };
  }
  const websites = table("websites"),
    tasks = table("tasks");
  return {
    db: {
      websites,
      tasks,
      transaction: (
        mode: string,
        first: unknown,
        second: unknown,
        callback: () => Promise<unknown>,
      ) => {
        if (mode !== "rw" || first !== websites || second !== tasks)
          throw new Error("Both seed stores must be locked together");
        const transaction = memory.queue.then(async () => {
          memory.active = {
            websites: structuredClone(memory.websites),
            tasks: structuredClone(memory.tasks),
          };
          try {
            const result = await callback();
            memory.websites = memory.active.websites;
            memory.tasks = memory.active.tasks;
            return result;
          } finally {
            memory.active = null;
          }
        });
        memory.queue = transaction.catch(() => undefined);
        return transaction;
      },
    },
  };
});

vi.mock("@/lib/cloudSync", () => ({
  markCloudRecordDirty: (collection: string, id: string) => {
    if (memory.active) throw new Error("Cloud mutations must be queued after commit.");
    memory.dirty.push({ collection, id });
  },
}));

import { ensurePortfolioBootstrap, PRIORITY_TASKS, WEBSITE_PORTFOLIO } from "../portfolioBootstrap";

beforeEach(() => {
  memory.websites.clear();
  memory.tasks.clear();
  memory.active = null;
  memory.queue = Promise.resolve();
  memory.failTaskWrite = false;
  memory.dirty.length = 0;
});

const task = (id: string, patch: Partial<Task> = {}): Task => ({
  id,
  title: "User edited title",
  priority: "low",
  status: "done",
  dueDate: "2027-01-15",
  category: "Personal",
  description: "Keep this user context",
  linkedProject: "Mine",
  subtasks: [{ id: "sub", title: "Keep completed step", done: true }],
  createdAt: "2026-01-01",
  tags: [`portfolio-key:${PRIORITY_TASKS[0].key}`],
  ...patch,
});

describe("Portfolio bootstrap concurrent startup", () => {
  it("seeds each site and task once when three tabs start together", async () => {
    const results = await Promise.all([
      ensurePortfolioBootstrap(),
      ensurePortfolioBootstrap(),
      ensurePortfolioBootstrap(),
    ]);
    expect(memory.websites.size).toBe(WEBSITE_PORTFOLIO.length);
    expect(memory.tasks.size).toBe(PRIORITY_TASKS.length);
    expect(results.reduce((sum, result) => sum + result.websitesAdded, 0)).toBe(
      WEBSITE_PORTFOLIO.length,
    );
    expect(results.reduce((sum, result) => sum + result.tasksAdded, 0)).toBe(PRIORITY_TASKS.length);
    expect(memory.dirty).toHaveLength(WEBSITE_PORTFOLIO.length + PRIORITY_TASKS.length);
    const keys = [...memory.tasks.values()].flatMap(
      (row) => row.tags?.filter((tag) => tag.startsWith("portfolio-key:")) || [],
    );
    expect(new Set(keys).size).toBe(PRIORITY_TASKS.length);
  });

  it("recognizes legacy tags/domains while preserving both existing duplicate tasks and user edits", async () => {
    const { slug: _slug, ...website } = WEBSITE_PORTFOLIO[0];
    const legacySite: Website = {
      ...website,
      id: "legacy-site",
      name: "User site name",
      url: "https://www.gearuptofit.com/custom",
      notes: "User notes",
      priority: "low",
    };
    const archived = task("legacy-a", { archived: true });
    const deleted = task("legacy-b", { deletedAt: "2026-11-01T12:00:00Z" });
    memory.websites.set(legacySite.id, structuredClone(legacySite));
    memory.tasks.set(archived.id, structuredClone(archived));
    memory.tasks.set(deleted.id, structuredClone(deleted));
    const result = await ensurePortfolioBootstrap();
    expect(result.websitesAdded).toBe(WEBSITE_PORTFOLIO.length - 1);
    expect(result.tasksAdded).toBe(PRIORITY_TASKS.length - 1);
    expect(memory.websites.get(legacySite.id)).toEqual(legacySite);
    expect(memory.tasks.get(archived.id)).toEqual(archived);
    expect(memory.tasks.get(deleted.id)).toEqual(deleted);
    expect(memory.tasks.has(`portfolio-task-${PRIORITY_TASKS[0].key}`)).toBe(false);
  });

  it("does not replace a stable seed whose user removed its tag or changed its URL", async () => {
    const customTask = task(`portfolio-task-${PRIORITY_TASKS[0].key}`, { tags: ["user-tag"] });
    const { slug, ...site } = WEBSITE_PORTFOLIO[0];
    const movedSite: Website = {
      ...site,
      id: `portfolio-site-${slug}`,
      url: "https://user-edited.example/",
      name: "Moved by user",
    };
    memory.tasks.set(customTask.id, structuredClone(customTask));
    memory.websites.set(movedSite.id, structuredClone(movedSite));
    await ensurePortfolioBootstrap();
    expect(memory.tasks.get(customTask.id)).toEqual(customTask);
    expect(memory.websites.get(movedSite.id)).toEqual(movedSite);
    expect(memory.tasks.size).toBe(PRIORITY_TASKS.length);
    expect(memory.websites.size).toBe(WEBSITE_PORTFOLIO.length);
  });

  it("uses matching identities for new seeds on independent devices", async () => {
    await ensurePortfolioBootstrap();
    const first = {
      websites: [...memory.websites.keys()].sort(),
      tasks: [...memory.tasks.keys()].sort(),
    };
    memory.websites.clear();
    memory.tasks.clear();
    memory.dirty.length = 0;
    await ensurePortfolioBootstrap();
    expect([...memory.websites.keys()].sort()).toEqual(first.websites);
    expect([...memory.tasks.keys()].sort()).toEqual(first.tasks);
  });

  it("rolls back the entire batch and sends no sync marks when a seed write fails", async () => {
    memory.failTaskWrite = true;
    await expect(ensurePortfolioBootstrap()).rejects.toThrow("Injected task storage failure");
    expect(memory.websites.size).toBe(0);
    expect(memory.tasks.size).toBe(0);
    expect(memory.dirty).toEqual([]);
    memory.failTaskWrite = false;
    await ensurePortfolioBootstrap();
    expect(memory.tasks.size).toBe(PRIORITY_TASKS.length);
  });
});
