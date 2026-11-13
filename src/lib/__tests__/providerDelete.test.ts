import { describe, expect, it, vi } from "vitest";
import {
  cleanupPagesDeployments,
  deleteCloudflareResource,
  deleteGitHubRepository,
  type FetchLike,
} from "@/lib/providerDelete.server";
import {
  gatedCloudflareDelete,
  gatedGitHubDelete,
  gatedPagesCleanup,
} from "@/lib/providerDeleteGate.server";

const ACCOUNT = "a".repeat(32);
const OTHER = "b".repeat(32);
const CF = "https://api.cloudflare.com/client/v4";
const GH = "https://api.github.com";
const TOKEN_ID = "c".repeat(32);
const env = {
  CLOUDFLARE_ACCOUNT_IDS: ACCOUNT + "," + OTHER,
  // Read keys: must never be used for deletes.
  CLOUDFLARE_ACCOUNT_TOKENS_JSON: JSON.stringify({
    [ACCOUNT]: "cf-read-token-123456789",
    [OTHER]: "cf-read-token-other-1234",
  }),
  CLOUDFLARE_DELETE_TOKENS_JSON: JSON.stringify({
    [ACCOUNT]: { pages: "cf-pages-delete-123456", workers: "cf-workers-delete-12345" },
  }),
  GITHUB_PORTFOLIO_TOKENS_JSON: JSON.stringify({ douphealth: "gh-read-token-1234567890" }),
  GITHUB_DELETE_TOKENS_JSON: JSON.stringify({ douphealth: "gh-delete-token-1234567890" }),
};

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
const cfOk = (result: unknown = null) => json(200, { success: true, errors: [], result });
const cfErr = (status: number, code: number, message: string) =>
  json(status, { success: false, errors: [{ code, message }], result: null });

type Call = { method: string; url: string; auth: string };
type Route = (method: string, url: string) => Response | Promise<Response> | undefined;
function provider(...routes: Route[]) {
  const calls: Call[] = [];
  const f: FetchLike = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method || "GET";
    const headers = new Headers(init?.headers);
    calls.push({ method, url, auth: headers.get("authorization") || "" });
    for (const route of routes) {
      const res = await route(method, url);
      if (res) return res;
    }
    return json(500, { unexpected: method + " " + url });
  });
  return { f, calls, deletes: () => calls.filter((c) => c.method === "DELETE") };
}

/** Cloudflare key is active; its own policies are not readable (common case). */
const cfKeyActive: Route = (method, url) => {
  if (url.endsWith("/tokens/verify")) return cfOk({ id: TOKEN_ID, status: "active" });
  if (url.endsWith("/tokens/" + TOKEN_ID))
    return cfErr(403, 9109, "Unauthorized to access requested resource");
};
const cfKeyWithPolicies =
  (permission: string, accountId = ACCOUNT, effect = "allow"): Route =>
  (method, url) => {
    if (url.endsWith("/tokens/verify")) return cfOk({ id: TOKEN_ID, status: "active" });
    if (url.endsWith("/tokens/" + TOKEN_ID))
      return cfOk({
        id: TOKEN_ID,
        policies: [
          {
            effect,
            resources: { ["com.cloudflare.api.account." + accountId]: "*" },
            permission_groups: [{ name: permission }],
          },
        ],
      });
  };
/** A resource that exists until a DELETE is accepted. */
function resource(path: string, readSuffix = "", deleteReply: () => Response = () => cfOk()) {
  let gone = false;
  const route: Route = (method, url) => {
    if (url === CF + path + readSuffix && method === "GET")
      return gone ? cfErr(404, 8000007, "not found") : cfOk({ name: "x" });
    if (url === CF + path && method === "DELETE") {
      const res = deleteReply();
      if (res.status === 200) gone = true;
      return res;
    }
  };
  return route;
}
const pagesPath = (name: string) => "/accounts/" + ACCOUNT + "/pages/projects/" + name;
const workerPath = (name: string) => "/accounts/" + ACCOUNT + "/workers/scripts/" + name;

