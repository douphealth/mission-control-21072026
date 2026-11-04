import type { BuildProject } from "@/lib/db";
import { APP_FUNNEL_CATALOG } from "@/lib/appPortfolio";
import { REPO_MASTER_LINK_ROWS } from "@/lib/repoMasterLinks";
import { REPO_RELATIONSHIPS } from "@/lib/repoRelationships";
import { getGitHubRepoKey } from "@/lib/unifiedGitHubCatalog";

/** Sources of an app URL. "Recorded" is deliberately not an uptime assertion. */
export type AppLinkOrigin =
  | "cloudflare-source"
  | "cloudflare-endpoint"
  | "app-record"
  | "app-catalog"
  | "audited-relation"
  | "audited-inventory"
  | "saved-plan"
  | "github-homepage"
  | "github-deployment"
  | "github-pages";

export type RepoAppEvidence = {
  url: string;
  origin: AppLinkOrigin;
  label: string;
  /** Provider API observes the association; not an independent HTTP check. */
  providerAttested: boolean;
};

export function appPublicUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const u = new URL(value.trim());
    if (u.protocol !== "https:" || !u.hostname || u.username || u.password ||
      u.port || u.hostname === "localhost" || u.hostname.endsWith(".localhost") ||
      u.hostname.endsWith(".local") || u.hostname.endsWith(".internal") ||
      /^\d+\.\d+\.\d+\.\d+$/.test(u.hostname)) return null;
    // Repository, management, and code-hosting links are not app endpoints.
    if (["github.com", "www.github.com", "api.github.com",
      "dash.cloudflare.com", "npmjs.com", "www.npmjs.com"].includes(u.hostname)) return null;
    return u.toString();
  } catch { return null; }
}

export function endpointIdentity(value: string | null | undefined): string | null {
  const parsed = appPublicUrl(value);
  if (!parsed) return null;
  const u = new URL(parsed);
  return u.hostname.toLowerCase() + u.pathname.replace(/\/+$/, "") + u.search;
}

export function recordedRepoAppLinks(
  savedApps: Pick<BuildProject, "githubRepo" | "deployedUrl">[] = [],
): Map<string, RepoAppEvidence> {
  const links = new Map<string, RepoAppEvidence>();
  const add = (repoUrl: string | null | undefined, appUrl: unknown, origin: AppLinkOrigin, label: string) => {
    const key = getGitHubRepoKey(repoUrl);
    const url = appPublicUrl(appUrl);
    if (key && url) links.set(key, { url, origin, label, providerAttested: false });
  };

  // Older audited source/production relationships, only when the recorded
  // evidence explicitly calls the relationship verified. Never use candidates.
  for (const [name, records] of Object.entries(REPO_RELATIONSHIPS)) {
    for (const row of records) {
      if (!/^VERIFIED/i.test(row.evidenceStatus)) continue;
      add("https://github.com/douphealth/" + name,
        row.canonicalUrl || row.pagesUrl || row.githubPagesUrl,
        "audited-relation", "Audited app relationship (historical)");
      break;
    }
  }

  // Master inventory is not a live account query. Its "Verified" field alone
  // is insufficient: preview-only and unconfirmed-origin rows are excluded.
  for (const row of REPO_MASTER_LINK_ROWS) {
    if (row.m !== "Verified" || !/^Deployed\s*\//i.test(row.s)) continue;
    add("https://github.com/douphealth/" + row.n, row.u.find(x => appPublicUrl(x)),
      "audited-inventory", "Previously verified inventory (recheck live status)");
  }

  // Curated inventory entries are operator-supplied, not Cloudflare Git proof.
  for (const app of APP_FUNNEL_CATALOG) {
    add(app.githubRepo, app.deployedUrl, "app-catalog", "Operator app catalog");
  }

  // User-maintained app records have the highest priority of recorded sources.
  for (const app of savedApps) {
    add(app.githubRepo, app.deployedUrl, "app-record", "Saved Apps & Infrastructure record");
  }
  return links;
}
