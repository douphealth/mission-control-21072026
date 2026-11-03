import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FeedSource, StreamItem } from "../db";

const state = vi.hoisted(() => ({ rows: new Map<string, any>(), tasks: new Map<string, any>(), queue: Promise.resolve() as Promise<unknown>, dirty: vi.fn(), push: vi.fn() }));
vi.mock("@/lib/db", () => ({
  genId: () => crypto.randomUUID(),
  db: {
    streamItems: {
      toArray: async () => structuredClone([...state.rows.values()]),
      get: async (id: string) => structuredClone(state.rows.get(id)),
      update: async (id: string, patch: any) => { const row = state.rows.get(id); if (!row) return 0; state.rows.set(id, { ...row, ...patch }); return 1; },
      bulkAdd: async (rows: any[]) => { for (const row of rows) { if (state.rows.has(row.id)) throw new Error("Duplicate key"); state.rows.set(row.id, structuredClone(row)); } },
    },
    watchTerms: { toArray: async () => [] },
    tasks: {
      get: async (id: string) => structuredClone(state.tasks.get(id)),
      add: async (task: any) => { if (state.tasks.has(task.id)) throw new Error("Duplicate task"); state.tasks.set(task.id, structuredClone(task)); },
    },
    transaction: (...args: unknown[]) => { const operation = state.queue.then(args.at(-1) as () => Promise<unknown>); state.queue = operation.catch(() => undefined); return operation; },
  },
}));
vi.mock("@/lib/cloudSync", () => ({ markCloudRecordDirty: state.dirty, queueCloudPush: state.push }));
vi.mock("@/lib/controlCenter.functions", () => ({ collectAudience: vi.fn(), collectIndustry: vi.fn(), collectMentions: vi.fn(), rankStories: vi.fn() }));

import { archiveStreamItems, captureStreamItem, localScore, persistCollectedItems, restoreStreamItems } from "../controlCenter";
import { attributedArticle, canonicalWebUrl } from "../intelligenceQuality";
import { deduplicateStreamItems, groupFeedSources } from "../intelligencePresentation";

const now = Date.parse("2026-11-03T12:00:00Z");
const source = (patch: Partial<FeedSource> = {}): FeedSource => ({ id: "source-a", name: "Publisher", url: "https://publisher.test/news/", enabled: true, topics: ["security", "search"], createdAt: "2026-10-01T12:00:00Z", ...patch });
const story = (patch: Partial<StreamItem> = {}): StreamItem => ({ id: "story-a", kind: "industry", title: "Search update", url: "https://publisher.test/article", source: "Publisher", publishedAt: "2026-11-03T10:00:00Z", dateBasis: "published", discoveredAt: "2026-11-03T11:00:00Z", status: "active", score: 100, ...patch });
const bing = (tid: string) => `https://www.bing.com/news/apiclick.aspx?ref=FexRss&tid=${tid}&url=${encodeURIComponent("https://publisher.test/article?utm_source=bing")}`;

beforeEach(() => { state.rows.clear(); state.tasks.clear(); state.queue = Promise.resolve(); state.dirty.mockReset(); state.push.mockReset(); });

