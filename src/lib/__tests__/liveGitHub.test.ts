import { describe, expect, it, vi } from "vitest";
import { fetchOwnerRepos, mergeLiveRepos } from "@/lib/liveGitHub";
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