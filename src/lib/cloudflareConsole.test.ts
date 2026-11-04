import { describe, expect, it } from "vitest";
import { normalizePagesProject, normalizeWorkerScript } from "@/lib/cloudflareInventory.server";
import {
  CF_PREFS_DEFAULT,
  cfDashboardLinks,
  cfFilterChips,
  cfGroup,
  cfRepoKey,
  clearCfFilter,
  normalizeCfPrefs,
} from "@/lib/cloudflareConsole";

const account = "a".repeat(32);
const pages = normalizePagesProject(account, {
  name: "site",
  domains: ["site.example.com"],
  subdomain: "site.pages.dev",
  source: {
    type: "github",
    config: { owner: "douphealth", repo_name: "site", production_branch: "main" },
  },
  canonical_deployment: {
    id: "1",
    created_on: "2026-11-03T10:00:00Z",
    latest_stage: { status: "success" },
  },
})!;
const upload = normalizePagesProject(account, {
  name: "uploaded",
  subdomain: "uploaded.pages.dev",
  canonical_deployment: { id: "2", latest_stage: { status: "failure" } },
})!;
const worker = normalizeWorkerScript(
  account,
  { id: "api", subdomain: { enabled: true }, deployed_on: "2026-11-03T10:00:00Z" },
  [],
  undefined,
  "example",
)!;
const name = (id: string) => (id === account ? "Primary" : id);

describe("cfGroup", () => {
  it("groups by account, kind and health, with problems ordered first", () => {
    expect(cfGroup(pages, "account", name).label).toBe("Primary");
    expect(cfGroup(worker, "kind", name).label).toBe("Workers");
    expect(cfGroup(pages, "kind", name).label).toBe("Pages projects");
    expect(cfGroup(upload, "health", name).order).toBeLessThan(
      cfGroup(pages, "health", name).order,
    );
    expect(cfGroup(pages, "none", name).key).toBe("all");
  });
});

describe("Cloudflare filter chips", () => {
  it("lists only non-default controls and clears them one at a time", () => {
    expect(cfFilterChips(CF_PREFS_DEFAULT, "", name)).toEqual([]);
    const prefs = {
      ...CF_PREFS_DEFAULT,
      quick: "failing" as const,
      account,
      facets: { ...CF_PREFS_DEFAULT.facets, source: "direct_upload" as const },
    };
    const chips = cfFilterChips(prefs, "site", name);
    expect(chips.map((c) => c.id)).toEqual(["query", "quick", "account", "source"]);
    expect(chips.find((c) => c.id === "account")?.label).toBe("Primary");
    const cleared = clearCfFilter(prefs, "source");
    expect(cleared.prefs.facets.source).toBe("all");
    expect(cleared.prefs.quick).toBe("failing");
    expect(clearCfFilter(prefs, "account").prefs.account).toBe("all");
  });
});

describe("normalizeCfPrefs", () => {
  it("upgrades old stored preferences and rejects junk", () => {
    expect(normalizeCfPrefs({ quick: "stale", facets: { kind: "pages" } })).toMatchObject({
      quick: "stale",
      density: "comfortable",
      groupBy: "none",
      facets: { kind: "pages", source: "all", endpoint: "all" },
    });
    expect(normalizeCfPrefs("nope")).toEqual(CF_PREFS_DEFAULT);
    expect(normalizeCfPrefs({ groupBy: "x" }).groupBy).toBe("none");
  });
});

describe("cross-links and dashboard destinations", () => {
  it("only reports a repository when Cloudflare itself reported one", () => {
    expect(cfRepoKey(pages)).toBe("douphealth/site");
    expect(cfRepoKey(upload)).toBeNull();
    expect(cfRepoKey(worker)).toBeNull();
  });
  it("offers Pages sub-pages but never invents Worker deep links", () => {
    const pageLinks = cfDashboardLinks(pages).map((l) => l.url);
    expect(pageLinks).toContain(pages.projectUrl + "/settings");
    expect(pageLinks).toContain(pages.projectUrl + "/domains");
    const workerLinks = cfDashboardLinks(worker).map((l) => l.url);
    expect(workerLinks).toContain(worker.projectUrl);
    expect(workerLinks.some((u) => u.endsWith("/settings"))).toBe(false);
    expect(workerLinks.every((u) => u.startsWith("https://dash.cloudflare.com/"))).toBe(true);
  });
});
