import { afterEach, describe, expect, it, vi } from "vitest";
import {
  collectCloudflareInventory,
  listAllPagesProjects,
  normalizePagesProject,
  PAGES_PAGE_SIZE,
} from "@/lib/cloudflareInventory.server";
import { mergeCloudflareInventories, unreachableAccountPart } from "@/lib/cloudflareInventoryMerge";

const ACCOUNT = "c".repeat(32);
const SECOND = "d".repeat(32);
const projects = (count: number, prefix = "site") =>
  Array.from({ length: count }, (_, i) => ({
    name: prefix + "-" + String(i + 1).padStart(3, "0"),
  }));

type Meta = (page: number, perPage: number, total: number) => Record<string, number>;
/** Synthetic Pages API. `meta` lets a test reproduce Cloudflare's capped result_info. */
function pagesApi(
  all: unknown[],
  meta: Meta,
  opts: { rejectPerPage?: boolean; ignorePage?: boolean; defaultSize?: number } = {},
) {
  const calls: string[] = [];
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    calls.push(url.pathname + url.search);
    if (opts.rejectPerPage && url.searchParams.has("per_page")) {
      return new Response(JSON.stringify({ success: false, errors: [{ code: 8000024 }] }), {
        status: 400,
      });
    }
    const perPage = Number(url.searchParams.get("per_page") || opts.defaultSize || 25);
    const page = opts.ignorePage ? 1 : Number(url.searchParams.get("page") || 1);
    const result = all.slice((page - 1) * perPage, page * perPage);
    return new Response(
      JSON.stringify({
        success: true,
        result,
        result_info: {
          page,
          per_page: perPage,
          count: result.length,
          ...meta(page, perPage, all.length),
        },
      }),
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

describe("exhaustive Cloudflare Pages pagination", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns all 185 projects when Cloudflare caps result_info at 100 (the reported bug)", async () => {
    const calls = pagesApi(projects(185), () => ({ total_count: 100, total_pages: 10 }));
    const listing = await listAllPagesProjects(ACCOUNT, "synthetic-read");
    expect(listing.projects).toHaveLength(185);
    expect(listing.reportedTotal).toBe(100);
    // 19 real pages + at most a couple of probe requests beyond the end.
    expect(listing.requests).toBeGreaterThanOrEqual(19);
    expect(listing.requests).toBeLessThanOrEqual(21);
    expect(calls.every((c) => c.includes("per_page=" + PAGES_PAGE_SIZE))).toBe(true);
  });

  it("uses exactly the needed requests when metadata is accurate", async () => {
    pagesApi(projects(185), (_p, per, total) => ({
      total_count: total,
      total_pages: Math.ceil(total / per),
    }));
    const listing = await listAllPagesProjects(ACCOUNT, "synthetic-read");
    expect(listing.projects).toHaveLength(185);
    expect(listing.requests).toBe(19);
  });

  it("keeps paging when metadata is missing entirely", async () => {
    pagesApi(projects(73), () => ({}));
    expect((await listAllPagesProjects(ACCOUNT, "synthetic-read")).projects).toHaveLength(73);
  });

  it("handles an exact multiple of the page size (empty terminal page)", async () => {
    pagesApi(projects(190), () => ({ total_count: 100, total_pages: 10 }));
    expect((await listAllPagesProjects(ACCOUNT, "synthetic-read")).projects).toHaveLength(190);
  });

  it("fails closed when Cloudflare ignores the page parameter instead of showing a partial list", async () => {
    pagesApi(projects(185), () => ({ total_count: 100, total_pages: 10 }), { ignorePage: true });
    await expect(listAllPagesProjects(ACCOUNT, "synthetic-read")).rejects.toThrow(
      /repeated a page/,
    );
  });

  it("fails closed when fewer projects arrive than Cloudflare reports", async () => {
    pagesApi(projects(15), () => ({ total_count: 40, total_pages: 4 }));
    await expect(listAllPagesProjects(ACCOUNT, "synthetic-read")).rejects.toThrow(/incomplete/);
  });

  it("falls back to the API default page size without trusting a capped total", async () => {
    const calls = pagesApi(projects(185), () => ({ total_count: 100, total_pages: 1 }), {
      rejectPerPage: true,
      defaultSize: 100,
    });
    const listing = await listAllPagesProjects(ACCOUNT, "synthetic-read");
    expect(listing.mode).toBe("default");
    expect(listing.projects).toHaveLength(185);
    expect(calls).toContain("/client/v4/accounts/" + ACCOUNT + "/pages/projects?page=2");
  });

  it("deduplicates overlapping pages by project name", async () => {
    const all = projects(25);
    const calls: number[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const page = Number(new URL(String(input)).searchParams.get("page"));
        calls.push(page);
        // Page 2 overlaps page 1 by one row (e.g. a project created mid-listing).
        const start = page === 1 ? 0 : (page - 1) * 10 - 1;
        const result = all.slice(start, start + 10);
        return new Response(JSON.stringify({ success: true, result, result_info: {} }));
      }),
    );
    const listing = await listAllPagesProjects(ACCOUNT, "synthetic-read");
    expect(new Set(listing.projects.map((p) => (p as { name: string }).name)).size).toBe(
      listing.projects.length,
    );
    expect(listing.projects.length).toBeGreaterThanOrEqual(24);
  });

  it("reports Pages completeness diagnostics per account and keeps every project", async () => {
    pagesApi(projects(185), () => ({ total_count: 100, total_pages: 10 }));
    const inventory = await collectCloudflareInventory(
      { CLOUDFLARE_ACCOUNT_IDS: ACCOUNT, CLOUDFLARE_API_TOKEN: "synthetic-read" },
      { accountId: ACCOUNT, section: "pages" },
    );
    expect(inventory.truthState).toBe("live");
    expect(inventory.rows.filter((r) => r.kind === "pages")).toHaveLength(185);
    expect(inventory.accountDetails[0]).toMatchObject({
      pagesCount: 185,
      pagesReportedTotal: 100,
      sections: ["pages"],
      deployEnabled: false,
    });
    expect(JSON.stringify(inventory)).not.toContain("synthetic-read");
  });

  it("rejects scopes for accounts that are not configured", async () => {
    await expect(
      collectCloudflareInventory(
        { CLOUDFLARE_ACCOUNT_IDS: ACCOUNT, CLOUDFLARE_API_TOKEN: "x" },
        { accountId: SECOND },
      ),
    ).rejects.toThrow(/Unknown Cloudflare account/);
  });
});

