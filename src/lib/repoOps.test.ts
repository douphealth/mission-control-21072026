import { describe, expect, it } from "vitest";
import type { GitHubRepo } from "@/lib/db";
import type { LiveRepo } from "@/lib/liveGitHub";
import type { OwnedRepoSnapshot } from "@/lib/githubPrivateInventory.server";
import { normalizePagesProject } from "@/lib/cloudflareInventory.server";
import {
  buildRepoOps,
  compareRepoRows,
  matchesRepoQuick,
  repoOpsCsv,
  repoQuickCounts,
} from "@/lib/repoOps";

const NOW = Date.parse("2026-11-03T12:00:00Z");
const plan = (over: Partial<GitHubRepo>): GitHubRepo => ({
  id: "saved-1",
  name: "alpha",
  url: "https://github.com/douphealth/alpha",
  description: "Saved desc",
  language: "TypeScript",
  stars: 0,
  forks: 0,
  status: "active",
  demoUrl: "",
  progress: 10,
  topics: [],
  lastUpdated: "2026-10-01",
  priority: "high",
  pendingSummary: "Ship pricing page",
  ...over,
});
const live = (name: string, over: Partial<LiveRepo> = {}): LiveRepo => ({
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
  stars: 1,
  forks: 0,
  openIssues: 0,
  homepage: null,
  ...over,
});
const owned = (name: string, over: Partial<OwnedRepoSnapshot> = {}): OwnedRepoSnapshot => ({
  owner: "Papalexios",
  name,
  url: "https://github.com/Papalexios/" + name,
  visibility: "private",
  description: "Private tool",
  language: "Python",
  defaultBranch: "main",
  pushedAt: "2025-01-01T00:00:00Z",
  updatedAt: null,
  archived: false,
  fork: false,
  stars: 0,
  forks: 0,
  openIssues: 4,
  homepage: null,
  ...over,
});
const cf = normalizePagesProject("a".repeat(32), {
  name: "alpha-site",
  domains: ["alpha.example.com"],
  source: {
    type: "github",
    config: { owner: "douphealth", repo_name: "alpha", production_branch: "main" },
  },
  canonical_deployment: { id: "d1", latest_stage: { status: "success" } },
  latest_deployment: { id: "d2", environment: "production", latest_stage: { status: "failure" } },
})!;

describe("unified repository operations model", () => {
  const saved = [plan({})];
  const rows = buildRepoOps({
    displayRepos: saved,
    savedRepos: saved,
    live: [live("alpha", { openIssues: 3 }), live("beta", { archived: true })],
    owned: [owned("secret-tool")],
    cloud: [cf],
  });
  const byKey = new Map(rows.map((r) => [r.key, r]));

  it("joins saved plans, live metadata, private repos and Cloudflare deployments", () => {
    expect(rows.map((r) => r.key).sort()).toEqual([
      "douphealth/alpha",
      "douphealth/beta",
      "papalexios/secret-tool",
    ]);
    const alpha = byKey.get("douphealth/alpha")!;
    expect(alpha.saved).toBe(true);
    expect(alpha.plan.priority).toBe("high");
    expect(alpha.openIssues).toBe(3);
    expect(alpha.source).toBe("github-api");
    expect(alpha.cloudflare.map((c) => c.name)).toEqual(["alpha-site"]);
    expect(alpha.appUrl).toBe("https://alpha.example.com/");
    const secret = byKey.get("papalexios/secret-tool")!;
    expect(secret).toMatchObject({
      visibility: "private",
      source: "authenticated",
      saved: false,
      owner: "Papalexios",
    });
  });
  it("links Cloudflare only via the reported Git source, never by name", () => {
    expect(byKey.get("douphealth/beta")!.cloudflare).toHaveLength(0);
  });
  it("computes quick filters", () => {
    expect(matchesRepoQuick(byKey.get("douphealth/alpha")!, "failing", NOW)).toBe(true);
    expect(matchesRepoQuick(byKey.get("douphealth/alpha")!, "attention", NOW)).toBe(true);
    expect(matchesRepoQuick(byKey.get("douphealth/beta")!, "archived", NOW)).toBe(true);
    expect(matchesRepoQuick(byKey.get("douphealth/beta")!, "undeployed", NOW)).toBe(false);
    expect(matchesRepoQuick(byKey.get("papalexios/secret-tool")!, "stale", NOW)).toBe(true);
    expect(repoQuickCounts(rows, NOW)).toMatchObject({
      all: 3,
      private: 1,
      cloudflare: 1,
      issues: 2,
      unplanned: 2,
    });
  });
  it("sorts by priority then importance, and by most recent push", () => {
    expect([...rows].sort((a, b) => compareRepoRows(a, b, "priority"))[0].key).toBe(
      "douphealth/alpha",
    );
    expect([...rows].sort((a, b) => compareRepoRows(a, b, "pushed")).at(-1)!.key).toBe(
      "papalexios/secret-tool",
    );
  });
  it("exports formula-safe CSV", () => {
    const csv = repoOpsCsv([
      { ...byKey.get("douphealth/alpha")!, plan: plan({ pendingSummary: "=HYPERLINK(x)" }) },
    ]);
    expect(csv).toContain('"\'=HYPERLINK(x)"');
  });
});

