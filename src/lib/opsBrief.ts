import type { CloudflareDeploymentRow, CloudflareAccountSummary } from "@/lib/cloudflareInventory.server";
import { healthOf, deployedMs, STALE_DAYS } from "@/lib/cloudflareWorkspace";

/** Pure, browser-safe "what needs me now" summaries for the GitHub and Cloudflare pages. */
const DAY = 86_400_000;
export const REPO_STALE_DAYS = 180;

export type FixItem = {
  key: string;
  title: string;
  reason: string;
  severity: "critical" | "warn" | "info";
  url: string;
  sub?: string;
};

export function repoKeyFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = /github\.com\/([^/\s]+)\/([^/\s#?]+)/i.exec(url);
  return m ? (m[1] + "/" + m[2].replace(/\.git$/, "")).toLowerCase() : null;
}

export function cloudflareBrief(
  rows: CloudflareDeploymentRow[],
  accounts: CloudflareAccountSummary[],
  now = Date.now(),
) {
  const pages = rows.filter((r) => r.kind === "pages");
  const workers = rows.filter((r) => r.kind === "worker");
  const isStale = (r: CloudflareDeploymentRow) =>
    deployedMs(r) > 0 && now - deployedMs(r) > STALE_DAYS * DAY;
  const failing = rows.filter((r) => healthOf(r) === "failing");
  const building = rows.filter((r) => healthOf(r) === "building");
  const never = rows.filter((r) => healthOf(r) === "none");
  const stale = rows.filter((r) => healthOf(r) === "live" && isStale(r));
  const healthy = rows.filter((r) => healthOf(r) === "live" && !isStale(r)).length;
  const gitLinked = rows.filter((r) => Boolean(r.repoUrl)).length;
  const customDomain = rows.filter((r) => r.domains.length > 0).length;
  const score = rows.length ? Math.round((healthy / rows.length) * 100) : 0;

  const accountRows = accounts.map((a) => {
    const mine = rows.filter((r) => r.accountId === a.accountId);
    return {
      accountId: a.accountId,
      label: a.label,
      pages: mine.filter((r) => r.kind === "pages").length,
      workers: mine.filter((r) => r.kind === "worker").length,
      failing: mine.filter((r) => healthOf(r) === "failing").length,
      zones: a.zonesCount,
      complete: a.errors.length === 0,
      errors: a.errors,
    };
  });

  const item = (r: CloudflareDeploymentRow, reason: string, severity: FixItem["severity"]): FixItem => ({
    key: r.key,
    title: r.name,
    reason,
    severity,
    url: r.projectUrl,
    sub: (r.kind === "worker" ? "Worker" : "Pages") + (r.domains[0] ? " · " + r.domains[0] : ""),
  });
  const queue: FixItem[] = [
    ...failing
      .sort((a, b) => deployedMs(b) - deployedMs(a))
      .map((r) => item(r, "Latest production build failed", "critical")),
    ...building.map((r) => item(r, "Build in progress", "info")),
    ...never.map((r) => item(r, "No successful deployment yet", "warn")),
    ...stale
      .sort((a, b) => deployedMs(a) - deployedMs(b))
      .map((r) =>
        item(r, "Not deployed in " + Math.floor((now - deployedMs(r)) / DAY) + " days", "info"),
      ),
  ];

  return {
    total: rows.length,
    pages: pages.length,
    workers: workers.length,
    failing: failing.length,
    building: building.length,
    never: never.length,
    stale: stale.length,
    healthy,
    score,
    gitLinked,
    customDomain,
    accountRows,
    queue,
  };
}

export type BriefRepo = {
  name: string;
  url: string;
  lastUpdated?: string;
  status?: string;
  visibility?: string;
  language?: string;
};

export function githubBrief(
  repos: BriefRepo[],
  cfRows: CloudflareDeploymentRow[],
  ownerOf: (url: string) => string,
  now = Date.now(),
) {
  const deployByRepo = new Map<string, CloudflareDeploymentRow[]>();
  for (const r of cfRows) {
    const k = repoKeyFromUrl(r.repoUrl);
    if (!k) continue;
    deployByRepo.set(k, [...(deployByRepo.get(k) ?? []), r]);
  }
  const ageDays = (r: BriefRepo) => {
    const t = r.lastUpdated ? Date.parse(r.lastUpdated) : NaN;
    return Number.isFinite(t) ? Math.floor((now - t) / DAY) : null;
  };
  const active = repos.filter((r) => r.status !== "archived");
  const deployed = repos.filter((r) => deployByRepo.has(repoKeyFromUrl(r.url) ?? ""));
  const failingRepos = repos.filter((r) =>
    (deployByRepo.get(repoKeyFromUrl(r.url) ?? "") ?? []).some((d) => healthOf(d) === "failing"),
  );
  const stale = active.filter((r) => {
    const d = ageDays(r);
    return d !== null && d > REPO_STALE_DAYS;
  });
  const recent = repos.filter((r) => {
    const d = ageDays(r);
    return d !== null && d <= 7;
  });
  const priv = repos.filter((r) => r.visibility === "private").length;

  const byAccount = new Map<string, number>();
  for (const r of repos) byAccount.set(ownerOf(r.url), (byAccount.get(ownerOf(r.url)) ?? 0) + 1);
  const langs = new Map<string, number>();
  for (const r of repos) if (r.language) langs.set(r.language, (langs.get(r.language) ?? 0) + 1);

  const queue: FixItem[] = [
    ...failingRepos.map((r) => {
      const d = (deployByRepo.get(repoKeyFromUrl(r.url) ?? "") ?? []).find(
        (x) => healthOf(x) === "failing",
      )!;
      return {
        key: "f:" + r.url,
        title: r.name,
        reason: "Cloudflare build failing (" + d.name + ")",
        severity: "critical" as const,
        url: d.projectUrl,
        sub: ownerOf(r.url),
      };
    }),
    ...stale
      .filter((r) => deployByRepo.has(repoKeyFromUrl(r.url) ?? ""))
      .sort((a, b) => (ageDays(b) ?? 0) - (ageDays(a) ?? 0))
      .map((r) => ({
        key: "s:" + r.url,
        title: r.name,
        reason: "Live on Cloudflare but no commits in " + ageDays(r) + " days",
        severity: "info" as const,
        url: r.url,
        sub: ownerOf(r.url),
      })),
  ];

  return {
    total: repos.length,
    active: active.length,
    archived: repos.length - active.length,
    deployed: deployed.length,
    failing: failingRepos.length,
    stale: stale.length,
    recent: recent.length,
    private: priv,
    accounts: [...byAccount.entries()].sort((a, b) => b[1] - a[1]),
    languages: [...langs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
    queue,
  };
}
