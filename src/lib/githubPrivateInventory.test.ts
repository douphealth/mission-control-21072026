import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MANAGED_GITHUB_ACCOUNTS, collectPrivateGithubInventory,
} from "@/lib/githubPrivateInventory.server";
describe("protected GitHub repository inventory", () => {
  it("has a deterministic three-account allowlist", () => {
    expect(MANAGED_GITHUB_ACCOUNTS).toEqual(["douphealth", "Papalexios", "papalexios001-wq"]);
  });
  it("returns a truthful disconnected state with no secrets", async () => {
    expect(await collectPrivateGithubInventory({})).toMatchObject({
      truthState:"not_connected", repositories:[], connectedAccounts:[], errors:[],
    });
  });
  it("does not treat a token-less account as connected", async () => {
    expect(await collectPrivateGithubInventory({ GITHUB_PORTFOLIO_TOKENS_JSON: "{}" }))
      .toMatchObject({ truthState: "not_connected", repositories: [] });
  });
});


describe("authenticated GitHub API inventory", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("checks GitHub account identity and excludes public repository rows", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const path = new URL(String(input)).pathname;
      calls.push(path);
      const payload = path === "/user"
        ? {login:"douphealth"}
        : path === "/user/repos"
          ? [{name:"private-tool",owner:{login:"douphealth"},private:true,
              default_branch:"main",pushed_at:"2026-10-01T00:00:00Z"},
             {name:"public-tool",owner:{login:"douphealth"},private:false}]
          : null;
      return new Response(JSON.stringify(payload), {status: payload ? 200 : 404});
    }));
    const inventory = await collectPrivateGithubInventory({
      GITHUB_PORTFOLIO_TOKENS_JSON: JSON.stringify({
        douphealth: "synthetic-supersecret-long-token",
      }),
    });
    expect(inventory.truthState).toBe("partial");
    expect(inventory.repositories.map(r=>r.name)).toEqual(["private-tool"]);
    expect(inventory.repositories[0].url)
      .toBe("https://github.com/douphealth/private-tool");
    expect(inventory.connectedAccounts).toEqual(["douphealth"]);
    expect(calls).toEqual(["/user", "/user/repos"]);
    expect(JSON.stringify(inventory)).not.toContain("synthetic-supersecret-long-token");
  });

  it("never trusts a mismatched identity token", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({login:"unrelated-user"}),{status:200})));
    const inventory = await collectPrivateGithubInventory({
      GITHUB_PORTFOLIO_TOKENS_JSON:JSON.stringify({
        douphealth:"synthetic-supersecret-long-token",
      }),
    });
    expect(inventory.repositories).toHaveLength(0);
    expect(inventory.truthState).toBe("error");
  });
});
