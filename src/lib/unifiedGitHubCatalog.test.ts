import { describe, expect, it } from "vitest";
import type { GitHubRepo } from "@/lib/db";
import {
  UNIFIED_PUBLIC_GITHUB_CATALOG as catalog, UNIFIED_PUBLIC_GITHUB_COUNT,
  getGitHubRepoKey as key, getGitHubRepoOwner as owner, mergeUnifiedGitHubRows as merge,
} from "@/lib/unifiedGitHubCatalog";

describe("three-account GitHub Projects", () => {
  it("contains exactly 229 unique public owner/repo identities", () => {
    expect(UNIFIED_PUBLIC_GITHUB_COUNT).toBe(229);
    expect(catalog).toHaveLength(229);
    expect(new Set(catalog.map(r => key(r.url))).size).toBe(229);
    expect(catalog.filter(r => owner(r.url) === "douphealth")).toHaveLength(76);
    expect(catalog.filter(r => owner(r.url) === "Papalexios")).toHaveLength(119);
    expect(catalog.filter(r => owner(r.url) === "papalexios001-wq")).toHaveLength(34);
    expect(catalog.every(r => r.visibility === "public")).toBe(true);
  });

  it("never invents external deployment URLs or metadata for the 153 additional projects", () => {
    const extra = catalog.filter(r => owner(r.url) !== "douphealth");
    expect(extra).toHaveLength(153);
    expect(extra.every(r => !r.demoUrl && !r.metadataCheckedAt)).toBe(true);
  });

  it("matches full owner/repo and retains saved planning data", () => {
    const a = catalog.find(r => owner(r.url) === "Papalexios")!;
    const stored: GitHubRepo = { ...a, id: "saved-1", pendingSummary: "My plan", priority: "critical" };
    const secret: GitHubRepo = {
      ...a, id: "secret", name: "secret", url: "https://github.com/acme/secret",
      visibility: "private",
    };
    const rows = merge([stored, secret]);
    expect(rows).toHaveLength(229);
    const got = rows.find(r => key(r.url) === key(a.url))!;
    expect(got.id).toBe("saved-1");
    expect(got.pendingSummary).toBe("My plan");
    expect(got.priority).toBe("critical");
    expect(rows.some(r => r.id === "secret")).toBe(false);
    expect(key("https://GITHUB.com/PAPALEXIOS/AI-IMAGE-ENGINE.git/")).toBe("papalexios/ai-image-engine");
  });

  it("keeps distinct accounts even when repository names are identical", () => {
    const sameNamed = catalog.filter(r => r.name.toLowerCase() === "ai-image-engine");
    expect(sameNamed.length).toBeGreaterThan(1);
    expect(new Set(sameNamed.map(r => key(r.url))).size).toBe(sameNamed.length);
  });
});
