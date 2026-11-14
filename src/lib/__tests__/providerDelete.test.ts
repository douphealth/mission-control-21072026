import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanupPagesDeployments,
  deleteCloudflareResource,
  deleteGitHubRepository,
  type FetchLike,
} from "@/lib/providerDelete.server";
import {
  deleteAdminStatus,
  gatedCloudflareDelete,
  gatedGitHubDelete,
  gatedPagesCleanup,
} from "@/lib/providerDeleteGate.server";
import { ADMIN_GOOGLE_TOKEN_HEADER } from "@/lib/providerDeleteNames";

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

describe("delete authorization (verified admin identity)", () => {
  const ORIGIN = "https://mc.example";
  const CLIENT = "123456789012-abcdefghijklmnop.apps.googleusercontent.com";
  const FOREIGN = "999999999999-someoneelsesapp000.apps.googleusercontent.com";
  const ADMIN = "owner@example.com";
  const GTOKEN = "ya29.a0-test-google-access-token_0123456789";
  const ADMIN_PASS = "admin-passcode-0123456789";
  const gateEnv: Record<string, string | undefined> = {
    ...env,
    MC_OWNER_PASSCODE: "viewer-passcode-1",
    MC_ADMIN_EMAILS: " Owner@Example.com , second@example.com",
    GOOGLE_OAUTH_CLIENT_ID: CLIENT,
  };
  const withPass: Record<string, string | undefined> = {
    ...gateEnv,
    MC_ADMIN_PASSCODE: ADMIN_PASS,
  };
  const req = (headers: Record<string, string> = {}) =>
    new Request(ORIGIN + "/_serverFn/delete", {
      method: "POST",
      headers: {
        origin: ORIGIN,
        "x-mc-owner-passcode": "viewer-passcode-1",
        [ADMIN_GOOGLE_TOKEN_HEADER]: GTOKEN,
        ...headers,
      },
    });
  const noGoogle = () => {
    const r = req();
    const h = new Headers(r.headers);
    h.delete(ADMIN_GOOGLE_TOKEN_HEADER);
    return new Request(r.url, { method: "POST", headers: h });
  };
  const cfData = { accountId: ACCOUNT, kind: "pages" as const, name: "s", confirm: "s" };
  const future = () => String(Math.floor(Date.now() / 1000) + 1800);
  const goodClaims = () => ({
    aud: CLIENT,
    azp: CLIENT,
    exp: future(),
    expires_in: "1799",
    email: ADMIN,
    email_verified: "true",
    scope: "openid email",
  });
  /** Mocked Google tokeninfo. */
  function google(reply: Record<string, unknown> | number | "throw") {
    const bodies: string[] = [];
    const urls: string[] = [];
    const f: FetchLike = vi.fn(async (url: string, init?: RequestInit) => {
      urls.push(url);
      bodies.push(String(init?.body ?? ""));
      if (reply === "throw") throw new TypeError("network down");
      if (typeof reply === "number") return json(reply, { error: "invalid_token" });
      return json(200, reply);
    });
    return { f, bodies, urls };
  }
  const cfProvider = () => provider(cfKeyActive, resource(pagesPath("s")));

  it("an admin passcode alone never authorizes a delete", async () => {
    const p = cfProvider();
    const g = google(goodClaims());
    const out = await gatedCloudflareDelete(
      noGoogle(),
      withPass,
      { ...cfData, adminPasscode: ADMIN_PASS },
      p.f,
      g.f,
    );
    expect(out).toMatchObject({ ok: false, code: "admin_required" });
    expect(p.calls).toHaveLength(0);
  });

  it("allows a verified, allowlisted Google identity when no second factor is configured", async () => {
    const p = cfProvider();
    const g = google(goodClaims());
    const out = await gatedCloudflareDelete(req(), gateEnv, cfData, p.f, g.f);
    expect(out).toMatchObject({ ok: true, code: "deleted" });
    // Token goes to Google in a POST body, never in the URL.
    expect(g.urls).toEqual(["https://oauth2.googleapis.com/tokeninfo"]);
    expect(g.bodies[0]).toContain("access_token=");
    expect(JSON.stringify(out)).not.toContain(GTOKEN);
  });

  it("with a second factor configured, needs BOTH the verified identity and the correct passcode", async () => {
    const g = google(goodClaims());
    const p1 = cfProvider();
    expect(await gatedCloudflareDelete(req(), withPass, cfData, p1.f, g.f)).toMatchObject({
      code: "admin_required",
    });
    expect(
      await gatedCloudflareDelete(
        req(),
        withPass,
        { ...cfData, adminPasscode: "admin-passcode-wrong-0000" },
        p1.f,
        g.f,
      ),
    ).toMatchObject({ code: "admin_required" });
    expect(p1.calls).toHaveLength(0);
    const p2 = cfProvider();
    expect(
      await gatedCloudflareDelete(
        req(),
        withPass,
        { ...cfData, adminPasscode: ADMIN_PASS },
        p2.f,
        g.f,
      ),
    ).toMatchObject({ ok: true, code: "deleted" });
  });

  it("refuses a verified Google email that is not in the allowlist", async () => {
    const p = cfProvider();
    const g = google({ ...goodClaims(), email: "intruder@example.com" });
    const out = await gatedCloudflareDelete(req(), gateEnv, cfData, p.f, g.f);
    expect(out).toMatchObject({ ok: false, code: "admin_required" });
    expect(out.message).toContain("intruder@example.com");
    expect(p.calls).toHaveLength(0);
  });

  it("refuses when Google says the email is not verified", async () => {
    const p = cfProvider();
    const g = google({ ...goodClaims(), email_verified: "false" });
    expect(await gatedCloudflareDelete(req(), gateEnv, cfData, p.f, g.f)).toMatchObject({
      code: "admin_required",
    });
    expect(p.calls).toHaveLength(0);
  });

  it("refuses a token issued to a different app (audience or azp)", async () => {
    const p = cfProvider();
    for (const claims of [
      { ...goodClaims(), aud: FOREIGN, azp: FOREIGN },
      { ...goodClaims(), azp: FOREIGN },
    ]) {
      expect(
        await gatedCloudflareDelete(req(), gateEnv, cfData, p.f, google(claims).f),
      ).toMatchObject({ code: "admin_required" });
    }
    expect(p.calls).toHaveLength(0);
  });

  it("refuses expired or invalid tokens", async () => {
    const p = cfProvider();
    const past = String(Math.floor(Date.now() / 1000) - 5);
    for (const g of [
      google({ ...goodClaims(), exp: past }),
      google({ ...goodClaims(), expires_in: "0" }),
      google(400),
      google({ ...goodClaims(), exp: undefined }),
    ]) {
      expect(await gatedCloudflareDelete(req(), gateEnv, cfData, p.f, g.f)).toMatchObject({
        code: "admin_required",
      });
    }
    expect(p.calls).toHaveLength(0);
  });

  it("fails closed when Google cannot be reached or answers with an error", async () => {
    const p = cfProvider();
    for (const g of [google("throw"), google(500), google(503)]) {
      expect(await gatedCloudflareDelete(req(), gateEnv, cfData, p.f, g.f)).toMatchObject({
        code: "admin_required",
      });
    }
    expect(p.calls).toHaveLength(0);
  });

  it("refuses Google sign-in when the server has no Google client ID configured", async () => {
    const p = cfProvider();
    const g = google(goodClaims());
    const { GOOGLE_OAUTH_CLIENT_ID: _c, ...noClient } = gateEnv;
    void _c;
    const out = await gatedCloudflareDelete(req(), noClient, cfData, p.f, g.f);
    expect(out).toMatchObject({ code: "admin_required" });
    expect(g.urls).toHaveLength(0);
    expect(p.calls).toHaveLength(0);
  });

  it("no admin allowlist → deleting is switched off (not_configured), even with a passcode", async () => {
    const p = cfProvider();
    const g = google(goodClaims());
    const { MC_ADMIN_EMAILS: _e, ...noList } = withPass;
    void _e;
    const out = await gatedCloudflareDelete(
      req(),
      noList,
      { ...cfData, adminPasscode: ADMIN_PASS },
      p.f,
      g.f,
    );
    expect(out).toMatchObject({ ok: false, code: "not_configured" });
    expect(out.message).toContain("MC_ADMIN_EMAILS");
    expect(g.urls).toHaveLength(0);
    expect(p.calls).toHaveLength(0);
  });

  it("an unusable admin passcode setting (too short or equal to the viewer passcode) fails closed", async () => {
    const p = cfProvider();
    const g = google(goodClaims());
    const bads: Record<string, string | undefined>[] = [
      { ...gateEnv, MC_ADMIN_PASSCODE: "short" },
      {
        ...gateEnv,
        MC_ADMIN_PASSCODE: "viewer-passcode-1-long-enough",
        MC_OWNER_PASSCODE: "viewer-passcode-1-long-enough",
      },
    ];
    for (const bad of bads) {
      const r = req({ "x-mc-owner-passcode": bad.MC_OWNER_PASSCODE! });
      expect(
        await gatedCloudflareDelete(
          r,
          bad,
          { ...cfData, adminPasscode: bad.MC_ADMIN_PASSCODE },
          p.f,
          g.f,
        ),
      ).toMatchObject({ code: "not_configured" });
    }
    expect(p.calls).toHaveLength(0);
  });

  it("refuses cross-site requests before anything else", async () => {
    const p = cfProvider();
    const g = google(goodClaims());
    const out = await gatedCloudflareDelete(
      req({ origin: "https://evil.example" }),
      gateEnv,
      cfData,
      p.f,
      g.f,
    );
    expect(out).toMatchObject({ ok: false, code: "invalid" });
    expect(g.urls).toHaveLength(0);
    expect(p.calls).toHaveLength(0);
  });

  it("refuses callers without a valid viewer sign-in", async () => {
    const p = cfProvider();
    const g = google(goodClaims());
    const out = await gatedCloudflareDelete(
      req({ "x-mc-owner-passcode": "wrong-passcode" }),
      gateEnv,
      cfData,
      p.f,
      g.f,
    );
    expect(out).toMatchObject({ ok: false, code: "unauthorized" });
    expect(g.urls).toHaveLength(0);
    expect(p.calls).toHaveLength(0);
  });

  it("refuses a confirmation that does not match the exact name", async () => {
    const p = cfProvider();
    const g = google(goodClaims());
    expect(
      await gatedCloudflareDelete(req(), gateEnv, { ...cfData, confirm: "S" }, p.f, g.f),
    ).toMatchObject({ code: "invalid" });
    expect(
      await gatedGitHubDelete(
        req(),
        gateEnv,
        { owner: "douphealth", repo: "old-app", confirm: "old-app" },
        p.f,
        g.f,
      ),
    ).toMatchObject({ code: "invalid" });
    expect(
      await gatedPagesCleanup(
        req(),
        gateEnv,
        { accountId: ACCOUNT, name: "s", confirm: "s", acknowledge: false },
        p.f,
        g.f,
      ),
    ).toMatchObject({ code: "invalid" });
    expect(p.calls).toHaveLength(0);
  });

  it("accepts a Google ID token only from Google's issuer", async () => {
    const idToken = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl";
    const p = cfProvider();
    const bad = google({ ...goodClaims(), iss: "https://evil.example" });
    expect(
      await gatedCloudflareDelete(
        req({ [ADMIN_GOOGLE_TOKEN_HEADER]: idToken }),
        gateEnv,
        cfData,
        p.f,
        bad.f,
      ),
    ).toMatchObject({ code: "admin_required" });
    expect(bad.bodies[0]).toContain("id_token=");
    expect(p.calls).toHaveLength(0);
    const good = google({ ...goodClaims(), iss: "https://accounts.google.com" });
    expect(
      await gatedCloudflareDelete(
        req({ [ADMIN_GOOGLE_TOKEN_HEADER]: idToken }),
        gateEnv,
        cfData,
        p.f,
        good.f,
      ),
    ).toMatchObject({ ok: true, code: "deleted" });
  });

  describe("Cloudflare Access identity", () => {
    const TEAM = "delete-gate-team.cloudflareaccess.com";
    const AUD = "delete-gate-aud";
    const accessEnv = {
      ...gateEnv,
      CLOUDFLARE_ACCESS_TEAM_DOMAIN: TEAM,
      CLOUDFLARE_ACCESS_AUD: AUD,
    };
    const part = (d: unknown) => Buffer.from(JSON.stringify(d)).toString("base64url");
    afterEach(() => vi.unstubAllGlobals());
    async function accessJwt(email: string) {
      const keys = await crypto.subtle.generateKey(
        {
          name: "RSASSA-PKCS1-v1_5",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["sign", "verify"],
      );
      const pub = await crypto.subtle.exportKey("jwk", keys.publicKey);
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => json(200, { keys: [{ ...pub, kid: "k-" + email, alg: "RS256" }] })),
      );
      const header = part({ alg: "RS256", typ: "JWT", kid: "k-" + email });
      const payload = part({
        iss: "https://" + TEAM,
        aud: [AUD],
        exp: Math.floor(Date.now() / 1000) + 300,
        email,
      });
      const sig = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        keys.privateKey,
        new TextEncoder().encode(header + "." + payload),
      );
      return header + "." + payload + "." + Buffer.from(sig).toString("base64url");
    }

    it("allows a verified Access login whose email is allowlisted, without Google", async () => {
      const jwt = await accessJwt(ADMIN);
      const p = cfProvider();
      const g = google(goodClaims());
      const r = noGoogle();
      const h = new Headers(r.headers);
      h.set("cf-access-jwt-assertion", jwt);
      const out = await gatedCloudflareDelete(
        new Request(r.url, { method: "POST", headers: h }),
        accessEnv,
        cfData,
        p.f,
        g.f,
      );
      expect(out).toMatchObject({ ok: true, code: "deleted" });
      expect(g.urls).toHaveLength(0);
    });

    it("refuses an Access login that is not allowlisted (and no Google identity)", async () => {
      const jwt = await accessJwt("someone@example.com");
      const p = cfProvider();
      const r = noGoogle();
      const h = new Headers(r.headers);
      h.set("cf-access-jwt-assertion", jwt);
      const out = await gatedCloudflareDelete(
        new Request(r.url, { method: "POST", headers: h }),
        accessEnv,
        cfData,
        p.f,
        google(goodClaims()).f,
      );
      expect(out).toMatchObject({ code: "admin_required" });
      expect(p.calls).toHaveLength(0);
    });
  });

  it("the read-only status check reports identity and second factor without leaking secrets", async () => {
    const g = google(goodClaims());
    const status = await deleteAdminStatus(req(), withPass, g.f);
    expect(status).toMatchObject({
      configured: true,
      secondFactorRequired: true,
      googleReady: true,
      identity: { via: "google", email: ADMIN },
    });
    const text = JSON.stringify(status);
    for (const secret of [GTOKEN, ADMIN_PASS, "second@example.com", "viewer-passcode-1"])
      expect(text).not.toContain(secret);
    const outsider = await deleteAdminStatus(
      req(),
      gateEnv,
      google({ ...goodClaims(), email: "x@y.com" }).f,
    );
    expect(outsider).toMatchObject({ configured: true, identity: null, otherEmail: "x@y.com" });
    const { MC_ADMIN_EMAILS: _e, ...noList } = gateEnv;
    void _e;
    expect(await deleteAdminStatus(req(), noList, g.f)).toMatchObject({ configured: false });
  });
});
