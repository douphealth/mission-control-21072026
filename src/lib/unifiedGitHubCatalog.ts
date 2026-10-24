import type { GitHubRepo } from "@/lib/db";
import { GITHUB_REPO_CATALOG } from "@/lib/repoCatalog";
import { PUBLIC_PORTFOLIO_REPOS } from "@/lib/portfolioAtlas";

/** Dated public snapshot only. Never ship private repo names or tokens. */
export const UNIFIED_PUBLIC_GITHUB_COUNT = PUBLIC_PORTFOLIO_REPOS.length;

export function getGitHubRepoKey(url: string | undefined | null): string | null {
  try {
    const parsed = new URL(String(url || "").trim());
    if (!["github.com", "www.github.com"].includes(parsed.hostname.toLowerCase())) return null;
    const parts = parsed.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    if (parts.length !== 2) return null;
    const owner = parts[0].toLowerCase();
    const name = parts[1].replace(/\.git$/i, "").toLowerCase();
    if (!/^[a-z0-9_.-]+$/.test(owner) || !/^[a-z0-9_.-]+$/.test(name)) return null;
    return owner + "/" + name;
  } catch { return null; }
}

export function getGitHubRepoOwner(url: string | undefined | null):
  "douphealth" | "Papalexios" | "papalexios001-wq" | "other" {
  const owner = getGitHubRepoKey(url)?.split("/")[0] || "";
  if (owner === "douphealth") return "douphealth";
  if (owner === "papalexios") return "Papalexios";
  if (owner === "papalexios001-wq") return "papalexios001-wq";
  return "other";
}

const curatedByKey = new Map(
  GITHUB_REPO_CATALOG.map(repo => [getGitHubRepoKey(repo.url), repo]),
);

/** douphealth retains its curated metadata. Other accounts are URL/name-only
 * public snapshots: no fictitious deployment or application URLs are added. */
export const UNIFIED_PUBLIC_GITHUB_CATALOG: Array<Omit<GitHubRepo, "id">> =
  PUBLIC_PORTFOLIO_REPOS.map(repo => {
    const curated = curatedByKey.get(getGitHubRepoKey(repo.url));
    if (curated && repo.owner === "douphealth") return curated;
    return {
      name: repo.name, url: repo.url, description: "", language: "Unknown",
      stars: 0, forks: 0, status: "active", demoUrl: "", progress: 0,
      topics: [], lastUpdated: "2026-10-24", visibility: "public",
    };
  });

/** Render all public rows without 153 automatic IndexedDB/cloud-sync writes.
 * Saved planning overrides are looked up by full owner/repo; private saved
 * records are excluded from this public projection. */
export function mergeUnifiedGitHubRows(saved: GitHubRepo[]): GitHubRepo[] {
  const byKey = new Map<string, GitHubRepo>();
  for (const repo of saved) {
    const key = getGitHubRepoKey(repo.url);
    if (key && repo.visibility !== "private" && !byKey.has(key)) byKey.set(key, repo);
  }
  const matched = new Set<string>();
  const catalogKeys = new Set<string>();
  const snapshotRows = UNIFIED_PUBLIC_GITHUB_CATALOG.map(repo => {
    const key = getGitHubRepoKey(repo.url)!;
    catalogKeys.add(key);
    const local = byKey.get(key);
    if (local) matched.add(local.id);
    return {
      ...repo, ...(local || {}),
      id: local?.id || "public-snapshot:" + key,
      name: repo.name, url: repo.url, visibility: "public" as const,
    };
  });
  return [
    ...snapshotRows,
    ...saved.filter(repo =>
      repo.visibility !== "private" && !matched.has(repo.id) &&
      !catalogKeys.has(getGitHubRepoKey(repo.url) || ""),
    ),
  ];
}