describe("Cloudflare delete", () => {
  it("deletes a Pages project with the dedicated delete key and confirms it is gone", async () => {
    const p = provider(cfKeyActive, resource(pagesPath("my-site")));
    const out = await deleteCloudflareResource(
      { accountId: ACCOUNT, kind: "pages", name: "my-site" },
      env,
      p.f,
    );
    expect(out).toMatchObject({ ok: true, code: "deleted" });
    expect(p.deletes()).toEqual([
      { method: "DELETE", url: CF + pagesPath("my-site"), auth: "Bearer cf-pages-delete-123456" },
    ]);
    expect(p.calls.every((c) => c.auth !== "Bearer cf-read-token-123456789")).toBe(true);
    expect(p.calls.at(-1)).toMatchObject({ method: "GET", url: CF + pagesPath("my-site") });
  });

  it("deletes a Worker without force, reading only its small settings", async () => {
    const p = provider(cfKeyActive, resource(workerPath("api"), "/settings"));
    const out = await deleteCloudflareResource(
      { accountId: ACCOUNT, kind: "worker", name: "api" },
      env,
      p.f,
    );
    expect(out.ok).toBe(true);
    expect(p.deletes()[0].url).toBe(CF + workerPath("api"));
    expect(p.calls.some((c) => c.url.includes("force"))).toBe(false);
    expect(p.calls.every((c) => c.auth === "Bearer cf-workers-delete-12345")).toBe(true);
  });

  it("refuses accounts that are not connected, without calling Cloudflare", async () => {
    const p = provider(cfKeyActive);
    const out = await deleteCloudflareResource(
      { accountId: "d".repeat(32), kind: "pages", name: "x" },
      env,
      p.f,
    );
    expect(out).toMatchObject({ ok: false, code: "invalid" });
    expect(p.calls).toHaveLength(0);
  });

  it("never falls back to the read key when no delete key exists for the account", async () => {
    const p = provider(cfKeyActive);
    const out = await deleteCloudflareResource(
      { accountId: OTHER, kind: "worker", name: "api" },
      env,
      p.f,
    );
    expect(out).toMatchObject({ ok: false, code: "not_configured" });
    expect(p.calls).toHaveLength(0);
  });

  it("stops before deleting when the key's policies lack Workers Scripts Edit", async () => {
    const p = provider(
      cfKeyWithPolicies("Workers KV Storage Write"),
      resource(workerPath("api"), "/settings"),
    );
    const out = await deleteCloudflareResource(
      { accountId: ACCOUNT, kind: "worker", name: "api" },
      env,
      p.f,
    );
    expect(out).toMatchObject({ ok: false, code: "forbidden" });
    expect(out.message).toContain("Workers Scripts: Edit");
    expect(p.deletes()).toHaveLength(0);
  });

  it("stops before deleting when Pages Edit is granted on a different account", async () => {
    const p = provider(cfKeyWithPolicies("Pages Write", OTHER), resource(pagesPath("s")));
    const out = await deleteCloudflareResource(
      { accountId: ACCOUNT, kind: "pages", name: "s" },
      env,
      p.f,
    );
    expect(out).toMatchObject({ ok: false, code: "forbidden" });
    expect(p.deletes()).toHaveLength(0);
  });

  it("proceeds when Pages Edit is confirmed for this account", async () => {
    const p = provider(cfKeyWithPolicies("Pages Write"), resource(pagesPath("s")));
    const out = await deleteCloudflareResource(
      { accountId: ACCOUNT, kind: "pages", name: "s" },
      env,
      p.f,
    );
    expect(out.ok).toBe(true);
  });

  it("rejects an expired or invalid key before touching the resource", async () => {
    const p = provider((m, url) =>
      url.endsWith("/tokens/verify") ? cfErr(401, 1000, "Invalid API Token") : undefined,
    );
    const out = await deleteCloudflareResource(
      { accountId: ACCOUNT, kind: "pages", name: "s" },
      env,
      p.f,
    );
    expect(out).toMatchObject({ ok: false, code: "unauthorized" });
    expect(p.deletes()).toHaveLength(0);
  });

  it("explains a missing Edit permission when the delete answers 403", async () => {
    const p = provider(
      cfKeyActive,
      resource(workerPath("api"), "/settings", () => cfErr(403, 10000, "Authentication error")),
    );
    const out = await deleteCloudflareResource(
      { accountId: ACCOUNT, kind: "worker", name: "api" },
      env,
      p.f,
    );
    expect(out).toMatchObject({ ok: false, code: "forbidden" });
    expect(out.message).toContain("Workers Scripts: Edit");
  });

  it("reports not_found (not success) when the project does not exist, and never sends DELETE", async () => {
    const p = provider(cfKeyActive, (m, url) =>
      url === CF + pagesPath("ghost") ? cfErr(404, 8000007, "not found") : undefined,
    );
    const out = await deleteCloudflareResource(
      { accountId: ACCOUNT, kind: "pages", name: "ghost" },
      env,
      p.f,
    );
    expect(out).toMatchObject({ ok: false, code: "not_found" });
    expect(p.deletes()).toHaveLength(0);
  });

  it("treats a 404 on DELETE as unverified, even if a later read is also 404", async () => {
    let reads = 0;
    const p = provider(cfKeyActive, (method, url) => {
      if (url !== CF + pagesPath("s")) return undefined;
      if (method === "DELETE") return cfErr(404, 8000007, "not found");
      return ++reads === 1 ? cfOk({ name: "s" }) : cfErr(404, 8000007, "not found");
    });
    const out = await deleteCloudflareResource(
      { accountId: ACCOUNT, kind: "pages", name: "s" },
      env,
      p.f,
    );
    expect(out).toMatchObject({ ok: false, code: "unverified" });
  });

  it("is unverified when Cloudflare accepts the delete but still lists the project", async () => {
    const p = provider(cfKeyActive, (method, url) =>
      url === CF + pagesPath("s") ? cfOk({ name: "s" }) : undefined,
    );
    const out = await deleteCloudflareResource(
      { accountId: ACCOUNT, kind: "pages", name: "s" },
      env,
      p.f,
    );
    expect(out).toMatchObject({ ok: false, code: "unverified" });
  });

  it("is unverified when the connection drops during the DELETE", async () => {
    const p = provider(cfKeyActive, (method, url) => {
      if (url !== CF + pagesPath("s")) return undefined;
      if (method === "DELETE") throw new TypeError("network down");
      return cfOk({ name: "s" });
    });
    const out = await deleteCloudflareResource(
      { accountId: ACCOUNT, kind: "pages", name: "s" },
      env,
      p.f,
    );
    expect(out).toMatchObject({ ok: false, code: "unverified" });
  });

  it("reports a network failure before deleting as 'nothing deleted'", async () => {
    const p = provider(() => {
      throw new TypeError("offline");
    });
    const out = await deleteCloudflareResource(
      { accountId: ACCOUNT, kind: "pages", name: "s" },
      env,
      p.f,
    );
    expect(out).toMatchObject({ ok: false, code: "network" });
    expect(p.deletes()).toHaveLength(0);
  });

  it("does not remove deployments as a side effect when Cloudflare says too many deployments", async () => {
    const p = provider(
      cfKeyActive,
      resource(pagesPath("big"), "", () =>
        cfErr(400, 8000076, "Your project has too many deployments"),
      ),
    );
    const out = await deleteCloudflareResource(
      { accountId: ACCOUNT, kind: "pages", name: "big" },
      env,
      p.f,
    );
    expect(out).toMatchObject({ ok: false, code: "needs_cleanup" });
    expect(p.deletes().map((c) => c.url)).toEqual([CF + pagesPath("big")]);
    expect(p.calls.some((c) => c.url.includes("/deployments"))).toBe(false);
  });

  it("reports Worker dependencies as blocked", async () => {
    const p = provider(
      cfKeyActive,
      resource(workerPath("core"), "/settings", () =>
        cfErr(409, 10064, "Script is referenced by a service binding"),
      ),
    );
    const out = await deleteCloudflareResource(
      { accountId: ACCOUNT, kind: "worker", name: "core" },
      env,
      p.f,
    );
    expect(out).toMatchObject({ ok: false, code: "blocked" });
  });

  it("reports rate limits with the provider's wait time", async () => {
    const p = provider(
      cfKeyActive,
      resource(pagesPath("s"), "", () =>
        json(429, { success: false, errors: [] }, { "retry-after": "120" }),
      ),
    );
    const out = await deleteCloudflareResource(
      { accountId: ACCOUNT, kind: "pages", name: "s" },
      env,
      p.f,
    );
    expect(out).toMatchObject({ ok: false, code: "rate_limited", retryAfterSeconds: 120 });
  });
});

