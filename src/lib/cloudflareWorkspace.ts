import type { CloudflareDeploymentRow, DeployHealth } from "@/lib/cloudflareInventory.server";

/** Pure view-model helpers for the Cloudflare workspace (browser-safe, tested). */
export type QuickFilter =
  | "all"
  | "failing"
  | "building"
  | "none"
  | "custom"
  | "pagesdev"
  | "git"
  | "direct"
  | "stale"
  | "recent"
  | "workers";
export type SortKey = "name" | "account" | "health" | "deployed" | "domain";
export const STALE_DAYS = 90;
export const RECENT_DAYS = 7;
const DAY = 86_400_000;

export function healthOf(row: CloudflareDeploymentRow): DeployHealth {
  if (row.health) return row.health;
  if (row.statusSource === "unavailable") return row.kind === "pages" ? "none" : "unknown";
  if (/^success$/i.test(row.status) || row.kind === "worker") return "live";
  if (/fail/i.test(row.status)) return "failing";
  return "unknown";
}
export function deployedMs(row: CloudflareDeploymentRow): number {
  const t = row.deployedAt ? Date.parse(row.deployedAt) : NaN;
  return Number.isFinite(t) ? t : 0;
}
export function hostOf(url: string | null | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}
/** GitHub commit link only when Cloudflare reported both repository and SHA. */
export function commitUrl(
  row: Pick<CloudflareDeploymentRow, "repoUrl" | "commit">,
  sha = row.commit,
): string | null {
  return row.repoUrl && sha && /^[a-f0-9]{7,40}$/i.test(sha)
    ? row.repoUrl + "/commit/" + sha
    : null;
}
export function relativeTime(iso: string | null | undefined, now = Date.now()): string {
  const t = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(t)) return "—";
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return Math.round(s / 60) + "m ago";
  if (s < 86400) return Math.round(s / 3600) + "h ago";
  if (s < 86400 * 60) return Math.round(s / 86400) + "d ago";
  if (s < 86400 * 730) return Math.round(s / (86400 * 30)) + "mo ago";
  return Math.round(s / (86400 * 365)) + "y ago";
}

export function matchesQuick(
  row: CloudflareDeploymentRow,
  filter: QuickFilter,
  now = Date.now(),
): boolean {
  const health = healthOf(row);
  const age = now - deployedMs(row);
  switch (filter) {
    case "all":
      return true;
    case "failing":
      return health === "failing";
    case "building":
      return health === "building";
    case "none":
      return health === "none";
    case "custom":
      return row.domains.length > 0;
    case "pagesdev":
      return row.kind === "pages" && row.domains.length === 0;
    case "git":
      return row.sourceType === "github" || row.sourceType === "gitlab" || Boolean(row.repoUrl);
    case "direct":
      return row.kind === "pages" && row.sourceType === "direct_upload";
    case "stale":
      return deployedMs(row) > 0 && age > STALE_DAYS * DAY;
    case "recent":
      return deployedMs(row) > 0 && age <= RECENT_DAYS * DAY;
    case "workers":
      return row.kind === "worker";
  }
}
export function quickCounts(
  rows: CloudflareDeploymentRow[],
  now = Date.now(),
): Record<QuickFilter, number> {
  const keys: QuickFilter[] = [
    "all",
    "failing",
    "building",
    "none",
    "custom",
    "pagesdev",
    "git",
    "direct",
    "stale",
    "recent",
    "workers",
  ];
  return Object.fromEntries(
    keys.map((k) => [k, rows.filter((r) => matchesQuick(r, k, now)).length]),
  ) as Record<QuickFilter, number>;
}
export function searchText(row: CloudflareDeploymentRow, accountLabel = ""): string {
  return [
    row.name,
    row.kind,
    row.status,
    healthOf(row),
    row.repoUrl || "",
    row.branch || "",
    row.commit || "",
    row.accountId,
    accountLabel,
    row.publicUrl || "",
    row.pagesDevUrl || "",
    ...row.domains,
    ...row.routes,
  ]
    .join(" ")
    .toLowerCase();
}
const HEALTH_RANK: Record<DeployHealth, number> = {
  failing: 0,
  building: 1,
  none: 2,
  unknown: 3,
  live: 4,
};
export function compareRows(
  a: CloudflareDeploymentRow,
  b: CloudflareDeploymentRow,
  key: SortKey,
  accountLabel: (id: string) => string = (id) => id,
): number {
  const byName = a.name.localeCompare(b.name);
  switch (key) {
    case "account":
      return accountLabel(a.accountId).localeCompare(accountLabel(b.accountId)) || byName;
    case "health":
      return HEALTH_RANK[healthOf(a)] - HEALTH_RANK[healthOf(b)] || byName;
    case "deployed":
      return deployedMs(b) - deployedMs(a) || byName;
    case "domain":
      return (hostOf(a.publicUrl) || "~").localeCompare(hostOf(b.publicUrl) || "~") || byName;
    default:
      return byName;
  }
}

/** CSV with spreadsheet formula-injection protection. */
export function inventoryCsv(
  rows: CloudflareDeploymentRow[],
  accountLabel: (id: string) => string,
): string {
  const safe = (value: string) => {
    const v = /^[\s]*[=+@-]/.test(value) ? "'" + value : value;
    return '"' + v.replace(/"/g, '""') + '"';
  };
  const header = [
    "account",
    "kind",
    "name",
    "health",
    "status",
    "deployed_at",
    "live_url",
    "pages_dev_url",
    "custom_domains",
    "routes",
    "source",
    "repo",
    "branch",
    "commit",
    "dashboard",
  ];
  const body = rows.map((r) =>
    [
      accountLabel(r.accountId),
      r.kind,
      r.name,
      healthOf(r),
      r.status,
      r.deployedAt || "",
      r.publicUrl || "",
      r.pagesDevUrl || "",
      r.domains.join("; "),
      r.routes.join("; "),
      r.sourceType || "",
      r.repoUrl || "",
      r.branch || "",
      r.commit || "",
      r.projectUrl,
    ]
      .map(safe)
      .join(","),
  );
  return [header.join(","), ...body].join("\r\n");
}
