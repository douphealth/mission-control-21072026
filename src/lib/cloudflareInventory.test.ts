import { afterEach, describe, expect, it, vi } from "vitest";
import {
  configuredAccounts, configuredAccountLabels, collectCloudflareInventory, loadDeploymentHistory,
  normalizePagesProject, normalizeWorkerScript,
} from "@/lib/cloudflareInventory.server";
import { CloudflareAccessError, requireCloudflareViewer } from "@/lib/cloudflareAccess.server";

const ACCOUNT = "a".repeat(32);

describe("Cloudflare production inventory normalization", () => {
  it("chooses canonical production deployment rather than latest preview", () => {
    const p = normalizePagesProject(ACCOUNT, {
      name: "example-product",
      subdomain: "example-product.pages.dev",
      domains: ["my-app.example.com"],
      source: { type: "github", config: {
        owner: "example-owner", repo_name: "example-repo", production_branch: "main",
      }},
      canonical_deployment: {
        id: "production-001", created_on: "2026-10-01T00:00:00Z",
        latest_stage: { status: "success" },
        deployment_trigger: { metadata: { branch: "main", commit_hash: "abcdef123" }},
      },
      latest_deployment: {
        id: "preview-999",
        latest_stage: { status: "failure" },
        deployment_trigger: { metadata: { branch: "preview", commit_hash: "bad000" }},
      },
    });
    expect(p?.deploymentId).toBe("production-001");
    expect(p?.commit).toBe("abcdef123");
    expect(p?.branch).toBe("main");
    expect(p?.status).toBe("success");
    expect(p?.publicUrl).toBe("https://my-app.example.com/");
    expect(p?.projectUrl).toBe(
      "https://dash.cloudflare.com/" + ACCOUNT + "/pages/view/example-product");
    expect(p?.repoUrl).toBe("https://github.com/example-owner/example-repo");
  });
  it("never marks a missing deployment as healthy", () => {
    const result = normalizePagesProject(ACCOUNT, { name: "empty-project" });
    expect(result?.status).toBe("unknown");
    expect(result?.deploymentId).toBeNull();
    expect(result?.statusSource).toBe("unavailable");
    expect(result?.publicUrl).toBeNull();
  });
  it("shows only enabled worker custom domains and real routes", () => {
    const worker = normalizeWorkerScript(
      ACCOUNT,
      { id: "mail-worker", routes: [{script:"mail-worker",pattern:"mail.example.com/*"}] },
      [{ service:"mail-worker",hostname:"mail.example.com",enabled:true },
       { service:"mail-worker",hostname:"private.example.com",enabled:false },
       { service:"other-worker",hostname:"other.example.com",enabled:true }],
      { id:"deployment-x",created_on:"2026-10-10T10:00:00Z" },
    );
    expect(worker?.domains).toEqual(["mail.example.com"]);
    expect(worker?.routes).toEqual(["mail.example.com/*"]);
    expect(worker?.publicUrl).toBe("https://mail.example.com/");
    expect(worker?.deploymentId).toBe("deployment-x");
    expect(worker?.repoUrl).toBeNull();
  });
  it("labels only valid configured account identifiers", () => {
    expect(configuredAccountLabels({CLOUDFLARE_ACCOUNT_LABELS_JSON: JSON.stringify({["a".repeat(32)]:"Cloudflare A",wrong:"Ignore"})})).toEqual({["a".repeat(32)]:"Cloudflare A"});
  });
  it("never treats a missing enabled flag as proof a Worker domain is live", () => {
    const row = normalizeWorkerScript(ACCOUNT,{id:"worker-a"},[{service:"worker-a",hostname:"app.example.com"}]);
    expect(row?.domains).toEqual([]);
    expect(row?.publicUrl).toBeNull();
  });
  it("deduplicates and validates account identifiers without leaking secrets", () => {
    expect(configuredAccounts({ CLOUDFLARE_ACCOUNT_IDS:
      ACCOUNT + "," + ACCOUNT + ",invalid," + "b".repeat(32) }))
      .toEqual([ACCOUNT, "b".repeat(32)]);
  });
});

describe("multi-account scoped API credentials", () => {
  it("preserves each account and can use a separate Pages token", async () => {
    const { apiTokenFor, pagesTokenFor } = await import("@/lib/cloudflareInventory.server");
    const first = "a".repeat(32), second = "b".repeat(32);
    const env = { CLOUDFLARE_ACCOUNT_TOKENS_JSON: JSON.stringify({
      [first]: { default: "first-general", pages: "first-pages" },
      [second]: { default: "second-general", pages: "second-pages" },
    }) };
    expect(apiTokenFor(first, env)).toBe("first-general");
    expect(pagesTokenFor(first, env)).toBe("first-pages");
    expect(apiTokenFor(second, env)).toBe("second-general");
    expect(pagesTokenFor(second, env)).toBe("second-pages");
  });
});

