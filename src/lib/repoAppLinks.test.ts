import { describe, expect, it } from "vitest";
import { appPublicUrl, endpointIdentity, recordedRepoAppLinks } from "@/lib/repoAppLinks";

describe("Portfolio app URL evidence", () => {
  it("rejects management links, code links, credentials and local endpoints", () => {
    for (const url of [
      "https://github.com/douphealth/app",
      "https://dash.cloudflare.com/account/workers",
      "https://user:secret@example.com/",
      "http://app.example.com/",
      "https://127.0.0.1:8080/",
      "https://localhost/",
      "not a URL",
    ]) expect(appPublicUrl(url)).toBeNull();
  });
  it("keeps real HTTPS app paths and query strings", () => {
    expect(appPublicUrl("https://example.com/shoe-finder/?mode=live")).toBe(
      "https://example.com/shoe-finder/?mode=live");
    expect(endpointIdentity("https://APP.example.com/tool/")).toBe("app.example.com/tool");
  });
  it("joins exact recorded Github repo identity and never links ambiguous repos", () => {
    const known = recordedRepoAppLinks([{
      githubRepo: "https://github.com/douphealth/my-ui",
      deployedUrl: "https://my-ui.example.com/",
    }, {
      githubRepo: "https://github.com/another-owner/other",
      deployedUrl: "https://other.example.com/",
    }]);
    expect(known.get("douphealth/my-ui")).toMatchObject({
      url: "https://my-ui.example.com/",
      origin: "app-record",
      providerAttested: false,
    });
    expect(known.get("another-owner/other")?.url).toBe("https://other.example.com/");
    expect(known.get("douphealth/other")).toBeUndefined();
  });
  it("includes known curated app links without making them live health checks", () => {
    const known = recordedRepoAppLinks();
    expect(known.get("douphealth/index-engine")).toMatchObject({
      url: "https://index-engine-dashboard.papalexios.workers.dev/",
      origin: "app-catalog", providerAttested: false,
    });
  });
  it("does not promote a candidate-only deployment as verified", () => {
    const known = recordedRepoAppLinks();
    expect(known.get("douphealth/ai-seo-orchestrator-001")).toBeUndefined();
  });
});