describe("Pages old-deployment cleanup (separate step)", () => {
  it("keeps the live and aliased deployments and never deletes the project", async () => {
    const p = provider(cfKeyActive, (method, url) => {
      if (url === CF + pagesPath("big") && method === "GET")
        return cfOk({
          name: "big",
          canonical_deployment: { id: "bbbb000001" },
          latest_deployment: { id: "cccc000001" },
        });
      if (url.startsWith(CF + pagesPath("big") + "/deployments?"))
        return json(200, {
          success: true,
          result: [
            { id: "aaaa000001", aliases: [] },
            { id: "bbbb000001", aliases: [] },
            { id: "dddd000001", aliases: ["https://preview.big.pages.dev"] },
            { id: "aaaa000002", aliases: null },
            { id: "cccc000001", aliases: [] },
          ],
          result_info: { total_count: 5 },
        });
      if (method === "DELETE" && url.includes("/deployments/")) return cfOk();
    });
    const out = await cleanupPagesDeployments({ accountId: ACCOUNT, name: "big" }, env, p.f);
    expect(out).toMatchObject({ ok: true, removed: 2, failed: 0 });
    expect(p.deletes().map((c) => c.url)).toEqual([
      CF + pagesPath("big") + "/deployments/aaaa000001?force=true",
      CF + pagesPath("big") + "/deployments/aaaa000002?force=true",
    ]);
    expect(p.deletes().some((c) => c.url === CF + pagesPath("big"))).toBe(false);
  });
});

