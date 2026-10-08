// WordPress evidence scoring, shared by the WordPress fleet cards and the detail panel.
// Scores are only computed from checks that actually ran. A null score means
// "needs evidence", never zero.

import type {
  HealthResult,
  SeoResult,
  SiteHealthTest,
  WpCurrentUser,
  WpPlugin,
} from "@/lib/wpClient";

export interface WpSiteSnapshot {
  health?: HealthResult;
  seo?: SeoResult;
  plugins?: WpPlugin[];
  siteHealth?: SiteHealthTest[];
  currentUser?: WpCurrentUser;
  counts?: { posts: number; pages: number; comments: number };
  loading?: boolean;
  authError?: string;
  lastChecked?: string;
}

export interface WpScores {
  health: number | null;
  seo: number | null;
  security: number | null;
}

export function scoreWpSite(status: WpSiteSnapshot): WpScores {
  const h = status.health;
  const seo = status.seo;
  const plugins = status.plugins;
  const siteHealth = status.siteHealth;

  const health = !h
    ? null
    : Math.min(
        100,
        (h.reachable ? 45 : 0) +
          (h.protocol === "https" ? 20 : 0) +
          (h.isWordPress ? 20 : 0) +
          (h.responseMs && h.responseMs < 1500 ? 15 : 0),
      );

  const seoScore = !seo
    ? null
    : Math.min(
        100,
        (seo.hasSitemap ? 30 : 0) +
          (seo.hasRobots ? 20 : 0) +
          (seo.title ? 20 : 0) +
          (seo.description ? 15 : 0) +
          (seo.ogTitle ? 8 : 0) +
          (seo.canonical ? 7 : 0),
      );

  const security =
    !plugins || !siteHealth || !status.currentUser
      ? null
      : Math.min(
          100,
          (h?.protocol === "https" ? 20 : 0) +
            (pluginUpdateCount(plugins) === 0 ? 20 : 5) +
            (siteHealth.filter((test) => test.status === "critical").length === 0 ? 35 : 0) +
            (siteHealth.filter((test) => test.status === "recommended").length <= 1 ? 15 : 5) +
            (status.currentUser.roles?.includes("administrator") ? 10 : 5),
        );

  return { health, seo: seoScore, security };
}

export function pluginUpdateCount(plugins?: WpPlugin[]): number {
  return plugins?.filter((plugin) => plugin.update && plugin.update !== "none").length ?? 0;
}

export function criticalHealthCount(siteHealth?: SiteHealthTest[]): number {
  return siteHealth?.filter((test) => test.status === "critical").length ?? 0;
}

export type WpConnection = "verified" | "pending" | "auth-error" | "public-only";

/** How this site is connected: REST with a verified app password, saved but unverified, failed, or public only. */
export function wpConnection(status: WpSiteSnapshot, hasCredential: boolean): WpConnection {
  if (status.authError) return "auth-error";
  if (!hasCredential) return "public-only";
  if (status.currentUser) return "verified";
  return "pending";
}