describe("infrastructure security", () => {
  it("fails closed when Cloudflare Access policy is missing", async () => {
    await expect(requireCloudflareViewer(undefined, {}))
      .rejects.toMatchObject({ code: "not_configured" });
  });
  it("rejects absent Access JWT without attempting external API calls", async () => {
    const env = { CLOUDFLARE_ACCESS_TEAM_DOMAIN: "myteam.cloudflareaccess.com",
      CLOUDFLARE_ACCESS_AUD: "the-required-audience" };
    await expect(requireCloudflareViewer(new Request("https://example.com"), env))
      .rejects.toMatchObject({ code: "unauthorized" });
  });
  it("uses Cloudflare specific denial errors", () => {
    expect(new CloudflareAccessError("unauthorized").name).toBe("CloudflareAccessError");
  });
});


describe("real Cloudflare API inventory with synthetic responses", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("collects Pages, Workers, routes and domains without N+1 Worker history requests", async () => {
    const paths: string[] = [];
    vi.stubEnv("CLOUDFLARE_ACCOUNT_IDS", ACCOUNT);
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "synthetic-read-token-only");
    const responses: Record<string, unknown> = {
      ["/accounts/" + ACCOUNT + "/pages/projects"]: [{
        name: "example-app", subdomain:"example-app.pages.dev",
        source: { type:"github", config:{owner:"example-org",repo_name:"app",production_branch:"main"}},
        canonical_deployment: { id:"depl-prod",latest_stage:{status:"success"} },
      }],
      ["/accounts/" + ACCOUNT + "/workers/workers"]: [{name:"api-worker",deployed_on:"2026-11-01T11:30:00Z"}],
      ["/accounts/" + ACCOUNT + "/workers/domains"]: [{
        service:"api-worker",hostname:"api.example.com",enabled:true,
      }],
      "/zones": [{id:ACCOUNT,name:"example.com"}],
      ["/zones/" + ACCOUNT + "/workers/routes"]: [
        {script:"api-worker",pattern:"example.com/api/*"},
      ],
      ["/accounts/" + ACCOUNT + "/workers/scripts/api-worker/deployments"]: {
        deployments:[{id:"worker-001",created_on:"2026-10-24T10:00:00Z"}],
      },
    };
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      const path = url.pathname.replace(/^\/client\/v4(?=\/)/, "");
      paths.push(path);
      const payload = responses[path];
      if (!payload) return new Response(JSON.stringify({success:false}), {status:404});
      return new Response(JSON.stringify({success:true,result:payload,
        result_info:{total_pages:1}}),{status:200});
    }));
    const inventory = await collectCloudflareInventory();
    expect(inventory.truthState).toBe("live");
    expect(inventory.errors).toHaveLength(0);
    expect(inventory.rows).toHaveLength(2);
    expect(inventory.zones).toHaveLength(1);
    expect(inventory.accountDetails).toMatchObject([{accountId:ACCOUNT,truthState:"live",pagesCount:1,workersCount:1,zonesCount:1}]);
    const pages = inventory.rows.find(row=>row.kind==="pages");
    expect(pages?.repoUrl).toBe("https://github.com/example-org/app");
    expect(pages?.status).toBe("success");
    const worker = inventory.rows.find(row=>row.kind==="worker");
    expect(worker?.routes).toEqual(["example.com/api/*"]);
    expect(worker?.domains).toEqual(["api.example.com"]);
    expect(worker?.statusSource).toBe("cloudflare-deployment");
    expect(worker?.status).toBe("deployed (API metadata)");
    expect(paths.some(path=>path.includes("/deployments"))).toBe(false);
    expect(paths.some(path=>path.endsWith("/workers/workers"))).toBe(true);
    expect(paths.some(path=>path.includes("/workers/domains") && path.includes("?"))).toBe(false);
    const history = await loadDeploymentHistory({
      accountId:ACCOUNT,kind:"worker",name:"api-worker",page:1,
    });
    expect(history.rows).toHaveLength(1);
    expect(history.rows[0].id).toBe("worker-001");
    expect(paths.filter(path=>path.includes("/deployments"))).toHaveLength(1);
    expect(JSON.stringify(inventory)).not.toContain("synthetic-read-token-only");
  });
  it("skips zone routes when a modern Workers API confirms no Workers", async () => {
    const paths: string[] = [];
    const env = { CLOUDFLARE_ACCOUNT_IDS: ACCOUNT, CLOUDFLARE_API_TOKEN: "synthetic-only" };
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      const path = url.pathname.replace(/^\/client\/v4(?=\/)/, "");
      paths.push(path);
      const data = path.includes("/pages/projects") || path.endsWith("/workers/workers") ||
        path.endsWith("/workers/domains") ? [] : path === "/zones" ?
        [{id:ACCOUNT,name:"example.com"}] : null;
      if (data === null) return new Response(JSON.stringify({success:false}), {status:404});
      return new Response(JSON.stringify({success:true,result:data,result_info:{total_pages:1}}));
    }));
    const inventory = await collectCloudflareInventory(env);
    expect(inventory.truthState).toBe("live");
    expect(inventory.zones).toHaveLength(1);
    expect(inventory.rows).toHaveLength(0);
    expect(paths.some(path => path.endsWith("/workers/routes"))).toBe(false);
  });

});
