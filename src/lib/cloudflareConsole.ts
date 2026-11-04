import type { CloudflareDeploymentRow, DeployHealth } from "@/lib/cloudflareInventory.server";
import { CLOUDFLARE_FACETS_DEFAULT, type CloudflareFacets } from "@/lib/cloudflareFacets";
import { healthOf, type QuickFilter, type SortKey } from "@/lib/cloudflareWorkspace";
import { getGitHubRepoKey } from "@/lib/unifiedGitHubCatalog";
import type { ConsoleDensity, FilterChip } from "@/lib/consoleKit";

export type CfGroupBy = "none" | "account" | "kind" | "health";
export type CfPrefs = {
  quick: QuickFilter;
  account: string;
  sort: SortKey;
  facets: CloudflareFacets;
  density: ConsoleDensity;
  groupBy: CfGroupBy;
};
export const CF_PREFS_DEFAULT: CfPrefs = {
  quick: "all",
  account: "all",
  sort: "name",
  facets: CLOUDFLARE_FACETS_DEFAULT,
  density: "comfortable",
  groupBy: "none",
};
export function normalizeCfPrefs(raw: unknown): CfPrefs {
  const value = (raw && typeof raw === "object" ? raw : {}) as Partial<CfPrefs>;
  const groupBys: CfGroupBy[] = ["none", "account", "kind", "health"];
  return {
    ...CF_PREFS_DEFAULT,
    ...value,
    density: value.density === "compact" ? "compact" : "comfortable",
    groupBy: groupBys.includes(value.groupBy as CfGroupBy) ? (value.groupBy as CfGroupBy) : "none",
    facets: { ...CLOUDFLARE_FACETS_DEFAULT, ...(value.facets || {}) },
  };
}

const HEALTH_GROUP: Record<DeployHealth, { label: string; order: number }> = {
  failing: { label: "Build failed", order: 0 },
  building: { label: "Building or queued", order: 1 },
  none: { label: "No deployment", order: 2 },
  unknown: { label: "Unverified", order: 3 },
  live: { label: "Deployed", order: 4 },
};

export function cfGroup(
  row: CloudflareDeploymentRow,
  by: CfGroupBy,
  accountName: (id: string) => string,
) {
  switch (by) {
    case "account":
      return { key: row.accountId, label: accountName(row.accountId), order: 0 };
    case "kind":
      return row.kind === "pages"
        ? { key: "pages", label: "Pages projects", order: 0 }
        : { key: "worker", label: "Workers", order: 1 };
    case "health": {
      const hit = HEALTH_GROUP[healthOf(row)];
      return { key: healthOf(row), label: hit.label, order: hit.order };
    }
    default:
      return { key: "all", label: "All resources", order: 0 };
  }
}

const QUICK_LABEL: Record<QuickFilter, string> = {
  all: "All",
  failing: "Build failed",
  building: "Building",
  none: "No deployment",
  recent: "Deployed ≤ 7 days",
  stale: "Stale over 90 days",
  custom: "Custom domain",
  pagesdev: "pages.dev only",
  git: "Git-connected",
  direct: "Direct upload",
  workers: "Workers",
};
export const cfQuickLabel = (quick: QuickFilter) => QUICK_LABEL[quick];

const FACET_LABEL = {
  kind: { pages: "Pages only", worker: "Workers only" },
  source: {
    github: "GitHub source",
    gitlab: "GitLab source",
    direct_upload: "Direct upload",
    unverified: "Git source unverified",
  },
  endpoint: {
    public: "Public URL reported",
    missing: "No verified public URL",
    custom: "Custom domain",
    workersdev: "workers.dev endpoint",
    pagesdev: "pages.dev endpoint",
    routes: "Worker route pattern",
  },
} as const;

export function cfFilterChips(
  prefs: CfPrefs,
  query: string,
  accountName: (id: string) => string,
): FilterChip[] {
  const chips: FilterChip[] = [];
  if (query.trim()) chips.push({ id: "query", label: "“" + query.trim().slice(0, 28) + "”" });
  if (prefs.quick !== "all") chips.push({ id: "quick", label: QUICK_LABEL[prefs.quick] });
  if (prefs.account !== "all") chips.push({ id: "account", label: accountName(prefs.account) });
  const f = prefs.facets;
  if (f.kind !== "all") chips.push({ id: "kind", label: FACET_LABEL.kind[f.kind] });
  if (f.source !== "all") chips.push({ id: "source", label: FACET_LABEL.source[f.source] });
  if (f.endpoint !== "all") chips.push({ id: "endpoint", label: FACET_LABEL.endpoint[f.endpoint] });
  return chips;
}

export function clearCfFilter(prefs: CfPrefs, id: string): { prefs: CfPrefs; clearQuery: boolean } {
  if (id === "query") return { prefs, clearQuery: true };
  if (id === "quick") return { prefs: { ...prefs, quick: "all" }, clearQuery: false };
  if (id === "account") return { prefs: { ...prefs, account: "all" }, clearQuery: false };
  if (id in CLOUDFLARE_FACETS_DEFAULT) {
    return {
      prefs: {
        ...prefs,
        facets: {
          ...prefs.facets,
          [id]: CLOUDFLARE_FACETS_DEFAULT[id as keyof CloudflareFacets],
        },
      },
      clearQuery: false,
    };
  }
  return { prefs, clearQuery: false };
}

/** `owner/repo` of the GitHub repository Cloudflare itself reports, when there is one. */
export const cfRepoKey = (row: Pick<CloudflareDeploymentRow, "repoUrl">): string | null =>
  getGitHubRepoKey(row.repoUrl) || null;

/**
 * Dashboard destinations derived from the project URL Cloudflare's own API gave
 * us. Pages sub-paths (`/settings`, `/domains`) are documented dashboard routes;
 * Workers get only the verified project URL rather than a guessed deep link.
 */
export function cfDashboardLinks(
  row: CloudflareDeploymentRow,
): Array<{ label: string; url: string }> {
  const links = [{ label: "Open in Cloudflare", url: row.projectUrl }];
  if (row.kind === "pages") {
    links.push(
      { label: "Pages settings", url: row.projectUrl + "/settings" },
      { label: "Custom domains", url: row.projectUrl + "/domains" },
    );
  }
  links.push({
    label: "Workers & Pages overview",
    url: "https://dash.cloudflare.com/" + row.accountId + "/workers-and-pages",
  });
  return links;
}
