import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WatchTerm } from "../db";

const state = vi.hoisted(() => ({
  tables: new Map<string, Map<string, any>>(), queue: Promise.resolve() as Promise<unknown>,
  markDirty: vi.fn(), push: vi.fn(),
}));
vi.mock("@/lib/db", () => {
  const table = (name: string) => {
    const rows = () => { if (!state.tables.has(name)) state.tables.set(name, new Map()); return state.tables.get(name)!; };
    return {
      toArray: async () => structuredClone([...rows().values()]),
      get: async (id: string) => structuredClone(rows().get(id)),
      add: async (row: any) => { if (rows().has(row.id)) throw new Error("Duplicate primary key"); rows().set(row.id, structuredClone(row)); return row.id; },
      put: async (row: any) => { rows().set(row.id, structuredClone(row)); return row.id; },
      update: async (id: string, patch: any) => { const row = rows().get(id); if (!row) return 0; rows().set(id, { ...row, ...structuredClone(patch) }); return 1; },
      filter: (predicate: (row: any) => boolean) => ({ first: async () => structuredClone([...rows().values()].find(predicate)) }),
      where: (key: string) => ({ equals: (value: unknown) => ({ first: async () => structuredClone([...rows().values()].find(row => row[key] === value)) }) }),
    };
  };
  return { db: {
    ...Object.fromEntries(["repos", "buildProjects", "links", "websites", "feedSources", "syncHealth", "watchTerms", "ideas", "seoProfiles", "seoIssues", "seoActions"].map(name => [name, table(name)])),
    transaction: (...args: unknown[]) => {
      const callback = args.at(-1) as () => Promise<unknown>;
      const operation = state.queue.then(callback);
      state.queue = operation.catch(() => undefined);
      return operation;
    },
  }, genId: () => crypto.randomUUID() };
});
vi.mock("@/lib/cloudSync", () => ({ markCloudRecordDirty: state.markDirty, queueCloudPush: state.push }));
vi.mock("@/lib/appPortfolio", () => ({ APP_FUNNEL_CATALOG: [] }));
vi.mock("@/lib/repoCatalog", () => ({ GITHUB_REPO_CATALOG: [{ name: "Repository", url: "https://github.com/example/repository", defaultBranch: "main", visibility: "public", repoSizeKb: 10 }] }));

import { ensureWorkspaceBootstrap } from "../workspaceBootstrap";
import { deterministicWatchId, ensureWatchTerm, groupWatchTerms, watchIdentityKey } from "../watchTerms";

const watch = (patch: Partial<WatchTerm> = {}): WatchTerm => ({ id: "legacy-a", term: "gearuptofit.com", type: "domain", enabled: true, anchors: [], negatives: [], createdAt: "2026-10-01T00:00:00Z", ...patch });
const rows = (name: string) => [...(state.tables.get(name)?.values() || [])];
const put = (name: string, record: any) => { if (!state.tables.has(name)) state.tables.set(name, new Map()); state.tables.get(name)!.set(record.id, structuredClone(record)); };
beforeEach(() => { state.tables.clear(); state.queue = Promise.resolve(); state.markDirty.mockReset(); state.push.mockReset(); });

