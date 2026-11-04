import { describe, expect, it } from "vitest";
import { normalizePagesProject, normalizeWorkerScript } from "@/lib/cloudflareInventory.server";
import { cloudflareCoverage, cloudflareInventoryStats, matchesCloudflareFacets } from "@/lib/cloudflareFacets";

const account = "a".repeat(32);
const pages = normalizePagesProject(account, {
  name: "site", domains: ["site.example.com"], subdomain: "site.pages.dev",
  source: {type: "github",config:{owner:"douphealth",repo_name:"site", production_branch:"main"}},
  canonical_deployment: {id:"1",created_on:"2026-11-03T10:00:00Z",latest_stage:{status:"success"}},
})!;
const upload = normalizePagesProject(account, {name:"uploaded",subdomain:"uploaded.pages.dev",
  source: {type:"direct_upload"}, canonical_deployment:{id:"2",latest_stage:{status:"failure"}}})!;
const worker = normalizeWorkerScript(account,{id:"api",subdomain:{enabled:true},deployed_on:"2026-11-03T10:00:00Z"},
  [],undefined,"example")!;
describe("Cloudflare operation facets",()=>{
  it("composes resource kinds, source integrations, and exact endpoint types",()=>{
    expect(matchesCloudflareFacets(pages,{kind:"pages",source:"github",endpoint:"custom"})).toBe(true);
    expect(matchesCloudflareFacets(pages,{kind:"worker",source:"all",endpoint:"all"})).toBe(false);
    expect(matchesCloudflareFacets(worker,{kind:"worker",source:"all",endpoint:"workersdev"})).toBe(true);
    expect(matchesCloudflareFacets(upload,{kind:"all",source:"direct_upload",endpoint:"all"})).toBe(true);
  });
  it("counts only metadata observed, not invented worker uptime",()=>{
    const stats=cloudflareInventoryStats([pages,upload,worker],Date.parse("2026-11-04T00:00:00Z"));
    expect(stats).toMatchObject({total:3,pages:2,workers:1,providerSources:1,failed:1});
  });
  it("distinguishes complete account coverage from partial results",()=>{
    const inventory={source:"Cloudflare API" as const,fetchedAt:"2026-11-04T00:00:00Z",
      rows:[pages],zones:[],accounts:[account],truthState:"live" as const,errors:[],
      accountDetails:[{accountId:account,label:"Primary",truthState:"live" as const,configuredToken:true,
        pagesCount:1,workersCount:0,zonesCount:0,errors:[]}]};
    expect(cloudflareCoverage(inventory).complete).toBe(true);
    expect(cloudflareCoverage({...inventory,truthState:"partial"}).complete).toBe(false);
  });
});