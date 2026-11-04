import type { BuildProject, GitHubRepo } from "@/lib/db";
import { recordedRepoAppLinks, appPublicUrl, endpointIdentity, type RepoAppEvidence } from "@/lib/repoAppLinks";
import type { LiveRepo } from "@/lib/liveGitHub";
import type { OwnedRepoSnapshot } from "@/lib/githubPrivateInventory.server";
import type { CloudflareDeploymentRow } from "@/lib/cloudflareInventory.server";
import { getGitHubRepoKey, getGitHubRepoOwner } from "@/lib/unifiedGitHubCatalog";
import { healthOf } from "@/lib/cloudflareWorkspace";

/**
 * One operational row per repository. GitHub/Cloudflare observations are
 * read-only; the `plan` is the user's saved planning record (or a synthesized,
 * unsaved default). Cloudflare deployments are linked ONLY through the Git
 * source Cloudflare itself reports — never by guessing from names.
 */
export type RepoSource = "authenticated" | "github-api" | "snapshot";
export interface RepoOpsRow {
  key: string;
  owner: string;
  name: string;
  url: string;
  visibility: "public" | "private";
  description: string;
  language: string | null;
  defaultBranch: string | null;
  pushedAt: string | null;
  archived: boolean;
  fork: boolean;
  stars: number | null;
  openIssues: number | null;
  homepage: string | null;
  source: RepoSource;
  plan: GitHubRepo;
  saved: boolean;
  cloudflare: CloudflareDeploymentRow[];
  appUrl: string | null;
  appEvidence: RepoAppEvidence | null;
}
export type RepoQuick =
  | "all"
  | "attention"
  | "cloudflare"
  | "failing"
  | "undeployed"
  | "recent"
  | "stale"
  | "issues"
  | "private"
  | "archived"
  | "forks"
  | "unplanned";
export type RepoSort = "pushed" | "name" | "priority" | "issues" | "stars";
const DAY = 86_400_000;
const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function synthesizedPlan(
  key: string,
  url: string,
  name: string,
  visibility: "public" | "private",
  updated: string | null,
): GitHubRepo {
  return {
    id: (visibility === "private" ? "private-live:" : "public-live:") + key,
    name,
    url,
    description: "",
    language: "Unknown",
    stars: 0,
    forks: 0,
    status: "active",
    demoUrl: "",
    progress: 0,
    topics: [],
    lastUpdated: updated?.slice(0, 10) || "",
    visibility,
  };
}

