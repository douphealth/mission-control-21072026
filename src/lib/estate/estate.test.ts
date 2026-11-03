import { describe, expect, it, vi } from "vitest";
import {
  collectAccountRepos,
  collectGitHubEstate,
  mapRepo,
  mergeRepos,
  type GqlRepo,
} from "@/lib/estate/githubCollector.server";
import {
  CloudflareActionError,
  mapDeployment,
  mapPagesProject,
  mapWorker,
  mapZone,
  pagesDeploymentAction,
  pagesHealth,
} from "@/lib/estate/cloudflareCollector.server";
import { SnapshotCache } from "@/lib/estate/estateCache.server";
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  EMPTY_ANNOTATION,
  attentionItems,
  linkEstate,
  matchesFilters,
  reposToCsv,
  sortRepos,
  sourceRepoState,
  summarize,
  type RepoAnnotation,
} from "@/lib/estate/model";
import type { EstateGitHubAccount, EstateSnapshot } from "@/lib/estate/types";

const NOW = Date.parse("2026-11-02T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();
const ACCOUNT = "0123456789abcdef0123456789abcdef";

function gql(
  fullName: string,
  over: Partial<GqlRepo> = {},
  ci: string | null = "SUCCESS",
): GqlRepo {
  const [owner, name] = fullName.split("/") as [string, string];
  return {
    nameWithOwner: fullName,
    name,
    owner: { login: owner },
    description: name + " description",
    url: "https://github.com/" + fullName,
    homepageUrl: null,
    isPrivate: false,
    isFork: false,
    isArchived: false,
    isTemplate: false,
    primaryLanguage: { name: "TypeScript", color: "#3178c6" },
    repositoryTopics: { nodes: [] },
    stargazerCount: 1,
    forkCount: 0,
    issues: { totalCount: 2 },
    pullRequests: { totalCount: 1 },
    diskUsage: 100,
    defaultBranchRef: {
      name: "main",
      target: {
        oid: "abc123",
        messageHeadline: "fix: thing",
        committedDate: daysAgo(1),
        url: "https://github.com/" + fullName + "/commit/abc123",
        author: { name: "A", user: { login: owner } },
        history: { totalCount: 10 },
        statusCheckRollup: ci ? { state: ci } : null,
      },
    },
    latestRelease: null,
    licenseInfo: { spdxId: "MIT", name: "MIT License" },
    createdAt: daysAgo(400),
    updatedAt: daysAgo(1),
    pushedAt: daysAgo(1),
    ...over,
  };
}
const repo = (
  full: string,
  account: EstateGitHubAccount,
  over?: Partial<GqlRepo>,
  ci?: string | null,
) => mapRepo(gql(full, over, ci === undefined ? "SUCCESS" : ci), account);

function deployment(id: string, status: string, environment = "production") {
  return {
    id,
    short_id: id.slice(0, 8),
    environment,
    created_on: daysAgo(0.1),
    url: "https://" + id.slice(0, 8) + ".site.pages.dev",
    latest_stage: { name: "deploy", status },
    deployment_trigger: {
      metadata: { branch: "main", commit_hash: "abc", commit_message: "ship it\nbody" },
    },
    aliases: [],
  };
}

function snapshot(): EstateSnapshot {
  const pages = [
    mapPagesProject(ACCOUNT, "Main", {
      name: "shop-site",
      subdomain: "shop-site.pages.dev",
      domains: ["shop-site.pages.dev", "shop.example.com"],
      source: { type: "github", config: { owner: "Papalexios", repo_name: "shop" } },
      latest_deployment: deployment("11111111-aaaa", "failure"),
      canonical_deployment: deployment("00000000-bbbb", "success"),
    })!,
    mapPagesProject(ACCOUNT, "Main", {
      name: "Blog_Engine",
      subdomain: "blog-engine.pages.dev",
      domains: ["blog-engine.pages.dev"],
      latest_deployment: deployment("22222222-cccc", "success"),
      canonical_deployment: deployment("22222222-cccc", "success"),
    })!,
    mapPagesProject(ACCOUNT, "Main", {
      name: "orphan",
      subdomain: "orphan.pages.dev",
      domains: [],
      source: { type: "github", config: { owner: "douphealth", repo_name: "gone" } },
    })!,
  ];
  return {
    version: 1,
    fetchedAt: new Date(NOW).toISOString(),
    github: {
      truthState: "partial",
      accounts: [
        {
          account: "douphealth",
          state: "not_connected",
          repoCount: 0,
          error: null,
          fetchedAt: null,
        },
        { account: "Papalexios", state: "live", repoCount: 3, error: null, fetchedAt: null },
        {
          account: "papalexios01",
          state: "error",
          repoCount: 0,
          error: "Token rejected",
          fetchedAt: null,
        },
      ] as EstateSnapshot["github"]["accounts"],
      repos: [
        repo("Papalexios/shop", "Papalexios"),
        repo("Papalexios/blog-engine", "Papalexios", { isPrivate: true }, "FAILURE"),
        repo(
          "Papalexios/old-thing",
          "Papalexios",
          { pushedAt: daysAgo(400), isArchived: true },
          null,
        ),
        repo("Papalexios/quiet-pinned", "Papalexios", { pushedAt: daysAgo(300) }, null),
      ],
    },
    cloudflare: {
      truthState: "live",
      accounts: [
        {
          accountId: ACCOUNT,
          label: "Main",
          state: "live",
          pagesCount: 3,
          workersCount: 1,
          zonesCount: 1,
          errors: [],
          dashboardUrl: "https://dash.cloudflare.com/" + ACCOUNT,
        },
      ],
      pages,
      workers: [mapWorker(ACCOUNT, "Main", { id: "shop" }, [], ["api.shop.example.com"])!],
      zones: [
        mapZone(ACCOUNT, "Main", {
          id: ACCOUNT,
          name: "example.com",
          status: "active",
          plan: { name: "Free" },
        })!,
      ],
    },
  };
}

describe("estate model", () => {
  const ann = new Map<string, RepoAnnotation>([
    [
      "papalexios/quiet-pinned",
      { ...EMPTY_ANNOTATION, pinned: true, priority: "high", recordId: "r1" },
    ],
  ]);

  it("links Pages by source repo first and by name for direct uploads", () => {
    const e = linkEstate(snapshot(), ann, NOW);
    const shop = e.pages.find((p) => p.name === "shop-site")!;
    expect(shop.linkedRepo).toBe("Papalexios/shop");
    expect(shop.linkMatch).toBe("source");
    const blog = e.pages.find((p) => p.name === "Blog_Engine")!;
    expect(blog.linkedRepo).toBe("Papalexios/blog-engine");
    expect(blog.linkMatch).toBe("name");
    expect(e.pages.find((p) => p.name === "orphan")!.linkedRepo).toBeNull();
    const shopRow = e.repos.find((r) => r.key === "papalexios/shop")!;
    expect(shopRow.deployState).toBe("failing");
    expect(shopRow.links.map((l) => l.kind).sort()).toEqual(["pages", "worker"]);
  });

  it("filters by CI, visibility, archive mode, pin and free text", () => {
    const rows = linkEstate(snapshot(), ann, NOW).repos;
    const pick = (f: Partial<typeof DEFAULT_FILTERS>) =>
      rows.filter((r) => matchesFilters(r, { ...DEFAULT_FILTERS, ...f })).map((r) => r.name);
    expect(pick({})).not.toContain("old-thing");
    expect(pick({ archived: "only" })).toEqual(["old-thing"]);
    expect(pick({ ci: "failing" })).toEqual(["blog-engine"]);
    expect(pick({ visibility: "private" })).toEqual(["blog-engine"]);
    expect(pick({ pinned: true })).toEqual(["quiet-pinned"]);
    expect(pick({ deploy: "failing" })).toEqual(["shop"]);
    expect(pick({ q: "shop.example" })).toEqual(["shop"]);
  });

  it("keeps pinned repos first, then applies the chosen sort", () => {
    const rows = linkEstate(snapshot(), ann, NOW).repos;
    const sorted = sortRepos(rows, DEFAULT_SORT).map((r) => r.name);
    expect(sorted[0]).toBe("quiet-pinned");
    expect(sorted.at(-1)).toBe("old-thing");
    const byName = sortRepos(rows, { key: "name", dir: "asc" }).map((r) => r.name);
    expect(byName).toEqual(["quiet-pinned", "blog-engine", "old-thing", "shop"]);
  });

  it("summarises only real counts", () => {
    const s = summarize(linkEstate(snapshot(), ann, NOW), 1, NOW);
    expect(s).toMatchObject({
      repos: 4,
      privateRepos: 1,
      ciFailing: 1,
      pages: 3,
      workers: 1,
      zones: 1,
      failingDeploys: 1,
      unlinkedPages: 1,
      pinned: 1,
    });
    expect(s.openPrs).toBe(3); // archived repo excluded
  });

  it("ranks failing deploys and CI before quiet priorities", () => {
    const snap = snapshot();
    const items = attentionItems(linkEstate(snap, ann, NOW), snap);
    const kinds = items.map((i) => i.kind);
    expect(items[0]!.severity).toBe("critical");
    expect(kinds).toContain("deploy_failed");
    expect(kinds).toContain("ci_failing");
    expect(kinds).toContain("stale_priority");
    expect(kinds).toContain("account");
    expect(kinds.indexOf("stale_priority")).toBeGreaterThan(kinds.indexOf("ci_failing"));
  });

  it("exports CSV with quoting and formula neutralisation", () => {
    const snap = snapshot();
    snap.github.repos[0]!.fullName = "=cmd|calc";
    const csv = reposToCsv(linkEstate(snap, new Map(), NOW).repos);
    expect(csv.split("\n")[0]).toMatch(/^repo,account,/);
    expect(csv).toContain(`"'=cmd|calc"`);
  });
});

describe("Cloudflare mapping", () => {
  it("only a failed production build makes Pages unhealthy", () => {
    const prod = mapDeployment(deployment("00000000-bbbb", "success"), "00000000-bbbb");
    const failedPreview = mapDeployment(deployment("33333333-dddd", "failure", "preview"), null);
    const failedProd = mapDeployment(deployment("44444444-eeee", "failure"), null);
    expect(prod!.isCurrentProduction).toBe(true);
    expect(prod!.commitMessage).toBe("ship it");
    expect(pagesHealth(failedPreview, prod)).toBe("healthy");
    expect(pagesHealth(failedProd, prod)).toBe("failing");
    expect(pagesHealth(null, null)).toBe("unknown");
  });

  it("rejects unsafe names and malformed zones", () => {
    expect(mapPagesProject(ACCOUNT, "Main", { name: "../etc" })).toBeNull();
    expect(mapZone(ACCOUNT, "Main", { id: "nope", name: "x.com" })).toBeNull();
    const direct = mapPagesProject(ACCOUNT, "Main", {
      name: "plain",
      subdomain: "plain.pages.dev",
    })!;
    expect(direct.source.type).toBe("direct_upload");
    expect(direct.url).toBe("https://plain.pages.dev");
  });

  it("refuses a deployment action whose typed confirmation does not match", async () => {
    const env = {
      CLOUDFLARE_ACCOUNT_IDS: ACCOUNT,
      CLOUDFLARE_ACCOUNT_TOKENS_JSON: JSON.stringify({ [ACCOUNT]: "x".repeat(40) }),
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(
      pagesDeploymentAction(env, {
        accountId: ACCOUNT,
        project: "shop-site",
        deploymentId: "11111111-aaaa",
        action: "rollback",
        confirmName: "shop",
      }),
    ).rejects.toBeInstanceOf(CloudflareActionError);
    await expect(
      pagesDeploymentAction(env, {
        accountId: "f".repeat(32),
        project: "shop-site",
        deploymentId: "11111111-aaaa",
        action: "retry",
        confirmName: "shop-site",
      }),
    ).rejects.toThrow("Unknown Cloudflare account");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe("GitHub collector", () => {
  const page = (login: string, nodes: GqlRepo[], next: string | null) =>
    new Response(
      JSON.stringify({
        data: {
          viewer: {
            login,
            repositories: { pageInfo: { hasNextPage: Boolean(next), endCursor: next }, nodes },
          },
        },
      }),
      { status: 200 },
    );

  it("paginates until the last page", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(page("Papalexios", [gql("Papalexios/a")], "c1"))
      .mockResolvedValueOnce(page("Papalexios", [gql("Papalexios/b")], null));
    const repos = await collectAccountRepos(
      "Papalexios",
      "t".repeat(40),
      f as unknown as typeof fetch,
    );
    expect(repos.map((r) => r.name)).toEqual(["a", "b"]);
    expect(f).toHaveBeenCalledTimes(2);
    expect(JSON.parse(f.mock.calls[1]![1].body).variables.cursor).toBe("c1");
  });

  it("retries a slow page once with a smaller page size", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(new Response("<html>timeout</html>", { status: 502 }))
      .mockResolvedValueOnce(page("Papalexios", [gql("Papalexios/a")], null));
    const repos = await collectAccountRepos(
      "Papalexios",
      "t".repeat(40),
      f as unknown as typeof fetch,
    );
    expect(repos).toHaveLength(1);
    expect(JSON.parse(f.mock.calls[1]![1].body).variables.size).toBeLessThan(
      JSON.parse(f.mock.calls[0]![1].body).variables.size,
    );
  });

  it("rejects a token that belongs to a different account", async () => {
    const f = vi.fn().mockResolvedValue(page("someone-else", [], null));
    await expect(
      collectAccountRepos("Papalexios", "t".repeat(40), f as unknown as typeof fetch),
    ).rejects.toThrow("identity");
  });

  it("dedupes shared repos in favour of the owning account", () => {
    const viaCollaborator = repo("Papalexios/shared", "papalexios01");
    const viaOwner = repo("Papalexios/shared", "Papalexios");
    const merged = mergeRepos([[viaCollaborator], [viaOwner]]);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.account).toBe("Papalexios");
  });

  it("reports per-account truth without leaking provider bodies or tokens", async () => {
    const secret = "ghp_" + "s".repeat(36);
    const f = vi.fn(async (_url: string, init: RequestInit) => {
      const auth = (init.headers as Record<string, string>).Authorization;
      if (auth.includes(secret))
        return new Response(JSON.stringify({ message: "Bad credentials " + secret }), {
          status: 401,
        });
      return page("Papalexios", [gql("Papalexios/a")], null);
    });
    const env = {
      GITHUB_PORTFOLIO_TOKENS_JSON: JSON.stringify({
        papalexios: "t".repeat(40),
        papalexios01: secret,
      }),
    };
    const res = await collectGitHubEstate(env, f as unknown as typeof fetch);
    expect(res.truthState).toBe("partial");
    const byAccount = Object.fromEntries(res.accounts.map((a) => [a.account, a]));
    expect(byAccount.Papalexios!.state).toBe("live");
    expect(byAccount.douphealth!.state).toBe("not_connected");
    expect(byAccount.papalexios01!.state).toBe("error");
    expect(JSON.stringify(res)).not.toContain(secret);
    expect(JSON.stringify(res)).not.toContain("Bad credentials");
  });

  it("is not connected when no tokens are configured", async () => {
    const f = vi.fn();
    const res = await collectGitHubEstate({}, f as unknown as typeof fetch);
    expect(res.truthState).toBe("not_connected");
    expect(res.repos).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });
});

describe("server snapshot cache", () => {
  it("serves fresh hits, shares one in-flight load and honours force", async () => {
    let t = 0;
    const cache = new SnapshotCache<number>(1000, () => t);
    let calls = 0;
    const load = () => new Promise<number>((r) => setTimeout(() => r(++calls), 5));
    const [a, b] = await Promise.all([cache.get(load), cache.get(load)]);
    expect(a[0]).toBe(1);
    expect(b[0]).toBe(1);
    expect(calls).toBe(1);
    expect((await cache.get(load))[1]).toBe(true);
    t = 2000;
    expect((await cache.get(load))[0]).toBe(2);
    expect((await cache.get(load, true))[0]).toBe(3);
  });

  it("does not cache a failed load", async () => {
    const cache = new SnapshotCache<number>(1000, () => 0);
    await expect(cache.get(() => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    expect((await cache.get(async () => 7))[0]).toBe(7);
  });
});

describe("Pages source repo state", () => {
  const accounts = snapshot().github.accounts;
  const p = (owner: string | null, repo: string | null, linkedRepo: string | null = null) => ({
    linkedRepo,
    source: { owner, repo },
  });
  it("only calls a repo missing when its owner was indexed", () => {
    expect(sourceRepoState(p("Papalexios", "shop", "Papalexios/shop"), accounts)).toBe("linked");
    expect(sourceRepoState(p(null, null), accounts)).toBe("direct");
    expect(sourceRepoState(p("papalexios", "deleted"), accounts)).toBe("missing");
    expect(sourceRepoState(p("douphealth", "x"), accounts)).toBe("not_indexed");
    expect(sourceRepoState(p("papalexios01", "x"), accounts)).toBe("not_indexed");
    expect(sourceRepoState(p("stranger", "x"), accounts)).toBe("external");
  });
});
