import type { RepoOpsRow, RepoQuick } from "@/lib/repoOps";
import { REPOSITORY_FACETS_DEFAULT, type RepositoryFacets } from "@/lib/repositoryFacets";
import { healthOf } from "@/lib/cloudflareWorkspace";
import type { ConsoleDensity, FilterChip } from "@/lib/consoleKit";

export type RepoSortKey = "pushed" | "name" | "priority" | "issues" | "stars";
export type RepoGroupBy = "none" | "owner" | "priority" | "language" | "deployment";
export type RepoPrefs = {
  quick: RepoQuick;
  owner: string;
  sort: RepoSortKey;
  facets: RepositoryFacets;
  density: ConsoleDensity;
  groupBy: RepoGroupBy;
};
export const REPO_PREFS_DEFAULT: RepoPrefs = {
  quick: "all",
  owner: "all",
  sort: "pushed",
  facets: REPOSITORY_FACETS_DEFAULT,
  density: "comfortable",
  groupBy: "none",
};

/** Fill anything missing (old localStorage or old saved views) with current defaults. */
export function normalizeRepoPrefs(raw: unknown): RepoPrefs {
  const value = (raw && typeof raw === "object" ? raw : {}) as Partial<RepoPrefs>;
  const groupBys: RepoGroupBy[] = ["none", "owner", "priority", "language", "deployment"];
  return {
    ...REPO_PREFS_DEFAULT,
    ...value,
    density: value.density === "compact" ? "compact" : "comfortable",
    groupBy: groupBys.includes(value.groupBy as RepoGroupBy)
      ? (value.groupBy as RepoGroupBy)
      : "none",
    facets: { ...REPOSITORY_FACETS_DEFAULT, ...(value.facets || {}) },
  };
}

/**
 * What the operator can actually conclude about deployment, from observed
 * evidence only. "linked" is a recorded URL, not proof that anything is serving.
 */
export type RepoDeployState = "failing" | "building" | "deployed" | "idle" | "linked" | "none";
export const REPO_DEPLOY_LABEL: Record<RepoDeployState, string> = {
  failing: "Build failed",
  building: "Building",
  deployed: "Cloudflare deployed",
  idle: "Cloudflare · no deployment",
  linked: "App link recorded",
  none: "No app link",
};
const DEPLOY_ORDER: Record<RepoDeployState, number> = {
  failing: 0,
  building: 1,
  idle: 2,
  deployed: 3,
  linked: 4,
  none: 5,
};
export function repoDeployState(row: RepoOpsRow): RepoDeployState {
  const states = row.cloudflare.map(healthOf);
  if (states.includes("failing")) return "failing";
  if (states.includes("building")) return "building";
  if (states.includes("live")) return "deployed";
  if (states.length) return "idle";
  return row.appUrl ? "linked" : "none";
}

const PRIORITY_LABEL: Record<string, { label: string; order: number }> = {
  critical: { label: "Critical", order: 0 },
  high: { label: "High", order: 1 },
  medium: { label: "Medium", order: 2 },
  low: { label: "Low", order: 3 },
};

export function repoGroup(row: RepoOpsRow, by: RepoGroupBy) {
  switch (by) {
    case "owner":
      return { key: row.owner.toLowerCase(), label: row.owner, order: 0 };
    case "priority": {
      const hit = PRIORITY_LABEL[row.plan.priority || ""];
      return hit
        ? { key: row.plan.priority!, label: hit.label, order: hit.order }
        : { key: "none", label: "No priority set", order: 9 };
    }
    case "language": {
      const language = row.language || "Unknown";
      return {
        key: language.toLowerCase(),
        label: language,
        order: language === "Unknown" ? 9 : 0,
      };
    }
    case "deployment": {
      const state = repoDeployState(row);
      return { key: state, label: REPO_DEPLOY_LABEL[state], order: DEPLOY_ORDER[state] };
    }
    default:
      return { key: "all", label: "All repositories", order: 0 };
  }
}

const QUICK_LABEL: Record<RepoQuick, string> = {
  all: "All",
  attention: "Needs action",
  cloudflare: "On Cloudflare",
  failing: "Failed builds",
  undeployed: "No verified app link",
  recent: "Pushed in 7 days",
  stale: "Stale over 180 days",
  issues: "Open issues/PRs",
  private: "Private",
  archived: "Archived",
  forks: "Forks",
  unplanned: "No plan yet",
};
export const repoQuickLabel = (quick: RepoQuick) => QUICK_LABEL[quick];

