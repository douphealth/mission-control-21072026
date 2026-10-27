import { describe, expect, it, vi } from "vitest";
import { fetchOwnerRepos, mergeLiveRepos, joinGitHubPlans, retainOwnerResult } from "@/lib/liveGitHub";
const repo=(owner:string,name:string)=>({html_url:`https://github.com/${owner}/${name}`,name,private:false,stargazers_count:4,forks_count:2,open_issues_count:3,default_branch:"main"});
describe("live GitHub inventory",()=>{
  it("fetches owned public repos, not forked or foreign private identifiers",async()=>{
    const fetcher=vi.fn(async()=>new Response(JSON.stringify([repo("douphealth","one"),{...repo("douphealth","secret"),private:true},repo("other","wrong")]),{status:200}));
    const result=await fetchOwnerRepos("douphealth",fetcher as unknown as typeof fetch);
    expect(result.state).toBe("live");
    expect(result.repositories.map(r=>r.key)).toEqual(["douphealth/one"]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("reports partial account failure rather than a fake empty success",async()=>{
    const fetcher=vi.fn(async()=>new Response("rate limited",{status:403}));
    const result=await fetchOwnerRepos("Papalexios",fetcher as unknown as typeof fetch);
    expect(result.state).toBe("error");
    expect(result.error).toMatch(/rate limit/);
  });
  it("paginates through an exactly full page",async()=>{
    let calls=0;
    const fetcher=vi.fn(async()=>{
      calls++;
      return new Response(JSON.stringify(calls===1?Array.from({length:100},(_,i)=>repo("douphealth","repo-"+i)):[]),{status:200});
    });
    const result=await fetchOwnerRepos("douphealth",fetcher as unknown as typeof fetch);
    expect(result.repositories.length).toBe(100);
    expect(calls).toBe(2);
  });
  it("retains a last verified account result after rate limiting",()=>{
    const ok={owner:"Papalexios",state:"live" as const,repositories:[],fetchedAt:"2026-10-27T07:00:00Z"};
    retainOwnerResult(ok);
    const failed=retainOwnerResult({owner:"Papalexios",state:"error",repositories:[],error:"GitHub rate limit"});
    expect(failed.state).toBe("error");
    expect(failed.fetchedAt).toBe(ok.fetchedAt);
  });
  it("preserves saved business plan while refreshing GitHub metadata",()=>{
    const saved={
      id:"saved-1",name:"one",url:"https://github.com/douphealth/one",
      description:"My project",language:"TypeScript",stars:0,forks:0,
      status:"paused" as const,demoUrl:"https://example.com",progress:70,
      topics:[],lastUpdated:"2026-10-20",priority:"critical" as const,
      pendingSummary:"Fix production blocker",
    };
    const live={
      key:"douphealth/one",owner:"douphealth",name:"one",
      url:"https://github.com/douphealth/one",description:"GitHub newer",
      language:"Python",updatedAt:null,pushedAt:null,defaultBranch:"main",
      visibility:"public" as const,archived:false,fork:false,stars:5,forks:1,
      openIssues:2,homepage:null,
    };
    const results=joinGitHubPlans([saved],[live]);
    expect(results).toHaveLength(1);
    expect(results[0].repo).toMatchObject({
      priority:"critical",progress:70,pendingSummary:"Fix production blocker",status:"paused",
    });
    expect(results[0].live?.stars).toBe(5);
  });
  it("merges live rows over dated snapshot without duplicates",()=>{
    const out=mergeLiveRepos([{url:"https://github.com/douphealth/one",description:"old"}],[{
      key:"douphealth/one",owner:"douphealth",name:"one",url:"https://github.com/douphealth/one",
      description:"new",language:"TypeScript",updatedAt:null,pushedAt:null,defaultBranch:"main",
      visibility:"public",archived:false,fork:false,stars:5,forks:1,openIssues:0,homepage:null,
    }]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({description:"new"});
  });
});