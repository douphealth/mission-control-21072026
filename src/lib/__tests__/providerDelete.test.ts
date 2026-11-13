import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteCloudflareResource, deleteGitHubRepository } from "@/lib/providerDelete.server";
import { filterDeleted, markDeleted, reconcileDeleted, resetDeletedForTests } from "@/lib/deletedResources";

const ACCOUNT = "a".repeat(32);
const env = {
  CLOUDFLARE_ACCOUNT_IDS: ACCOUNT,
  CLOUDFLARE_ACCOUNT_TOKENS_JSON: JSON.stringify({ [ACCOUNT]: "cf-token-123456789" }),
  GITHUB_PORTFOLIO_TOKENS_JSON: JSON.stringify({ douphealth: "gh-token-1234567890" }),
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

let calls: Array<{ method: string; url: string }> = [];
function mockFetch(handler: (method: string, url: string) => Response) {
  calls = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method || "GET";
    calls.push({ method, url });
    return handler(method, url);
  }));
}
afterEach(() => vi.unstubAllGlobals());

describe("Cloudflare delete", () => {
  it("deletes a Pages project with DELETE on that exact project", async () => {
    mockFetch(() => json(200, { success: true, result: null }));
    const out = await deleteCloudflareResource({ accountId: ACCOUNT, kind: "pages", name: "my-site" }, env);
    expect(out).toMatchObject({ ok: true, alreadyGone: false });
    expect(calls).toEqual([{ method: "DELETE", url: `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/pages/projects/my-site` }]);
  });

  it("deletes a Worker through the Workers scripts endpoint", async () => {
    mockFetch(() => json(200, { success: true, result: null }));
    await deleteCloudflareResource({ accountId: ACCOUNT, kind: "worker", name: "api" }, env);
    expect(calls[0].url).toBe(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/api`);
  });

  it("refuses accounts that are not configured, without calling Cloudflare", async () => {
    mockFetch(() => json(200, { success: true }));
    const out = await deleteCloudflareResource({ accountId: "b".repeat(32), kind: "pages", name: "x" }, env);
    expect(out).toMatchObject({ ok: false, code: "invalid" });
    expect(calls).toHaveLength(0);
  });

  it("explains a missing Edit permission on 403", async () => {
    mockFetch(() => json(403, { success: false, errors: [{ code: 10000, message: "Authentication error" }] }));
    const out = await deleteCloudflareResource({ accountId: ACCOUNT, kind: "worker", name: "api" }, env);
    expect(out).toMatchObject({ ok: false, code: "forbidden" });
    expect(out.message).toContain("Workers Scripts: Edit");
  });

  it("clears old deployments then retries when Cloudflare says too many deployments", async () => {
    let projectDeletes = 0;
    mockFetch((method, url) => {
      if (method === "DELETE" && url.endsWith("/pages/projects/big"))
        return ++projectDeletes === 1
          ? json(400, { success: false, errors: [{ code: 8000076, message: "too many deployments" }] })
          : json(200, { success: true, result: null });
      if (method === "GET") return json(200, { success: true, result: [{ id: "deadbeef01", aliases: [] }, { id: "deadbeef02", aliases: ["https://big.pages.dev"] }] });
      return json(200, { success: true, result: null });
    });
    const out = await deleteCloudflareResource({ accountId: ACCOUNT, kind: "pages", name: "big" }, env);
    expect(out.ok).toBe(true);
    const deploymentDeletes = calls.filter((c) => c.method === "DELETE" && c.url.includes("/deployments/"));
    expect(deploymentDeletes.map((c) => c.url)).toEqual([
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/pages/projects/big/deployments/deadbeef01?force=true`,
    ]);
  });
});

describe("GitHub delete", () => {
  it("deletes a repository in a connected account", async () => {
    mockFetch(() => new Response(null, { status: 204 }));
    const out = await deleteGitHubRepository({ owner: "DoupHealth", repo: "old-app" }, env);
    expect(out).toMatchObject({ ok: true, alreadyGone: false });
    expect(calls[0]).toEqual({ method: "DELETE", url: "https://api.github.com/repos/douphealth/old-app" });
  });

  it("refuses accounts that are not connected", async () => {
    mockFetch(() => new Response(null, { status: 204 }));
    const out = await deleteGitHubRepository({ owner: "someone-else", repo: "x" }, env);
    expect(out).toMatchObject({ ok: false, code: "invalid" });
    expect(calls).toHaveLength(0);
  });

  it("tells the owner to add delete_repo when GitHub answers 403", async () => {
    mockFetch(() => json(403, { message: "Must have admin rights" }));
    const out = await deleteGitHubRepository({ owner: "douphealth", repo: "x" }, env);
    expect(out).toMatchObject({ ok: false, code: "forbidden" });
    expect(out.message).toContain("delete_repo");
  });
});

describe("deleted marks", () => {
  beforeEach(() => {
    // The live repository runs tests in a plain node environment where
    // localStorage does not exist; the module itself already tolerates that.
    globalThis.localStorage?.clear?.();
    resetDeletedForTests();
  });
  it("hides a deleted item until the provider shows it again 15+ minutes later", () => {
    markDeleted("douphealth/old-app", 1_000);
    const rows = [{ key: "douphealth/old-app" }, { key: "douphealth/keep" }];
    expect(filterDeleted(rows)).toEqual([{ key: "douphealth/keep" }]);
    reconcileDeleted(["douphealth/old-app"], 1_000 + 60_000); // provider echo right after delete
    expect(filterDeleted(rows)).toHaveLength(1);
    reconcileDeleted(["douphealth/old-app"], 1_000 + 16 * 60_000); // recreated later
    expect(filterDeleted(rows)).toHaveLength(2);
  });
});
