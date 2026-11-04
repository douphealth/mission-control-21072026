import type { CloudflareDeploymentRow, CloudflareInventory } from "@/lib/cloudflareInventory.server";
import { deployedMs, healthOf } from "@/lib/cloudflareWorkspace";

export type CloudflareFacets = {
  kind: "all" | "pages" | "worker";
  source: "all" | "github" | "gitlab" | "direct_upload" | "unverified";
  endpoint: "all" | "public" | "missing" | "custom" | "workersdev" | "pagesdev" | "routes";
};
export const CLOUDFLARE_FACETS_DEFAULT: CloudflareFacets = {
  kind: "all", source: "all", endpoint: "all",
};
export function matchesCloudflareFacets(row: CloudflareDeploymentRow, f: CloudflareFacets): boolean {
  if (f.kind !== "all" && row.kind !== f.kind) return false;
  if (f.source === "unverified" && (row.repoUrl || row.sourceType === "direct_upload")) return false;
  if (f.source !== "all" && f.source !== "unverified" && row.sourceType !== f.source) return false;
  switch (f.endpoint) {
    case "public": return Boolean(row.publicUrl);
    case "missing": return !row.publicUrl;
    case "custom": return row.domains.length > 0;
    case "workersdev": return row.kind === "worker" && Boolean(row.workersDevUrl);
    case "pagesdev": return row.kind === "pages" && Boolean(row.pagesDevUrl);
    case "routes": return row.kind === "worker" && row.routes.length > 0;
    default: return true;
  }
}
export function cloudflareInventoryStats(rows: readonly CloudflareDeploymentRow[], now = Date.now()) {
  return {
    total: rows.length,
    pages: rows.filter(x => x.kind === "pages").length,
    workers: rows.filter(x => x.kind === "worker").length,
    failed: rows.filter(x => healthOf(x) === "failing").length,
    building: rows.filter(x => healthOf(x) === "building").length,
    providerSources: rows.filter(x => Boolean(x.repoUrl)).length,
    directUploads: rows.filter(x => x.sourceType === "direct_upload").length,
    missingEndpoints: rows.filter(x => !x.publicUrl).length,
    deployed7d: rows.filter(x => deployedMs(x) > 0 && now >= deployedMs(x) &&
      now - deployedMs(x) <= 7 * 86_400_000).length,
  };
}
export function cloudflareCoverage(inventory: CloudflareInventory) {
  const accountRows = inventory.accountDetails.map(a => ({
    ...a, items: inventory.rows.filter(r => r.accountId === a.accountId).length,
  }));
  return {
    complete: inventory.truthState === "live" &&
      accountRows.every(x => x.truthState === "live"),
    errors: inventory.errors.length,
    accounts: accountRows,
    source: inventory.source,
    fetchedAt: inventory.fetchedAt,
  };
}