describe("GitHub delete", () => {
  const repoUrl = GH + "/repos/douphealth/old-app";
  const repo = (
    extra: Record<string, unknown> = {},
    headers: Record<string, string> = { "x-oauth-scopes": "repo, delete_repo" },
  ) =>
    json(200, { full_name: "douphealth/old-app", permissions: { admin: true }, ...extra }, headers);

  function github(
    deleteReply: () => Response,
    afterDelete: () => Response = () => json(404, { message: "Not Found" }),
  ) {
    let deleted = false;
    return provider((method, url) => {
      if (url !== repoUrl) return undefined;
      if (method === "DELETE") {
        deleted = true;
        return deleteReply();
      }
      return deleted ? afterDelete() : repo();
    });
  }

  it("deletes with the dedicated delete key and confirms it is gone", async () => {
    const p = github(() => new Response(null, { status: 204 }));
    const out = await deleteGitHubRepository({ owner: "DoupHealth", repo: "old-app" }, env, p.f);
    expect(out).toMatchObject({ ok: true, code: "deleted" });
    expect(p.calls.map((c) => c.method)).toEqual(["GET", "DELETE", "GET"]);
    expect(p.calls.every((c) => c.auth === "Bearer gh-delete-token-1234567890")).toBe(true);
  });

  it("never treats DELETE 404 + GET 404 as success (could be missing access)", async () => {
    const p = github(() => json(404, { message: "Not Found" }));
    const out = await deleteGitHubRepository({ owner: "douphealth", repo: "old-app" }, env, p.f);
    expect(out.ok).toBe(false);
    expect(out.code).toBe("unverified");
  });

  it("does not send DELETE when the key cannot see the repository (ambiguous 404)", async () => {
    const p = provider(() => json(404, { message: "Not Found" }));
    const out = await deleteGitHubRepository({ owner: "douphealth", repo: "old-app" }, env, p.f);
    expect(out).toMatchObject({ ok: false, code: "not_found" });
    expect(p.deletes()).toHaveLength(0);
  });

  it("is unverified when GitHub accepts but still shows the repository", async () => {
    const p = github(
      () => new Response(null, { status: 204 }),
      () => repo(),
    );
    const out = await deleteGitHubRepository({ owner: "douphealth", repo: "old-app" }, env, p.f);
    expect(out).toMatchObject({ ok: false, code: "unverified" });
  });

  it("stops before deleting when a classic key lacks delete_repo", async () => {
    const p = provider((m, url) =>
      url === repoUrl && m === "GET" ? repo({}, { "x-oauth-scopes": "repo" }) : undefined,
    );
    const out = await deleteGitHubRepository({ owner: "douphealth", repo: "old-app" }, env, p.f);
    expect(out).toMatchObject({ ok: false, code: "forbidden" });
    expect(out.message).toContain("delete_repo");
    expect(p.deletes()).toHaveLength(0);
  });

  it("stops before deleting when the key is not a repository admin", async () => {
    const p = provider((m, url) =>
      url === repoUrl && m === "GET"
        ? repo({ permissions: { admin: false, push: true } })
        : undefined,
    );
    const out = await deleteGitHubRepository({ owner: "douphealth", repo: "old-app" }, env, p.f);
    expect(out).toMatchObject({ ok: false, code: "forbidden" });
    expect(p.deletes()).toHaveLength(0);
  });

  it("maps a 403 on DELETE to forbidden", async () => {
    const p = github(() => json(403, { message: "Must have admin rights to Repository." }));
    const out = await deleteGitHubRepository({ owner: "douphealth", repo: "old-app" }, env, p.f);
    expect(out).toMatchObject({ ok: false, code: "forbidden" });
  });

  it("maps a 403 with no remaining quota to rate_limited", async () => {
    const reset = String(Math.floor(Date.now() / 1000) + 300);
    const p = provider(() =>
      json(
        403,
        { message: "API rate limit exceeded" },
        { "x-ratelimit-remaining": "0", "x-ratelimit-reset": reset },
      ),
    );
    const out = await deleteGitHubRepository({ owner: "douphealth", repo: "old-app" }, env, p.f);
    expect(out).toMatchObject({ ok: false, code: "rate_limited" });
    expect(out.ok ? 0 : out.retryAfterSeconds).toBeGreaterThan(200);
  });

  it("refuses renamed repositories instead of following the redirect", async () => {
    const p = provider(
      () => new Response(null, { status: 301, headers: { location: GH + "/repositories/1" } }),
    );
    const out = await deleteGitHubRepository({ owner: "douphealth", repo: "old-app" }, env, p.f);
    expect(out).toMatchObject({ ok: false, code: "invalid" });
    expect(p.deletes()).toHaveLength(0);
  });

  it("refuses accounts that are not connected, and never uses read keys", async () => {
    const p = provider(() => new Response(null, { status: 204 }));
    expect(
      await deleteGitHubRepository({ owner: "someone-else", repo: "x" }, env, p.f),
    ).toMatchObject({ code: "invalid" });
    expect(
      await deleteGitHubRepository({ owner: "Papalexios", repo: "x" }, env, p.f),
    ).toMatchObject({ code: "not_configured" });
    expect(p.calls).toHaveLength(0);
  });
});

