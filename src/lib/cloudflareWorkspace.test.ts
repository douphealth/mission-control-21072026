import { describe, expect, it } from "vitest";
import { normalizePagesProject, normalizeWorkerScript } from "@/lib/cloudflareInventory.server";
import {
  commitUrl,
  compareRows,
  healthOf,
  inventoryCsv,
  matchesQuick,
  quickCounts,
  relativeTime,
} from "@/lib/cloudflareWorkspace";

const A = "a".repeat(32);
const NOW = Date.parse("2026-11-03T12:00:00Z");
const git = normalizePagesProject(A, {
  name: "git-site",
  subdomain: "git-site.pages.dev",
  domains: ["www.example.com"],
  source: { type: "github", config: { owner: "o", repo_name: "r", production_branch: "main" } },
  canonical_deployment: {
    id: "d1",
    created_on: "2026-11-01T12:00:00Z",
    latest_stage: { status: "success" },
    deployment_trigger: { metadata: { commit_hash: "abcdef1234" } },
  },
})!;
const direct = normalizePagesProject(A, {
  name: "upload-site",
  subdomain: "upload-site.pages.dev",
  canonical_deployment: {
    id: "d2",
    created_on: "2026-01-01T00:00:00Z",
    latest_stage: { status: "success" },
  },
})!;
const empty = normalizePagesProject(A, {
  name: "empty-site",
  source: { type: "github", config: {} },
})!;
const worker = normalizeWorkerScript(A, { id: "api", deployed_on: "2026-11-03T08:00:00Z" }, [])!;

describe("Cloudflare workspace view model", () => {
  it("classifies quick filters", () => {
    expect(matchesQuick(git, "custom", NOW)).toBe(true);
    expect(matchesQuick(git, "git", NOW)).toBe(true);
    expect(matchesQuick(git, "recent", NOW)).toBe(true);
    expect(matchesQuick(direct, "direct", NOW)).toBe(true);
    expect(matchesQuick(direct, "pagesdev", NOW)).toBe(true);
    expect(matchesQuick(direct, "stale", NOW)).toBe(true);
    expect(matchesQuick(empty, "none", NOW)).toBe(true);
    expect(matchesQuick(worker, "workers", NOW)).toBe(true);
    expect(quickCounts([git, direct, empty, worker], NOW)).toMatchObject({
      all: 4,
      none: 1,
      workers: 1,
      git: 2,
    });
  });
  it("derives health for legacy rows without the health field", () => {
    expect(healthOf({ ...git, health: undefined })).toBe("live");
    expect(healthOf({ ...empty, health: undefined })).toBe("none");
  });
  it("links commits only from Cloudflare-reported repo and SHA", () => {
    expect(commitUrl(git)).toBe("https://github.com/o/r/commit/abcdef1234");
    expect(commitUrl(direct)).toBeNull();
  });
  it("sorts problems first by health and newest first by deployment", () => {
    expect(
      [direct, empty, git].sort((a, b) => compareRows(a, b, "health")).map((r) => r.name)[0],
    ).toBe("empty-site");
    expect([direct, git].sort((a, b) => compareRows(a, b, "deployed")).map((r) => r.name)).toEqual([
      "git-site",
      "upload-site",
    ]);
  });
  it("formats relative time and neutralises CSV formulas", () => {
    expect(relativeTime("2026-11-03T11:00:00Z", NOW)).toBe("1h ago");
    expect(relativeTime(null, NOW)).toBe("—");
    const csv = inventoryCsv([{ ...git, name: "=cmd" }], () => "Main");
    expect(csv).toContain('"\'=cmd"');
    expect(csv.split("\r\n")).toHaveLength(2);
  });
});
