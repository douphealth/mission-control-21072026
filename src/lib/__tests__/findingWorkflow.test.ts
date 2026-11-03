import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { Decision, Task, StreamItem } from "../db";

const state = vi.hoisted(() => ({
  findings: new Map<string, Decision>(),
  tasks: new Map<string, Task>(),
  queue: Promise.resolve() as Promise<unknown>,
  serial: 0,
}));
vi.mock("@/lib/db", () => ({
  genId: () => `record-${++state.serial}`,
  db: {
    decisions: {
      get: async (id: string) => state.findings.get(id),
      put: async (value: Decision) => {
        state.findings.set(value.id, { ...value });
        return value.id;
      },
      count: async () => state.findings.size,
      where: (key: keyof Decision) => ({
        equals: (value: unknown) => ({
          first: async () => [...state.findings.values()].find((row) => row[key] === value),
          toArray: async () => [...state.findings.values()].filter((row) => row[key] === value),
        }),
      }),
    },
    tasks: {
      get: async (id: string) => state.tasks.get(id),
      put: async (value: Task) => {
        state.tasks.set(value.id, { ...value });
        return value.id;
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
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn(async () => {}) }));
vi.mock("@/lib/cloudSync", () => ({ markCloudRecordDirty: vi.fn(), queueCloudPush: vi.fn() }));
import { actOnDecision, generateDecisions, upsertDecision } from "../decisions";

const finding = (patch: Partial<Decision> = {}): Decision => ({
  id: "finding-1",
  title: "Review coverage",
  context: "Saved source observation",
  source: "manual",
  severity: "high",
  status: "open",
  groupKey: "manual|coverage",
  occurrences: 1,
  createdAt: "2026-11-03T10:00:00Z",
  updatedAt: "2026-11-03T10:00:00Z",
  ...patch,
});
const mention = (patch: Partial<StreamItem> = {}): StreamItem => ({
  id: "mention-1",
  kind: "mention",
  title: "Verified coverage",
  url: "https://example.com/coverage",
  source: "Example",
  publishedAt: "2026-11-03T09:00:00Z",
  discoveredAt: "2026-11-03T10:00:00Z",
  dateBasis: "published",
  score: 50,
  status: "active",
  verification: "exact-brand",
  ...patch,
});

beforeEach(() => {
  state.findings.clear();
  state.tasks.clear();
  state.queue = Promise.resolve();
  state.serial = 0;
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-03T14:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("Findings create a single, honest follow-up", () => {
  it("coalesces concurrent clicks into the same linked task", async () => {
    const record = finding();
    state.findings.set(record.id, record);
    const [first, second] = await Promise.all([actOnDecision(record), actOnDecision(record)]);
    expect(first).toBe(second);
    expect(state.tasks.size).toBe(1);
    expect(state.findings.get(record.id)?.linkedTaskId).toBe(first);
  });
  it("records a work plan without inventing a real deadline", async () => {
    const record = finding();
    state.findings.set(record.id, record);
    const id = await actOnDecision(record);
    expect(state.tasks.get(id)?.dueDate).toBe("");
    expect(state.tasks.get(id)?.scheduledAt).toBe("2026-11-04");
    expect(state.findings.get(record.id)?.status).toBe("acted");
  });
  it("creates a distinct follow-up when a completed task’s finding is reopened", async () => {
    const record = finding();
    state.findings.set(record.id, record);
    const firstId = await actOnDecision(record);
    state.tasks.set(firstId, {
      ...state.tasks.get(firstId)!,
      status: "done",
      completedAt: "2026-11-03T14:00:00Z",
    });
    state.findings.set(record.id, { ...state.findings.get(record.id)!, status: "open" });
    const nextId = await actOnDecision(record);
    expect(nextId).not.toBe(firstId);
    expect(state.tasks.get(firstId)?.status).toBe("done");
    expect(state.tasks.get(nextId)?.status).toBe("todo");
  });
  it("rejects stale actions after the finding was dismissed", async () => {
    const record = finding();
    state.findings.set(record.id, { ...record, status: "ignored" });
    await expect(actOnDecision(record)).rejects.toThrow(/already changed/);
    expect(state.tasks.size).toBe(0);
  });
  it("preserves an archived task when creating a reopened finding’s follow-up", async () => {
    const record = finding();
    state.findings.set(record.id, record);
    const firstId = await actOnDecision(record);
    state.tasks.set(firstId, { ...state.tasks.get(firstId)!, archived: true });
    state.findings.set(record.id, { ...state.findings.get(record.id)!, status: "open" });
    const nextId = await actOnDecision(record);
    expect(nextId).not.toBe(firstId);
    expect(state.tasks.get(firstId)?.archived).toBe(true);
    expect(state.tasks.get(nextId)?.archived).not.toBe(true);
  });
  it("preserves a deferred decision before its review date", async () => {
    state.findings.set("finding-1", finding({ status: "later", deferUntil: "2026-11-10" }));
    await upsertDecision({
      title: "Review coverage",
      context: "Repeated observation",
      source: "manual",
      groupKey: "manual|coverage",
      severity: "high",
    });
    expect(state.findings.get("finding-1")?.status).toBe("later");
    expect(state.findings.get("finding-1")?.deferUntil).toBe("2026-11-10");
  });
  it("does not surface unrelated, unverified or stale mentions as new findings", async () => {
    await generateDecisions({
      mentions: [
        mention({ id: "topic", verification: "topic-search" }),
        mention({ id: "old", publishedAt: "2025-01-01T00:00:00Z" }),
        mention({ id: "archived", status: "archived" }),
        mention(),
      ],
    });
    expect(state.findings.size).toBe(1);
    expect([...state.findings.values()][0].sourceRef).toBe("mention-1");
  });
});