describe("delete authorization", () => {
  const ORIGIN = "https://mc.example";
  const gateEnv = {
    ...env,
    MC_OWNER_PASSCODE: "viewer-passcode-1",
    MC_ADMIN_PASSCODE: "admin-passcode-0123456789",
  };
  const req = (headers: Record<string, string> = {}) =>
    new Request(ORIGIN + "/_serverFn/delete", {
      method: "POST",
      headers: { origin: ORIGIN, "x-mc-owner-passcode": "viewer-passcode-1", ...headers },
    });
  const cfData = { accountId: ACCOUNT, kind: "pages" as const, name: "s", confirm: "s" };

  it("refuses cross-site requests before anything else", async () => {
    const p = provider(cfKeyActive, resource(pagesPath("s")));
    const out = await gatedCloudflareDelete(
      req({ origin: "https://evil.example" }),
      gateEnv,
      { ...cfData, adminPasscode: gateEnv.MC_ADMIN_PASSCODE },
      p.f,
    );
    expect(out).toMatchObject({ ok: false, code: "invalid" });
    expect(p.calls).toHaveLength(0);
  });

  it("refuses callers without a valid viewer sign-in", async () => {
    const p = provider(cfKeyActive, resource(pagesPath("s")));
    const out = await gatedCloudflareDelete(
      req({ "x-mc-owner-passcode": "wrong-passcode" }),
      gateEnv,
      { ...cfData, adminPasscode: gateEnv.MC_ADMIN_PASSCODE },
      p.f,
    );
    expect(out).toMatchObject({ ok: false, code: "unauthorized" });
    expect(p.calls).toHaveLength(0);
  });

  it("a viewer sign-in alone is not enough: the admin passcode is required", async () => {
    const p = provider(cfKeyActive, resource(pagesPath("s")));
    expect(await gatedCloudflareDelete(req(), gateEnv, cfData, p.f)).toMatchObject({
      code: "admin_required",
    });
    expect(
      await gatedCloudflareDelete(
        req(),
        gateEnv,
        { ...cfData, adminPasscode: "admin-passcode-wrong-0000" },
        p.f,
      ),
    ).toMatchObject({
      code: "admin_required",
    });
    expect(p.calls).toHaveLength(0);
  });

  it("fails closed when no admin is configured or the admin passcode equals the viewer passcode", async () => {
    const p = provider(cfKeyActive, resource(pagesPath("s")));
    const { MC_ADMIN_PASSCODE: _unused, ...noAdmin } = gateEnv;
    void _unused;
    expect(await gatedCloudflareDelete(req(), noAdmin, cfData, p.f)).toMatchObject({
      code: "not_configured",
    });
    const same = {
      ...gateEnv,
      MC_OWNER_PASSCODE: "same-passcode-0123456789",
      MC_ADMIN_PASSCODE: "same-passcode-0123456789",
    };
    expect(
      await gatedCloudflareDelete(
        req({ "x-mc-owner-passcode": "same-passcode-0123456789" }),
        same,
        { ...cfData, adminPasscode: "same-passcode-0123456789" },
        p.f,
      ),
    ).toMatchObject({ code: "not_configured" });
    expect(p.calls).toHaveLength(0);
  });

  it("refuses a confirmation that does not match the exact name", async () => {
    const p = provider(cfKeyActive, resource(pagesPath("s")));
    const admin = { adminPasscode: gateEnv.MC_ADMIN_PASSCODE };
    expect(
      await gatedCloudflareDelete(req(), gateEnv, { ...cfData, confirm: "S", ...admin }, p.f),
    ).toMatchObject({ code: "invalid" });
    expect(
      await gatedGitHubDelete(
        req(),
        gateEnv,
        { owner: "douphealth", repo: "old-app", confirm: "old-app", ...admin },
        p.f,
      ),
    ).toMatchObject({
      code: "invalid",
    });
    expect(
      await gatedPagesCleanup(
        req(),
        gateEnv,
        { accountId: ACCOUNT, name: "s", confirm: "s", acknowledge: false, ...admin },
        p.f,
      ),
    ).toMatchObject({
      code: "invalid",
    });
    expect(p.calls).toHaveLength(0);
  });

  it("deletes once viewer sign-in, admin passcode and exact name all check out", async () => {
    const p = provider(cfKeyActive, resource(pagesPath("s")));
    const out = await gatedCloudflareDelete(
      req(),
      gateEnv,
      { ...cfData, adminPasscode: gateEnv.MC_ADMIN_PASSCODE },
      p.f,
    );
    expect(out).toMatchObject({ ok: true, code: "deleted" });
  });
});
