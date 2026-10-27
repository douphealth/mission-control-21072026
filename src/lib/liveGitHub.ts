import { getGitHubRepoKey } from "@/lib/unifiedGitHubCatalog";
import type { GitHubRepo } from "@/lib/db";

export const OWNERS = ["douphealth", "Papalexios", "papalexios001-wq"] as const;
export type LiveRepo = {
  key: string; owner: string; name: string; url: string; description: string | null;
  language: string | null; updatedAt: string | null; pushedAt: string | null;
  defaultBranch: string | null; visibility: "public"; archived: boolean;
  fork: boolean; stars: number; forks: number; openIssues: number;
  homepage: string | null;
};
export type OwnerResult = {
  owner: string; state: "live" | "error"; repositories: LiveRepo[];
  error?: string; fetchedAt?: string; retryAt?: string;
};
export type ManagedRepo = {
  key: string; repo: GitHubRepo; live: LiveRepo | null;
  source: "live" | "saved snapshot"; owner: string;
};

const MAX_PAGES = 25;
// Ephemeral in-memory cache: never add hundreds of API observations to the
// localStorage mutation journal or overwrite user-managed planning fields.
const accountCache = new Map<string, OwnerResult>();
export function cachedOwners(): Record<string, OwnerResult> {
  return Object.fromEntries(accountCache);
}
export function retainOwnerResult(next: OwnerResult): OwnerResult {
  const previous = accountCache.get(next.owner);
  const retained = next.state === "error" && previous
    ? { ...next, repositories: previous.repositories, fetchedAt: previous.fetchedAt }
    : next;
  accountCache.set(next.owner, retained);
  return retained;
}
function normalize(row: unknown, owner: string): LiveRepo | null {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const v = row as Record<string, unknown>;
  const url = typeof v.html_url === "string" ? v.html_url : "";
  const key = getGitHubRepoKey(url);
  if (!key || key.split("/")[0] !== owner.toLowerCase() ||
      v.private === true || v.visibility === "private") return null;
  const str = (x: unknown) => typeof x === "string" ? x : null;
  const num = (x: unknown) => typeof x === "number" && Number.isFinite(x) ? Math.max(0, x) : 0;
  const homepage = str(v.homepage);
  return {
    key, owner, name: str(v.name) || key.split("/")[1], url,
    description: str(v.description), language: str(v.language),
    updatedAt: str(v.updated_at), pushedAt: str(v.pushed_at),
    defaultBranch: str(v.default_branch), visibility: "public",
    archived: v.archived === true, fork: v.fork === true,
    stars: num(v.stargazers_count), forks: num(v.forks_count),
    openIssues: num(v.open_issues_count),
    homepage: homepage && /^https:\/\/[^/]+/i.test(homepage) ? homepage : null,
  };
}
function rateLimitWait(response: Response): string | undefined {
  const reset = Number(response.headers.get("x-ratelimit-reset"));
  const retry = Number(response.headers.get("retry-after"));
  const target = Number.isFinite(retry) && retry > 0
    ? Date.now() + Math.min(retry, 3600) * 1000
    : Number.isFinite(reset) && reset > 0 ? reset * 1000 : 0;
  return target > Date.now() ? new Date(target).toISOString() : undefined;
}
/** Full paginated public list per owner; partial successes are never marked live. */
export async function fetchOwnerRepos(owner: string, fetcher: typeof fetch = fetch): Promise<OwnerResult> {
  if (!OWNERS.some(o => o.toLowerCase() === owner.toLowerCase()))
    return { owner, state: "error", repositories: [], error: "Unknown owner" };
  const all: LiveRepo[] = [];
  let retryAt: string | undefined;
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = `https://api.github.com/users/${encodeURIComponent(owner)}/repos?type=owner&sort=full_name&direction=asc&per_page=100&page=${page}`;
      const response = await fetcher(url, {
        headers: { Accept: "application/vnd.github+json" },
        cache: "no-store", signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        if (response.status === 403 || response.status === 429) {
          retryAt = rateLimitWait(response);
          throw new Error("GitHub rate limit or access restriction");
        }
        throw new Error("GitHub API HTTP " + response.status);
      }
      const rows: unknown = await response.json();
      if (!Array.isArray(rows)) throw new Error("Unexpected GitHub API response");
      for (const value of rows) {
        const item = normalize(value, owner);
        if (item) all.push(item);
      }
      if (rows.length < 100) return {
        owner, state: "live", fetchedAt: new Date().toISOString(),
        repositories: [...new Map(all.map(v => [v.key, v])).values()],
      };
    }
    throw new Error("Repository pagination limit reached; incomplete inventory rejected");
  } catch (error) {
    return { owner, state: "error", repositories: [],
      error: error instanceof Error ? error.message : "GitHub API unavailable", retryAt };
  }
}
/** Build one view: live fields are read-only, saved plans are always authoritative. */
export function joinGitHubPlans(saved: GitHubRepo[], live: LiveRepo[]): ManagedRepo[] {
  const rows = new Map<string, ManagedRepo>();
  for (const repo of saved) {
    if (repo.visibility === "private") continue;
    const key = getGitHubRepoKey(repo.url);
    if (!key) continue;
    rows.set(key, { key, repo, live: null, source: "saved snapshot", owner: key.split("/")[0] });
  }
  for (const fresh of live) {
    const previous = rows.get(fresh.key);
    const observed: GitHubRepo = previous?.repo || {
      id: "public-live:" + fresh.key, name: fresh.name, url: fresh.url,
      description: "", language: "Unknown", stars: 0, forks: 0,
      status: "active", demoUrl: "", progress: 0, topics: [],
      lastUpdated: fresh.updatedAt?.slice(0, 10) || "",
      visibility: "public",
    };
    // Never replace user-managed fields, including priority, progress, status,
    // pending work, app URLs, and notes, with GitHub API metadata.
    rows.set(fresh.key, {
      key: fresh.key, owner: fresh.owner.toLowerCase(),
      repo: observed, live: fresh, source: "live",
    });
  }
  return [...rows.values()];
}
export function repoNeedsAttention(repo: ManagedRepo): boolean {
  return Boolean(repo.repo.pendingSummary?.trim()) ||
    repo.repo.priority === "critical" || repo.repo.priority === "high";
}
// Backwards-compatible merge for existing public-repository consumers.
export function mergeLiveRepos<T extends { url: string }>(snapshot: T[], live: LiveRepo[]): Array<T | LiveRepo> {
  const rows = new Map<string, T | LiveRepo>();
  for (const item of snapshot) {
    const key = getGitHubRepoKey(item.url);
    if (key) rows.set(key, item);
  }
  for (const item of live) rows.set(item.key, { ...(rows.get(item.key) || {}), ...item });
  return [...rows.values()];
}
