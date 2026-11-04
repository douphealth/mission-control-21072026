import { describe, expect, it } from "vitest";
import { recentOperatorActivity } from "@/lib/operatorActivity";
import { normalizePagesProject } from "@/lib/cloudflareInventory.server";
import type { RepoOpsRow } from "@/lib/repoOps";
const repo={key:"douphealth/site",url:"https://github.com/douphealth/site",
pushedAt:"2026-11-03T10:00:00Z"} as RepoOpsRow;
const deployment=normalizePagesProject("a".repeat(32),{name:"site",
canonical_deployment:{id:"a",created_on:"2026-11-04T00:00:00Z",latest_stage:{status:"success"}}})!;
describe("source-grounded operator activity",()=>{
  it("orders observed pushes/deployments while keeping event meaning distinct",()=>{
    const events=recentOperatorActivity([repo],[deployment],8);
    expect(events.map(e=>e.source)).toEqual(["Cloudflare","GitHub"]);
    expect(events[1].action).toMatch(/not necessarily deployed/);
    expect(events[0].url).toBe(deployment.projectUrl);
  });
  it("ignores unknown timestamps and clamps output",()=>{
    expect(recentOperatorActivity([{...repo,pushedAt:null}],[deployment],0)).toHaveLength(0);
    expect(recentOperatorActivity([{...repo,pushedAt:"bad-date"}],[],8)).toHaveLength(0);
  });
});