const FACET_LABEL = {
  visibility: { public: "Public only", private: "Private only" },
  deployment: {
    cloudflare: "Linked to Cloudflare",
    app: "Has app URL",
    "missing-app": "Missing app URL",
    "no-cloudflare": "No Cloudflare match",
  },
  activity: {
    "7d": "Pushed ≤ 7 days",
    "30d": "Pushed ≤ 30 days",
    "180d": "Pushed ≤ 180 days",
    stale: "Not pushed 180+ days",
    unknown: "Push date unknown",
  },
  evidence: {
    provider: "Provider-attested link",
    recorded: "Recorded link only",
    missing: "No link evidence",
  },
} as const;

/** One removable chip per control that differs from its default. */
export function repoFilterChips(prefs: RepoPrefs, query: string): FilterChip[] {
  const chips: FilterChip[] = [];
  if (query.trim()) chips.push({ id: "query", label: "“" + query.trim().slice(0, 28) + "”" });
  if (prefs.quick !== "all") chips.push({ id: "quick", label: QUICK_LABEL[prefs.quick] });
  if (prefs.owner !== "all") chips.push({ id: "owner", label: prefs.owner });
  const f = prefs.facets;
  if (f.language !== "all") chips.push({ id: "language", label: f.language });
  if (f.visibility !== "all")
    chips.push({ id: "visibility", label: FACET_LABEL.visibility[f.visibility] });
  if (f.deployment !== "all")
    chips.push({ id: "deployment", label: FACET_LABEL.deployment[f.deployment] });
  if (f.activity !== "all") chips.push({ id: "activity", label: FACET_LABEL.activity[f.activity] });
  if (f.evidence !== "all") chips.push({ id: "evidence", label: FACET_LABEL.evidence[f.evidence] });
  return chips;
}

/** Remove one chip. Returns the next prefs and whether the text query should be cleared. */
export function clearRepoFilter(
  prefs: RepoPrefs,
  id: string,
): { prefs: RepoPrefs; clearQuery: boolean } {
  if (id === "query") return { prefs, clearQuery: true };
  if (id === "quick") return { prefs: { ...prefs, quick: "all" }, clearQuery: false };
  if (id === "owner") return { prefs: { ...prefs, owner: "all" }, clearQuery: false };
  if (id in REPOSITORY_FACETS_DEFAULT) {
    return {
      prefs: {
        ...prefs,
        facets: {
          ...prefs.facets,
          [id]: REPOSITORY_FACETS_DEFAULT[id as keyof RepositoryFacets],
        },
      },
      clearQuery: false,
    };
  }
  return { prefs, clearQuery: false };
}

/** Plain-text clone / URL helpers used by bulk actions. */
export const repoCloneCommand = (row: RepoOpsRow) => "git clone " + row.url + ".git";
export const repoSshCloneCommand = (row: RepoOpsRow) =>
  "git clone git@github.com:" + row.key + ".git";

/** Every GitHub-side destination for a repository, grouped for the Links tab. */
export function repoLinkGroups(row: RepoOpsRow) {
  const base = row.url;
  const [owner, repo] = row.key.split("/");
  const branch = row.defaultBranch ? encodeURIComponent(row.defaultBranch) : null;
  return [
    {
      title: "Code & history",
      links: [
        { label: "Code", url: base },
        ...(branch
          ? [{ label: "Branch · " + row.defaultBranch, url: base + "/tree/" + branch }]
          : []),
        { label: "Commits", url: base + "/commits" + (branch ? "/" + branch : "") },
        { label: "Branches", url: base + "/branches" },
        { label: "Tags & releases", url: base + "/releases" },
      ],
    },
    {
      title: "Collaboration",
      links: [
        { label: "Pull requests", url: base + "/pulls" },
        { label: "Issues", url: base + "/issues" },
        { label: "New issue", url: base + "/issues/new" },
        { label: "Discussions", url: base + "/discussions" },
      ],
    },
    {
      title: "Automation & quality",
      links: [
        { label: "Actions · workflow runs", url: base + "/actions" },
        { label: "GitHub deployments", url: base + "/deployments" },
        { label: "Security", url: base + "/security" },
        { label: "Insights · pulse", url: base + "/pulse" },
      ],
    },
    {
      title: "Edit & admin",
      links: [
        { label: "Edit in github.dev", url: "https://github.dev/" + owner + "/" + repo },
        {
          label: "Open in Codespaces",
          url: "https://codespaces.new/" + owner + "/" + repo,
        },
        { label: "Settings", url: base + "/settings" },
      ],
    },
  ];
}
