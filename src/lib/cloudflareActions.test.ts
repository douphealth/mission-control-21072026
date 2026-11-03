import { afterEach, describe, expect, it, vi } from "vitest";
import { assertSameOrigin, runPagesAction } from "@/lib/cloudflareActions.server";

const ACCOUNT = "e".repeat(32);
const env = (tokens: Record<string, unknown>) => ({
  CLOUDFLARE_ACCOUNT_IDS: ACCOUNT,
  CLOUDFLARE_ACCOUNT_TOKENS_JSON: JSON.stringify({ [ACCOUNT]: tokens }),
});

describe("Cloudflare Pages write actions", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("stays disabled without a dedicated deploy token, even when read tokens exist", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      runPagesAction(
        { accountId: ACCOUNT, name: "site", action: "deploy" },
        { ...env({ default: "read", pages: "pages-read" }), CLOUDFLARE_API_TOKEN: "global-read" },
      ),
    ).rejects.toMatchObject({ code: "not_enabled" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects unknown accounts and malformed deployment ids before any API call", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      runPagesAction(
        { accountId: "f".repeat(32), name: "site", action: "deploy" },
        env({ deploy: "w" }),
      ),
    ).rejects.toMatchObject({ code: "invalid" });
    await expect(
      runPagesAction(
        { accountId: ACCOUNT, name: "site", action: "rollback", deploymentId: "../x" },
        env({ deploy: "w" }),
      ),
    ).rejects.toMatchObject({ code: "invalid" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("starts a production build only for Git-connected projects", async () => {
    const calls: Array<{ method: string; path: string; auth: string }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const path = new URL(String(input)).pathname;
        calls.push({
          method: init?.method || "GET",
          path,
          auth: (init?.headers as Record<string, string>).Authorization,
        });
        const result =
          init?.method === "POST"
            ? {
                id: "0f1e2d3c-aaaa",
                url: "https://0f1e2d3c.site.pages.dev",
                latest_stage: { name: "queued", status: "idle" },
              }
            : { name: "site", source: { type: "github" } };
        return new Response(JSON.stringify({ success: true, result }));
      }),
    );
    const result = await runPagesAction(
      { accountId: ACCOUNT, name: "site", action: "deploy" },
      env({ deploy: "write-token" }),
    );
    expect(result).toMatchObject({ ok: true, deploymentId: "0f1e2d3c-aaaa", status: "idle" });
    expect(calls.map((c) => c.method + " " + c.path)).toEqual([
      "GET /client/v4/accounts/" + ACCOUNT + "/pages/projects/site",
      "POST /client/v4/accounts/" + ACCOUNT + "/pages/projects/site/deployments",
    ]);
    expect(calls.every((c) => c.auth === "Bearer write-token")).toBe(true);
  });

  it("refuses to trigger Direct Upload projects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ success: true, result: { name: "site" } }))),
    );
    await expect(
      runPagesAction({ accountId: ACCOUNT, name: "site", action: "deploy" }, env({ deploy: "w" })),
    ).rejects.toMatchObject({ code: "unsupported" });
  });

  it("maps permission failures to a safe message without provider text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              success: false,
              errors: [{ code: 10000, message: "secret internal detail" }],
            }),
            { status: 403 },
          ),
      ),
    );
    const error = await runPagesAction(
      { accountId: ACCOUNT, name: "site", action: "retry", deploymentId: "abcdef12-3456" },
      env({ deploy: "w" }),
    ).catch((e: Error) => e);
    expect(error).toMatchObject({ code: "rejected" });
    expect((error as Error).message).toMatch(/Pages Edit permission/);
    expect((error as Error).message).not.toContain("secret internal detail");
  });
});

describe("same-origin guard", () => {
  it("accepts same-origin and rejects cross-site requests", () => {
    expect(() =>
      assertSameOrigin(
        new Request("https://mc.example.com/_serverFn/x", {
          method: "POST",
          headers: { origin: "https://mc.example.com" },
        }),
      ),
    ).not.toThrow();
    expect(() =>
      assertSameOrigin(
        new Request("https://mc.example.com/_serverFn/x", {
          method: "POST",
          headers: { origin: "https://evil.example" },
        }),
      ),
    ).toThrow(/Cross-site/);
    expect(() =>
      assertSameOrigin(new Request("https://mc.example.com/_serverFn/x", { method: "POST" })),
    ).toThrow(/Cross-site/);
  });
});
