import { describe, expect, it } from "vitest";
import { normalizePagesProject } from "@/lib/cloudflareInventory.server";
import { buildRepoOps } from "@/lib/repoOps";
import { matchesRepositoryFacets, repositoryPortfolioStats, REPOSITORY_FACETS_DEFAULT } from "@/lib/repositoryFacets";
import type { GitHubRepo } from "@/lib/db";
const repo: GitHubRepo = {id:"r1",name:"site",url:"https://github.com/douphealth/site",description:"",
language:"TypeScript",stars:0,forks:0,status:"active",demoUrl:"",progress:0,topics:[],
lastUpdated:"2026-11-02"};
const cloud=normalizePagesProject("a".repeat(32),{name:"app",domains:["app.example.com"],
source:{type:"github",config:{owner:"douphealth",repo_name:"site",production_branch:"main"}},
canonical_deployment:{id:"1",created_on:"2026-11-02T00:00:00Z",latest_stage:{status:"success"}}})!;
const rows=buildRepoOps({displayRepos:[repo,{...repo,id:"r2",name:"unknown",
url:"https://github.com/douphealth/unknown"}],savedRepos:[repo],live:[],owned:[],cloud:[cloud]});
const site=rows.find(r=>r.name==="site")!;
const unknown=rows.find(r=>r.name==="unknown")!;
describe("composable repository evidence filters",()=>{
  it("does not guess URL for an unrelated repo",()=>{
    expect(site.appUrl).toBe("https://app.example.com/");
    expect(unknown.appUrl).toBeNull();
    expect(repositoryPortfolioStats(rows)).toMatchObject({total:2,cloudflareMatches:1,missingApps:1});
  });
  it("filters on app source evidence, language, visibility, and deployment",()=>{
    expect(matchesRepositoryFacets(site,{...REPOSITORY_FACETS_DEFAULT,evidence:"provider"})).toBe(true);
    expect(matchesRepositoryFacets(unknown,{...REPOSITORY_FACETS_DEFAULT,evidence:"provider"})).toBe(false);
    expect(matchesRepositoryFacets(unknown,{...REPOSITORY_FACETS_DEFAULT,deployment:"missing-app"})).toBe(true);
    expect(matchesRepositoryFacets(site,{...REPOSITORY_FACETS_DEFAULT,language:"Python"})).toBe(false);
  });
  it("never treats an absent last-push date as a recent push",()=>{
    expect(matchesRepositoryFacets(site,{...REPOSITORY_FACETS_DEFAULT,activity:"7d"})).toBe(false);
    expect(matchesRepositoryFacets(site,{...REPOSITORY_FACETS_DEFAULT,activity:"unknown"})).toBe(true);
  });
});