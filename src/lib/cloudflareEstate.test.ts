import { afterEach, describe, expect, it, vi } from "vitest";
import { collectCloudflareEstate, inspectCloudflareWorker } from "@/lib/cloudflareEstate.server";
const A = "a".repeat(32), B = "b".repeat(32);
const env = {
  CLOUDFLARE_ACCOUNT_IDS: A + "," + B,
  CLOUDFLARE_ACCOUNT_TOKENS_JSON: JSON.stringify({
    [A]: {default: "a-token"}, [B]: {default: "b-token"},
  }),
};
describe("Cloudflare estate least-privilege discovery", () => {
  afterEach(() => { vi.unstubAllGlobals(); });
  it("keeps per-account credentials isolated and treats inaccessible services as unknown", async () => {
    const requests: {url:string; token:string}[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string, init?: RequestInit) => {
      const url = String(input);
      const token = String((init?.headers as Record<string, string>)?.Authorization);
      requests.push({url, token});
      if (url.includes("/r2/buckets")) return new Response("", {status:403});
      const path = new URL(url).pathname;
      const value = path.includes("/storage/kv/namespaces") ?
        [{id:"a1",title:"cached-data"}] : path.includes("/d1/database") ?
        [{uuid:"d1x",name:"content-db"}] : path.includes("/queues") ?
        [{queue_id:"q1",queue_name:"jobs"}] : [];
      return new Response(JSON.stringify({success:true,result:value,
        result_info:{total_count:value.length,total_pages:1}}));
    }));
    const result = await collectCloudflareEstate(env);
    expect(result.truthState).toBe("partial");
    expect(result.assets).toHaveLength(6);
    expect(result.checks.filter(c => c.service === "r2")).toHaveLength(10);
    expect(result.checks.filter(c => c.service === "r2").every(c =>
      c.state === "error" && c.count === null)).toBe(true);
    expect(requests.filter(r => r.url.includes("/accounts/" + A))
      .every(r => r.token === "Bearer a-token")).toBe(true);
    expect(requests.filter(r => r.url.includes("/accounts/" + B))
      .every(r => r.token === "Bearer b-token")).toBe(true);
    expect(JSON.stringify(result)).not.toContain("a-token");
    expect(JSON.stringify(result)).not.toContain("b-token");
  });
  it("refuses unknown accounts before calling an API", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(inspectCloudflareWorker({accountId:"c".repeat(32),name:"foo"},env))
      .rejects.toThrow("Unknown Cloudflare Worker");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("hides plaintext and secrets from Worker binding metadata", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input:string) => {
      const path = new URL(String(input)).pathname;
      const result = path.endsWith("/settings") ? {bindings:[
        {name:"API_SECRET",type:"secret_text",text:"SUPER-PRIVATE"},
        {name:"BAD_TEXT",type:"plain_text",text:"PII"},
        {name:"DB",type:"d1",id:"db-123"},
      ]} : path.endsWith("/schedules") ? {schedules:[{cron:"0 9 * * *"}]} : {};
      return new Response(JSON.stringify({success:true,result}));
    }));
    const result = await inspectCloudflareWorker({accountId:A,name:"test-worker"},env);
    expect(result.bindings).toEqual([
      {name:"API_SECRET",type:"secret_text",target:null},
      {name:"BAD_TEXT",type:"plain_text",target:null},
      {name:"DB",type:"d1",target:"db-123"},
    ]);
    expect(JSON.stringify(result)).not.toContain("SUPER-PRIVATE");
    expect(JSON.stringify(result)).not.toContain("PII");
    expect(result.crons).toEqual(["0 9 * * *"]);
  });
});
