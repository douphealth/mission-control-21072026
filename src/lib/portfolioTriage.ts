import type { RepoOpsRow } from "@/lib/repoOps";
import type { CloudflareDeploymentRow, InfraTruth } from "@/lib/cloudflareInventory.server";
import { healthOf } from "@/lib/cloudflareWorkspace";

/** Read-only, evidence-grounded reconciliation. No URL guesses or uptime assertions. */
export function githubTriage(rows: readonly RepoOpsRow[], cloudTruth: InfraTruth | null) {
  const missingApp = rows.filter(r => !r.appUrl);
  const failedBuild = rows.filter(r => r.cloudflare.some(c => healthOf(c) === "failing"));
  const unconfirmedApp = rows.filter(r => r.appUrl && !r.appEvidence?.providerAttested);
  const conflicting = rows.filter(r => {
    const observed = r.cloudflare.map(c => c.publicUrl).filter((u): u is string => Boolean(u));
    if (!r.appUrl || !observed.length || r.appEvidence?.providerAttested) return false;
    // A historical app URL can legitimately differ. Offer review, not a false alarm.
    try {
      const appHost = new URL(r.appUrl).hostname;
      return !observed.some(u => new URL(u).hostname === appHost);
    } catch { return false; }
  });
  return { failedBuild, missingApp, unconfirmedApp, conflicting, complete: cloudTruth === "live" };
}

export function cloudflareTriage(rows: readonly CloudflareDeploymentRow[], truth: InfraTruth) {
  const failedBuild = rows.filter(r => healthOf(r) === "failing");
  const building = rows.filter(r => healthOf(r) === "building");
  const unknownURL = rows.filter(r => !r.publicUrl);
  const unknownSource = rows.filter(r => !r.repoUrl && r.sourceType !== "direct_upload");
  // A successful Cloudflare deployment does not establish endpoint uptime.
  return { failedBuild, building, unknownURL, unknownSource, complete: truth === "live" };
}
