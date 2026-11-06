import { describe, expect, it } from "vitest";
import { cloudflareBrief, githubBrief, repoKeyFromUrl } from "./opsBrief";

const NOW = Date.parse("2026-11-06T00:00:00Z");
const row = (o: Record<string, unknown>) =>
  ({ key: String(o.name), kind: "pages", accountId: "a", name: "x", projectUrl: "https://dash", publicUrl: null, domains: [], routes: [], repoUrl: null, branch: null, commit: null, deploymentId: null, deployedAt: "2026-11-01T00:00:00Z", status: "success", statusSource: "cloudflare-deployment", ...o }) as never;

describe("ops brief", () => {
  it("puts failing builds first and flags 90+ day stale deploys", () => {
    const b = cloudflareBrief(
      [row({ name: "ok" }), row({ name: "bad", health: "failing" }), row({ name: "old", deployedAt: "2026-06-01T00:00:00Z" })],
      [],
      NOW,
    );
    expect(b.failing).toBe(1);
    expect(b.stale).toBe(1);
    expect(b.queue[0].title).toBe("bad");
    expect(b.score).toBe(33);
  });
  it("links repos to Cloudflare by build source", () => {
    expect(repoKeyFromUrl("https://github.com/Foo/Bar.git")).toBe("foo/bar");
    const g = githubBrief(
      [{ name: "bar", url: "https://github.com/foo/bar" }],
      [row({ name: "p", repoUrl: "https://github.com/foo/bar", health: "failing" })],
      () => "foo",
      NOW,
    );
    expect(g.deployed).toBe(1);
    expect(g.failing).toBe(1);
  });
});