export function buildRepoOps(input: {
  /** Public projection: catalog snapshot merged with saved plans (mergeUnifiedGitHubRows). */
  displayRepos: GitHubRepo[];
  /** Persisted plan records (all visibilities). */
  savedRepos: GitHubRepo[];
  live: LiveRepo[];
  owned: OwnedRepoSnapshot[];
  cloud: CloudflareDeploymentRow[];
  apps?: Pick<BuildProject, "githubRepo" | "deployedUrl">[];
}): RepoOpsRow[] {
  const persisted = new Set(input.savedRepos.map((r) => r.id));
  const recorded = recordedRepoAppLinks(input.apps);
  // Exact endpoint identity is useful for direct-upload Pages / Wrangler Workers,
  // whose Cloudflare API records often omit a Git source. Reject ambiguous URLs.
  const byEndpoint = new Map<string, CloudflareDeploymentRow[]>();
  for (const deployment of input.cloud) {
    for (const url of [deployment.publicUrl, deployment.pagesDevUrl, deployment.workersDevUrl]) {
      const id = endpointIdentity(url);
      if (!id) continue;
      const prior = byEndpoint.get(id) || [];
      if (!prior.some(x => x.key === deployment.key)) byEndpoint.set(id, [...prior, deployment]);
    }
  }
  const savedByKey = new Map<string, GitHubRepo>();
  for (const repo of input.savedRepos) {
    const key = getGitHubRepoKey(repo.url);
    if (key && !savedByKey.has(key)) savedByKey.set(key, repo);
  }
  const cfByRepo = new Map<string, CloudflareDeploymentRow[]>();
  for (const row of input.cloud) {
    const key = getGitHubRepoKey(row.repoUrl);
    if (key) cfByRepo.set(key, [...(cfByRepo.get(key) || []), row]);
  }
  const rows = new Map<string, RepoOpsRow>();
  const base = (
    key: string,
    url: string,
    name: string,
    plan: GitHubRepo,
    visibility: "public" | "private",
  ): RepoOpsRow => ({
    key,
    owner: getGitHubRepoOwner(url) === "other" ? key.split("/")[0] : getGitHubRepoOwner(url),
    name,
    url,
    visibility,
    description: plan.description || "",
    language: plan.language && plan.language !== "Unknown" ? plan.language : null,
    defaultBranch: plan.defaultBranch || null,
    pushedAt: null,
    archived: false,
    fork: false,
    stars: null,
    openIssues: null,
    homepage: null,
    source: "snapshot",
    plan,
    saved: persisted.has(plan.id),
    cloudflare: [],
    appUrl: null,
    appEvidence: null,
  });
  for (const repo of input.displayRepos) {
    const key = getGitHubRepoKey(repo.url);
    if (!key || rows.has(key)) continue;
    rows.set(
      key,
      base(key, repo.url, repo.name, repo, repo.visibility === "private" ? "private" : "public"),
    );
  }
  for (const live of input.live) {
    const existing = rows.get(live.key);
    const row =
      existing ||
      base(
        live.key,
        live.url,
        live.name,
        savedByKey.get(live.key) ||
          synthesizedPlan(live.key, live.url, live.name, "public", live.updatedAt),
        "public",
      );
    Object.assign(row, {
      description: live.description || row.description,
      language: live.language || row.language,
      defaultBranch: live.defaultBranch || row.defaultBranch,
      pushedAt: live.pushedAt,
      archived: live.archived,
      fork: live.fork,
      stars: live.stars,
      openIssues: live.openIssues,
      homepage: live.homepage,
      source: "github-api" as const,
    });
    rows.set(live.key, row);
  }
  // Authenticated data is the most complete source (includes private repos).
  for (const owned of input.owned) {
    const key = getGitHubRepoKey(owned.url);
    if (!key) continue;
    const existing = rows.get(key);
    const row =
      existing ||
      base(
        key,
        owned.url,
        owned.name,
        savedByKey.get(key) ||
          synthesizedPlan(key, owned.url, owned.name, owned.visibility, owned.updatedAt),
        owned.visibility,
      );
    Object.assign(row, {
      visibility: owned.visibility,
      description: owned.description || row.description,
      language: owned.language || row.language,
      defaultBranch: owned.defaultBranch || row.defaultBranch,
      pushedAt: owned.pushedAt,
      archived: owned.archived,
      fork: owned.fork,
      stars: owned.stars,
      openIssues: owned.openIssues,
      homepage: httpsUrl(owned.homepage),
      source: "authenticated" as const,
    });
    rows.set(key, row);
  }
  for (const row of rows.values()) {
    const recordedLink = recorded.get(row.key) || null;
    const fromPlan = appPublicUrl(row.plan.demoUrl);
    const fromGithub = appPublicUrl(row.homepage);
    const candidate = recordedLink?.url || fromPlan || fromGithub;
    const endpointMatch = candidate ? byEndpoint.get(endpointIdentity(candidate) || "") || [] : [];
    // Only a single provider resource with that exact URL is sufficient to
    // associate a direct-upload Worker/Pages project with this repository record.
    const exactMatch = endpointMatch.length === 1 ? endpointMatch : [];
    const linked = new Map<string, CloudflareDeploymentRow>();
    for (const resource of [...(cfByRepo.get(row.key) || []), ...exactMatch]) linked.set(resource.key, resource);
    row.cloudflare = [...linked.values()].sort(
      (a, b) =>
        Number(Boolean(b.domains.length)) - Number(Boolean(a.domains.length)) ||
        a.name.localeCompare(b.name),
    );
    const authoritative = row.cloudflare.find(c =>
      getGitHubRepoKey(c.repoUrl) === row.key && appPublicUrl(c.publicUrl));
    const matched = row.cloudflare.find(c => appPublicUrl(c.publicUrl));
    const chosen = authoritative?.publicUrl || matched?.publicUrl || candidate || null;
    row.appUrl = appPublicUrl(chosen);
    row.appEvidence = authoritative && row.appUrl
      ? {url: row.appUrl, origin: "cloudflare-source", label: "Cloudflare-reported Git source", providerAttested: true}
      : matched && row.appUrl
        ? {url: row.appUrl, origin: "cloudflare-endpoint", label: "Cloudflare endpoint + exact recorded app URL", providerAttested: true}
        : recordedLink && row.appUrl === recordedLink.url
          ? recordedLink
          : fromPlan && row.appUrl === fromPlan
            ? {url: fromPlan, origin: "saved-plan", label: "Saved repository app URL", providerAttested: false}
            : fromGithub && row.appUrl === fromGithub
              ? {url: fromGithub, origin: "github-homepage", label: "GitHub repository homepage", providerAttested: false}
              : null;
  }
  return [...rows.values()];
}

