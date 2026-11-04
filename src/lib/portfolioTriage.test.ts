import { describe, expect, it } from "vitest";
import { githubTriage, cloudflareTriage } from "@/lib/portfolioTriage";
import { normalizePagesProject } from "@/lib/cloudflareInventory.server";
import { buildRepoOps } from "@/lib/repoOps";
import type { GitHubRepo } from "@/lib/db";
const account="a".repeat(32);
const prod=normalizePagesProject(account,{
  name:"deploy",subdomain:"deploy.pages.dev",domains:["prod.example.com"],
  source:{type:"github",config:{owner:"douphealth",repo_name:"app",production_branch:"main"}},
  canonical_deployment:{id:"1",latest_stage:{status:"success"}},
  latest_deployment:{id:"2",environment:"production",latest_stage:{status:"failure"}},
})!;
const repo:GitHubRepo={id:"saved",name:"app",url:"https://github.com/douphealth/app",
  description:"",language:"TypeScript",stars:0,forks:0,status:"active",
  demoUrl:"https://old.example.com/",progress:0,topics:[],lastUpdated:"2026-11-04"};
describe("evidence-based portfolio triage",()=>{
  it("identifies current failed production attempts without asserting endpoint outage",()=>{
    const finding=cloudflareTriage([prod],"live");
    expect(finding.failedBuild.map(x=>x.name)).toEqual(["deploy"]);
    expect(finding.unknownURL).toHaveLength(0);
  });
  it("reconciles exact Git links without incorrectly reporting outdated plan URL",()=>{
    const rows=buildRepoOps({displayRepos:[repo],savedRepos:[repo],live:[],owned:[],cloud:[prod]});
    const finding=githubTriage(rows,"live");
    expect(rows[0].appUrl).toBe("https://prod.example.com/");
    expect(finding.conflicting).toHaveLength(0);
    expect(finding.failedBuild).toHaveLength(1);
  });
  it("labels absent app links as unresolved even with partial Cloudflare data",()=>{
    const rows=buildRepoOps({displayRepos:[{...repo,name:"empty",url:"https://github.com/douphealth/empty",demoUrl:""}],
      savedRepos:[],live:[],owned:[],cloud:[]});
    const finding=githubTriage(rows,"partial");
    expect(finding.complete).toBe(false);
    expect(finding.missingApp).toHaveLength(1);
  });
});
