import type { RepoOpsRow } from "@/lib/repoOps";
import { healthOf } from "@/lib/cloudflareWorkspace";

export type RepositoryFacets = {
  language: string;
  visibility: "all" | "public" | "private";
  deployment: "all" | "cloudflare" | "app" | "missing-app" | "no-cloudflare";
  activity: "all" | "7d" | "30d" | "180d" | "stale" | "unknown";
  evidence: "all" | "provider" | "recorded" | "missing";
};
export const REPOSITORY_FACETS_DEFAULT: RepositoryFacets = {
  language: "all", visibility: "all", deployment: "all",
  activity: "all", evidence: "all",
};

export function matchesRepositoryFacets(
  row: RepoOpsRow, filters: RepositoryFacets, now = Date.now(),
): boolean {
  if (filters.language !== "all" &&
      (row.language || "Unknown").toLowerCase() !== filters.language.toLowerCase()) return false;
  if (filters.visibility !== "all" && row.visibility !== filters.visibility) return false;
  if (filters.deployment === "cloudflare" && !row.cloudflare.length) return false;
  if (filters.deployment === "app" && !row.appUrl) return false;
  if (filters.deployment === "missing-app" && row.appUrl) return false;
  if (filters.deployment === "no-cloudflare" && row.cloudflare.length) return false;
  if (filters.evidence === "provider" && !row.appEvidence?.providerAttested) return false;
  if (filters.evidence === "recorded" && (!row.appEvidence || row.appEvidence.providerAttested)) return false;
  if (filters.evidence === "missing" && row.appEvidence) return false;

  if (filters.activity === "all") return true;
  const pushed = row.pushedAt ? Date.parse(row.pushedAt) : NaN;
  if (filters.activity === "unknown") return !Number.isFinite(pushed);
  if (!Number.isFinite(pushed)) return false;
  const days = Math.max(0, now - pushed) / 86_400_000;
  if (filters.activity === "stale") return days > 180;
  return days <= Number(filters.activity.slice(0, -1));
}

export function repositoryPortfolioStats(rows: readonly RepoOpsRow[], now = Date.now()) {
  const age = (date: string | null) => date ? Date.parse(date) : NaN;
  return {
    total: rows.length,
    private: rows.filter(r => r.visibility === "private").length,
    pushed7d: rows.filter(r => Number.isFinite(age(r.pushedAt)) &&
      Math.max(0, now - age(r.pushedAt)) <= 7 * 86_400_000).length,
    appLinks: rows.filter(r => Boolean(r.appUrl)).length,
    cloudflareMatches: rows.filter(r => r.cloudflare.length > 0).length,
    missingApps: rows.filter(r => !r.appUrl).length,
    failedDeploys: rows.filter(r => r.cloudflare.some(c => healthOf(c) === "failing")).length,
    cloudflareSourceLinks: rows.filter(r => r.cloudflare.some(c => c.repoEvidence === "pages-source" ||
      c.repoEvidence === "worker-build")).length,
  };
}
