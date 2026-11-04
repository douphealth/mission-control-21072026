import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression: the shipped starter catalog contains apps with no GitHub
 * repository ("Watch Match", "Supplement Match", "Social Media Management").
 * A strict identity guard once threw on the first of them, which aborted the
 * whole bootstrap — so on a fresh device the Trends publisher feeds and the
 * Mentions watch rules (seeded *after* build projects) never appeared, and the
 * only trace was a swallowed console warning.
 *
 * The other bootstrap tests mock the app catalog as empty, which is why this
 * went unnoticed. This one deliberately uses the real catalog.
 */
const state = vi.hoisted(() => ({
  tables: new Map<string, Map<string, any>>(),
  queue: Promise.resolve() as Promise<unknown>,
}));
vi.mock("@/lib/db", () => {
  const table = (name: string) => {
    const rows = () => {
      if (!state.tables.has(name)) state.tables.set(name, new Map());
      return state.tables.get(name)!;
    };
    return {
      toArray: async () => structuredClone([...rows().values()]),
      get: async (id: string) => structuredClone(rows().get(id)),
      bulkGet: async (ids: string[]) => ids.map((id) => structuredClone(rows().get(id))),
      add: async (row: any) => {
        if (rows().has(row.id)) throw new Error("Duplicate primary key");
        rows().set(row.id, structuredClone(row));
        return row.id;
      },
      bulkDelete: async (ids: string[]) => {
        ids.forEach((id) => rows().delete(id));
      },
      put: async (row: any) => {
        rows().set(row.id, structuredClone(row));
        return row.id;
      },
      update: async (id: string, patch: any) => {
        const row = rows().get(id);
        if (!row) return 0;
        rows().set(id, { ...row, ...structuredClone(patch) });
        return 1;
      },
      filter: (predicate: (row: any) => boolean) => ({
        first: async () => structuredClone([...rows().values()].find(predicate)),
      }),
      where: (key: string) => ({
        equals: (value: unknown) => ({
          first: async () => structuredClone([...rows().values()].find((row) => row[key] === value)),
        }),
      }),
    };
  };
  return {
    db: {
      ...Object.fromEntries(
        [
          "settings",
          "repos",
          "buildProjects",
          "links",
          "websites",
          "feedSources",
          "syncHealth",
          "watchTerms",
          "ideas",
          "seoProfiles",
          "seoIssues",
          "seoActions",
        ].map((name) => [name, table(name)]),
      ),
      transaction: (...args: unknown[]) => {
        const callback = args.at(-1) as () => Promise<unknown>;
        const operation = state.queue.then(callback);
        state.queue = operation.catch(() => undefined);
        return operation;
      },
    },
    genId: () => crypto.randomUUID(),
  };
});
vi.mock("@/lib/cloudSync", () => ({ markCloudRecordDirty: vi.fn(), queueCloudPush: vi.fn() }));

import { APP_FUNNEL_CATALOG } from "@/lib/appPortfolio";
import { buildIdentity, ensureWorkspaceBootstrap, isSameBuild } from "@/lib/workspaceBootstrap";

const rows = (name: string) => [...(state.tables.get(name)?.values() || [])];
beforeEach(() => {
  state.tables.clear();
  state.queue = Promise.resolve();
});

describe("starter catalog without GitHub repositories", () => {
  it("the shipped catalog really does contain repo-less apps (so this test stays meaningful)", () => {
    expect(APP_FUNNEL_CATALOG.some((app) => !app.githubRepo.trim())).toBe(true);
  });

  it("every shipped app has a usable identity", () => {
    for (const app of APP_FUNNEL_CATALOG) expect(buildIdentity(app), app.name).not.toBe("");
  });

  it("seeds every shipped app — including the repo-less ones — instead of aborting", async () => {
    await expect(ensureWorkspaceBootstrap()).resolves.toBeUndefined();
    const names = new Set(rows("buildProjects").map((row) => row.name));
    for (const app of APP_FUNNEL_CATALOG) expect(names.has(app.name), app.name).toBe(true);
  });

  it("still reaches the stages after build projects: publisher feeds and watch rules", async () => {
    await ensureWorkspaceBootstrap();
    expect(rows("feedSources").length).toBeGreaterThan(0);
    expect(rows("watchTerms")).toHaveLength(10);
    expect(rows("links").length).toBeGreaterThan(0);
  });

  it("is idempotent across repeated and concurrent boots", async () => {
    await Promise.all([ensureWorkspaceBootstrap(), ensureWorkspaceBootstrap()]);
    const first = {
      builds: rows("buildProjects").length,
      feeds: rows("feedSources").length,
      terms: rows("watchTerms").length,
    };
    await ensureWorkspaceBootstrap();
    expect({
      builds: rows("buildProjects").length,
      feeds: rows("feedSources").length,
      terms: rows("watchTerms").length,
    }).toEqual(first);
  });

  it("a user's own repo-less build does not stop the repo-less seeds from appearing", async () => {
    state.tables.set(
      "buildProjects",
      new Map([["mine", { id: "mine", name: "My private tool", githubRepo: "", deployedUrl: "" }]]),
    );
    await ensureWorkspaceBootstrap();
    const names = new Set(rows("buildProjects").map((row) => row.name));
    expect(names.has("My private tool")).toBe(true);
    for (const app of APP_FUNNEL_CATALOG) expect(names.has(app.name), app.name).toBe(true);
  });
});

describe("build identity ladder", () => {
  it("prefers the repository, then the deployed URL, then the name", () => {
    expect(buildIdentity({ githubRepo: "https://github.com/o/r", deployedUrl: "https://x", name: "n" })).toBe("https://github.com/o/r");
    expect(buildIdentity({ githubRepo: " ", deployedUrl: "https://x", name: "n" })).toBe("https://x");
    expect(buildIdentity({ githubRepo: "", deployedUrl: "", projectUrl: "", name: "Only a name" })).toBe("Only a name");
    expect(buildIdentity({})).toBe("");
  });
  it("matches stored rows with the same ladder, case-insensitively, and tolerates missing fields", () => {
    expect(isSameBuild({ githubRepo: "HTTPS://github.com/O/R" }, { githubRepo: "https://github.com/o/r" })).toBe(true);
    expect(isSameBuild({ deployedUrl: "https://X/" }, { githubRepo: "", deployedUrl: "https://x/" })).toBe(true);
    expect(isSameBuild({ name: "Tool" }, { githubRepo: "", deployedUrl: "", name: "tool" })).toBe(true);
    // A stored row with no repository must not crash the comparison, nor match a repo seed.
    expect(isSameBuild({ name: "Tool" }, { githubRepo: "https://github.com/o/r" })).toBe(false);
  });
});