describe("collection identities and old data", () => {
  it("resolves Bing tracking envelopes to the exact source without treating intermediary as publisher", () => {
    expect(canonicalWebUrl(bing("first"))).toBe("https://publisher.test/article");
    expect(canonicalWebUrl(bing("second"))).toBe(canonicalWebUrl(bing("first")));
    expect(attributedArticle({ url: bing("first"), source: "bing.com", sourceUrl: "https://www.bing.com/" })).toMatchObject({ url: "https://publisher.test/article", source: "publisher.test", sourceUrl: "https://publisher.test/" });
    expect(canonicalWebUrl("https://publisher.test/article?reference=1&sourceId=2&id=3")).toContain("reference=1");
    expect(canonicalWebUrl("https://www.bing.com/news/apiclick.aspx?url=javascript%3Aalert(1)")).not.toContain("javascript:alert");
  });

  it("presents legacy duplicate sources once without mutating saved data or merging distinct preferences", () => {
    const rows = [source(), source({ id: "b", topics: [" SEARCH ", "security", "search"], lastCheckedAt: "2026-11-03T11:00:00Z", lastError: "Provider error" }), source({ id: "paused", enabled: false }), source({ id: "another-rule", topics: ["cloud"] })];
    const before = structuredClone(rows), groups = groupFeedSources(rows);
    expect(groups).toHaveLength(3);
    expect(groups.find(row => row.memberIds.includes("source-a"))).toMatchObject({ memberIds: ["b", "source-a"], duplicateCount: 1, lastError: "Provider error" });
    expect(rows).toEqual(before);
  });

  it("deduplicates old redirected articles while keeping archive status and separate mention rules", () => {
    const records = [story(), story({ id: "b", url: bing("one"), source: "bing.com" }), story({ id: "c", url: bing("two"), status: "archived" })];
    expect(deduplicateStreamItems(records)).toHaveLength(2);
    expect(deduplicateStreamItems(records).find(row => row.status === "active")?.memberIds).toEqual(["b", "story-a"]);
    expect(deduplicateStreamItems([story({ kind: "mention", sourceId: "rule-a" }), story({ id: "b", kind: "mention", sourceId: "rule-b" })])).toHaveLength(2);
    expect(deduplicateStreamItems([story({ kind: "mention", sourceId: "rule-a" }), story({ id: "b", kind: "mention", sourceId: "rule-b" })], new Map([["rule-a", "same"], ["rule-b", "same"]]))).toHaveLength(1);
  });

  it("serializes concurrent collection and preserves archived legacy rows", async () => {
    const item = story();
    const counts = await Promise.all([persistCollectedItems("industry", [item]), persistCollectedItems("industry", [{ ...item, url: bing("new") }])]);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(1);
    expect(state.rows.size).toBe(1);
    const firstId = [...state.rows.keys()][0];
    state.rows.clear();
    await persistCollectedItems("industry", [item]);
    expect([...state.rows.keys()][0]).toBe(firstId);
    state.rows.clear(); state.rows.set("old", story({ id: "old", status: "archived", url: bing("old") }));
    expect(await persistCollectedItems("industry", [item])).toBe(0);
    expect(state.rows.get("old").status).toBe("archived");
  });

  it("archives/restores every grouped alias and recognizes a previously captured alias", async () => {
    state.rows.set("story-a", story()); state.rows.set("alias", story({ id: "alias", url: bing("alias") }));
    await archiveStreamItems(["story-a", "alias", "alias"]);
    expect([...state.rows.values()].every(row => row.status === "archived")).toBe(true);
    await restoreStreamItems(["story-a", "alias"]);
    expect([...state.rows.values()].every(row => row.status === "active")).toBe(true);
    state.tasks.set("intel-capture-alias", { id: "intel-capture-alias", title: "Previous capture" });
    expect(await captureStreamItem("story-a", ["story-a", "alias"])).toBe("exists");
    expect(state.tasks.size).toBe(1);
  });

  it("keeps a canonical capture id when the visible duplicate changes", async () => {
    state.rows.set("story-a", story()); state.rows.set("alias", story({ id: "alias", url: bing("alias") }));
    expect(await captureStreamItem("story-a")).toBe("created");
    expect(await captureStreamItem("alias")).toBe("exists");
    expect(state.tasks.size).toBe(1);
  });

  it("recognizes a legacy capture on an archived duplicate outside the active display group", async () => {
    state.rows.set("active-b", story({ id: "active-b" }));
    state.rows.set("archived-a", story({ id: "archived-a", url: bing("archived"), status: "archived" }));
    const previous = { id: "intel-capture-archived-a", title: "Existing user-edited capture" };
    state.tasks.set(previous.id, previous);
    expect(await captureStreamItem("active-b", ["active-b"])).toBe("exists");
    expect([...state.tasks.values()]).toEqual([previous]);
    state.tasks.set(previous.id, { ...previous, deletedAt: "2026-11-03T12:00:00Z" });
    expect(await captureStreamItem("active-b")).toBe("trash");
    expect(state.tasks.size).toBe(1);
  });

  it("does not let an archived capture for a different mention rule suppress a new follow-up", async () => {
    state.rows.set("active-brand-b", story({ id: "active-brand-b", kind: "mention", sourceId: "brand-b" }));
    state.rows.set("archived-brand-a", story({ id: "archived-brand-a", kind: "mention", sourceId: "brand-a", url: bing("same-article"), status: "archived" }));
    state.tasks.set("intel-capture-archived-brand-a", { id: "intel-capture-archived-brand-a", title: "Follow up with brand A" });
    expect(await captureStreamItem("active-brand-b")).toBe("created");
    expect(state.tasks.size).toBe(2);
    expect(await captureStreamItem("active-brand-b")).toBe("exists");
  });
});

describe("review priority respects age and unique topic matches", () => {
  it("does not saturate stale stories because feeds repeated their topics", () => {
    const item = story({ title: "Search security update", publishedAt: "2026-10-01T12:00:00Z" });
    const topics = ["search", "security", "update"];
    expect(localScore(item, [...topics, ...topics, ...topics], now)).toBe(localScore(item, topics, now));
    expect(localScore(item, topics, now)).toBeLessThan(50);
    expect(localScore({ ...item, publishedAt: "2026-11-03T10:00:00Z" }, topics, now)).toBeGreaterThan(localScore(item, topics, now));
  });
  it("does not grant recency to discovery-only, future or invalid dates", () => {
    const undated = localScore(story({ dateBasis: "discovered" }), [], now);
    expect(localScore(story({ publishedAt: "2027-01-01" }), [], now)).toBe(undated);
    expect(localScore(story({ publishedAt: "invalid" }), [], now)).toBe(undated);
    expect(localScore(story({ title: "Urban design review" }), ["ban"], now)).toBe(localScore(story({ title: "Urban design review" }), [], now));
  });
});