describe("GitHub Portfolio app link evidence resolution", () => {
  it("shows operator-curated app links even if Cloudflare inventory lacks Git provenance", () => {
    const rows = buildRepoOps({
      displayRepos: [plan({ id: "index", name: "index-engine", url: "https://github.com/douphealth/index-engine", demoUrl: "" })],
      savedRepos: [],
      live: [], owned: [], cloud: [],
    });
    expect(rows[0].appUrl).toBe("https://index-engine-dashboard.papalexios.workers.dev/");
    expect(rows[0].appEvidence?.origin).toBe("app-catalog");
    expect(rows[0].appEvidence?.providerAttested).toBe(false);
  });

  it("resolves direct-upload Cloudflare deployments only by exact known endpoint", () => {
    const app = "https://acme-test.pages.dev/";
    const direct = { ...cf, key: "pages:a:acme-test", name: "acme-test",
      repoUrl: null, publicUrl: app, pagesDevUrl: app, domains: [] };
    const row = buildRepoOps({
      displayRepos: [plan({ id: "custom", name: "some-repo", url: "https://github.com/douphealth/some-repo", demoUrl: app })],
      savedRepos: [], live: [], owned: [], cloud: [direct],
    })[0];
    expect(row.cloudflare.map(c => c.key)).toEqual([direct.key]);
    expect(row.appUrl).toBe(app);
    expect(row.appEvidence?.origin).toBe("cloudflare-endpoint");
  });

  it("refuses to associate ambiguous Cloudflare resource endpoints", () => {
    const url = "https://same.example.com/";
    const twins = [{ ...cf, key: "pages:a:one", repoUrl: null, publicUrl: url },
      { ...cf, key: "worker:a:two", repoUrl: null, publicUrl: url }];
    const row = buildRepoOps({ displayRepos: [plan({ demoUrl: url })], savedRepos: [],
      live: [], owned: [], cloud: twins })[0];
    expect(row.cloudflare).toHaveLength(0);
    expect(row.appUrl).toBe(url);
    expect(row.appEvidence?.origin).toBe("saved-plan");
  });

  it("keeps an unmatched repo without invented Pages or Workers URL", () => {
    const row = buildRepoOps({ displayRepos: [plan({ demoUrl: "" })], savedRepos: [],
      live: [], owned: [], cloud: [] })[0];
    expect(row.appUrl).toBeNull();
    expect(row.appEvidence).toBeNull();
  });

  it("prefers Cloudflare-reported Git source to historical or saved app URLs", () => {
    const row = buildRepoOps({ displayRepos: [plan({ demoUrl: "https://old.example.com/" })],
      savedRepos: [], live: [], owned: [], cloud: [cf] })[0];
    expect(row.appUrl).toBe("https://alpha.example.com/");
    expect(row.appEvidence?.origin).toBe("cloudflare-source");
  });
});