describe("Pages deployment health", () => {
  it("flags a failed newer production build while the old deployment still serves", () => {
    const row = normalizePagesProject(ACCOUNT, {
      name: "broken-build",
      subdomain: "broken-build.pages.dev",
      source: { type: "github", config: { owner: "o", repo_name: "r", production_branch: "main" } },
      canonical_deployment: {
        id: "ok-1",
        environment: "production",
        latest_stage: { status: "success" },
      },
      latest_deployment: {
        id: "bad-2",
        environment: "production",
        created_on: "2026-11-02T00:00:00Z",
        latest_stage: { status: "failure" },
        deployment_trigger: { metadata: { branch: "main", commit_hash: "abc" } },
      },
    });
    expect(row?.health).toBe("failing");
    expect(row?.status).toBe("success");
    expect(row?.latestProduction).toMatchObject({ id: "bad-2", status: "failure", commit: "abc" });
    expect(row?.sourceType).toBe("github");
    expect(row?.pagesDevUrl).toBe("https://broken-build.pages.dev/");
  });
  it("ignores failed preview deployments", () => {
    const row = normalizePagesProject(ACCOUNT, {
      name: "preview-noise",
      canonical_deployment: { id: "ok-1", latest_stage: { status: "success" } },
      latest_deployment: { id: "p-2", environment: "preview", latest_stage: { status: "failure" } },
    });
    expect(row?.health).toBe("live");
    expect(row?.latestProduction).toBeNull();
    expect(row?.sourceType).toBe("direct_upload");
  });
  it("marks projects without any production deployment", () => {
    expect(
      normalizePagesProject(ACCOUNT, { name: "empty", source: { type: "gitlab" } })?.health,
    ).toBe("none");
  });
});

describe("client-side merge of per-account, per-section inventories", () => {
  const part = (
    accountId: string,
    section: "pages" | "platform",
    over: Record<string, unknown> = {},
  ) => ({
    truthState: "live" as const,
    source: "Cloudflare API" as const,
    fetchedAt: "2026-11-03T00:00:00Z",
    accounts: [accountId],
    errors: [] as string[],
    zones: [],
    rows:
      section === "pages"
        ? [normalizePagesProject(accountId, { name: "p-" + accountId.slice(0, 3) })!]
        : [],
    accountDetails: [
      {
        accountId,
        label: "L" + accountId.slice(0, 1),
        truthState: "live" as const,
        configuredToken: true,
        pagesCount: section === "pages" ? 1 : 0,
        workersCount: 0,
        zonesCount: section === "platform" ? 2 : 0,
        errors: [] as string[],
        sections: [section],
        ...over,
      },
    ],
  });
  it("sums sections into one account summary with the same truth rules", () => {
    const merged = mergeCloudflareInventories([
      part(ACCOUNT, "pages", { pagesApiRequests: 19, pagesReportedTotal: 100 }),
      part(ACCOUNT, "platform", { errors: ["Worker domains unavailable"] }),
      part(SECOND, "pages"),
      part(SECOND, "platform"),
    ]);
    expect(merged.accounts).toEqual([ACCOUNT, SECOND]);
    expect(merged.accountDetails[0]).toMatchObject({
      pagesCount: 1,
      zonesCount: 2,
      truthState: "partial",
      pagesApiRequests: 19,
      pagesReportedTotal: 100,
    });
    expect(merged.accountDetails[1].truthState).toBe("live");
    expect(merged.truthState).toBe("partial");
    expect(merged.rows).toHaveLength(2);
  });
  it("records an unreachable section as an explicit error, never as zero projects", () => {
    const merged = mergeCloudflareInventories([
      unreachableAccountPart(ACCOUNT, "Main", "pages", "2026-11-03T00:00:00Z"),
      part(ACCOUNT, "platform"),
    ]);
    expect(merged.accountDetails[0].truthState).toBe("partial");
    expect(merged.errors[0]).toMatch(/Pages inventory request failed/);
  });
});
