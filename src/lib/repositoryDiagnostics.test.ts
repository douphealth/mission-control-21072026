import { afterEach, describe, expect, it, vi } from "vitest";
import { collectRepositoryDiagnostics } from "@/lib/repositoryDiagnostics.server";

const tokenEnv={GITHUB_PORTFOLIO_TOKENS_JSON:JSON.stringify({douphealth:"fake-private-read-token-long"})};
const mock=(path:string)=>{
  if(path.endsWith("/site")) return {full_name:"douphealth/site",default_branch:"main"};
  if(path.endsWith("/actions/runs")) return {workflow_runs:[{status:"completed",conclusion:"failure",
    name:"CI",event:"push",html_url:"https://github.com/douphealth/site/actions/runs/12",
    head_sha:"abc1234",created_at:"2026-11-04T00:00:00Z"}]};
  if(path.endsWith("/pulls")) return [{number:3,title:"Fix indexation",
    html_url:"https://github.com/douphealth/site/pull/3",updated_at:"2026-11-04T00:00:00Z"}];
  if(path.endsWith("/deployments")) return [{environment:"production",ref:"main",
    html_url:"https://github.com/douphealth/site/deployments/10",created_at:"2026-11-04T00:00:00Z"}];
  return null;
};
describe("authenticated on-demand repository diagnostics",()=>{
  afterEach(()=>vi.unstubAllGlobals());
  it("does not make external requests when private account token is absent",async()=>{
    const fetcher=vi.fn();
    const result=await collectRepositoryDiagnostics("douphealth","site",{},fetcher);
    expect(result.state).toBe("unavailable");
    expect(fetcher).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain("Authorization");
  });
  it("rejects untrusted repo identifiers before HTTP calls",async()=>{
    await expect(collectRepositoryDiagnostics("foreign","x",tokenEnv)).rejects.toThrow();
    await expect(collectRepositoryDiagnostics("douphealth","../secret",tokenEnv)).rejects.toThrow();
  });
  it("only queries authenticated verified account repo and reads actual CI outcome",async()=>{
    const fetcher=vi.fn(async(input:string)=>{
      const u=new URL(input);
      const payload=mock(u.pathname);
      return new Response(JSON.stringify(payload),{status:payload?200:404});
    });
    const result=await collectRepositoryDiagnostics("douphealth","site",tokenEnv,fetcher as unknown as typeof fetch);
    expect(result.state).toBe("live");
    expect(result.latestCI?.conclusion).toBe("failure");
    expect(result.latestCI?.url).toBe("https://github.com/douphealth/site/actions/runs/12");
    expect(result.recentOpenPRs).toHaveLength(1);
    expect(result.deployments).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(JSON.stringify(result)).not.toContain("fake-private-read-token-long");
  });
  it("fails closed when repository identity does not match the request",async()=>{
    const fetcher=vi.fn(async()=>new Response(JSON.stringify({full_name:"other/site"}),{status:200}));
    const result=await collectRepositoryDiagnostics("douphealth","site",tokenEnv,fetcher as unknown as typeof fetch);
    expect(result.state).toBe("unavailable");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});