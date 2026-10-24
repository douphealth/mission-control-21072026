import { describe, expect, it } from "vitest";
import { GITHUB_ACCOUNT_AUDIT } from "@/lib/portfolioAtlasSnapshot";
import { GITHUB_REPO_CATALOG } from "@/lib/repoCatalog";
import { PUBLIC_PORTFOLIO_REPOS, classifyPortfolioRepo } from "@/lib/portfolioAtlas";

describe("Portfolio Atlas audit snapshot", () => {
  it("has consistent account totals and the complete public inventory", () => {
    expect(GITHUB_ACCOUNT_AUDIT.map(x => x.total)).toEqual([87, 119, 35]);
    expect(GITHUB_ACCOUNT_AUDIT.reduce((sum, x) => sum + x.total, 0)).toBe(241);
    expect(GITHUB_ACCOUNT_AUDIT.reduce((sum, x) => sum + x.public, 0)).toBe(229);
    expect(GITHUB_ACCOUNT_AUDIT.reduce((sum, x) => sum + x.private, 0)).toBe(12);
    expect(PUBLIC_PORTFOLIO_REPOS).toHaveLength(229);
    expect(PUBLIC_PORTFOLIO_REPOS.filter(x => x.owner === "douphealth")).toHaveLength(76);
    expect(PUBLIC_PORTFOLIO_REPOS.filter(x => x.owner === "Papalexios")).toHaveLength(119);
    expect(PUBLIC_PORTFOLIO_REPOS.filter(x => x.owner === "papalexios001-wq")).toHaveLength(34);
  });

  it("does not expose catalog private repository entries in the public inventory", () => {
    const urls = new Set(PUBLIC_PORTFOLIO_REPOS.map(r => r.url.toLocaleLowerCase()));
    expect(urls.size).toBe(PUBLIC_PORTFOLIO_REPOS.length);
    for (const r of GITHUB_REPO_CATALOG.filter(x => x.visibility === "private")) {
      expect(urls.has(r.url.toLocaleLowerCase())).toBe(false);
    }
    expect(GITHUB_REPO_CATALOG.every(r => r.visibility === "public")).toBe(true);
  });

  it("classifies priority outreach and indexing projects without asserting deployment", () => {
    expect(classifyPortfolioRepo("backlink-command-center")).toBe("Backlinks");
    expect(classifyPortfolioRepo("sitemap-indexer-pro")).toBe("Indexation");
    expect(classifyPortfolioRepo("social-media-co-pilot")).toBe("Social outreach");
    expect(classifyPortfolioRepo("AmzWP-Automator")).toBe("Automation");
  });
});
