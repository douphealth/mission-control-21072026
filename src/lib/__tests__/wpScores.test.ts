import { describe, it, expect } from "vitest";
import { criticalHealthCount, pluginUpdateCount, scoreWpSite, wpConnection } from "@/lib/wpScores";

const healthy = {
  reachable: true,
  protocol: "https" as const,
  isWordPress: true,
  responseMs: 420,
};

const seo = {
  hasSitemap: true,
  hasRobots: true,
  robotsAllowsAll: true,
  title: "Title",
  description: "Desc",
  ogTitle: "OG",
  canonical: "https://example.com/",
  errors: [],
};

describe("scoreWpSite", () => {
  it("returns null scores when no evidence has been collected", () => {
    expect(scoreWpSite({})).toEqual({ health: null, seo: null, security: null });
  });

  it("scores health from reachability, HTTPS, WordPress detection and speed", () => {
    expect(scoreWpSite({ health: healthy }).health).toBe(100);
    expect(scoreWpSite({ health: { ...healthy, protocol: "http", responseMs: 2400 } }).health).toBe(
      45 + 20,
    );
  });

  it("scores SEO basics only from what was actually found", () => {
    expect(scoreWpSite({ seo }).seo).toBe(100);
    expect(scoreWpSite({ seo: { ...seo, hasSitemap: false, title: undefined } }).seo).toBe(
      100 - 30 - 20,
    );
  });

  it("needs authenticated evidence before it scores security", () => {
    const partial = scoreWpSite({ health: healthy, plugins: [], siteHealth: [] });
    expect(partial.security).toBeNull();
    const full = scoreWpSite({
      health: healthy,
      plugins: [],
      siteHealth: [],
      currentUser: { id: 1, roles: ["administrator"] },
    });
    expect(full.security).toBe(100);
  });
});

describe("evidence counters", () => {
  it("counts only real plugin updates, not 'none'", () => {
    expect(
      pluginUpdateCount([
        { plugin: "a", status: "active", name: "A", version: "1", update: "available" },
        { plugin: "b", status: "active", name: "B", version: "1", update: "none" },
        { plugin: "c", status: "inactive", name: "C", version: "1" },
      ]),
    ).toBe(1);
    expect(pluginUpdateCount(undefined)).toBe(0);
  });

  it("counts critical site-health findings", () => {
    expect(
      criticalHealthCount([
        { key: "a", label: "A", status: "critical" },
        { key: "b", label: "B", status: "good" },
      ]),
    ).toBe(1);
  });
});

describe("wpConnection", () => {
  it("reports each connection state distinctly", () => {
    expect(wpConnection({}, false)).toBe("public-only");
    expect(wpConnection({}, true)).toBe("pending");
    expect(wpConnection({ currentUser: { id: 1 } }, true)).toBe("verified");
    expect(wpConnection({ authError: "401" }, true)).toBe("auth-error");
  });
});
