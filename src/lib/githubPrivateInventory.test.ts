import { describe, expect, it } from "vitest";
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
