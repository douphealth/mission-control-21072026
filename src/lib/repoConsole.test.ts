import { describe, expect, it } from "vitest";
import type { GitHubRepo } from "@/lib/db";
import type { LiveRepo } from "@/lib/liveGitHub";
import { normalizePagesProject } from "@/lib/cloudflareInventory.server";
import { buildRepoOps } from "@/lib/repoOps";
import {
  REPO_PREFS_DEFAULT,
  clearRepoFilter,
  normalizeRepoPrefs,
  repoDeployState,
  repoFilterChips,
  repoGroup,
  repoLinkGroups,
} from "@/lib/repoConsole";

const plan = (over: Partial<GitHubRepo> = {}): GitHubRepo => ({
  id: "p1",
  name: "alpha",
  url: "https://github.com/douphealth/alpha",
  description: "",
  language: "TypeScript",
  stars: 0,
  forks: 0,
  status: "active",
  demoUrl: "",
  progress: 0,
  topics: [],
  lastUpdated: "",
  ...over,
});
const live = (name: string): LiveRepo => ({
  key: "douphealth/" + name,
  owner: "douphealth",
  name,
  url: "https://github.com/douphealth/" + name,
  description: null,
  language: "TypeScript",
  updatedAt: null,
  pushedAt: "2026-11-02T00:00:00Z",
  defaultBranch: "main",
  visibility: "public",
  archived: false,
  fork: false,
  stars: 0,
  forks: 0,
  openIssues: 0,
  homepage: null,
});
const project = (status: string, repo = "alpha") =>
  normalizePagesProject("a".repeat(32), {
    name: repo + "-site",
    domains: [repo + ".example.com"],
    source: {
      type: "github",
      config: { owner: "douphealth", repo_name: repo, production_branch: "main" },
    },
    canonical_deployment: { id: "d1", latest_stage: { status } },
  })!;
const rowsFor = (
  saved: GitHubRepo[],
  names: string[],
  cloud = [] as ReturnType<typeof project>[],
) =>
  buildRepoOps({ displayRepos: saved, savedRepos: saved, live: names.map(live), owned: [], cloud });

describe("repoDeployState", () => {
  it("reports only what was observed: failure beats success, links are not deployments", () => {
    const [failing] = rowsFor([plan()], ["alpha"], [project("failure")]);
    expect(repoDeployState(failing)).toBe("failing");
    const [ok] = rowsFor([plan()], ["alpha"], [project("success")]);
    expect(repoDeployState(ok)).toBe("deployed");
    const [bare] = rowsFor([plan({ demoUrl: "" })], ["alpha"]);
    expect(repoDeployState(bare)).toBe("none");
    const [linked] = rowsFor([plan({ demoUrl: "https://alpha.example.org/" })], ["alpha"]);
    expect(repoDeployState(linked)).toBe("linked");
  });
});

describe("repoGroup", () => {
  const [row] = rowsFor([plan({ priority: "high" })], ["alpha"]);
  it("groups by the requested dimension with stable ordering", () => {
    expect(repoGroup(row, "priority")).toMatchObject({ key: "high", label: "High", order: 1 });
    expect(repoGroup(row, "owner").label).toBe("douphealth");
    expect(repoGroup(row, "none").key).toBe("all");
    const [unset] = rowsFor([plan({ priority: undefined })], ["alpha"]);
    expect(repoGroup(unset, "priority").order).toBeGreaterThan(3);
  });
});

describe("filter chips", () => {
  it("shows nothing at defaults and one removable chip per active control", () => {
    expect(repoFilterChips(REPO_PREFS_DEFAULT, "")).toEqual([]);
    const prefs = {
      ...REPO_PREFS_DEFAULT,
      quick: "failing" as const,
      owner: "douphealth",
      facets: { ...REPO_PREFS_DEFAULT.facets, language: "Python", activity: "stale" as const },
    };
    expect(repoFilterChips(prefs, " pricing ").map((c) => c.id)).toEqual([
      "query",
      "quick",
      "owner",
      "language",
      "activity",
    ]);
  });
  it("clears exactly one control without disturbing the rest", () => {
    const prefs = {
      ...REPO_PREFS_DEFAULT,
      quick: "issues" as const,
      facets: { ...REPO_PREFS_DEFAULT.facets, visibility: "private" as const },
    };
    const cleared = clearRepoFilter(prefs, "visibility");
    expect(cleared.prefs.facets.visibility).toBe("all");
    expect(cleared.prefs.quick).toBe("issues");
    expect(clearRepoFilter(prefs, "query").clearQuery).toBe(true);
    expect(clearRepoFilter(prefs, "quick").prefs.quick).toBe("all");
  });
});

describe("normalizeRepoPrefs", () => {
  it("upgrades preferences and saved views written before density/grouping existed", () => {
    const old = { quick: "stale", owner: "douphealth", sort: "name", facets: { language: "Go" } };
    const next = normalizeRepoPrefs(old);
    expect(next).toMatchObject({
      quick: "stale",
      owner: "douphealth",
      sort: "name",
      density: "comfortable",
      groupBy: "none",
    });
    expect(next.facets.language).toBe("Go");
    expect(next.facets.visibility).toBe("all");
  });
  it("rejects junk instead of crashing the console", () => {
    expect(normalizeRepoPrefs(null)).toEqual(REPO_PREFS_DEFAULT);
    expect(normalizeRepoPrefs({ groupBy: "<script>", density: 7 })).toMatchObject({
      groupBy: "none",
      density: "comfortable",
    });
  });
});

describe("repoLinkGroups", () => {
  it("builds every destination from the verified repository key and encodes the branch", () => {
    const [row] = rowsFor([plan()], ["alpha"]);
    const groups = repoLinkGroups({ ...row, defaultBranch: "feat/x y" });
    const urls = groups.flatMap((g) => g.links.map((l) => l.url));
    expect(urls).toContain("https://github.com/douphealth/alpha/pulls");
    expect(urls).toContain("https://github.dev/douphealth/alpha");
    expect(urls).toContain("https://github.com/douphealth/alpha/tree/feat%2Fx%20y");
    expect(urls.every((u) => u.startsWith("https://"))).toBe(true);
  });
});