export function repoNeedsAction(row: RepoOpsRow): boolean {
  return (
    row.plan.priority === "critical" ||
    row.plan.priority === "high" ||
    Boolean(row.plan.pendingSummary?.trim()) ||
    row.cloudflare.some((c) => healthOf(c) === "failing")
  );
}
export function matchesRepoQuick(row: RepoOpsRow, quick: RepoQuick, now = Date.now()): boolean {
  const pushed = row.pushedAt ? Date.parse(row.pushedAt) : NaN;
  switch (quick) {
    case "all":
      return true;
    case "attention":
      return repoNeedsAction(row);
    case "cloudflare":
      return row.cloudflare.length > 0;
    case "failing":
      return row.cloudflare.some((c) => healthOf(c) === "failing" || healthOf(c) === "none");
    case "undeployed":
      return !row.archived && !row.cloudflare.length && !row.appUrl;
    case "recent":
      return Number.isFinite(pushed) && now - pushed <= 7 * DAY;
    case "stale":
      return Number.isFinite(pushed) && now - pushed > 180 * DAY;
    case "issues":
      return (row.openIssues || 0) > 0;
    case "private":
      return row.visibility === "private";
    case "archived":
      return row.archived;
    case "forks":
      return row.fork;
    case "unplanned":
      return !row.saved;
  }
}
export function repoQuickCounts(rows: RepoOpsRow[], now = Date.now()): Record<RepoQuick, number> {
  const keys: RepoQuick[] = [
    "all",
    "attention",
    "cloudflare",
    "failing",
    "undeployed",
    "recent",
    "stale",
    "issues",
    "private",
    "archived",
    "forks",
    "unplanned",
  ];
  return Object.fromEntries(
    keys.map((k) => [k, rows.filter((r) => matchesRepoQuick(r, k, now)).length]),
  ) as Record<RepoQuick, number>;
}
export function compareRepoRows(a: RepoOpsRow, b: RepoOpsRow, sort: RepoSort): number {
  const byName = a.key.localeCompare(b.key);
  switch (sort) {
    case "name":
      return byName;
    case "priority":
      return (
        (PRIORITY_RANK[a.plan.priority || ""] ?? 4) - (PRIORITY_RANK[b.plan.priority || ""] ?? 4) ||
        (b.plan.importance || 0) - (a.plan.importance || 0) ||
        byName
      );
    case "issues":
      return (b.openIssues ?? -1) - (a.openIssues ?? -1) || byName;
    case "stars":
      return (b.stars ?? -1) - (a.stars ?? -1) || byName;
    default: {
      const ta = a.pushedAt ? Date.parse(a.pushedAt) || 0 : 0;
      const tb = b.pushedAt ? Date.parse(b.pushedAt) || 0 : 0;
      return tb - ta || byName;
    }
  }
}
export function repoSearchText(row: RepoOpsRow): string {
  return [
    row.key,
    row.description,
    row.language,
    row.plan.pendingSummary,
    row.plan.doneSummary,
    row.plan.priority,
    row.appUrl,
    row.appEvidence?.label,
    ...row.plan.topics,
    ...row.cloudflare.flatMap((c) => [c.name, c.publicUrl || "", ...c.domains]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
export function repoOpsCsv(rows: RepoOpsRow[]): string {
  const safe = (value: string) => {
    const v = /^[\s]*[=+@-]/.test(value) ? "'" + value : value;
    return '"' + v.replace(/"/g, '""') + '"';
  };
  const header = [
    "repository",
    "url",
    "visibility",
    "language",
    "last_push",
    "open_issues",
    "stars",
    "archived",
    "priority",
    "next_action",
    "app_url",
    "app_url_evidence",
    "cloudflare_projects",
    "cloudflare_health",
  ];
  return [
    header.join(","),
    ...rows.map((r) =>
      [
        r.key,
        r.url,
        r.visibility,
        r.language || "",
        r.pushedAt || "",
        r.openIssues === null ? "" : String(r.openIssues),
        r.stars === null ? "" : String(r.stars),
        String(r.archived),
        r.plan.priority || "",
        r.plan.pendingSummary || "",
        r.appUrl || "",
        r.appEvidence?.label || "",
        r.cloudflare.map((c) => c.name).join("; "),
        r.cloudflare.map((c) => healthOf(c)).join("; "),
      ]
        .map(safe)
        .join(","),
    ),
  ].join("\r\n");
}
