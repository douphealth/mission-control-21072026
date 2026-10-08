import { describe, it, expect } from "vitest";
import { PRIORITY_TASKS, WEBSITE_PORTFOLIO } from "@/lib/portfolioBootstrap";
import { domainOf, siteKind } from "@/lib/portfolioInsights";

// The ten properties in the SEO portfolio (one folder each). If a site is added or removed
// in the portfolio, this list and the seed must change together.
const PORTFOLIO_DOMAINS = [
  "gearuptofit.com",
  "affiliatemarketingforsuccess.com",
  "mysticaldigits.com",
  "frenchyfab.com",
  "micegoneguide.com",
  "gearuptogrow.com",
  "plantastichaven.com",
  "efficientgptprompts.com",
  "openclaw-skillshub.com",
  "imagealchemy.app",
];

describe("portfolio seed", () => {
  it("contains every website in the portfolio, once each", () => {
    const seeded = WEBSITE_PORTFOLIO.map((site) => domainOf(site.url));
    expect(new Set(seeded).size).toBe(seeded.length);
    expect([...seeded].sort()).toEqual([...PORTFOLIO_DOMAINS].sort());
  });

  it("classifies eight WordPress sites and two non-WordPress properties", () => {
    const kinds = WEBSITE_PORTFOLIO.map((site) => siteKind(site));
    expect(kinds.filter((kind) => kind === "wordpress")).toHaveLength(8);
    expect(kinds.filter((kind) => kind === "property")).toHaveLength(2);
  });

  it("never ships credentials in the public repository", () => {
    for (const site of WEBSITE_PORTFOLIO) {
      expect(site.wpUsername, site.name).toBe("");
      expect(site.wpPassword, site.name).toBe("");
      expect(site.hostingUsername, site.name).toBe("");
      expect(site.hostingPassword, site.name).toBe("");
    }
  });

  it("gives every site a niche, goal and revenue model from the portfolio record", () => {
    for (const site of WEBSITE_PORTFOLIO) {
      expect(site.niche, site.name).toBeTruthy();
      expect(site.primaryGoal, site.name).toBeTruthy();
      expect(site.revenueModel, site.name).toBeTruthy();
    }
  });

  it("keeps portfolio task keys unique so restore never duplicates work", () => {
    const keys = PRIORITY_TASKS.map((task) => task.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