describe("concurrent workspace initialization", () => {
  it("does not duplicate watch terms, links, feeds, repositories, builds, ideas or SEO profiles across concurrent boots", async () => {
    put("websites", { id: "site-1", name: "User site", url: "https://example.test", notes: "Keep user notes", appUrls: [] });
    await Promise.all([ensureWorkspaceBootstrap(), ensureWorkspaceBootstrap(), ensureWorkspaceBootstrap()]);
    expect(rows("watchTerms")).toHaveLength(10);
    expect(rows("repos")).toHaveLength(1);
    expect(rows("seoProfiles")).toHaveLength(1);
    for (const [table, key] of [["links", "url"], ["feedSources", "url"], ["buildProjects", "githubRepo"], ["ideas", "title"]]) {
      const entries = rows(table);
      expect(entries.length).toBeGreaterThan(0);
      expect(new Set(entries.map(row => row[key])).size).toBe(entries.length);
    }
  });

  it("preserves existing paused watches, health results, legacy duplicates and user catalog fields", async () => {
    const original = watch({ enabled: false, lastError: "Keep this diagnostic" });
    put("watchTerms", original);
    put("watchTerms", watch({ id: "legacy-b", enabled: false }));
    put("repos", { id: "existing-repo", name: "Repository", url: "https://github.com/example/repository", visibility: "private", defaultBranch: "release", repoSizeKb: 999, description: "User description" });
    put("syncHealth", { id: "mentions", status: "ok", detail: "Actual last run", lastSuccessAt: "2026-11-03T12:00:00Z" });
    await Promise.all([ensureWorkspaceBootstrap(), ensureWorkspaceBootstrap()]);
    expect(state.tables.get("watchTerms")?.get(original.id)).toEqual(original);
    expect(state.tables.get("watchTerms")?.has("legacy-b")).toBe(true);
    expect(rows("watchTerms")).toHaveLength(11);
    expect(rows("repos")[0]).toMatchObject({ defaultBranch: "release", visibility: "private", repoSizeKb: 999, description: "User description" });
    expect(state.tables.get("syncHealth")?.get("mentions")).toMatchObject({ status: "ok", detail: "Actual last run" });
  });

  it("creates the same seed IDs in independently initialized devices", async () => {
    await ensureWorkspaceBootstrap();
    const first = Object.fromEntries(["watchTerms", "repos", "links", "feedSources", "buildProjects", "ideas"].map(name => [name, rows(name).map(row => row.id).sort()]));
    state.tables.clear();
    await ensureWorkspaceBootstrap();
    for (const [name, ids] of Object.entries(first)) expect(rows(name).map(row => row.id).sort()).toEqual(ids);
  });
});

describe("watch identity and safe legacy grouping", () => {
  it("makes concurrent manual/default creation idempotent without overwriting a saved row", async () => {
    const { id: _, ...input } = watch();
    const results = await Promise.all([ensureWatchTerm(input), ensureWatchTerm(input), ensureWatchTerm({ ...input, createdAt: "2026-11-03T00:00:00Z" })]);
    expect(results.filter(result => result.created)).toHaveLength(1);
    expect(rows("watchTerms")).toHaveLength(1);
    expect(results.every(result => result.record.id === results[0].record.id)).toBe(true);
  });

  it("groups legacy identical rules without deleting data or losing source aliases", () => {
    const input = [watch(), watch({ id: "legacy-b", term: " HTTPS://WWW.GEARUPTOFIT.COM/ ", lastCheckedAt: "2026-11-03T10:00:00Z" })];
    const before = structuredClone(input);
    const grouped = groupWatchTerms(input);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].memberIds).toEqual(["legacy-a", "legacy-b"]);
    expect(grouped[0].lastCheckedAt).toBe("2026-11-03T10:00:00Z");
    expect(input).toEqual(before);
  });

  it("never merges different anchors, exclusions, identity types or pause preferences", () => {
    const input = [watch(), watch({ id: "anchor", anchors: ["running"] }), watch({ id: "exclude", negatives: ["review"] }), watch({ id: "brand", type: "brand" }), watch({ id: "paused", enabled: false })];
    expect(groupWatchTerms(input)).toHaveLength(5);
    expect(groupWatchTerms(input).filter(row => row.enabled)).toHaveLength(4);
  });

  it("normalizes case, spacing and set order while preserving distinct semantic phrases", () => {
    expect(watchIdentityKey(watch({ anchors: [" Running shoes ", "FITNESS", "fitness"], negatives: ["Other"] }))).toBe(watchIdentityKey(watch({ anchors: ["fitness", "running  shoes"], negatives: ["other"] })));
    expect(watchIdentityKey(watch({ anchors: ["running"] }))).not.toBe(watchIdentityKey(watch({ anchors: ["running shoes"] })));
  });

  it("does not re-enable an existing paused equivalent when added or bootstrapped again", async () => {
    put("watchTerms", watch({ enabled: false }));
    const { id: _, ...input } = watch();
    const result = await ensureWatchTerm(input);
    expect(result.created).toBe(false);
    expect(result.record.enabled).toBe(false);
    expect(rows("watchTerms")).toHaveLength(1);
  });

  it("allows separate manual rules for the same term with different identity anchors", async () => {
    const { id: _, ...input } = watch();
    await ensureWatchTerm({ ...input, anchors: ["running"] });
    await ensureWatchTerm({ ...input, anchors: ["fitness"] });
    expect(rows("watchTerms")).toHaveLength(2);
    expect(await deterministicWatchId({ ...input, anchors: ["running"] })).not.toBe(await deterministicWatchId({ ...input, anchors: ["fitness"] }));
  });
});
