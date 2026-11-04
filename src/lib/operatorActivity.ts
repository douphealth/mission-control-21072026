import type { RepoOpsRow } from "@/lib/repoOps";
import type { CloudflareDeploymentRow } from "@/lib/cloudflareInventory.server";

export type OperatorActivity = {
  key: string; source: "GitHub" | "Cloudflare"; name: string;
  action: string; at: string; url: string;
};
/** Observed timestamps and URLs only. A push is not a deployment. */
export function recentOperatorActivity(
  repos: readonly RepoOpsRow[], deployments: readonly CloudflareDeploymentRow[], limit = 8,
): OperatorActivity[] {
  const events: OperatorActivity[] = [];
  for (const row of repos) if (row.pushedAt && Number.isFinite(Date.parse(row.pushedAt))) {
    events.push({key:"gh:"+row.key,source:"GitHub",name:row.key,
      action:"Repository pushed (not necessarily deployed)",
      at:row.pushedAt,url:row.url});
  }
  for (const row of deployments) if (row.deployedAt && Number.isFinite(Date.parse(row.deployedAt))) {
    events.push({key:"cf:"+row.key,source:"Cloudflare",name:row.name,
      action:row.kind === "pages" ? "Pages serving deployment recorded" : "Worker deployment metadata reported",
      at:row.deployedAt,url:row.projectUrl});
  }
  return events.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)||a.key.localeCompare(b.key))
    .slice(0,Math.min(16,Math.max(0,limit)));
}
